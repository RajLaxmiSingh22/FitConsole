import { Client, Trainer } from "../models/index.js";

export async function canAccessClient(user, clientId) {
  if (user.role === "owner") {
    return true;
  }

  const client = await Client.findByPk(clientId, {
    attributes: ["id", "userId", "trainerId"],
  });
  if (!client) {
    return false;
  }

  if (user.role === "client") {
    return client.userId === user.id;
  }

  if (user.role === "trainer") {
    const trainer = await Trainer.findByPk(user.id, { attributes: ["id"] });
    return Boolean(trainer && client.trainerId === trainer.id);
  }

  return false;
}
