import { beforeAll, assert, expect, test } from "vitest"
import {
  createSubscriptions,
  getSubscriptionsForUser,
  getSubscribersToNotify,
} from "./dao"
import { open } from "lmdb"
const { createClient } = require(`@libsql/client`)
const fs = require(`fs-extra`)
const path = require(`path`)
const os = require(`os`)

let sql
let lmdb
beforeAll(async () => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), `foo-`))
  const pathTosql = path.join(folder, `data.db`)
  const config = {
    url: `file:${pathTosql}`,
  }
  sql = createClient(config)
  lmdb = open({ path: path.join(folder, `lmdb.db`), compression: true })
  const migrationSQLStatements = fs
    .readFileSync(
      path.join(__dirname, `../turso/migrations/subscriptions.sql`),
      `utf-8`
    )
    .split(`\n\n`)

  for (const statement of migrationSQLStatements) {
    await sql.execute(statement)
  }
})

test(`createSubscriptions`, async () => {
  await createSubscriptions({
    categories: [`🕸`],
    userId: `123`,
    guildId: `123`,
    sql,
  })

  const categories = await getSubscriptionsForUser({
    userId: `123`,
    guildId: `123`,
    sql,
  })

  expect(categories).toHaveLength(1)
  expect(categories[0]).toEqual(`🕸`)
})

test(`createSubscriptions deletes now unpicked categories`, async () => {
  await createSubscriptions({
    categories: [`🕯️`],
    userId: `123`,
    guildId: `123`,
    sql,
  })

  const categories = await getSubscriptionsForUser({
    userId: `123`,
    guildId: `123`,
    sql,
  })

  // console.log({ res, rows: res.rows })
  expect(categories).toHaveLength(1)
  expect(categories[0]).toEqual(`🕯️`)
})

test(`getSubscribersToNotify`, async () => {
  const subscribers = await getSubscribersToNotify({
    category: `🕯️`,
    guildId: `123`,
    sql,
    lmdb,
  })
  expect(subscribers).toHaveLength(1)

  const subscribers2 = await getSubscribersToNotify({
    category: `🕯️`,
    guildId: `123`,
    sql,
    lmdb,
  })

  expect(subscribers2).toHaveLength(0)
})

test(`createSubscriptions handles empty categories array`, async () => {
  await createSubscriptions({
    categories: [],
    userId: `123`,
    guildId: `123`,
    sql,
  })

  const categories = await getSubscriptionsForUser({
    userId: `123`,
    guildId: `123`,
    sql,
  })

  // console.log({ res, rows: res.rows })
  expect(categories).toHaveLength(0)
})
