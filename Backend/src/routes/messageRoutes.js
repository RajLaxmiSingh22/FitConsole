import { Router } from "express";
import {
  listConversations,
  listMessages,
  sendMessage,
  startConversation,
} from "../controllers/messageController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { conversationIdParamsSchema, sendMessageSchema, startConversationSchema } from "../validation/index.js";

const messageRoutes = Router();
messageRoutes.use(requireAuthentication);
messageRoutes.get("/conversations", listConversations);
messageRoutes.post("/conversations", validateRequest({ body: startConversationSchema }), startConversation);
messageRoutes.get("/conversations/:id/messages", validateRequest({ params: conversationIdParamsSchema }), listMessages);
messageRoutes.post("/conversations/:id/messages", validateRequest({ params: conversationIdParamsSchema, body: sendMessageSchema }), sendMessage);

export default messageRoutes;
