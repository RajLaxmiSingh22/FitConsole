import { useState } from "react";
import { avatarUrl } from "../../services/api.js";
import { initials } from "../../utils/format.js";

// Profile photo when one is saved, initials otherwise (and if the image fails to load).
export default function Avatar({ userId, name, version, className = "avatar" }) {
  const src = avatarUrl(userId, version);
  const [failed, setFailed] = useState(null);
  if (src && failed !== src) return <span className={`${className} avatar--photo`}><img src={src} alt="" onError={() => setFailed(src)} /></span>;
  return <span className={className}>{initials(name)}</span>;
}
