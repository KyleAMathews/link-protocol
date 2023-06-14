import got from "got"
import cheerio from "cheerio"

async function main () {
  const html = await got(`https://www.nature.com/articles/s41586-023-06137-x`).text()
  const $ = cheerio.load(html)
  console.log($(`title`).first().text())
}

main()
