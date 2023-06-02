import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  const message = await prisma.message.create({
    data: {
      messageId: `111`,
      channelId: `111`,
      guildId: `111`,
      content: `yo`,
      createdTimestamp: 123,
      links: JSON.stringify([
        {
          url: `https://google.com`,
        },
      ]),
    },
  });
  console.log({ message });
  await prisma.message.update({
    where: {
      messageId: message.messageId,
    },
    data: {
      reactions: JSON.stringify([
        {
          count: 1,
          name: `😍`,
        },
      ]),
    },
  });

  console.log(`Database has been seeded. 🌱`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
