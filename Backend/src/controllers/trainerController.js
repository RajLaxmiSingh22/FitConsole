import { Client, Course, Trainer, TrainerDetails, User, UserAvatar, UserStatus } from "../models/index.js";
import { avatarVersion } from "./profileController.js";

const avatarInclude = { model: UserAvatar, attributes: ["userId", "updatedAt"] };

const publicTrainerFields = {
  attributes: ["id", "userId", "certification"],
  include: [
    { model: User, attributes: ["id", "fullName"], include: [avatarInclude] },
    { model: Course, attributes: ["id", "name", "category"], through: { attributes: [] } },
    { model: TrainerDetails, attributes: ["userId", "experienceYears", "bio", "achievements", "specialties"] },
  ],
};

// Public coach profile fields, always present so the website can render them safely.
function publicProfile(details, user) {
  return { ...(user ? { avatarVersion: avatarVersion(user.UserAvatar) } : {}), bio: details?.bio ?? null, achievements: details?.achievements ?? [], specialties: details?.specialties ?? [] };
}

// Only fields sent in the request change; others keep their saved values.
function publicProfileChanges(changes, existing) {
  return {
    bio: changes.bio === undefined ? existing?.bio ?? null : changes.bio || null,
    achievements: changes.achievements ?? existing?.achievements ?? [],
    specialties: changes.specialties ?? existing?.specialties ?? [],
  };
}

export async function listTrainers(req, res) {
  try {
    const [trainers, inactiveUsers] = await Promise.all([
      Trainer.findAll({
      ...publicTrainerFields,
      // Phone numbers are staff contact details: only the owner receives them.
      attributes: [...publicTrainerFields.attributes, ...(req.user?.role === "owner" ? ["phone"] : [])],
      include: [
        ...publicTrainerFields.include.slice(0, 1),
        publicTrainerFields.include[1],
        publicTrainerFields.include[2],
      ],
      order: [[User, "fullName", "ASC"]],
      }),
      UserStatus.findAll({ where: { active: false }, attributes: ["userId"] }),
    ]);
    const inactiveIds = new Set(inactiveUsers.map((row) => row.userId));
    return res.json({
      status: "success",
      data: trainers
        .filter((trainer) => !inactiveIds.has(trainer.userId))
        .map((trainer) => ({
          ...trainer.toJSON(),
          experienceYears: trainer.TrainerDetail?.experienceYears ?? null,
          ...publicProfile(trainer.TrainerDetail, trainer.User),
        })),
    });
  } catch (error) {
    console.error("Trainer list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve trainers." });
  }
}

export async function getTrainer(req, res) {
  try {
    const isPrivateView = req.user?.role === "owner" ||
      (req.user?.role === "trainer" && req.user.id === req.params.id);
    const [trainer, status] = await Promise.all([
      Trainer.findOne({
      ...publicTrainerFields,
      where: { userId: req.params.id },
      include: [
        { model: User, attributes: ["id", "fullName", ...(isPrivateView ? ["email"] : [])], include: [avatarInclude] },
        publicTrainerFields.include[1],
        publicTrainerFields.include[2],
      ],
      attributes: ["id", "userId", "certification", ...(isPrivateView ? ["phone"] : [])],
      }),
      UserStatus.findByPk(req.params.id),
    ]);
    if (!trainer || status?.active === false) return res.status(404).json({ status: "error", message: "Trainer not found." });
    const data = {
      ...trainer.toJSON(),
      experienceYears: trainer.TrainerDetail?.experienceYears ?? null,
      ...publicProfile(trainer.TrainerDetail, trainer.User),
    };
    return res.json({
      status: "success",
      data,
    });
  } catch (error) {
    console.error("Trainer lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve trainer." });
  }
}

export async function updateMyTrainer(req, res) {
  try {
    const value = req.validated.body;
    const trainer = await Trainer.findByPk(req.user.id);
    if (!trainer) return res.status(404).json({ status: "error", message: "Trainer profile not found." });
    const { phone, certification, experienceYears, bio, achievements, specialties, ...details } = value;
    const existingDetails = await TrainerDetails.findByPk(trainer.userId);
    const profile = {};
    if (phone !== undefined) profile.phone = phone;
    if (certification !== undefined) profile.certification = certification;
    if (Object.keys(profile).length) await trainer.update(profile);
    await TrainerDetails.upsert({
      userId: trainer.userId,
      experienceYears: experienceYears ?? existingDetails?.experienceYears,
      details: { ...existingDetails?.details, ...details },
      ...publicProfileChanges({ bio, achievements, specialties }, existingDetails),
    });
    const savedDetails = await TrainerDetails.findByPk(trainer.userId);
    return res.json({ status: "success", data: { ...trainer.toJSON(), experienceYears: savedDetails?.experienceYears, ...savedDetails?.details, ...publicProfile(savedDetails) } });
  } catch (error) {
    console.error("Trainer profile update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update trainer profile." });
  }
}

export async function updateTrainer(req, res) {
  try {
    const value = req.validated.body;
    const trainer = await Trainer.findByPk(req.params.id);
    if (!trainer) return res.status(404).json({ status: "error", message: "Trainer not found." });
    const { phone, certification, experienceYears, bio, achievements, specialties, ...details } = value;
    const existingDetails = await TrainerDetails.findByPk(trainer.userId);
    const profile = {};
    if (phone !== undefined) profile.phone = phone;
    if (certification !== undefined) profile.certification = certification;
    if (Object.keys(profile).length) await trainer.update(profile);
    await TrainerDetails.upsert({
      userId: trainer.userId,
      experienceYears: experienceYears ?? existingDetails?.experienceYears,
      details: { ...existingDetails?.details, ...details },
      ...publicProfileChanges({ bio, achievements, specialties }, existingDetails),
    });
    const savedDetails = await TrainerDetails.findByPk(trainer.userId);
    return res.json({ status: "success", data: { ...trainer.toJSON(), experienceYears: savedDetails?.experienceYears, ...savedDetails?.details, ...publicProfile(savedDetails) } });
  } catch (error) {
    console.error("Trainer update failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to update trainer." });
  }
}

export async function listMyClients(req, res) {
  try {
    const trainer = await Trainer.findByPk(req.user.id, { attributes: ["id"] });
    if (!trainer) return res.status(404).json({ status: "error", message: "Trainer profile not found." });
    const clients = await Client.findAll({
      where: { trainerId: trainer.id },
      include: [{ model: User, attributes: ["id", "fullName", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    return res.json({ status: "success", data: clients });
  } catch (error) {
    console.error("Trainer client list failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to retrieve assigned clients." });
  }
}
