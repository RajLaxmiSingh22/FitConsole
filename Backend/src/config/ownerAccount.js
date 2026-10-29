import argon2 from "argon2";
import { sequelize } from "../database.js";
import User from "../models/User.js";
import UserStatus from "../models/UserStatus.js";
import { ownerEnvironmentSchema } from "../validation/index.js";

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
  await sequelize.transaction(async (transaction) => {
    let owner = await User.findOne({
      where: { email: credentials.email },
      transaction,
    });

    if (owner && owner.role !== "owner") {
      throw new Error("OWNER_EMAIL belongs to a non-owner account. Configure a unique owner email.");
    }

    if (!owner) {
      owner = await User.create({
        fullName: credentials.name,
        email: credentials.email,
        passwordHash: await argon2.hash(credentials.password),
        role: "owner",
      }, { transaction });
    }

    await UserStatus.findOrCreate({
      where: { userId: owner.id },
      defaults: { userId: owner.id, active: true },
      transaction,
    });
  });
}
