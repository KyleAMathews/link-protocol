import * as React from "react"
import type { V2_MetaFunction } from "@remix-run/node"
import { json } from "@remix-run/node"
import { Link } from "@remix-run/react"
import { useLoaderData, useParams } from "@remix-run/react"
import { sortBy, sumBy, groupBy } from "lodash"
import opentelemetry from "@opentelemetry/api"

// Kyle's test server.
// const guildId = `1113425261128593550`;
// SOP
// const guildId = `1082444651946049567`

export const loader = async (props) => {
  const guildId = props.params.guildId
  const tracer = opentelemetry.trace.getTracer(`remix`)
  return tracer.startActiveSpan(`route._index.loader`, async (span) => {
    span.setAttribute(`discord.guildId`, guildId)
    const { turso } = require(`../db.server.ts`)
    const messages = await tracer.startActiveSpan(
      `route._index.loader.query`,
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

    const sortedLinks = sortBy(links, (link) =>
      sumBy(link.reactions, (reaction) => reaction.count)
    ).reverse()
    const result = {
      links: sortBy(
        Object.entries(groupBy(sortedLinks, `date`)),
        ([date]) => date
      ).reverse(),
    }
    span.end()

    return json(result)
  })
}

export const meta: V2_MetaFunction = () => [{ title: `Latest links` }]

export default function Links() {
  const { guildId } = useParams()
  const data = useLoaderData<typeof loader>()
  return (
    <main className="relative min-h-screen bg-white sm:flex">
      <div className="relative sm:p-8">
        <h1 className="mb-2 text-3xl font-bold">Links</h1>
        {data.links.map(([date, links]) => {
          return (
            <div className="mb-3">
              <h2 className="mb-2 text-xl">{date}</h2>

              {links.map((link) => {
                return (
                  <div>
                    -{` `}
                    <a
                      className="underline decoration-gray-400 decoration-dotted"
                      href={link.link}
                    >
                      {link.link}
                    </a>
                    {` `}
                    {link.reactions?.map((reaction) => (
                      <span>
                        {reaction.name} {reaction.count}
                        {`, `}
                      </span>
                    ))}
                    <span>
                      <a
                        className="text-blue-500 underline"
                        href={`https://discordapp.com/channels/${guildId}/${link.channelId}/${link.messageId}`}
                      >
                        discord link
                      </a>
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </main>
  )
}
