import { useEffect, useState } from "react";
import { Button, Card, EmptyState, Field, LoadingState, Notice, PageHeader, StatusPill } from "../../components/ui/index.js";
import { useLoad } from "../../hooks/useLoad.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { dateLabel } from "../../utils/format.js";

const MIN_LENGTH = 50;

// Owner: write and publish the gym agreement members accept before enrolling, checking in or paying online.
export default function AgreementEditor() {
  const agreement = useLoad(async () => responseData(await apiCalls.waivers.versions()));
  const current = agreement.data?.current ?? null;
  // "default" means members are accepting the built-in standard agreement.
  const usingDefault = !current || current.source === "default";
  const versions = agreement.data?.versions ?? [];
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (agreement.data) setText(current?.text ?? "");
  }, [agreement.data, current?.text]);

  const trimmed = text.trim();
  const unchanged = Boolean(current) && trimmed === current.text;
  const tooShort = trimmed.length < MIN_LENGTH;

  async function publish() {
    setPublishing(true);
    setError("");
    setNotice("");
    try {
      const published = responseData(await apiCalls.waivers.publish(trimmed));
      setConfirming(false);
      setNotice(`Version ${published.version} is live. Members will be asked to accept it before their next enrolment, check-in or payment.`);
      agreement.refresh();
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to publish the agreement."));
    } finally {
      setPublishing(false);
    }
  }

  if (agreement.loading && !agreement.data) return <LoadingState label="Loading gym agreement…" />;

  return <>
    <PageHeader eyebrow="Settings" title="Gym agreement" description="The training agreement members accept before they can enrol, check in or pay online." />
    <Notice error={agreement.error || error} />
    <Notice tone="success" error={notice} />

    <section className={`mship-hero ${usingDefault ? "mship-hero--due" : "mship-hero--active"}`} aria-label="Agreement status">
      <div className="mship-hero-copy">
        <p className="overline">{usingDefault ? "STANDARD AGREEMENT" : "LIVE"}</p>
        <h2>{usingDefault ? "Members see the standard agreement" : `Version ${current.version} is live`}</h2>
        <p className="muted">{usingDefault
          ? "Online payments work now. Members tick a box at checkout to accept this standard text. Edit it below to make it your gym's own."
          : `${current.publishedAt ? `Published ${dateLabel(current.publishedAt)}` : "Set in the server configuration"}. Publishing a change creates a new version members accept at their next payment.`}</p>
      </div>
      <StatusPill tone={usingDefault ? "warning" : "success"}>{usingDefault ? "Standard text" : "Your agreement"}</StatusPill>
    </section>

    <Card title="Edit agreement" eyebrow={usingDefault ? "Make it your own" : "Next version"}>
      {usingDefault && <p className="mship-hint agreement-draft-note">This is general starter text. Check it with your legal adviser and change anything that doesn't match how your gym works.</p>}
      <Field label="Agreement text" className="field--wide">
        <textarea className="agreement-text" rows="18" maxLength="20000" value={text} onChange={(event) => { setText(event.target.value); setConfirming(false); }} />
      </Field>
      <div className="agreement-actions">
        <span className="muted">{trimmed.length.toLocaleString("en-IN")} / 20,000 characters{tooShort ? ` · at least ${MIN_LENGTH} needed` : ""}</span>
        <div className="row-actions">
          {current && <Button variant="ghost" disabled={unchanged || publishing} onClick={() => { setText(current.text); setConfirming(false); }}>Discard changes</Button>}
          {!confirming
            ? <Button disabled={tooShort || (unchanged && !usingDefault) || publishing} onClick={() => setConfirming(true)}>{usingDefault ? "Publish as my agreement" : "Publish new version"}</Button>
            : <>
              <Button variant="outline" disabled={publishing} onClick={() => setConfirming(false)}>Cancel</Button>
              <Button disabled={publishing} onClick={publish}>{publishing ? "Publishing…" : "Confirm & publish"}</Button>
            </>}
        </div>
      </div>
      {confirming && <p className="mship-hint" role="status">Members who already accepted will tick the box once more at their next payment, enrolment or check-in.</p>}
    </Card>

    <Card title="Version history" eyebrow="Published from the app">
      {versions.length ? <div className="mship-history">{versions.map((version, index) => <article className="mship-history-row agreement-version" key={version.id}>
        <div>
          <b>Version {version.version}</b>
          <small>{dateLabel(version.createdAt)} · {version.publisher?.fullName ?? "Owner"}</small>
        </div>
        <StatusPill tone={index === 0 ? "success" : "neutral"}>{index === 0 ? "Live" : "Replaced"}</StatusPill>
      </article>)}</div> : <EmptyState title="No versions yet" detail="Versions you publish here will be listed with their date." />}
    </Card>
  </>;
}
