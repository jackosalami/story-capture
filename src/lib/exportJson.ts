// Full JSON export of every entity in the local store.
// Audio blobs are large; by default we omit them and just note their existence.
// Caller can pass { includeAudio: true } to inline as base64.

import { db } from "../db/db";

interface ExportSegment {
  id: string;
  sessionId: string;
  order: number;
  mimeType: string;
  durationMs: number;
  transcript: string;
  timestamp: string;
  followUpQuestion: string | null;
  audioBase64?: string;
  audioOmitted?: true;
}

export interface ExportPayload {
  version: 1;
  exportedAt: string;
  sessions: unknown[];
  segments: ExportSegment[];
  stories: unknown[];
  characters: unknown[];
  chapters: unknown[];
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function buildExport(options: { includeAudio?: boolean } = {}): Promise<ExportPayload> {
  const [sessions, segments, stories, characters, chapters] = await Promise.all([
    db.sessions.toArray(),
    db.segments.toArray(),
    db.stories.toArray(),
    db.characters.toArray(),
    db.chapters.toArray(),
  ]);

  const exportSegments: ExportSegment[] = [];
  for (const seg of segments) {
    const base: ExportSegment = {
      id: seg.id,
      sessionId: seg.sessionId,
      order: seg.order,
      mimeType: seg.mimeType,
      durationMs: seg.durationMs,
      transcript: seg.transcript,
      timestamp: seg.timestamp,
      followUpQuestion: seg.followUpQuestion,
    };
    if (options.includeAudio) {
      base.audioBase64 = await blobToBase64(seg.audioBlob);
    } else {
      base.audioOmitted = true;
    }
    exportSegments.push(base);
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    sessions,
    segments: exportSegments,
    stories,
    characters,
    chapters,
  };
}

export async function downloadExport(options: { includeAudio?: boolean } = {}): Promise<void> {
  const payload = await buildExport(options);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `story-capture-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
