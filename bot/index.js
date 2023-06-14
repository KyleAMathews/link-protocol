const { upsertMessage, deleteMessage } = require(`../bot/dao.ts`)
const path = require(`path`)
const extractUrls = require(`extract-urls`)
const { Events } = require(`discord.js`)

const { discordClient } = require(`../app/db.server.ts`)

console.log(`listening to discord server events`)

discordClient.on([Events.MessageCreate], async (message) => {
  const links = JSON.stringify(extractUrls(message.content))
  if (links) {
    console.log(`message created`, message.id, message.content)
    const result = await upsertMessage({
      id: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      createdTimestamp: message.createdTimestamp,
      editedTimestamp: message.editedTimestamp,
      content: message.content,
      links,
    })
  }
})
discordClient.on([Events.MessageUpdate], async (message) => {
  console.log(`message updated`, message.content)
  if (message.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await message.fetch()
    } catch (error) {
      console.error(`Something went wrong when fetching the message:`, error)
      // Return as `reaction.message.author` may be undefined/null
      return
    }
  }
  const fetched = await message.fetch()
  await upsertMessage({
    ...fetched,
    links: JSON.stringify(extractUrls(fetched.content)),
  })
})

discordClient.on([Events.MessageDelete], async (message) => {
  console.log(`message deleted`, message.id, message.content)
  deleteMessage(message.id)
})

discordClient.on(Events.MessageReactionAdd, async (reaction, user) => {
  const { getSubscribersToNotify } = require(`./dao`)
  console.log({ getSubscribersToNotify })
  const { turso, lmdb } = require(`../app/db.server.ts`)

  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await reaction.fetch()
    } catch (error) {
      console.error(`Something went wrong when fetching the message:`, error)
      // Return as `reaction.message.author` may be undefined/null
      return
    }
  }

  // Now the message has been cached and is fully available
  console.log(
    `${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`
  )
  // The reaction is now also fully available and the properties will be reflected accurately:
  console.log(
    `${reaction.count} user(s) have given the same reaction to this message!`
  )

  const subscribers = await getSubscribersToNotify({
    category: reaction._emoji.name,
    guildId: reaction.message.guild.id,
    messageId: reaction.message.id,
    sql: turso,
    lmdb,
  })
  console.log({ subscribers })
  subscribers.forEach((id) => {
    discordClient.users.send(
      id,
      `A new link was added to a category (${
        reaction._emoji.name
      }) you have subscribed to:
       
      - message: ${`https://discordapp.com/channels/${reaction.message.guild.id}/${reaction.message.channel.id}/${reaction.message.id}`}
      - link: ${extractUrls(reaction.message.content)}

    `
    )
  })

  await upsertMessage({
    ...reaction.message,
    links: JSON.stringify(extractUrls(reaction.message.content)),
  })
})
