import { Router } from "express";
import {
  listConversations,
  listMessages,
  sendMessage,
  startConversation,
} from "../controllers/messageController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { conversationIdParamsSchema, messageQuerySchema, sendMessageSchema, startConversationSchema } from "../validation/index.js";

const messageRoutes = Router();
// Mounted at /api, so authentication must be scoped to these paths only.
messageRoutes.use("/conversations", requireAuthentication);
messageRoutes.get("/conversations", listConversations);
messageRoutes.post("/conversations", validateRequest({ body: startConversationSchema }), startConversation);
messageRoutes.get("/conversations/:id/messages", validateRequest({ params: conversationIdParamsSchema, query: messageQuerySchema }), listMessages);
messageRoutes.post("/conversations/:id/messages", validateRequest({ params: conversationIdParamsSchema, body: sendMessageSchema }), sendMessage);

export default messageRoutes;
