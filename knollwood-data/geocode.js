const {
  compose,
  lensPath,
  head,
  map,
  prop,
  reduce,
  replace,
  trim,
  view
} = require("ramda")
const request = require("request-fluture")
const {
  of: success,
  encase,
  rejectAfter,
  reject,
  parallel
} = require("fluture")
const fs = require("fs")
const path = require("path")

// It'd be nice to have multiple passes, in which case
// on the second pass we'd only attempt the failed
// cases, and then write the second batch of failed cases
// to a temp file and overwrite to the original failed
// file when all have been processed, to continue
// with the passes until some base case is reached.
// Sounds like it could be done recursively and maybe all
// of this could be held in memory. TODO another day.
const clients = require("./output/results")

// from .env included then exported via Makefile
const { GOOGLE_MAPS_API_KEY } = process.env

const id = x => x

const url = apiKey => address =>
  `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}&address=${encodeURI(
    address
  )}`

// geocode :: APIKey => ClientRecord => Coordinates :: Object
const geocode = apiKey => ({
  "Facility Street 1": streetAddress,
  "Facility City": town,
  "Facility Zip Code": zip
}) =>
  request(
    url(apiKey)(
      `${streetAddress}, ${town}, ${zip}`
    )
  )
    .map(({ body }) => body)
    .chain(encase(JSON.parse))
    .map(
      view(
        lensPath([
          "results",
          0,
          "geometry",
          "location"
        ])
      )
    )

// Path is created in Makefile with
// mkdir -p knollwood-data/output
const outputPath = path.join(
  __dirname,
  "./output"
)

const appendTo = filename => results =>
  fs.appendFile(
    path.join(outputPath, filename),
    JSON.stringify(results).concat("\n"),
    "utf8",
    error =>
      error
        ? console.error(error)
        : "Success writing to file"
  )

clients.map(client =>
  geocode(GOOGLE_MAPS_API_KEY)(client)
    .chain(x => (!!x ? success(x) : reject(x)))
    .map(response => ({
      ...client,
      Location: response
    }))
    .mapRej(() => ({
      ...client,
      Location: "Not processed"
    }))
    .fork(
      // These are going to be new-line delimited JSON
      appendTo(
        "./geocoded-results-failure.ndjson"
      ),
      appendTo(
        "./geocoded-results-success.ndjson"
      )
    )
)
