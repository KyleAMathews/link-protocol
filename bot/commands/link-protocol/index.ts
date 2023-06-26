const opentelemetry = require(`@opentelemetry/api`)
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require(`discord.js`)
const arrayToSentence = require(`array-to-sentence`)
const { createSubscriptions, getSubscriptionsForUser } = require(`../../dao.ts`)

const tracer = opentelemetry.trace.getTracer(`discord`)

const categories = [
  {
    emoji: `SoP`,
    display: `☀️`,
    label: `Organizational Protocols`,
  },
  {
    emoji: `deathmemory`,
    display: `🕯️`,
    label: `Death Memory`,
  },
  {
    emoji: `creditprotocols`,
    display: `🕸️`,
    label: `Credit Protocols`,
  },
  {
    emoji: `techstandards`,
    display: `🔧`,
    label: `Tech Standards`,
  },
  {
    emoji: `unconsciousprotocols`,
    display: `🧠`,
    label: `Unconscious Protocols`,
  },
  {
    emoji: `builtenvironment`,
    display: `🏙️`,
    label: `Built Environment`,
  },
]

module.exports = {
  data: new SlashCommandBuilder()
    .setName(`link-protocol`)
    .setDescription(`Get info about the link protocol bot!`)
    // .addSubcommand(
    // (subcommand) =>
    // subcommand.setName(`help`).setDescription(`get help using the bot`)
    // // .addUserOption((option) =>
    // // option.setName(`target`).setDescription(`The user`)
    // // )
    // )
    .addSubcommand((subcommand) =>
      subcommand
        .setName(`manage-subscriptions`)
        .setDescription(
          `Subscribe to updates for people adding categories to shared links.`
        )
    ),
  async execute(interaction) {
    const { turso } = require(`../../../app/db.server.ts`)
    if (interaction.options._subcommand === `manage-subscriptions`) {
      await tracer.startActiveSpan(
        `discord.InteractionCreate.link-protocol.manage-subscriptions`,
        async (span) => {
          try {
            const subscriptions = await getSubscriptionsForUser({
              userId: interaction.user.id,
              guildId: interaction.guild.id,
              sql: turso,
            })
            const select = new StringSelectMenuBuilder()
              .setCustomId(`category subscription`)
              .setPlaceholder(
                `Hey ${interaction.user.username}, choose your subscriptions`
              )
              .addOptions(
                categories.map((category) =>
                  new StringSelectMenuOptionBuilder()
                    .setLabel(`${category.display} ${category.label}`)
                    .setValue(category.emoji)
                    .setDefault(subscriptions.includes(category.emoji))
                )
              )
              .setMinValues(0)
              .setMaxValues(categories.length)

            const row = new ActionRowBuilder().addComponents(select)

            const response = await interaction.reply({
              content: `Choose your starter!`,
              components: [row],
            })

            const collectorFilter = (i) => i.user.id === interaction.user.id

            try {
              const confirmation = await response.awaitMessageComponent({
                filter: collectorFilter,
                time: 60000,
              })
              await createSubscriptions({
                categories: confirmation.values,
                userId: confirmation.user.id,
                guildId: confirmation.guild.id,
                sql: turso,
              })
              if (confirmation.values.length > 0) {
                await confirmation.update({
                  content: `Thanks ${
                    confirmation.user.username
                  }! You're now subscribed to the ${arrayToSentence(
                    confirmation.values
                  )} ${
                    confirmation.values.length === 1 ? `category` : `categories`
                  }`,
                  components: [],
                })
              } else {
                await confirmation.update({
                  content: `Thanks ${confirmation.user.username} for updating your subscriptions`,
                  components: [],
                })
              }
            } catch (e) {
              await interaction.editReply({
                content: `Response not received within 1 minute, cancelling`,
                components: [],
              })
            }
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
  },
}
