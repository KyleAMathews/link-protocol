const { createClient } = require(`@libsql/client`)

const { Client, Events, GatewayIntentBits, Partials } = require(`discord.js`)
const { open } = require(`lmdb`)

let discordClient
let turso
let lmdb
const token = process.env.DISCORD_TOKEN

console.log(process.env.NODE_ENV)

function setLocalsFromGlobals() {
  turso = global.__sql__
  lmdb = global.__lmdb__
  discordClient = global.__discord__
}

function login() {
  discordClient = global.__discord__
  discordClient.login(token)
  discordClient.once(Events.ClientReady, async (c) => {
    console.log(`Ready! Logged in as ${c.user.tag}`)
    require(`../bot/index.js`)
    require(`../bot/commands.js`)
  })

  setLocalsFromGlobals()
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll have a single connection to the DB.
if (process.env.NODE_ENV === `production`) {
  const loggedIn = !!global.__sql__
  if (!global.__sql__) {
    global.__sql__ = createClient({
      url: process.env.VITE_TURSO_DB_URL,
      authToken: process.env.VITE_TURSO_DB_AUTH_TOKEN,
    })
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

    login()
  }

  setLocalsFromGlobals()
} else {
  if (!global.__sql__) {
    global.__sql__ = createClient({
      url: `file:turso/data.db`,
    })
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

    login()
  }
}

module.exports = { turso, discordClient, lmdb }
