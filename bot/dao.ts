let linkSavedCount
async function processMessages(messages) {
  if (!global.__linkSavedCount) {
    global.__linkSavedCount = 0
  }

  linkSavedCount = global.__linkSavedCount
  const extractUrls = require(`extract-urls`)
  messages.forEach(async (message) => {
    const links = JSON.stringify(extractUrls(message.content))
    if (links) {
      const messageObj = {
        ...message,
        links,
      }

      await upsertMessage(messageObj)

      linkSavedCount += 1
      if (linkSavedCount % 10 === 0) {
        console.log(
          `saved link to sql for`,
          message.channel?.name,
          `total links`,
          linkSavedCount
        )
      }
    }
  })
}

//  Batch retrieve all messages from a given channel
async function getAllChannelMessages(channel) {
  const batchSize = 100 // Discord won't give us any more
  let earliestMessageID = null
  try {
    let moreMessagesExist = (await channel.messages.fetch({ limit: 1 })).size
    while (moreMessagesExist) {
      // While the channel has at least one result
      const data = await channel.messages.fetch({
        limit: batchSize,
        before: earliestMessageID,
      })
      earliestMessageID = data.last().id
      await processMessages(data)
      moreMessagesExist = (
        await channel.messages.fetch({ limit: 1, before: earliestMessageID })
      ).size
    }
  } catch (err) {
    if (err.name !== `DiscordAPIError[50001]`) {
      console.error(
        `Error occurred while extracting messages from #${channel.name}: ${err}`
      )
      console.log({ name: err.name })
    }
  }
}

exports.getServers = async () => {
  const { discordClient } = require(`../app/db.server.ts`)
  return discordClient.guilds.cache.map((guild) => {
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      channelsSize: guild.channels.cache.size,
    }
  })
}

exports.getOldMessagesForGuild = async (guildId) => {
  const { discordClient } = require(`../app/db.server.ts`)
  for (const channel of discordClient.channels.cache.values()) {
    // Filter to Text channels.
    if (channel.guild.id === guildId) {
      if (
        typeof channel.lastMessageId !== `undefined` &&
        channel.lastMessageId !== null &&
        typeof channel.bitrate === `undefined`
      ) {
        await getAllChannelMessages(channel)
      } else {
        // console.log(`bad channel`, channel.id);
      }
    }
  }
}

const deleteMessage = async (messageId) => {
  const { turso } = require(`../app/db.server.ts`)
  try {
    await turso.execute({
      sql: `DELETE FROM Message WHERE messageId = ?;`,
      args: [messageId],
    })
  } catch (e) {
    console.log(e)
    // Ignore if the row doesn't exist.
  }
}
exports.deleteMessage = deleteMessage

exports.upsertMessage = async (message) => {
  const { turso } = require(`../app/db.server.ts`)
  let result
  try {
    if (message.links && message.links.length > 0) {
      const reactions =
        JSON.stringify(
          message.reactions?.cache.map((reaction) => {
            return { name: reaction._emoji.name, count: reaction.count }
          })
        ) || `[]`

      result = await turso.execute({
        sql: `INSERT INTO
Message (messageId, channelId, guildId, content, createdTimestamp, editedTimestamp, links, reactions)
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
      })
    } else {
      deleteMessage(message.id)
    }
  } catch (e) {
    console.log(e)
    result = e
  }

  return result
}

exports.createSubscriptions = async ({ categories, userId, guildId, sql }) => {
  // Delete any existing subscriptions for the user first.
  await sql.execute({
    sql: `DELETE FROM Subscription where userId = ?`,
    args: [userId],
  })

  for (const category of categories) {
    await sql.execute({
      sql: `INSERT INTO
    Subscription (category, userId, guildId, createdTimestamp)
    VALUES (?, ?, ?, ?)`,
      args: [category, userId, guildId, new Date().getTime()],
    })
  }
}

exports.getSubscriptionsForUser = async ({ userId, guildId, sql }) => {
  const res = await sql.execute({
    sql: `SELECT category FROM
    Subscription 
    WHERE
      userId = ? AND
      guildId = ?`,
    args: [userId, guildId],
  })

  return res.rows.map((row) => row.category)
}

const getSubscribersForCategory = async ({ category, guildId, sql }) => {
  const res = await sql.execute({
    sql: `SELECT userId FROM
    Subscription 
    WHERE
      category = ? AND
      guildId = ?`,
    args: [category, guildId],
  })

  return res.rows.map((row) => row.userId)
}

exports.getSubscribersToNotify = async ({
  category,
  guildId,
  messageId,
  sql,
  lmdb,
}) => {
  const key = `notificationsSent::${category}::${messageId}`
  const sentAlready = lmdb.get(key) || false
  await lmdb.put(key, true)
  console.log({ key, sentAlready })
  if (!sentAlready) {
    const subscribers = await getSubscribersForCategory({
      category,
      guildId,
      sql,
    })
    return subscribers
  } else {
    return []
  }
}
