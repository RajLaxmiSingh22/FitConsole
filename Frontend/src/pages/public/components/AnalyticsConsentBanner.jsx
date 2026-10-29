import { Button } from "../../../components/ui/index.js";

export default function AnalyticsConsentBanner({ consent, onChoose, onClose }) {
  return <aside className="analytics-consent" role="dialog" aria-label="Analytics preferences">
    <div><strong>Choose analytics preferences</strong><p>Optional first-party analytics counts public page visits. It is off unless you accept. See the <a href="/privacy">privacy notice</a>.</p></div>
    <div className="analytics-consent-actions">
      <Button variant="outline" onClick={() => onChoose("declined")}>Decline</Button>
      <Button onClick={() => onChoose("accepted")}>Accept analytics</Button>
      {consent && <button className="analytics-consent-close" type="button" onClick={onClose}>Close</button>}
    </div>
  </aside>;
}
