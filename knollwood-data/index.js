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

const {
  USER,
  PASS,
  USER_INPUT_SELECTOR,
  PASS_INPUT_SELECTOR,
  CUSTOMER_LIST_LINK_SELECTOR,
  URL
} = require("./config.json")

let clients = []

const clean = compose(
  reduce(
    (acc, x) => ({ ...acc, [x[0]]: x[1] }),
    {}
  ),
  map(map(compose(replace(":", ""), trim)))
)

const showProgress = (dvd, dvr) => {
  const PCT = Math.round(100 * dvd / dvr)
  const COMPLETED = "▇".repeat(PCT)
  const REMAINDER = "░".repeat(100 - PCT)
  console.clear()
  console.log(`${COMPLETED}${REMAINDER} ${PCT}%`)
}

const scrape = async url => {
  const browser = await puppeteer.launch({
    headless: false
  })
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

  return clients
}

scrape(URL).then(console.log)
