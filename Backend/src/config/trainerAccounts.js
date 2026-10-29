import argon2 from "argon2";
import { sequelize } from "../database.js";
import { trainerEnvironmentSchema } from "../validation/index.js";
import { Trainer, TrainerDetails, User, UserStatus } from "../models/index.js";

export function getTrainerCredentials(environment = process.env) {
  const { value, error } = trainerEnvironmentSchema.validate(environment, {
    abortEarly: false,
    convert: true,
  });

  const trainers = [1, 2, 3].flatMap((number) => {
    const name = value[`TRAINER_${number}_NAME`];
    const email = value[`TRAINER_${number}_EMAIL`];
    const password = value[`TRAINER_${number}_PASSWORD`];
    if ([name, email, password].every((field) => field === undefined)) return [];
    if ([name, email, password].some((field) => field === undefined)) {
      throw new Error("Configure each optional trainer bootstrap account with a name, email, and password.");
    }
    return [{ name, email, password }];
  });

  if (error || new Set(trainers.map(({ email }) => email)).size !== trainers.length) {
    throw new Error(
      "Configure optional trainer accounts with unique email addresses and passwords (12-128 characters) in the backend environment.",
    );
  }

  return trainers;
}

export async function ensureTrainerAccounts(environment = process.env) {
  const trainers = getTrainerCredentials(environment);

  await sequelize.transaction(async (transaction) => {
    for (const credentials of trainers) {
      let user = await User.findOne({
        where: { email: credentials.email },
        transaction,
      });

      if (user && user.role !== "trainer") {
        throw new Error(`TRAINER email ${credentials.email} belongs to a non-trainer account.`);
      }

      if (!user) {
        user = await User.create({
          fullName: credentials.name,
          email: credentials.email,
          passwordHash: await argon2.hash(credentials.password),
          role: "trainer",
        }, { transaction });
      }

      await Trainer.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id },
        transaction,
      });
      await TrainerDetails.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id },
        transaction,
      });
      await UserStatus.findOrCreate({
        where: { userId: user.id },
        defaults: { userId: user.id, active: true },
        transaction,
      });
    }
  });
}
