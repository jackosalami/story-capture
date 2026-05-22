// Client-side image helpers — resize to a sane size before sending to OpenAI,
// and produce a data URL for the model.

export interface ResizedImage {
  blob: Blob;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
}

// Resize a File/Blob so the longest edge is at most `maxDim` px, re-encoded as JPEG.
// Keeps payloads small and predictable for the vision model.
export async function resizeImage(file: Blob, maxDim = 1024, quality = 0.85): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("No se pudo codificar la imagen."))),
      "image/jpeg",
      quality,
    );
  });
  const dataUrl = await blobToDataUrl(blob);
  return { blob, mimeType: "image/jpeg", dataUrl, width: w, height: h };
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
