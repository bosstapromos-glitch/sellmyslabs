"use client";
import { useEffect, useRef, useState } from "react";

const extension = type => type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

function PhotoViewer({ src, number, type, total, onPrevious, onNext, onClose }) {
  const dialog = useRef(null);
  const imageArea = useRef(null);
  const [actualSize, setActualSize] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    setActualSize(false);
    imageArea.current?.scrollTo(0, 0);
  }, [number]);
  return <dialog ref={dialog} className="photo-inspection" onClose={onClose} aria-labelledby="photo-inspection-heading">
    <div className="photo-inspection-heading"><h2 id="photo-inspection-heading">Photo {number} of {total}</h2><button type="button" className="button quiet small" onClick={() => dialog.current?.close()}>Done</button></div>
    <p className="hint">Check details and condition. Use full size to inspect the label.</p>
    <div className="photo-inspection-actions">
      <button type="button" className="button secondary small" aria-pressed={actualSize} onClick={() => setActualSize(v => !v)}>{actualSize ? "Fit photo" : "View full size"}</button>
      <a className="button secondary small" href={src} download={`submission-photo-${number}.${extension(type)}`}>Download photo</a>
    </div>
    <div ref={imageArea} tabIndex={0} role="region" aria-label="Photo inspection; scroll to inspect full-size photo" className={`photo-inspection-image${actualSize ? " actual-size" : ""}`}><img src={src} alt={`Seller photo ${number}, enlarged for review`} /></div>
    {total > 1 && <div className="photo-inspection-navigation"><button type="button" className="button quiet small" disabled={number === 1} onClick={onPrevious}>← Previous</button><button type="button" className="button quiet small" disabled={number === total} onClick={onNext}>Next →</button></div>}
  </dialog>;
}

export default function PhotoReview({ id, photos }) {
  const [selected, setSelected] = useState(null);
  const source = index => `/api/admin/photo?id=${id}&index=${index}`;
  return <section className="owner-photo-review" aria-labelledby="owner-photos-heading">
    <div className="card-heading"><h3 id="owner-photos-heading">Review photos</h3><span className="hint">{photos.length} photo{photos.length === 1 ? "" : "s"}</span></div>
    <p className="hint">Private review · Enlarge a photo to check the item details and condition, or download a copy for closer inspection.</p>
    {!photos.length && <p className="hint">No photos were included with this earlier request.</p>}
    <div className="owner-photo-grid">{photos.map((photo, i) => <article key={photo.index} className="owner-photo-tile">
      <button type="button" className="owner-photo-preview" onClick={() => setSelected(photo.index)} aria-label={`Enlarge photo ${i + 1}`}>
        <img src={source(photo.index)} alt={`Seller photo ${i + 1}`} loading="lazy" decoding="async" />
        <span>Enlarge photo</span>
      </button>
      <div className="owner-photo-caption"><strong>Photo {i + 1}</strong><a className="text-link" href={source(photo.index)} download={`submission-photo-${i + 1}.${extension(photo.type)}`}>Download</a></div>
    </article>)}</div>
    {selected !== null && <PhotoViewer src={source(selected)} type={photos.find(p => p.index === selected)?.type} number={photos.findIndex(p => p.index === selected) + 1} total={photos.length}
      onPrevious={() => setSelected(photos[photos.findIndex(p => p.index === selected) - 1].index)}
      onNext={() => setSelected(photos[photos.findIndex(p => p.index === selected) + 1].index)} onClose={() => setSelected(null)} />}
  </section>;
}
