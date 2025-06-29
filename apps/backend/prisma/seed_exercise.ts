import { PrismaClient } from "@prisma/client";
import { parseArgs } from "node:util";

async function seed() {
  const {
    values: { centerId },
  } = parseArgs({ options: { centerId: { type: "string" } } });
  const prisma = new PrismaClient();

  // const readingExercise: ReadingExercise = {
  //   content: "This is the reading material",
  //   tasks: [task],
  //   title: "First reading exercise",
  // };

  // const exercise = await prisma.exercise.create({
  //   data: {
  //     name: "Ancient Rome",
  //     content: readingExercise,
  //     subType: {
  //       connect: {
  //         id: subtype.id,
  //       },
  //     },
  //     center: {
  //       connect: {
  //         id: centerId,
  //       },
  //     },
  //   },
  // });

  // console.log("exercise", exercise);
}

seed()
  .then(() => console.log("Seeding done"))
  .catch((error) => console.log("Error seeding: ", error));
