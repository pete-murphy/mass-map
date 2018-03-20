.PHONY: all clean

zip/cb_2014_25_tract_500k.zip:
	@mkdir -p $(dir $@)
	@curl \
		"https://www2.census.gov/geo/tiger/GENZ2014/shp/cb_2014_25_tract_500k.zip" \
		-o zip/cb_2014_25_tract_500k.zip

shp/cb_2014_25_tract_500k.shp: zip/cb_2014_25_tract_500k.zip
	@mkdir -p $(dir $@)
	@rm -rf tmp && mkdir tmp
	@unzip \
		-o -d tmp \
		$<
	@cp tmp/* shp

json/ma.json: shp/cb_2014_25_tract_500k.shp
	@mkdir -p $(dir $@)
	@shp2json \
		shp/cb_2014_25_tract_500k.shp \
		-o $@

json/ma-mercator.json: json/ma.json
	@geoproject "d3.geoMercator().fitSize([960, 960], d)" \
		< json/ma.json \
		> json/ma-mercator.json

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

all: svg/ma-mercator.svg

clean: 
	@rm -rf svg
	@rm -rf json
	@rm -rf zip
	@rm -rf shp
	@rm -rf topojson