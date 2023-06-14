const { createClient } = require(`@libsql/client`)

const { Client, Events, GatewayIntentBits, Partials } = require(`discord.js`)
const { open } = require(`lmdb`)
const { HoneycombSDK } = require(`@honeycombio/opentelemetry-node`)
const {
  getNodeAutoInstrumentations,
} = require(`@opentelemetry/auto-instrumentations-node`)

let discordClient
let turso
let lmdb
let sdk

console.log(process.env.NODE_ENV)

function setLocalsFromGlobals() {
  turso = global.__sql__
  lmdb = global.__lmdb__
  discordClient = global.__discord__
  sdk = global.__sdk__
}

if (!global.__sql__) {
  if (process.env.NODE_ENV === `production`) {
    global.__sql__ = createClient({
      url: process.env.VITE_TURSO_DB_URL,
      authToken: process.env.VITE_TURSO_DB_AUTH_TOKEN,
    })
  } else {
    global.__sql__ = createClient({
      url: `file:turso/data.db`,
    })
  }
  global.__lmdb__ = open({ path: `lmdb.db`, compression: true })
  // Create a new client instance
  global.__discord__ = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  })

  discordClient = global.__discord__
  discordClient.login(process.env.DISCORD_TOKEN)
  discordClient.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`)
    require(`../bot/index.js`)
    require(`../bot/commands.js`)
  })

  // uses HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
  global.__sdk__ = new HoneycombSDK()

  global.__sdk__.start()
}

setLocalsFromGlobals()

module.exports = { turso, discordClient, lmdb, sdk }
