import { selectAll } from "d3-selection"
import { geoMercator, geoPath } from "d3-geo"
import data from "./knollwood-data/output/safe-output"
import massMap from "./json/ma"

const width = 920
const height = 920

const svg = selectAll("svg")
  .attr("width", width)
  .attr("height", height)

const projection = geoMercator().fitSize(
  [width, height],
  massMap
)

const path = geoPath().projection(projection)

svg
  .append("path")
  .attr("d", path(massMap))
  .style("fill", "red")
  .style("opacity", "0.2")

svg.append("path").attr("d", path(data))
