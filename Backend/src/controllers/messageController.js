import { Op, QueryTypes } from "sequelize";
import { Client, Conversation, ConversationParticipant, Message, Trainer, User, UserStatus } from "../models/index.js";
import { sequelize } from "../database.js";

async function userCanStartConversation(user, otherUser) {
  if (user.role === "owner" || otherUser.role === "owner") return true;
  if (user.role === "client" && otherUser.role === "trainer") {
    const [client, trainer] = await Promise.all([
      Client.findOne({ where: { userId: user.id } }),
      Trainer.findByPk(otherUser.id, { attributes: ["id"] }),
    ]);
    return Boolean(client && trainer && client.trainerId === trainer.id);
  }
  if (user.role === "trainer" && otherUser.role === "client") {
    const [client, trainer] = await Promise.all([
      Client.findOne({ where: { userId: otherUser.id } }),
      Trainer.findByPk(user.id, { attributes: ["id"] }),
    ]);
    return Boolean(client && trainer && client.trainerId === trainer.id);
  }
  return false;
}

async function getParticipantConversation(conversationId, userId) {
  return Conversation.findOne({
    where: { id: conversationId },
    include: [{
      model: User,
      as: "Users",
      where: { id: userId },
      attributes: ["id"],
      through: { attributes: [] },
    }],
  });
}

export async function listConversations(req, res) {
  try {
    const participation = await ConversationParticipant.findAll({
      where: { userId: req.user.id },
      attributes: ["conversationId"],
    });
    const conversations = await Conversation.findAll({
      where: { id: participation.map((row) => row.conversationId) },
      include: [
        {
          model: User,
          as: "Users",
          attributes: ["id", "fullName", "role"],
          through: { attributes: [] },
          required: false,
        },
        { model: Message, limit: 1, separate: true, order: [["createdAt", "DESC"]] },
      ],
      order: [["updatedAt", "DESC"]],
    });
    return res.json({ status: "success", data: conversations });
  } catch (error) {
    console.error("Conversation list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve conversations." });
  }
}

export function conversationPairKey(firstUserId, secondUserId) {
  return [firstUserId, secondUserId].sort().join(":");
}

export async function startConversation(req, res) {
  try {
    const value = req.validated.body;
    if (value.participantId === req.user.id) {
      return res.status(400).json({ status: "error", message: "Cannot start a conversation with yourself." });
    }
    const [participant, status] = await Promise.all([
      User.findByPk(value.participantId),
      UserStatus.findByPk(value.participantId),
    ]);
    if (!participant || status?.active === false) return res.status(404).json({ status: "error", message: "Participant not found." });
    if (!(await userCanStartConversation(req.user, participant))) {
      return res.status(403).json({ status: "error", message: "Conversation is not allowed for these users." });
    }

    const result = await sequelize.transaction(async (transaction) => {
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:key))", {
        replacements: { key: `conversation:${conversationPairKey(req.user.id, participant.id)}` },
        transaction,
      });
      const [match] = await sequelize.query(
        `SELECT conversation_id FROM conversation_participants
         GROUP BY conversation_id
         HAVING COUNT(*) = 2
            AND BOOL_OR(user_id = :first) AND BOOL_OR(user_id = :second)
         LIMIT 1`,
        {
          replacements: { first: req.user.id, second: participant.id },
          type: QueryTypes.SELECT,
          transaction,
        },
      );
      if (match) return { conversation: await Conversation.findByPk(match.conversation_id, { transaction }), created: false };
      const created = await Conversation.create({}, { transaction });
      await created.addUsers([req.user.id, participant.id], { transaction });
      return { conversation: created, created: true };
    });
    return res.status(result.created ? 201 : 200).json({ status: "success", data: result.conversation });
  } catch (error) {
    console.error("Conversation creation failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to start conversation." });
  }
}

export async function listMessages(req, res) {
  try {
    const conversation = await getParticipantConversation(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ status: "error", message: "Conversation not found." });
    const query = req.validated.query ?? {};
    const paginate = query.before !== undefined || query.limit !== undefined;
    const where = { conversationId: conversation.id };
    if (query.before) where.createdAt = { [Op.lt]: query.before };
    // Without cursor params the full ascending history is returned for existing clients.
    const messages = await Message.findAll({
      where,
      include: [{ model: User, attributes: ["id", "fullName", "role"] }],
      order: [["createdAt", paginate ? "DESC" : "ASC"]],
      ...(paginate ? { limit: query.limit ?? 50 } : {}),
    });
    if (paginate) messages.reverse();
    await Message.update(
      { readAt: new Date() },
      { where: { conversationId: conversation.id, senderId: { [Op.ne]: req.user.id }, readAt: null } },
    );
    return res.json({ status: "success", data: messages });
  } catch (error) {
    console.error("Message list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve messages." });
  }
}

export async function sendMessage(req, res) {
  try {
    const value = req.validated.body;
    const conversation = await getParticipantConversation(req.params.id, req.user.id);
    if (!conversation) return res.status(404).json({ status: "error", message: "Conversation not found." });
    const message = await Message.create({
      conversationId: conversation.id,
      senderId: req.user.id,
      body: value.body,
    });
    await conversation.changed("updatedAt", true);
    await conversation.save();
    return res.status(201).json({ status: "success", data: message });
  } catch (error) {
    console.error("Message send failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to send message." });
  }
}
