import { db, newId } from "./db";
import type { Session, Segment } from "./types";

export async function createSession(args: {
  storyId?: string | null;
  topicPrompt?: string | null;
} = {}): Promise<Session> {
  const session: Session = {
    id: newId(),
    date: new Date().toISOString(),
    status: "recording",
    summary: null,
    storyId: args.storyId ?? null,
    topicPrompt: args.topicPrompt ?? null,
  };
  await db.sessions.add(session);
  return session;
}

export async function migrateOrphanSessions(): Promise<void> {
  // Wave A created sessions without a linked story. Auto-create stub stories
  // for those so Wave B's story-centric UI has something to show.
  const orphans = await db.sessions.filter((s) => !s.storyId).toArray();
  if (orphans.length === 0) return;
  const { createStory, linkSessionToStory } = await import("./stories");
  for (const s of orphans) {
    const story = await createStory({
      title: "",
      summary: s.summary ?? "",
      sessionIds: [s.id],
    });
    // Use the session's date as the story's createdAt so chronology stays sensible.
    await db.stories.update(story.id, { createdAt: s.date });
    await linkSessionToStory(story.id, s.id);
  }
}

export async function appendSegment(args: {
  sessionId: string;
  audioBlob: Blob;
  mimeType: string;
  durationMs: number;
  transcript: string;
}): Promise<Segment> {
  const order = await db.segments.where("sessionId").equals(args.sessionId).count();
  const segment: Segment = {
    id: newId(),
    sessionId: args.sessionId,
    order,
    audioBlob: args.audioBlob,
    mimeType: args.mimeType,
    durationMs: args.durationMs,
    transcript: args.transcript,
    timestamp: new Date().toISOString(),
    followUpQuestion: null,
  };
  await db.segments.add(segment);
  return segment;
}

export async function setSegmentFollowUp(segmentId: string, question: string): Promise<void> {
  await db.segments.update(segmentId, { followUpQuestion: question });
}

export async function listSegments(sessionId: string): Promise<Segment[]> {
  const segs = await db.segments.where("sessionId").equals(sessionId).toArray();
  return segs.sort((a, b) => a.order - b.order);
}

export async function getAccumulatedTranscript(sessionId: string): Promise<string> {
  const segs = await listSegments(sessionId);
  return segs.map((s) => s.transcript.trim()).filter(Boolean).join("\n\n");
}

export async function finishSession(sessionId: string, summary: string): Promise<void> {
  await db.sessions.update(sessionId, { status: "completed", summary });
}

export async function listSessions(): Promise<Session[]> {
  const all = await db.sessions.toArray();
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getSession(id: string): Promise<Session | undefined> {
  return db.sessions.get(id);
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction("rw", db.sessions, db.segments, async () => {
    await db.segments.where("sessionId").equals(id).delete();
    await db.sessions.delete(id);
  });
}
