import * as React from "react";
import type { V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { pick, sortBy, sumBy, groupBy } from "lodash";

export const loader = async () => {
  const prisma = new PrismaClient();
  const messages = await prisma.$queryRaw`
  SELECT 
    DATE(datetime(createdTimestamp / 1000, 'unixepoch')) as date,
	links,
	reactions
FROM 
    Message
WHERE
   guildId = "1113425260562366577"
ORDER BY 
    date;
`;
  // const messages = await prisma.message.findMany({
  // select: {
  // links,
  // reactions,
  // `DATE(datetime(createdTimestamp / 1000, 'unixepoch')) as date,`
  // },
  // where: {
  // guildId: `1113425260562366577`,
  // },
  // });
  const parsedMessages = messages.map((message) => {
    message.links = JSON.parse(message.links);
    message.reactions = JSON.parse(message.reactions);

    return message;
  });
  const links = [];
  parsedMessages.forEach((message) => {
    message.links.forEach((link) =>
      links.push({ link, reactions: message.reactions, date: message.date })
    );
  });

  const sortedLinks = sortBy(links, (link) =>
    sumBy(link.reactions, (reaction) => reaction.count)
  ).reverse();
  console.log(sortedLinks);
  return json({
    links: sortBy(
      Object.entries(groupBy(sortedLinks, `date`)),
      ([date]) => date
    ).reverse(),
  });
};

export const meta: V2_MetaFunction = () => [{ title: `Latest links` }];

export default function Index() {
  const data = useLoaderData<typeof loader>();
  console.log(data);
  return (
    <main className="relative min-h-screen bg-white sm:flex">
      <div className="relative sm:p-8">
        <h1 className="mb-2 text-3xl font-bold">Links</h1>
        {data.links.map(([date, links]) => {
          return (
            <div className="mb-3">
              <h2 className="mb-2 text-xl">{date}</h2>

              {links.map((link) => (
                <div>
                  - {link.link}
                  {` `}
                  {link.reactions?.map((reaction) => (
                    <span>
                      {reaction.name} {reaction.count}
                      {`, `}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}
