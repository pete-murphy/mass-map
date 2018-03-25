// This is the puppeteer script, notable issue(s):
// CANNOT CANCEL THESE PROMISES ONCE THEY KICK OFF,
// instead have to wait for them to time out :(
// TODO: write these using Futures
const puppeteer = require("puppeteer")
const {
  compose,
  last,
  head,
  map,
  reduce,
  replace,
  trim
} = require("ramda")
const fs = require("fs")
const path = require("path")
const readline = require("readline")

const {
  USER,
  PASS,
  USER_INPUT_SELECTOR,
  PASS_INPUT_SELECTOR,
  CUSTOMER_LIST_LINK_SELECTOR,
  URL
} = require("./config.json")

// from .env included then exported via Makefile
const { GOOGLE_MAPS_API_KEY } = process.env

let clients = []

const id = x => x
const clean = compose(
  reduce(
    (acc, x) => ({ ...acc, [x[0]]: x[1] }),
    {}
  ),
  map(
    map(
      compose(
        // Bad data
        replace("Monomessatt", "Monomessat"),
        replace(
          "3.5 Mary Ann Drive Garage South",
          "12 Mary Ann Drive"
        ),
        // Cleaning up formatting
        replace(":", ""),
        trim
      )
    )
  )
)

// Haven't tested this yet
const showProgress = (dvd, dvr) => {
  const PCT = Math.round(100 * dvd / dvr)
  const COMPLETED = "█".repeat(PCT)
  const REMAINDER = "░".repeat(100 - PCT)
  readline.cursorTo(process.stdout, 0, 0)
  process.stdout.write(
    `${COMPLETED}${REMAINDER} ${PCT}%\nScraping in progress...\n`
  )
}

const scrape = async url => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto(url)
  await page.waitForSelector(USER_INPUT_SELECTOR)
  await page.click(USER_INPUT_SELECTOR)
  await page.keyboard.type(USER)

  await page.click(PASS_INPUT_SELECTOR)
  await page.keyboard.type(PASS)

  await page.keyboard.press("Enter")

  await page.waitFor(2000)

  const frame = await last(page.frames())
  await frame.click(CUSTOMER_LIST_LINK_SELECTOR)

  await page.waitFor(2000)
  const customerDetailURLs = await frame.$$eval(
    "td:first-of-type a[href^='./cust']",
    xs => Array.from(xs).map(x => x.href)
  )

  const secondPage = await browser.newPage()
  for (let url in customerDetailURLs) {
    showProgress(url, customerDetailURLs.length)
    await secondPage.goto(customerDetailURLs[url])
    await secondPage.waitForSelector("tbody")
    const client = await secondPage.$$eval(
      "tr",
      rows =>
        Array.from(rows).map(row =>
          Array.from(
            row.querySelectorAll("td")
          ).map(cell => cell.textContent)
        )
    )
    clients.push(clean(client))
  }

  browser.close()
  return clients
}

// Path is created in Makefile with
// mkdir -p knollwood-data/output
const output = path.join(__dirname, "./output")

scrape(URL)
  .then(results =>
    fs.writeFile(
      path.join(output, "./results.json"),
      JSON.stringify(results, null, 2),
      "utf8",
      error =>
        error
          ? console.error(error)
          : "Output successfully written\n"
    )
  )
  .then(() =>
    console.log("Clients successfully scraped\n")
  )
  .catch(console.error)
