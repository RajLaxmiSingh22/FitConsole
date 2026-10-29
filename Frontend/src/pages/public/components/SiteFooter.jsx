export default function SiteFooter() {
  return <footer className="public-footer">
    <a className="brand" href="/"><span className="brand-mark">F</span><span>FITCONSOLE</span></a>
    <p>Train hard. Eat smart. Grow faster.</p>
    <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/waiver">Waiver info</a><button type="button" className="analytics-preferences-link" onClick={() => window.dispatchEvent(new Event("fitconsole:analytics-preferences"))}>Analytics preferences</button></nav>
  </footer>;
}
