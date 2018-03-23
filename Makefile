.PHONY: all clean

# Download zips
zip/cb_2014_25_tract_500k.zip:
	@mkdir -p $(dir $@)
	@curl \
		-sS \
		"https://www2.census.gov/geo/tiger/GENZ2014/shp/cb_2014_25_tract_500k.zip" \
		-o $@.download
	@mv $@.download $@

zip/srtm_%.zip:
	@mkdir -p $(dir $@)
	@curl \
		-sS \
		"http://srtm.csi.cgiar.org/SRT-ZIP/SRTM_V41/SRTM_Data_GeoTiff/$(notdir $@)" \
		-o $@.download
	@mv $@.download $@

# Unzip
tif/srtm_%.tif: zip/srtm_%.zip
	@mkdir -p $(dir $@)
	@rm -rf tmp && mkdir tmp
	@unzip -q -o -d tmp $<
	@cp tmp/* $(dir $@)
	@rm -rf tmp

shp/cb_2014_25_tract_500k.shp: zip/cb_2014_25_tract_500k.zip
	@mkdir -p $(dir $@)
	@rm -rf tmp && mkdir tmp
	@unzip \
		-o -d tmp \
		$<
	@cp tmp/* shp

# Make SVG of Massachusetts
# (Mercator projection)
json/ma.json: shp/cb_2014_25_tract_500k.shp
	@mkdir -p $(dir $@)
	@shp2json \
		$< \
		-o $@

json/ma-mercator.json: json/ma.json
	@geoproject "d3.geoMercator().fitSize([960, 960], d)" \
		$< \
		> $@

topojson/ma-topo.json: json/ma-mercator.json
	@mkdir -p $(dir $@)
	@geo2topo \
		$< \
		> $@

topojson/ma-simple-topo.json: topojson/ma-topo.json
	@toposimplify -p 1 -f \
		< $< \
		> $@

topojson/ma-quantized-topo.json: topojson/ma-simple-topo.json
	@topoquantize 1e5 \
		< $< \
		> $@

topojson/ma-merged-topo.json: topojson/ma-quantized-topo.json
	@topomerge ma=ma-mercator \
		< $< \
		> $@

topojson/ma-geo.json: topojson/ma-merged-topo.json
	@topo2geo ma=- \
		< $< \
		> $@

svg/ma-mercator.svg: topojson/ma-geo.json
	@mkdir -p $(dir $@)
	@geo2svg -w 960 -h 960 \
		< $< \
		> $@

# Merge topographic tiles.
tif/ma-merged-90m.tif: \
	tif/srtm_22_04.tif \
	tif/srtm_23_04.tif 
	@mkdir -p $(dir $@)
	@gdal_merge.py \
		-o $@ \
		-init "255" \
		tif/srtm_*.tif

# Convert to Mercator
tif/ma-reprojected.tif: tif/ma-merged-90m.tif
	@mkdir -p $(dir $@)
	@gdalwarp \
		-co "TFW=YES" \
		-s_srs "EPSG:4326" \
		-t_srs "EPSG:3857" \
		$< \
		$@

# Crop raster to shape of Massachusetts
tif/ma-cropped.tif: tif/ma-reprojected.tif
	@mkdir -p $(dir $@)
	@gdalwarp \
		-cutline shp/cb_2014_25_tract_500k.shp \
		-crop_to_cutline \
		-dstalpha $< $@

# Shade and color
tif/ma-color-crop.tif: tif/ma-cropped.tif
	@rm -rf tmp && mkdir -p tmp
	@gdaldem \
		hillshade \
		$< tmp/hillshade.tmp.tif \
		-z 5 \
		-az 315 \
		-alt 60 \
		-compute_edges
	@gdal_calc.py \
		-A tmp/hillshade.tmp.tif \
		--outfile=$@ \
		--calc="255*(A>220) + A*(A<=220)"
	@gdal_calc.py \
		-A tmp/hillshade.tmp.tif \
		--outfile=tmp/opacity_crop.tmp.tif \
		--calc="1*(A>220) + (256-A)*(A<=220)"
	@rm -rf tmp

# Convert to .png
ma.png: tif/ma-color-crop.tif
	@convert \
		-resize x960 \
		$< $@

all: svg/ma-mercator.svg \
	ma.png

clean: 
	@rm -rf svg
	@rm -rf json
	@rm -rf tif
	@rm -rf shp
	@rm -rf topojson