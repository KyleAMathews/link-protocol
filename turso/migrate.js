const { turso } = require(`../app/db.server`);
const path = require(`path`);
const fs = require(`fs`);

const migrationSQLStatements = fs
  .readFileSync(
    path.join(__dirname, `./migrations/20230607125529_/migration.sql`),
    `utf-8`
  )
  .split(`\n\n`);

async function main() {
  try {
    for (const statement of migrationSQLStatements) {
      const rs = await turso.execute(statement);
      console.log(rs);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
