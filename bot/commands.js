const fs = require(`node:fs`)
const { Events, Collection } = require(`discord.js`)
const { discordClient } = require(`../app/db.server`)
const path = require(`node:path`)

discordClient.commands = new Collection()
const foldersPath = path.join(__dirname, `../bot/commands`)
const commandFolders = fs.readdirSync(foldersPath)

for (const folder of commandFolders) {
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(foldersPath, folder)
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(`.js`) || file.endsWith(`.ts`))
  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file)
    const command = require(filePath)
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if (`data` in command && `execute` in command) {
      console.log(`loading command "${command.data.name}" from`, filePath)
      discordClient.commands.set(command.data.name, command)
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      )
    }
  }
}

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const command = discordClient.commands.get(interaction.commandName)

  console.log(`got interaction command`, interaction.commandName)
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: `There was an error while executing this command!`,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content: `There was an error while executing this command!`,
        ephemeral: true,
      })
    }
  }
})