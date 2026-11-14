import { ageOn } from "../services/dietTargets.js";

// A course with min/max age only accepts members in that range; returns a message when not eligible.
export function courseAgeError(course, client, today) {
  if (course.minAge == null && course.maxAge == null) return null;
  if (!client.dateOfBirth) return `${course.name} has an age requirement. Add the member's date of birth first.`;
  const age = ageOn(client.dateOfBirth, today);
  if (course.minAge != null && age < course.minAge) return `${course.name} is for ages ${course.minAge}${course.maxAge ? `–${course.maxAge}` : "+"}; this member is ${age}.`;
  if (course.maxAge != null && age > course.maxAge) return `${course.name} is for ages ${course.minAge ?? 0}–${course.maxAge}; this member is ${age}.`;
  return null;
}
