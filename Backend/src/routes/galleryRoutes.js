import { Router } from "express";
import { createGalleryItem, deleteGalleryItem, listGallery, reorderGallery, signGalleryUpload, updateGalleryItem } from "../controllers/galleryController.js";
import { requireAuthentication } from "../middleware/requireAuthentication.js";
import { requireRole } from "../middleware/requireRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { directUploadRequestSchema, galleryCreateSchema, galleryReorderSchema, galleryUpdateSchema, idParamsSchema } from "../validation/index.js";

const galleryRoutes = Router();
galleryRoutes.use(requireAuthentication, requireRole("owner"));
galleryRoutes.get("/", listGallery);
// Files go from the browser straight to Cloudinary: sign first, then save the checked upload.
galleryRoutes.post("/uploads", validateRequest({ body: directUploadRequestSchema }), signGalleryUpload);
galleryRoutes.post("/", validateRequest({ body: galleryCreateSchema }), createGalleryItem);
galleryRoutes.put("/order", validateRequest({ body: galleryReorderSchema }), reorderGallery);
galleryRoutes.patch("/:id", validateRequest({ params: idParamsSchema, body: galleryUpdateSchema }), updateGalleryItem);
galleryRoutes.delete("/:id", validateRequest({ params: idParamsSchema }), deleteGalleryItem);

export default galleryRoutes;
