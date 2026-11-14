// Site design assets hosted on Cloudinary (fitconsole/site/hero/). q_auto/f_auto let Cloudinary pick a smaller encoding.
const CLOUDINARY = "https://res.cloudinary.com/dp7mimqub";

export const heroMedia = {
  video: `${CLOUDINARY}/video/upload/q_auto/v1794658619/fitconsole/site/hero/hero-bg.mp4`,
  poster: `${CLOUDINARY}/image/upload/f_auto,q_auto/v1794658620/fitconsole/site/hero/hero-poster.jpg`,
};

// Built-in course covers: one 1600x900 sheet in Cloudinary, cropped into four 800x450 tiles.
const SHEET = "v1794659606/fitconsole/site/covers/default-sheet.jpg";
const TILES = { combat: [0, 0], conditioning: [800, 0], kids: [0, 450], strength: [800, 450] };
export const defaultCoverKeys = Object.keys(TILES);
export const defaultCoverLabels = { combat: "Combat", conditioning: "Conditioning", kids: "Kids", strength: "Strength" };

export function defaultCoverUrl(key) {
  const [x, y] = TILES[key] ?? TILES.combat;
  return `${CLOUDINARY}/image/upload/c_crop,x_${x},y_${y},w_800,h_450/f_auto,q_auto/${SHEET}`;
}

// The default for a course without an uploaded cover: the owner's pick, else kids/category.
export function autoCoverKey(course) {
  if (course.coverDefault) return course.coverDefault;
  if ((course.maxAge && course.maxAge <= 15) || /\bkid|junior|child/i.test(course.name ?? "")) return "kids";
  const category = (course.category ?? "").toLowerCase();
  if (category.includes("strength") || category.includes("power")) return "strength";
  if (category.includes("condition") || category.includes("wellness") || category.includes("cardio")) return "conditioning";
  return "combat";
}

// Cover image for a course; `width` asks Cloudinary for a smaller copy (e.g. 600 for cards).
export function courseCover(course, width) {
  if (course.coverImageUrl) {
    const url = width ? course.coverImageUrl.replace("/image/upload/", `/image/upload/c_fill,w_${width},h_${Math.round(width * 9 / 16)}/f_auto,q_auto/`) : course.coverImageUrl;
    return { src: url, alt: course.coverImageAlt || `${course.name} cover`, isDefault: false };
  }
  const key = autoCoverKey(course);
  return { src: defaultCoverUrl(key), alt: course.coverImageAlt || "", isDefault: true, key };
}
