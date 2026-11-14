import { useRef, useState } from "react";
import DownloadButton from "../../components/DownloadButton.jsx";
import { Button, Card, Notice, StatusPill } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";

const STATUS = {
  ready: { tone: "success", label: "✓ Ready" },
  duplicate: { tone: "warning", label: "↺ Already exists" },
  error: { tone: "danger", label: "✕ Needs fixing" },
};

// Upload an Excel/CSV member list, preview every row, then import the valid ones.
export default function ClientImport({ onImported, onClose }) {
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  async function check(nextFile, commit = false) {
    setBusy(commit ? "import" : "check");
    setError("");
    try {
      const data = responseData(await apiCalls.clients.importFile(nextFile, commit));
      setResult(data);
      if (commit && data.summary.imported) onImported();
    } catch (requestError) {
      setResult(null);
      setError(getApiError(requestError, "Unable to read that file."));
    } finally {
      setBusy("");
    }
  }

  function pick(event) {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (next.size > 2 * 1024 * 1024) return setError("That file is larger than 2 MB. Split it into smaller files.");
    setFile(next);
    check(next);
  }

  const summary = result?.summary;
  const problems = result?.rows.filter((row) => row.status !== "ready") ?? [];
  const visible = showAll ? result?.rows ?? [] : problems;

  return <Card title="Import clients from Excel" eyebrow="Bulk add" action={<Button variant="ghost" onClick={onClose}>Close</Button>}>
    <ol className="import-steps">
      <li>Use your own sheet or <DownloadButton label="download the template" filename="clients-import-template.xlsx" variant="ghost" download={apiCalls.clients.importTemplate} />. The first row must be headers; <b>Name</b> and <b>Email</b> are required. Phone, date of birth, gender, height, weight, goal, blood group, address, emergency contact, guardian, health issues, injuries, trainer (name or email) and joined date are optional.</li>
      <li>Upload the .xlsx or .csv file. Nothing is saved until you confirm.</li>
      <li>Imported members sign in with <b>Forgot password</b> to set their own password.</li>
    </ol>
    <input ref={input} type="file" hidden accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={pick} />
    <div className="import-actions">
      <Button onClick={() => input.current?.click()} disabled={Boolean(busy)}>{busy === "check" ? "Checking…" : file ? "Choose another file" : "Choose file"}</Button>
      {file && <span className="muted">{file.name}</span>}
    </div>
    <Notice error={error} />
    {result && <>
      {result.committed
        ? <Notice tone="success" error={`Imported ${summary.imported} client${summary.imported === 1 ? "" : "s"}.${summary.duplicate + summary.error ? ` ${summary.duplicate + summary.error} row(s) were skipped.` : ""}`} />
        : <div className="import-summary" role="status">
          <span><b>{summary.total}</b> rows</span>
          <StatusPill tone="success">✓ {summary.ready} ready</StatusPill>
          {summary.duplicate > 0 && <StatusPill tone="warning">↺ {summary.duplicate} already exist</StatusPill>}
          {summary.error > 0 && <StatusPill tone="danger">✕ {summary.error} need fixing</StatusPill>}
        </div>}
      {result.unknownHeaders.length > 0 && <p className="muted">Ignored columns: {result.unknownHeaders.join(", ")}</p>}
      {(visible.length > 0 || problems.length < result.rows.length) && <div className="table-wrap"><table>
        <thead><tr><th>Row</th><th>Name</th><th>Email</th><th>Status</th><th>Details</th></tr></thead>
        <tbody>{visible.map((row) => <tr key={row.line}><td>{row.line}</td><td>{row.fullName || "—"}</td><td>{row.email || "—"}</td><td><StatusPill tone={STATUS[row.status].tone}>{STATUS[row.status].label}</StatusPill></td><td>{row.errors.join("; ") || (row.trainer ? `Trainer: ${row.trainer}` : "")}</td></tr>)}</tbody>
      </table></div>}
      {problems.length < result.rows.length && <Button variant="ghost" onClick={() => setShowAll(!showAll)}>{showAll ? "Show only rows with problems" : `Show all ${result.rows.length} rows`}</Button>}
      {!result.committed && <div className="form-actions">
        <Button onClick={() => check(file, true)} disabled={!summary.ready || Boolean(busy)}>{busy === "import" ? "Importing…" : `Import ${summary.ready} client${summary.ready === 1 ? "" : "s"}`}</Button>
        {summary.ready < summary.total && <small className="muted">Rows that already exist or need fixing are skipped.</small>}
      </div>}
    </>}
  </Card>;
}
