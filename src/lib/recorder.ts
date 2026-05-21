// Thin wrapper around MediaRecorder for chunked-segment recording.
// One Record→Stop pair produces one Blob, per PRD §6.1.

export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
}

export class ChunkRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;
  private mimeType = "";

  async start(): Promise<void> {
    if (this.recorder) throw new Error("Ya estás grabando.");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Prefer opus webm — small files, supported in all modern browsers.
    const preferred = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "",
    ];
    let chosen = "";
    for (const t of preferred) {
      if (t === "" || MediaRecorder.isTypeSupported(t)) {
        chosen = t;
        break;
      }
    }
    this.mimeType = chosen || "audio/webm";
    this.recorder = chosen
      ? new MediaRecorder(this.stream, { mimeType: chosen })
      : new MediaRecorder(this.stream);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.startedAt = performance.now();
    this.recorder.start();
  }

  async stop(): Promise<RecordingResult> {
    const rec = this.recorder;
    if (!rec) throw new Error("No estás grabando.");
    const durationMs = performance.now() - this.startedAt;
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        resolve(new Blob(this.chunks, { type: this.mimeType || "audio/webm" }));
      };
      rec.stop();
    });
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
    return { blob, mimeType: this.mimeType || "audio/webm", durationMs };
  }

  get isRecording(): boolean {
    return this.recorder !== null;
  }
}
