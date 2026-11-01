export async function requestJSON(
  url,
  options = {},
  fallback = "Could not complete that request. Please try again.",
  fetchRequest = fetch,
) {
  let response;
  try {
    response = await fetchRequest(url, { cache: "no-store", ...options });
  } catch {
    throw new Error("Could not connect. Check your connection and try again.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error(fallback);
    error.status = response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      typeof data?.error === "string" ? data.error : fallback,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
