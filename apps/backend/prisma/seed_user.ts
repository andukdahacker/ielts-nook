import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

async function seed() {
  const prisma = new PrismaClient();

  const hashed = await argon2.hash("Ducdeptraino1@");
  
  // Create a center
  const center = await prisma.center.create({
    data: {
      email: 'doanduc227@gmail.com',
      name: "Duc's nook",
    }
  })

  for (let i = 0; i < 100; i++) {
    await prisma.user.create({
      data: {
        email: `user${i}@gmail.com`,
        password: hashed,
        role: "STUDENT",
        center: {
          connect: {
            id: center.id,
          },
        },
        firstName: "User",
        lastName: `${i}`,
      },
    });
  }
}

seed()
  .then(() => console.log("Seeding done"))
  .catch((error) => console.log("Error seeding: ", error));
