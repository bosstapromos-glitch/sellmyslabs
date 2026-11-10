import { heicTo } from "heic-to/next";

self.onmessage = async ({ data }) => {
  let source;
  try {
    source = await heicTo({ blob: data, type: "bitmap" });
    const scale = Math.min(1, 1800 / Math.max(source.width, source.height));
    const bitmap = await createImageBitmap(source, {
      resizeWidth: Math.max(1, Math.round(source.width * scale)),
      resizeHeight: Math.max(1, Math.round(source.height * scale)),
      resizeQuality: "high",
    });
    self.postMessage({ bitmap }, [bitmap]);
  } catch {
    self.postMessage({ error: "Could not decode iPhone photo" });
  } finally {
    source?.close();
  }
};
