// Consent checkbox shown next to a Pay button until the member has accepted the current gym agreement.
export default function AgreementConsent({ checked, onChange, disabled = false }) {
  return <label className="checkbox-field mship-consent">
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <span>I agree to the <a href="/agreement" target="_blank" rel="noopener noreferrer">gym agreement</a>.</span>
  </label>;
}
