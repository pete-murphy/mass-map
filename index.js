import { selectAll } from "d3-selection"
import { geoMercator, geoPath } from "d3-geo"
import data from "./knollwood-data/output/safe-output"
import massMap from "./json/ma"
import massRaster from "./ma.png"

const width = 960
const height = 960

const svg = selectAll("svg")
  .attr("width", width)
  .attr("height", height)

const projection = geoMercator().fitSize(
  [width, height],
  massMap
)

const path = geoPath().projection(projection)

svg
  .append("image")
  .attr("id", "Raster")
  .attr("xlink:href", massRaster)
  .attr("class", "raster")
  .attr("width", width)
  .attr("height", height)

// Turns out, I probably would have
// been better off leaving the data
// in CSV format or similar...
svg
  .append("g")
  .selectAll("circle")
  .data(data.features)
  .enter()
  .append("circle")
  .attr(
    "cx",
    ({ geometry: { coordinates } }) =>
      projection(coordinates)[0]
  )
  .attr(
    "cy",
    ({ geometry: { coordinates } }) =>
      projection(coordinates)[1]
  )
  .attr("r", 20)
  .style("fill", "red")
  .style("opacity", "0.25")
