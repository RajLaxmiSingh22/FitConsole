import { LoadingState } from "../../../components/ui/index.js";
import { gymProfile } from "../../../constants/gymProfile.js";
import { useLoad } from "../../../hooks/useLoad.js";
import { apiCalls, responseData } from "../../../services/api.js";

function PlaceholderTiles() {
  return gymProfile.gallery.map(([title, caption, tone], index) => <figure key={title} className={`gallery-tile tt-tone-${tone} ${index === 0 ? "is-wide" : ""}`}>
    <span className="gallery-mark" aria-hidden="true">FC</span>
    <figcaption><b>{title}</b><small>{caption}</small></figcaption>
  </figure>);
}

// Owner-managed photos and videos; styled placeholder tiles show until the gym uploads its own.
export default function GalleryPage() {
  const gallery = useLoad(async () => responseData(await apiCalls.gallery.public()), []);
  const items = gallery.data ?? [];
  const hasMedia = items.length > 0;
  return <div className="static-page">
    <p className="muted gallery-intro">{hasMedia ? "A look around the gym." : "A look around the gym. Real photos are coming soon; these tiles show what each space is for."}</p>
    {gallery.loading && !gallery.data
      ? <LoadingState />
      : <div className="gallery-grid">{hasMedia
        ? items.map((item, index) => <figure key={item.id} className={`gallery-tile gallery-tile--media gallery-tile--${item.mediaType} ${index === 0 ? "is-wide" : ""}`}>
          {item.mediaType === "video"
            ? <video src={item.url} poster={item.posterUrl ?? undefined} controls playsInline preload="none" aria-label={item.title} />
            : <img src={item.url} alt={item.caption ? `${item.title}: ${item.caption}` : item.title} loading="lazy" />}
          <figcaption><b>{item.title}</b>{item.caption && <small>{item.caption}</small>}</figcaption>
        </figure>)
        : <PlaceholderTiles />}</div>}
    <div className="static-callout"><div><h2>See it in person.</h2><p className="muted">The best way to see the gym is a trial class.</p></div><a className="button button--primary" href="/trial">Book a trial ↗</a></div>
  </div>;
}
