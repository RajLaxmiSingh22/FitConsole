import argon2 from "argon2";
import Joi from "joi";
import { sequelize } from "../database.js";
import User from "../models/User.js";
import UserStatus from "../models/UserStatus.js";

const ownerEnvironmentSchema = Joi.object({
  OWNER_NAME: Joi.string().trim().min(1).max(255).default("FitConsole Owner"),
  OWNER_EMAIL: Joi.string().trim().email().lowercase().required(),
  OWNER_PASSWORD: Joi.string().min(12).max(128).required(),
}).unknown(true);

export function getOwnerCredentials(environment = process.env) {
  const { value, error } = ownerEnvironmentSchema.validate(environment, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error("Configure OWNER_EMAIL and OWNER_PASSWORD (12-128 characters) in the backend environment.");
  }

  return {
    name: value.OWNER_NAME,
    email: value.OWNER_EMAIL,
    password: value.OWNER_PASSWORD,
  };
}

export async function ensureOwnerAccount(environment = process.env) {
  const credentials = getOwnerCredentials(environment);
  const passwordHash = await argon2.hash(credentials.password);

  await sequelize.transaction(async (transaction) => {
    let owner = await User.findOne({
      where: { email: credentials.email },
      transaction,
    });

    if (owner && owner.role !== "owner") {
      throw new Error("OWNER_EMAIL belongs to a non-owner account. Configure a unique owner email.");
    }

    if (owner) {
      await owner.update({
        fullName: credentials.name,
        passwordHash,
      }, { transaction });
    } else {
      owner = await User.create({
        fullName: credentials.name,
        email: credentials.email,
        passwordHash,
        role: "owner",
      }, { transaction });
    }

    const existingOwners = await User.findAll({
      where: { role: "owner" },
      attributes: ["id"],
      transaction,
    });
    for (const existingOwner of existingOwners) {
      await UserStatus.upsert({
        userId: existingOwner.id,
        active: existingOwner.id === owner.id,
      }, { transaction });
    }
  });
}
