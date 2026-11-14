import express, { Router } from "express";
import { deleteGalleryItem, GALLERY_IMAGE_TYPES, GALLERY_VIDEO_TYPES, listGallery, reorderGallery, updateGalleryItem, uploadGalleryItem } from "../controllers/galleryController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { galleryReorderSchema, galleryUpdateSchema, galleryUploadQuerySchema, idParamsSchema } from "../validation/index.js";

// The raw body limit matches the largest allowed file (video); the controller applies per-type limits.
const mediaBody = express.raw({ type: [...GALLERY_IMAGE_TYPES, ...GALLERY_VIDEO_TYPES], limit: "101mb" });

const galleryRoutes = Router();
galleryRoutes.use(requireAuthentication, requireRole("owner"));
galleryRoutes.get("/", listGallery);
galleryRoutes.post("/", validateRequest({ query: galleryUploadQuerySchema }), mediaBody, uploadGalleryItem);
galleryRoutes.put("/order", validateRequest({ body: galleryReorderSchema }), reorderGallery);
galleryRoutes.patch("/:id", validateRequest({ params: idParamsSchema, body: galleryUpdateSchema }), updateGalleryItem);
galleryRoutes.delete("/:id", validateRequest({ params: idParamsSchema }), deleteGalleryItem);

export default galleryRoutes;
