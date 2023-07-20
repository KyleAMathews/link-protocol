// import { Response } from "@remix-run/node"
import { sortBy, sumBy, groupBy } from "lodash"
import opentelemetry from "@opentelemetry/api"
import { stringify } from "csv-stringify/sync"

export const loader = async (props) => {
  const guildId = props.params.guildId
  const tracer = opentelemetry.trace.getTracer(`remix`)
  return tracer.startActiveSpan(`route._index.csv`, async (span) => {
    span.setAttribute(`discord.guildId`, guildId)
    const { turso } = require(`../db.server.ts`)
    const messages = await tracer.startActiveSpan(
      `route._index.csv.query`,
      async (span) => {
        const result = await turso.execute({
          sql: `
  SELECT 
    DATE(datetime(createdTimestamp / 1000, 'unixepoch')) as date,
	links,
	reactions,
  channelId,
  messageId
FROM 
    Message
WHERE
   guildId = ?
ORDER BY 
    date DESC;
`,
          args: [guildId],
        })

        span.end()
        return result
      }
    )
    const parsedMessages = messages.rows.map((message) => {
      const newMessage = {
        ...message,
        links: JSON.parse(message.links),
        reactions: JSON.parse(message.reactions),
      }

      return newMessage
    })
    const links = []
    parsedMessages.forEach((message) => {
      message.links.forEach((link) =>
        links.push({
          link,
          reactions: message.reactions,
          date: message.date,
          channelId: message.channelId,
          messageId: message.messageId,
        })
      )
    })

    // const sortedLinks = sortBy(links, (link) =>
    // sumBy(link.reactions, (reaction) => reaction.count)
    // ).reverse()

    // const result = {
    // links: sortBy(
    // Object.entries(groupBy(sortedLinks, `date`)),
    // ([date]) => date
    // ).reverse(),
    // }
    span.end()

    return new Response(stringify(links, { header: true }), {
      status: 200,
      headers: {
        "Content-Type": `application/csv`,
      },
    })
  })
}
