import { GymSettings } from "../models/index.js";

// Public view: unset fields are null, and the website shows its placeholder text for them.
export function toContact(row) {
  return {
    phone: row?.phone ?? null,
    email: row?.email ?? null,
    address: row?.address ?? null,
    mapUrl: row?.mapUrl ?? null,
    whatsappEnabled: row ? row.whatsappEnabled : true,
  };
}

export async function getPublicGymContact(_req, res) {
  try {
    const row = await GymSettings.findByPk(1);
    res.set("Cache-Control", "public, max-age=300");
    return res.json({ status: "success", data: toContact(row) });
  } catch (error) {
    console.error("Gym contact lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load contact details." });
  }
}

export async function getOwnerGymContact(_req, res) {
  try {
    return res.json({ status: "success", data: toContact(await GymSettings.findByPk(1)) });
  } catch (error) {
    console.error("Gym contact lookup failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to load contact details." });
  }
}

export async function saveGymContact(req, res) {
  try {
    const value = req.validated.body;
    const [row] = await GymSettings.upsert({
      id: 1,
      phone: value.phone || null,
      email: value.email || null,
      address: value.address || null,
      mapUrl: value.mapUrl || null,
      whatsappEnabled: value.whatsappEnabled,
      updatedBy: req.user.id,
    }, { returning: true });
    return res.json({ status: "success", data: toContact(row) });
  } catch (error) {
    console.error("Gym contact save failed:", error);
    return res.status(500).json({ status: "error", message: "Unable to save contact details." });
  }
}
