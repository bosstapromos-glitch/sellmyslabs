import { heicTo } from "heic-to/next";

self.onmessage = async ({ data }) => {
  try {
    const bitmap = await heicTo({ blob: data, type: "bitmap" });
    self.postMessage({ bitmap }, [bitmap]);
  } catch {
    self.postMessage({ error: "Could not decode iPhone photo" });
  }
};
