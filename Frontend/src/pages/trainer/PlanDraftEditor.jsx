import { useState } from "react";
import { Button, Field } from "../../components/ui/index.js";
import { getApiError } from "../../services/api.js";

export default function PlanDraftEditor({ plan, saving, onSave, onCancel }) {
  const [content, setContent] = useState(JSON.stringify(plan.plan ?? {}, null, 2));
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const parsed = JSON.parse(content);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        setError("Plan content must be a JSON object.");
        return;
      }
      await onSave(parsed);
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? "Enter valid JSON before saving." : getApiError(requestError, "Unable to save the draft."));
    }
  }
  return <form className="plan-editor" onSubmit={submit}>
    <details className="plan-advanced">
      <summary>Advanced: edit plan JSON</summary>
      <Field label="Draft plan JSON"><textarea rows="12" value={content} onChange={(event) => setContent(event.target.value)} spellCheck="false" /></Field>
    </details>
    {error && <p className="inline-error">{error}</p>}
    <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save draft"}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
  </form>;
}
