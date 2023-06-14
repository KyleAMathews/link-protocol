const opentelemetry = require(`@opentelemetry/api`)
const fs = require(`node:fs`)
const { Events, Collection } = require(`discord.js`)
const { discordClient } = require(`../app/db.server.ts`)
const path = require(`node:path`)

const tracer = opentelemetry.trace.getTracer(`discord`)
tracer.startActiveSpan(`discord.loadCommands`, async (span) => {
  try {
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
  } catch (e) {
    span.recordException(e)
    span.setStatus({
      code: opentelemetry.SpanStatusCode.ERROR,
      message: String(e),
    })
    throw e
  } finally {
    span.end()
  }
})

discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  tracer.startActiveSpan(`discord.InteractionCreate`, async (span) => {
    const command = discordClient.commands.get(interaction.commandName)
    span.setAttribute(
      `discord.InteractionCreate.commandName`,
      interaction.commandName
    )
    span.setAttribute(`discord.userId`, interaction.user.id)
    span.setAttribute(`discord.guildId`, interaction.member.guild.id)

    console.log(`got interaction command`, interaction.commandName)
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (error) {
      span.recordException(error)
      span.setStatus({
        code: opentelemetry.SpanStatusCode.ERROR,
        message: String(error),
      })
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
    } finally {
      span.end()
    }
  })
})
