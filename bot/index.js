import opentelemetry from "@opentelemetry/api"
const { upsertMessage, deleteMessage } = require(`../bot/dao.ts`)
const path = require(`path`)
const extractUrls = require(`extract-urls`)
const { Events } = require(`discord.js`)

const { discordClient } = require(`../app/db.server.ts`)

console.log(`listening to discord server events`)

discordClient.on([Events.MessageCreate], async (message) => {
  const links = JSON.stringify(extractUrls(message.content))
  if (links) {
    const tracer = opentelemetry.trace.getTracer(`discord`)
    return tracer.startActiveSpan(
      `discord.Events.MessageCreate`,
      async (span) => {
        span.setAttributes({
          "discord.messageId": message.id,
          "discord.guildId": message.guild.id,
          "discord.channelId": message.channel.id,
        })
        console.log(`message created`, message.id, message.content)
        await upsertMessage({
          id: message.id,
          guildId: message.guildId,
          channelId: message.channelId,
          createdTimestamp: message.createdTimestamp,
          editedTimestamp: message.editedTimestamp,
          content: message.content,
          links,
        })
        span.end()
      }
    )
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

  console.log(reaction.message.content)
  const links = extractUrls(reaction.message.content)
  console.log({ links })
  if (links) {
    const tracer = opentelemetry.trace.getTracer(`discord`)
    return tracer.startActiveSpan(
      `discord.Events.MessageReactionAdd`,
      async (span) => {
        console.log(reaction)
        span.setAttribute(`discord.messageId`, reaction.message.id)
        span.setAttribute(`discord.guildId`, reaction.message.guildId)
        span.setAttribute(`discord.channelId`, reaction.message.channelId)
        span.setAttribute(`discord.reaction.emoji`, reaction._emoji.name)

        try {
          const { getSubscribersToNotify } = require(`./dao`)
          const { turso, lmdb } = require(`../app/db.server.ts`)

          // Now the message has been cached and is fully available
          console.log(
            `${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`
          )
          // The reaction is now also fully available and the properties will be reflected accurately:
          console.log(
            `${reaction.count} user(s) have given the same reaction to this message!`
          )

          tracer.startActiveSpan(
            `discord.Events.MessageReactionAdd.sendSubscribersNotifications`,
            async (span) => {
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
            }
          )

          await upsertMessage({
            ...reaction.message,
            links: JSON.stringify(extractUrls(reaction.message.content)),
          })
        } catch (e) {
          span.recordException(e)
          span.setStatus({
            code: opentelemetry.SpanStatusCode.ERROR,
            message: String(e),
          })
        } finally {
          span.end()
        }
      }
    )
  }
})
