export const MAX_SUBMISSION_PHOTOS = 100;

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
      onPrepared(photo);
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
