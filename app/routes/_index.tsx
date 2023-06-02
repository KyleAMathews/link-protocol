import * as React from "react";
import type { V2_MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { pick, sortBy, sumBy } from "lodash";

export const loader = async () => {
  const prisma = new PrismaClient();
  const messages = await prisma.message.findMany({
    where: {
      guildId: `1113425260562366577`,
    },
  });
  console.log({ messages });
  const picked = messages.map((message) => {
    const picked = pick(message, [`links`, `reactions`]);
    picked.links = JSON.parse(picked.links);
    picked.reactions = JSON.parse(picked.reactions);

    return picked;
  });
  const links = [];
  picked.forEach((message) => {
    message.links.forEach((link) =>
      links.push({ link, reactions: message.reactions })
    );
  });
  return json({
    links: sortBy(links, (link) =>
      sumBy(link.reactions, (reaction) => reaction.count)
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
        <h1 className="mb-2 text-2xl">Links</h1>
        {data.links.map((link) => {
          return (
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
          );
        })}
      </div>
    </main>
  );
}
