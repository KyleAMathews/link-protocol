import * as React from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form } from "@remix-run/react";
import { getServers, getOldMessagesForGuild } from "../models/note.server.ts";

// Loaders only run on the server and provide data
// to your component on GET requests
export async function loader() {
  const servers = await getServers();
  return json(servers);
}

// Actions only run on the server and handle POST
// PUT, PATCH, and DELETE. They can also provide data
// to the component
export async function action({ request }: ActionArgs) {
  const form = await request.formData();
  const guildId = form.get(`guildId`);
  const guildName = form.get(`guildName`);
  console.log(`fetching old messages for`, { guildId, guildName });
  getOldMessagesForGuild(guildId);
  // const errors = validate(form);
  // if (errors) {
  // return json({ errors });
  // }
  // await createProject({ title: form.get("title") });
  return json({ guildId });
}

// The default export is the component that will be
// rendered when a route matches the URL. This runs
// both on the server and the client
export default function Projects() {
  const guilds = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  console.log({ guilds, actionData });

  // TODO if loading is happening, loop until it's done.

  return (
    <main className="relative min-h-screen bg-white sm:flex">
      <div className="relative sm:p-8">
        <h1 className="mb-2 text-3xl font-bold">
          Load old messages from new servers
        </h1>
        {guilds.map((guild) => {
          return (
            <div key={guild.id}>
              <Form method="post">
                <h2>{guild.name}</h2>
                <p>{guild.channelsSize}</p>
                <input type="hidden" name="guildId" value={guild.id} />
                <input type="hidden" name="guildName" value={guild.name} />
                <button type="submit">load old messages</button>
              </Form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
