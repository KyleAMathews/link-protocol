const { createClient } = require(`@libsql/client`);

const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Commands,
  Collection,
  SlashCommandBuilder,
} = require(`discord.js`);

let discordClient;
let turso;
const token = process.env.DISCORD_TOKEN;

console.log(process.env.NODE_ENV);

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll have a single connection to the DB.
if (process.env.NODE_ENV === `production`) {
  console.log(`setting up db for prod`);
  global.__db__ = createClient({
    url: process.env.VITE_TURSO_DB_URL,
    authToken: process.env.VITE_TURSO_DB_AUTH_TOKEN,
  });
  // Create a new client instance
  global.__discord__ = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });
} else {
  if (!global.__db__) {
    global.__db__ = createClient({
      url: `file:turso/data.db`,
    });
    // Create a new client instance
    global.__discord__ = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Message, Partials.Channel, Partials.Reaction],
    });
  }
}

discordClient = global.__discord__;
discordClient.login(token);
discordClient.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  require(`../bot/index`);
});

turso = global.__db__;
discordClient = global.__discord__;

export { turso, discordClient };
