import argon2 from "argon2";
import Joi from "joi";
import { sequelize } from "../database.js";
import { Trainer, TrainerDetails, User, UserStatus } from "../models/index.js";

const trainerEnvironmentSchema = Joi.object({
  TRAINER_1_NAME: Joi.string().trim().min(1).max(255).required(),
  TRAINER_1_EMAIL: Joi.string().trim().email().lowercase().required(),
  TRAINER_1_PASSWORD: Joi.string().min(12).max(128).required(),
  TRAINER_2_NAME: Joi.string().trim().min(1).max(255).required(),
  TRAINER_2_EMAIL: Joi.string().trim().email().lowercase().required(),
  TRAINER_2_PASSWORD: Joi.string().min(12).max(128).required(),
  TRAINER_3_NAME: Joi.string().trim().min(1).max(255).required(),
  TRAINER_3_EMAIL: Joi.string().trim().email().lowercase().required(),
  TRAINER_3_PASSWORD: Joi.string().min(12).max(128).required(),
}).unknown(true);

export function getTrainerCredentials(environment = process.env) {
  const { value, error } = trainerEnvironmentSchema.validate(environment, {
    abortEarly: false,
    convert: true,
  });

  const trainers = [1, 2, 3].map((number) => ({
    name: value[`TRAINER_${number}_NAME`],
    email: value[`TRAINER_${number}_EMAIL`],
    password: value[`TRAINER_${number}_PASSWORD`],
  }));

  if (error || new Set(trainers.map(({ email }) => email)).size !== trainers.length) {
    throw new Error(
      "Configure three trainers with unique email addresses and passwords (12-128 characters) in the backend environment.",
    );
  }

  return trainers;
}

export async function ensureTrainerAccounts(environment = process.env) {
  const trainers = getTrainerCredentials(environment);

  await sequelize.transaction(async (transaction) => {
    for (const credentials of trainers) {
      const passwordHash = await argon2.hash(credentials.password);
      let user = await User.findOne({
        where: { email: credentials.email },
        transaction,
      });

      if (user && user.role !== "trainer") {
        throw new Error(`TRAINER email ${credentials.email} belongs to a non-trainer account.`);
      }

      if (user) {
        await user.update({
          fullName: credentials.name,
          passwordHash,
        }, { transaction });
      } else {
        user = await User.create({
          fullName: credentials.name,
          email: credentials.email,
          passwordHash,
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
