// Require the necessary discord.js classes
import { prisma, discordClient } from "~/db.server";
const extractUrls = require(`extract-urls`);

// console.log(`bot.ts`, { token });
let linkSavedCount = 0;
async function processMessages(messages) {
  messages.forEach(async (message) => {
    const links = JSON.stringify(extractUrls(message.content));
    if (links) {
      const reactions = JSON.stringify(
        message.reactions.cache.map((reaction) => {
          return { name: reaction._emoji.name, count: reaction.count };
        })
      );
      await prisma.message.upsert({
        where: {
          messageId: message.id,
        },
        create: {
          messageId: message.id,
          guildId: message.guildId,
          channelId: message.channelId,
          createdTimestamp: message.createdTimestamp,
          editedTimestamp: message.editedTimestamp,
          content: message.content,
          links,
          reactions,
        },
        update: {
          messageId: message.id,
          guildId: message.guildId,
          channelId: message.channelId,
          createdTimestamp: message.createdTimestamp,
          editedTimestamp: message.editedTimestamp,
          content: message.content,
          links,
          reactions,
        },
      });
      linkSavedCount += 1;
      if (linkSavedCount % 10 === 0) {
        console.log(
          `saved link to db for`,
          message.channel?.name,
          `total links`,
          linkSavedCount
        );
      }
    }
  });
}

//  Batch retrieve all messages from a given channel
async function getAllChannelMessages(channel) {
  const batchSize = 100; // Discord won't give us any more
  // const updateInterval = 10; // Edit progress update message every N batches
  let earliestMessageID = null;
  // let allMessages = new Map();
  // progressEmbed.setCurrentlyFetchingChannel(channel.name);
  // await progressEmbed.updateProgress(
  // channel.id,
  // channel.name,
  // allMessages.size
  // );
  try {
    let moreMessagesExist = (await channel.messages.fetch({ limit: 1 })).size;
    while (moreMessagesExist) {
      // While the channel has at least one result
      const data = await channel.messages.fetch({
        limit: batchSize,
        before: earliestMessageID,
      });
      earliestMessageID = data.last().id;
      await processMessages(data);
      // allMessages = new Map([...allMessages, ...data]);
      // if (allMessages.size % (batchSize * updateInterval) === 0) {
      // await progressEmbed.updateProgress(
      // channel.id,
      // channel.name,
      // allMessages.size
      // );
      // }
      // console.log(`allMessages`, allMessages.size)
      // moreMessagesExist = false;
      moreMessagesExist = (
        await channel.messages.fetch({ limit: 1, before: earliestMessageID })
      ).size;
    }
  } catch (err) {
    if (err.name !== `DiscordAPIError[50001]`) {
      console.error(
        `Error occurred while extracting messages from #${channel.name}: ${err}`
      );
      console.log({ name: err.name });
    }
  }
  // await progressEmbed.updateProgress(
  // channel.id,
  // channel.name,
  // allMessages.size
  // );
  // return allMessages;
}

export async function getServers() {
  return discordClient.guilds.cache.map((guild) => {
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      channelsSize: guild.channels.cache.size,
    };
  });
}

export async function getOldMessagesForGuild(guildId) {
  let channelFoundCount = 0;
  for (const channel of discordClient.channels.cache.values()) {
    // Filter to Text channels.
    if (channel.guild.id === guildId) {
      // const { guild, permissionOverwrites, messages, threads, ...other } =
      // channel;
      // console.log(other);
      if (
        typeof channel.lastMessageId !== `undefined` &&
        channel.lastMessageId !== null &&
        typeof channel.bitrate === `undefined`
      ) {
        // console.log(
        // `good channel`,
        // channel.id,
        // channel.name,
        // channel.messageCount
        // );
        channelFoundCount += 1;
        // if (channelFoundCount > 10) {
        // return;
        // }
        await getAllChannelMessages(channel);
      } else {
        // console.log(`bad channel`, channel.id);
      }
    }
  }
}

// client.once(Events.ClientReady, async (c) => {
// deferred.resolve();
// console.log(`Ready! Logged in as ${c.user.tag}`);
// // console.log(client.channels.cache);
// });
// client.login(token);
