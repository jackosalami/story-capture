// Build a self-contained shareable HTML book and upload it for a public URL.
//
// The HTML embeds title + 5 image+text page spreads. All images are base64
// data-URLs so the file is a single artifact with no external deps. We
// upload to 0x0.st (anonymous, CORS-enabled, no API key) and return the
// resulting URL. If upload fails we fall back to triggering a download.

import type { KidCharacter, KidStory, StoryLanguage } from "../db/types";
import { splitStoryIntoSections } from "./splitStory";
import { getStoryInLanguage } from "./translateStory";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function buildShareableHtml(args: {
  story: KidStory;
  cast: KidCharacter[];
  language: StoryLanguage;
}): Promise<string> {
  const { title, content } = getStoryInLanguage(args.story, args.language);
  const sceneCount = args.story.imagePrompts?.scenes.length ?? 5;
  const sections = splitStoryIntoSections(content, sceneCount);

  // Pre-encode all images as data URLs so the HTML is fully self-contained.
  const imageDataUrls: (string | null)[] = await Promise.all(
    Array.from({ length: sceneCount }).map(async (_, i) => {
      const blob = args.story.imagePrompts?.scenes[i]?.image;
      if (!blob) return null;
      return blobToDataUrl(blob);
    }),
  );

  const cover = imageDataUrls.find((u) => u) ?? null;
  const castLine = args.cast.length
    ? `<p class="cast">Con ${args.cast.map((c) => escapeHtml(c.name)).join(", ")}</p>`
    : "";

  const pages = sections.map((text, i) => {
    const img = imageDataUrls[i];
    const moment = args.story.imagePrompts?.scenes[i]?.momentTitle ?? "";
    return `
    <article class="spread">
      <div class="page page-image">
        ${img ? `<img src="${img}" alt="" />` : '<div class="placeholder">Sin imagen</div>'}
      </div>
      <div class="page page-text">
        ${moment ? `<p class="moment">${escapeHtml(moment)}</p>` : ""}
        <div class="prose">${escapeHtml(text).replace(/\n{2,}/g, "</p><p>").replace(/^/, "<p>").replace(/$/, "</p>")}</div>
        <p class="folio">${i + 1} / ${sceneCount}</p>
      </div>
    </article>`;
  }).join("\n");

  return `<!doctype html>
<html lang="${args.language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title || "Cuento")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Fredoka:wght@600&family=Nunito:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: linear-gradient(180deg, #ecdcff 0%, #fff8e7 30%, #fff1c2 100%);
    font-family: "Nunito", system-ui, sans-serif;
    color: #2d1b4e;
    min-height: 100vh;
    padding: 24px 16px 64px;
  }
  .book { max-width: 980px; margin: 0 auto; }
  .cover {
    position: relative;
    aspect-ratio: 3 / 4;
    max-width: 420px;
    margin: 12px auto 40px;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 24px 48px rgba(45, 27, 78, 0.25);
    background: linear-gradient(135deg, #a78bfa, #ff6b9d, #ff8c42);
    color: white;
  }
  .cover img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.8; mix-blend-mode: multiply; }
  .cover .cover-overlay {
    position:absolute; inset:0;
    background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0.1));
    display:flex; flex-direction:column; justify-content:flex-end;
    padding: 24px;
  }
  .cover h1 {
    font-family: "Fredoka", system-ui, sans-serif;
    font-size: 32px; line-height: 1.1; margin: 0;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }
  .cover .for-child { margin-top: 12px; font-size: 14px; opacity: 0.9; }
  .cast { text-align:center; color: rgba(45,27,78,0.7); margin: 0 0 32px; }
  .spread {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 24px auto;
    max-width: 1000px;
  }
  @media (max-width: 720px) {
    .spread { grid-template-columns: 1fr; }
  }
  .page {
    background: #fff8e7;
    border-radius: 18px;
    box-shadow: 0 12px 32px rgba(45,27,78,0.12);
    overflow: hidden;
    aspect-ratio: 3 / 4;
  }
  .page-image {
    background: #fff8e7;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .page-image img { width: 100%; height: 100%; object-fit: contain; border-radius: 12px; }
  .placeholder { color: rgba(45,27,78,0.4); font-family: "Fredoka", system-ui, sans-serif; }
  .page-text {
    padding: 36px 32px;
    overflow-y: auto;
    position: relative;
  }
  .moment {
    font-family: "Fredoka", system-ui, sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    color: #a78bfa;
    margin: 0 0 16px;
  }
  .prose {
    font-family: "Fraunces", Georgia, serif;
    font-size: 18px;
    line-height: 1.8;
    color: #2d1b4eee;
  }
  .prose p { margin: 0 0 12px; }
  .folio {
    position: absolute; bottom: 16px; right: 24px;
    font-family: "Fredoka", system-ui, sans-serif;
    font-size: 11px; color: rgba(45,27,78,0.45);
    margin: 0;
  }
  .fin {
    text-align: center;
    margin: 48px auto 0;
    color: #2d1b4e;
  }
  .fin h2 {
    font-family: "Fredoka", system-ui, sans-serif;
    font-size: 48px; margin: 0;
  }
</style>
</head>
<body>
  <div class="book">
    <div class="cover">
      ${cover ? `<img src="${cover}" alt="" />` : ""}
      <div class="cover-overlay">
        <p style="font-family:'Fredoka',system-ui,sans-serif;text-transform:uppercase;letter-spacing:0.15em;font-size:11px;margin:0 0 6px;opacity:0.9;">Un cuento</p>
        <h1>${escapeHtml(title || "Cuento")}</h1>
        ${args.story.forChild ? `<p class="for-child">💝 Para ${escapeHtml(args.story.forChild)}</p>` : ""}
      </div>
    </div>
    ${castLine}
    ${pages}
    <div class="fin">
      <h2>Fin</h2>
    </div>
  </div>
</body>
</html>`;
}

// We try several anonymous file hosts in order. Each is free, no auth, and
// (in principle) supports CORS POST from a browser. If one fails we move to
// the next. Different services have different reliability windows / regional
// availability, so the chain is more robust than any single endpoint.

async function uploadToCatbox(blob: Blob, filename: string): Promise<string> {
  // Permanent (no expiry), 200 MB limit, well-known browser-CORS support.
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", blob, filename);
  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`catbox failed (${res.status}): ${t}`);
  }
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error(`catbox bad response: ${url}`);
  return url;
}

async function uploadToLitterbox(blob: Blob, filename: string): Promise<string> {
  // Temporary (24h–72h depending on flag). Same operator as catbox; different
  // backend with different anti-abuse rules.
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", "72h");
  form.append("fileToUpload", blob, filename);
  const res = await fetch("https://litterbox.catbox.moe/resources/internals/api.php", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`litterbox failed (${res.status}): ${t}`);
  }
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error(`litterbox bad response: ${url}`);
  return url;
}

async function uploadToZeroXZero(blob: Blob, filename: string): Promise<string> {
  // ~1-year retention for small files, ~512 MB cap.
  const form = new FormData();
  form.append("file", blob, filename);
  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`0x0.st failed (${res.status}): ${t}`);
  }
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error(`0x0.st bad response: ${url}`);
  return url;
}

// Try services in this order until one returns a URL.
async function uploadAnywhere(blob: Blob, filename: string): Promise<{ url: string; service: string }> {
  const attempts: { name: string; fn: () => Promise<string> }[] = [
    { name: "catbox.moe", fn: () => uploadToCatbox(blob, filename) },
    { name: "0x0.st", fn: () => uploadToZeroXZero(blob, filename) },
    { name: "litterbox.catbox.moe", fn: () => uploadToLitterbox(blob, filename) },
  ];
  const failures: string[] = [];
  for (const a of attempts) {
    try {
      const url = await a.fn();
      return { url, service: a.name };
    } catch (e) {
      failures.push(`${a.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error("All upload services failed:\n" + failures.join("\n"));
}

// Returns the public URL of the uploaded book and the service that hosted it.
export async function shareBook(args: {
  story: KidStory;
  cast: KidCharacter[];
  language: StoryLanguage;
}): Promise<{ url: string; service: string }> {
  const html = await buildShareableHtml(args);
  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  const slug = (args.story.title || "cuento")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "cuento";
  return uploadAnywhere(blob, `${slug}.html`);
}

// Fallback: trigger a local download of the HTML.
export async function downloadBookHtml(args: {
  story: KidStory;
  cast: KidCharacter[];
  language: StoryLanguage;
}): Promise<void> {
  const html = await buildShareableHtml(args);
  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = (args.story.title || "cuento")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "cuento";
  a.href = url;
  a.download = `${slug}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
