# What's new

<!--
Newest first. Shown to the gym owner on the /docs page under "What's new".
Format for each entry:
## YYYY-MM-DD · Short title
**What changed**
- One plain-language line per change (no code, no file names).
**What you need to do**
- What the owner should do, or "Nothing."
-->

## 2026-11-14 · Faster, safer photo and video uploads
**What changed**
- Gallery photos and videos and course covers now go straight from your browser to Cloudinary, with a progress bar while they upload. Large videos (up to 100 MB) no longer pass through the app's server.
- The app still checks every upload: only the allowed photo and video types, within the size limits, and only into your own gym's storage folders. Anything else is refused and removed.
- Course covers are always stored as cropped 1200×675 WebP images, which also removes hidden photo details such as the location where the photo was taken.
**What you need to do**
- Nothing. Uploads work the same way from the Gallery page and Courses → Edit course.

## 2026-11-14 · Documentation that stays up to date
**What changed**
- The list of everything the app can do (the endpoint directory on this page) is now built from the app itself, so it always matches what the app really does. It lists all 119 actions, who can use each one, and which need the extra security token.
- This "What's new" section was added so you can see every change in one place.
**What you need to do**
- Nothing.

## 2026-11-14 · Faster app and safer database updates
**What changed**
- The owner, trainer and member screens now load only when they are needed, so the website opens faster.
- The database setup was combined into a single starting point. Your existing data was not changed, and a backup was taken first.
**What you need to do**
- Nothing.

## 2026-11-14 · Demo account
**What changed**
- When someone in the demo account presses Pay, they now see a short explanation with "Create my account" or "Maybe later" instead of an error. If they sign up, they return to the plan they picked.
- A small "DEMO" label shows next to the name while the demo account is in use.
- The demo account still cannot change anything or make payments.
**What you need to do**
- Nothing.

## 2026-11-14 · Course covers
**What changed**
- Each course can have its own cover photo, shown on your Courses page and on the public Programs page. Courses without a photo get one of four built-in covers (combat, conditioning, kids, strength).
- Coaches on each course card now show as small photo circles; you can change coaches in "Edit course".
**What you need to do**
- Optional: open Courses → Edit course to upload a cover and add a short image description.

## 2026-11-14 · Gallery and photo storage
**What changed**
- New Gallery page in your workspace: upload photos and videos, add titles and captions, choose what the website shows, and set the order.
- Profile photos, gallery items and course covers are now stored in Cloudinary (online media storage), in tidy folders.
**What you need to do**
- Add your Cloudinary details on the server if they are not set yet; without them, gallery and cover uploads are turned off.
- Upload real gym photos to the Gallery; until then the website shows placeholder tiles.

## 2026-11-14 · New website look
**What changed**
- New home page with a moving background, a navigation bar that follows you as you scroll, animated sections, a scrolling list of your programs and a back-to-top button. Visitors who turn off motion in their device settings see a still version.
- The "Sample details" notice was removed from the About, Contact and legal pages.
**What you need to do**
- Check that the address, phone number, email and gym story on the About and Contact pages are your real details. The phone and email are still placeholders and are now clickable links.

## 2026-11-14 · Prices and payments
**What changed**
- Course prices must be above zero, and a longer plan can no longer cost less than a shorter one (for example, 6 months cannot be cheaper than 3 months).
- The rupee sign (₹) now shows correctly everywhere, including in small text.
- Saving a course no longer fails with a "security token" error after the page has been open for a while.
**What you need to do**
- If a course's existing prices break the new rule, you will be asked to fix them the next time you edit them.
