"use client";
import { useEffect, useRef, useState } from "react";
import { preparePhoto } from "../../lib/prepare-photo";

function SalesPhoto({ src, number, onRemove }) {
  const [failed, setFailed] = useState(false);
  return (
    <li>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open sales photo ${number}`}
      >
        {failed ? (
          <span className="hint">Preview unavailable. Open photo.</span>
        ) : (
          <img
            src={src}
            alt={`Sales photo ${number}`}
            onError={() => setFailed(true)}
          />
        )}
      </a>
      <span>Sales photo {number}</span>
      <button
        type="button"
        className="plain-button"
        aria-label={`Remove sales photo ${number}`}
        onClick={onRemove}
      >
        Remove
      </button>
    </li>
  );
}

export default function OfferContext({
  id,
  message,
  onMessage,
  photos,
  onPhotos,
  files,
  onFiles,
  preparing,
  onPreparing,
  onError,
}) {
  const input = useRef(null);
  const [expanded, setExpanded] = useState(
    Boolean(message || photos.length || files.length),
  );
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  async function choosePhotos(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length || preparing) return;
    if (photos.length + files.length + selected.length > 3) {
      onError("Attach up to 3 sales photos. Remove one before adding another.");
      return;
    }
    onPreparing(true);
    onError("");
    try {
      const prepared = [];
      for (const file of selected) prepared.push(await preparePhoto(file));
      onFiles([...files, ...prepared]);
    } catch (error) {
      onError(
        error.message || "That photo could not be prepared. Try another photo.",
      );
    } finally {
      onPreparing(false);
    }
  }
  return (
    <details
      className="offer-context"
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        Message & sales photos <span>Optional</span>
      </summary>
      <p className="hint">
        Included in the seller’s offer email and your copy.
      </p>
      <label className="field">
        Message to seller
        <textarea
          rows={4}
          maxLength={3000}
          value={message}
          onChange={(event) => onMessage(event.target.value)}
          placeholder="Explain how you arrived at the price, or add context about condition and recent sales."
        />
      </label>
      {(photos.length > 0 || previews.length > 0) && (
        <ul className="offer-sales-photos">
          {photos.map((photo, index) => (
            <SalesPhoto
              key={photo.id}
              src={`/api/admin/offer-photo?id=${id}&photo=${photo.id}`}
              number={index + 1}
              onRemove={() =>
                onPhotos(photos.filter((item) => item.id !== photo.id))
              }
            />
          ))}
          {previews.map((src, index) => (
            <SalesPhoto
              key={src}
              src={src}
              number={photos.length + index + 1}
              onRemove={() => onFiles(files.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="button secondary small"
        disabled={preparing || photos.length + files.length >= 3}
        onClick={() => input.current?.click()}
      >
        {preparing ? "Preparing photos…" : "Add sales photos"}
      </button>
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        onChange={choosePhotos}
      />
      <p className="hint" role="status">
        {photos.length + files.length} of 3 photos added. You can attach
        screenshots or photos of recent sales.
      </p>
    </details>
  );
}
