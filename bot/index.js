const { upsertMessage } = require(`../bot/dao`);
const path = require(`path`);
const fs = require(`fs`);
const _ = require(`lodash`);
const extractUrls = require(`extract-urls`);
const { Events } = require(`discord.js`);

// discordClient.commands = new Collection();
// const commandsPath = path.join(__dirname, `commands`);
// const commandFiles = fs
// .readdirSync(commandsPath)
// .filter((file) => file.endsWith(`.js`));

// for (const file of commandFiles) {
// const filePath = path.join(commandsPath, file);
// const command = require(filePath);
// // Set a new item in the Collection with the key as the command name and the value as the exported module
// if (`data` in command && `execute` in command) {
// discordClient.commands.set(command.data.name, command);
// } else {
// console.log(
// `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
// );
// }
// }

const { discordClient } = require(`../app/db.server`);

console.log(`listening to discord server events`);

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.discordClient.commands.get(
    interaction.commandName
  );

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: `There was an error while executing this command!`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `There was an error while executing this command!`,
        ephemeral: true,
      });
    }
  }
});

discordClient.on([Events.MessageCreate], async (message) => {
  console.log(`message create`, message);
  const links = JSON.stringify(extractUrls(message.content));
  if (links) {
    const result = await upsertMessage({
      messageId: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      createdTimestamp: message.createdTimestamp,
      editedTimestamp: message.editedTimestamp,
      content: message.content,
      links,
    });

    console.log({ result });
  }
});
discordClient.on([Events.MessageUpdate], async (message) => {
  if (message.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await message.fetch();
    } catch (error) {
      console.error(`Something went wrong when fetching the message:`, error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }
  const fetched = await message.fetch();
  await upsertMessage({
    ...fetched,
    links: JSON.stringify(extractUrls(fetched.content)),
  });
});

discordClient.on(Events.MessageReactionAdd, async (reaction, user) => {
  // When a reaction is received, check if the structure is partial
  if (reaction.partial) {
    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
    try {
      await reaction.fetch();
    } catch (error) {
      console.error(`Something went wrong when fetching the message:`, error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  // Now the message has been cached and is fully available
  console.log(
    `${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`
  );
  // The reaction is now also fully available and the properties will be reflected accurately:
  console.log(
    `${reaction.count} user(s) have given the same reaction to this message!`
  );
  await upsertMessage({
    ...reaction.message,
    links: JSON.stringify(extractUrls(reaction.message.content)),
  });
});
