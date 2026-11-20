// Pure helpers for the gym contact details (no imports, so they can be unit tested).
export const contactPlaceholders = {
  phone: "+91 00000 00000",
  email: "hello@fitconsole.example.com",
  address: "Address shown once the gym adds it",
  mapUrl: null,
  whatsappEnabled: false,
};

export function withPlaceholders(contact) {
  const value = (key) => contact?.[key] ?? contactPlaceholders[key];
  return {
    phone: value("phone"),
    email: value("email"),
    address: value("address"),
    mapUrl: contact?.mapUrl ?? null,
    whatsappEnabled: contact ? contact.whatsappEnabled : contactPlaceholders.whatsappEnabled,
    // Placeholders never get a link: nobody dials, messages or emails a placeholder.
    isSaved: Boolean(contact?.phone || contact?.email),
  };
}

// WhatsApp chat link for a phone number, or null when WhatsApp is off or the number is a placeholder.
export function whatsappLink(contact) {
  if (!contact.whatsappEnabled || !contact.isSaved || !contact.phone) return null;
  const digits = contact.phone.replace(/\D/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

export function telLink(phone) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
