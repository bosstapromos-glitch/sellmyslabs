"use client";
import { useEffect, useRef, useState } from "react";

const extension = type => type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

function PhotoViewer({ src, number, type, onClose }) {
  const dialog = useRef(null);
  const [actualSize, setActualSize] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="photo-inspection" onClose={onClose} aria-labelledby="photo-inspection-heading">
    <div className="photo-inspection-heading"><h2 id="photo-inspection-heading">Photo {number}</h2><button type="button" className="button quiet small" onClick={() => dialog.current?.close()}>Close preview</button></div>
    <p>Check the item details and condition. Look for glare, blur or cropped details before pricing it.</p>
    <div className="photo-inspection-actions">
      <button type="button" className="button secondary small" aria-pressed={actualSize} onClick={() => setActualSize(v => !v)}>{actualSize ? "Fit photo" : "View full size"}</button>
      <a className="button secondary small" href={src} download={`submission-photo-${number}.${extension(type)}`}>Download photo</a>
    </div>
    <div className={`photo-inspection-image${actualSize ? " actual-size" : ""}`}><img src={src} alt={`Seller photo ${number}, enlarged for review`} /></div>
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
        <img src={source(photo.index)} alt={`Seller photo ${i + 1}`} loading="lazy" />
        <span>Enlarge photo</span>
      </button>
      <div className="owner-photo-caption"><strong>Photo {i + 1}</strong><a className="text-link" href={source(photo.index)} download={`submission-photo-${i + 1}.${extension(photo.type)}`}>Download</a></div>
    </article>)}</div>
    {selected !== null && <PhotoViewer src={source(selected)} type={photos.find(p => p.index === selected)?.type} number={photos.findIndex(p => p.index === selected) + 1} onClose={() => setSelected(null)} />}
  </section>;
}
