export const leadStatuses = ["new", "contacted", "trial_scheduled", "trial_confirmed", "trial_attended", "no_show", "enrolled", "lost"];

export const leadName = (lead) => lead.name ?? lead.fullName ?? lead.contactName ?? "Website lead";
