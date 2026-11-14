// Sends a file straight from the browser to Cloudinary using a one-time signed upload from our API, so
// large files never pass through the API server. `signed` is { uploadUrl, fields } from the API;
// `onProgress` receives 0–100. Resolves with Cloudinary's response (we only send back its public_id,
// and the API checks the file in our own Cloudinary account before saving it).
export function uploadToCloudinary(file, signed, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(signed.fields)) form.append(key, String(value));
    form.append("file", file);
    const request = new XMLHttpRequest();
    request.open("POST", signed.uploadUrl);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => {
      let body = null;
      try { body = JSON.parse(request.responseText); } catch { /* not JSON */ }
      if (request.status >= 200 && request.status < 300 && body?.public_id) resolve(body);
      else reject(new Error(body?.error?.message ? `Upload refused: ${body.error.message}` : "The upload did not finish. Try again."));
    };
    request.onerror = () => reject(new Error("The upload could not reach media storage. Check your connection and try again."));
    request.ontimeout = () => reject(new Error("The upload took too long. Try again on a faster connection."));
    request.timeout = 15 * 60 * 1000;
    request.send(form);
  });
}
