import { useState } from "react";
import { getBlobApiError } from "../services/api.js";
import { Button } from "./ui/index.js";

export default function DownloadButton({ label, download }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleDownload() {
    setBusy(true);
    setError("");
    try {
      const response = await download();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      const disposition = response.headers?.["content-disposition"] ?? "";
      link.download = disposition.match(/filename="([^"]+)"/)?.[1]
        ?? label.match(/[\w-]+\.xlsx/i)?.[0]
        ?? "fitconsole-report.xlsx";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(await getBlobApiError(requestError, "Unable to download report."));
    } finally {
      setBusy(false);
    }
  }
  return <><Button variant="outline" onClick={handleDownload} disabled={busy}>{busy ? "Preparing…" : label}</Button>{error && <span className="inline-error">{error}</span>}</>;
}
