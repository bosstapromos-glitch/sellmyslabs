export const MAX_SUBMISSION_PHOTOS = 100;
// Shared by the browser, which prepares photos, and the server, which checks them.
// Large enough to keep slab labels and certification numbers readable.
export const PHOTO_MAX_EDGE = 2400;
export const MAX_PHOTO_BYTES = 1000000;

// Process serially, retain successes, and release each source File as we finish it.
export async function prepareSelection(
  queue,
  remaining,
  prepare,
  onPrepared,
  onProgress,
) {
  const total = queue.length;
  const failures = [];
  let added = 0;
  let attempted = 0;
  while (queue.length && added < remaining) {
    const file = queue.shift();
    onProgress({ current: ++attempted, total });
    try {
      const photo = await prepare(file);
      await onPrepared(photo);
      added++;
    } catch (error) {
      failures.push(
        `${file.name}: ${error.message || "Could not open this photo. Try a JPG."}`,
      );
    }
  }
  const skipped = queue.length;
  queue.length = 0;
  return { added, failures, skipped };
}
