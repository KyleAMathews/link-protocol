let linkSavedCount;
async function processMessages(messages) {
  if (!global.__linkSavedCount) {
    global.__linkSavedCount = 0;
  }

  linkSavedCount = global.__linkSavedCount;
  const extractUrls = require(`extract-urls`);
  messages.forEach(async (message) => {
    const links = JSON.stringify(extractUrls(message.content));
    if (links) {
      const messageObj = {
        ...message,
        links,
      };

      await upsertMessage(messageObj);

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
  let earliestMessageID = null;
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
}

export async function getServers() {
  const { discordClient } = require(`~/db.server`);
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
  const { discordClient } = require(`~/db.server`);
  for (const channel of discordClient.channels.cache.values()) {
    // Filter to Text channels.
    if (channel.guild.id === guildId) {
      if (
        typeof channel.lastMessageId !== `undefined` &&
        channel.lastMessageId !== null &&
        typeof channel.bitrate === `undefined`
      ) {
        await getAllChannelMessages(channel);
      } else {
        // console.log(`bad channel`, channel.id);
      }
    }
  }
}

export async function deleteMessage(messageId) {
  const { turso } = require(`~/db.server`);
  try {
    await turso.execute({
      sql: `DELETE FROM Message WHERE messageId = ?;`,
      args: [messageId],
    });
  } catch (e) {
    console.log(e);
    // Ignore if the row doesn't exist.
  }
}

export async function upsertMessage(message) {
  const { turso } = require(`~/db.server`);
  let result;
  try {
    if (message.links && message.links.length > 0) {
      const reactions =
        JSON.stringify(
          message.reactions?.cache.map((reaction) => {
            return { name: reaction._emoji.name, count: reaction.count };
          })
        ) || `[]`;

      result = await turso.execute({
        sql: `INSERT INTO Message (messageId, channelId, guildId, content, createdTimestamp, editedTimestamp, links, reactions)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (messageId) DO UPDATE SET
    channelId = excluded.channelId,
    guildId = excluded.guildId,
    content = excluded.content,
    createdTimestamp = excluded.createdTimestamp,
    editedTimestamp = excluded.editedTimestamp,
    links = excluded.links,
    reactions = excluded.reactions;`,
        args: [
          message.id,
          message.channelId,
          message.guildId,
          message.content,
          message.createdTimestamp,
          message.editedTimestamp,
          message.links,
          reactions,
        ],
      });
    } else {
      deleteMessage(message.id);
    }
  } catch (e) {
    console.log(e);
    result = e;
  }

  return result;
}
