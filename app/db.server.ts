import { PrismaClient } from "@prisma/client";
const {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Commands,
  Collection,
  SlashCommandBuilder,
} = require(`discord.js`);

let prisma: PrismaClient;
let discordClient;
const token = process.env.DISCORD_TOKEN;

declare global {
  var __db__: PrismaClient | undefined;
  var __discord__: Client | undefined;
}

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// In production, we'll have a single connection to the DB.
if (process.env.NODE_ENV === `production`) {
  prisma = new PrismaClient();
  // Create discord client & return promise that resolves with it once it's ready.
  // Create a new client instance
  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
  });
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
    // Create a new client instance
    global.__discord__ = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });
    discordClient = global.__discord__;
    discordClient.login(token);
    discordClient.once(Events.ClientReady, async (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);
    });
  }

  prisma = global.__db__;
  prisma.$connect();
  discordClient = global.__discord__;
}

export { prisma, discordClient };
