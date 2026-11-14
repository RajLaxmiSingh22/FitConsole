import { sequelize } from "../database.js";
import { destroyMediaQuietly, isCloudinaryConfigured, uploadAvatarImage } from "../services/cloudinary.js";
import { Attendance, ClassSession, Client, DietPlan, Trainer, TrainerDetails, User, UserAvatar } from "../models/index.js";

export const AVATAR_MAX_BYTES = 200 * 1024;

// The declared type must match the file's own signature, so a renamed file cannot pass as an image.
export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

// Cache-busting token for avatar URLs; null when the user has no photo.
export const avatarVersion = (avatar) => (avatar?.updatedAt ? new Date(avatar.updatedAt).getTime() : null);

async function profilePayload(userId) {
  const [user, avatar, trainer] = await Promise.all([
    User.findByPk(userId, { attributes: ["id", "fullName", "email", "role"] }),
    UserAvatar.findByPk(userId, { attributes: ["userId", "updatedAt"] }),
    Trainer.findByPk(userId, { attributes: ["userId"] }),
  ]);
  return { user: user.toJSON(), avatarVersion: avatarVersion(avatar), coaching: Boolean(trainer) };
}

export async function getProfile(req, res) {
  try {
    return res.json({ status: "success", data: await profilePayload(req.user.id) });
  } catch (error) {
    console.error("Profile lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load profile." });
  }
}

export async function updateProfile(req, res) {
  try {
    await User.update({ fullName: req.validated.body.fullName }, { where: { id: req.user.id } });
    return res.json({ status: "success", data: await profilePayload(req.user.id) });
  } catch (error) {
    console.error("Profile update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update profile." });
  }
}

export async function uploadAvatar(req, res) {
  try {
    const declared = req.headers["content-type"]?.split(";")[0].trim();
    const mimeType = detectImageType(req.body);
    if (!mimeType || mimeType !== declared) {
      return res.status(400).json({ status: "error", message: "Upload a JPEG, PNG or WebP image." });
    }
    if (req.body.length > AVATAR_MAX_BYTES) {
      return res.status(413).json({ status: "error", message: "Image is too large (200 KB maximum)." });
    }
    const previous = await UserAvatar.findByPk(req.user.id, { attributes: ["userId", "publicId"] });
    if (isCloudinaryConfigured()) {
      const { publicId, url } = await uploadAvatarImage({ buffer: req.body, mimeType, role: req.user.role, userId: req.user.id });
      await UserAvatar.upsert({ userId: req.user.id, mimeType, data: null, url, publicId });
    } else {
      await UserAvatar.upsert({ userId: req.user.id, mimeType, data: req.body, url: null, publicId: null });
    }
    // Old-file cleanup runs after the response so a slow storage call never delays the user.
    if (previous?.publicId) destroyMediaQuietly(previous.publicId);
    return res.json({ status: "success", data: await profilePayload(req.user.id) });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to save profile photo." });
  }
}

export async function deleteAvatar(req, res) {
  try {
    const avatar = await UserAvatar.findByPk(req.user.id, { attributes: ["userId", "publicId"] });
    if (avatar) {
      await avatar.destroy();
      destroyMediaQuietly(avatar.publicId);
    }
    return res.json({ status: "success", data: await profilePayload(req.user.id) });
  } catch (error) {
    console.error("Avatar removal failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to remove profile photo." });
  }
}

// Coach photos are public (the website shows them); everyone else's needs a signed-in viewer.
export async function getAvatar(req, res) {
  try {
    const [avatar, trainer] = await Promise.all([
      UserAvatar.findByPk(req.params.id),
      req.user ? null : Trainer.findByPk(req.params.id, { attributes: ["userId"] }),
    ]);
    if (!avatar || (!req.user && !trainer)) return res.status(404).json({ status: "error", message: "Photo not found." });
    // Cloudinary-hosted photos: same access check, then send the browser to the CDN copy.
    if (avatar.url) {
      // The app runs on another origin, so the redirect must allow cross-origin embedding like the byte response does.
      res.set({ "Cache-Control": "private, max-age=86400", "Cross-Origin-Resource-Policy": "cross-origin" });
      return res.redirect(302, avatar.url);
    }
    res.set({ "Content-Type": avatar.mimeType, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "cross-origin" });
    return res.send(avatar.data);
  } catch (error) {
    console.error("Avatar lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load profile photo." });
  }
}

// An owner who also coaches gets a trainer profile, so they can be assigned members, courses and classes.
export async function setCoaching(req, res) {
  try {
    const userId = req.user.id;
    if (req.validated.body.enabled) {
      await sequelize.transaction(async (transaction) => {
        await Trainer.findOrCreate({ where: { userId }, defaults: { userId }, transaction });
        await TrainerDetails.findOrCreate({ where: { userId }, defaults: { userId }, transaction });
      });
      return res.json({ status: "success", data: await profilePayload(userId) });
    }
    const trainer = await Trainer.findByPk(userId);
    if (trainer) {
      // Removing a trainer profile cascades to members and history, so only an unused profile can be removed.
      const [clients, attendance, plans, classes, courses] = await Promise.all([
        Client.count({ where: { trainerId: trainer.id } }),
        Attendance.count({ where: { trainerId: userId } }),
        DietPlan.count({ where: { trainerId: userId } }),
        ClassSession.count({ where: { trainerId: userId } }),
        trainer.countCourses(),
      ]);
      if (clients + attendance + plans + classes + courses > 0) {
        return res.status(409).json({ status: "error", message: "Your coach profile is in use (members, courses, classes, attendance or diet plans). Reassign those first." });
      }
      await trainer.destroy();
    }
    return res.json({ status: "success", data: await profilePayload(userId) });
  } catch (error) {
    console.error("Coaching toggle failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update coaching profile." });
  }
}
