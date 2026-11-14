import { isOpenNow, openingHoursSummary } from "../../../constants/openingHours.js";
import { todayWeekday } from "../../../constants/schedule.js";

// Opening hours card with an open/closed indicator for right now.
export default function OpeningHours() {
  const open = isOpenNow();
  const todayRow = todayWeekday() === 7 ? 1 : 0;
  return <section className="opening-hours" aria-label="Opening hours">
    <div className="opening-hours-head">
      <p className="overline">OPENING HOURS</p>
      <span className={`opening-status ${open ? "is-open" : "is-closed"}`}><i aria-hidden="true" />{open ? "Open now" : "Closed now"}</span>
    </div>
    <dl>{openingHoursSummary.map(([days, hours], index) => <div key={days} className={index === todayRow ? "is-today" : ""}>
      <dt>{days}{index === todayRow && <em>Today</em>}</dt>
      <dd>{hours}</dd>
    </div>)}</dl>
  </section>;
}
