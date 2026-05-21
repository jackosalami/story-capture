// Thin OpenAI client used directly from the browser.
// PRD §7.3: the user supplies their own key; no backend.
// Built so models are swappable per PRD Open Q #4 — callers pass the model name.

import { useSettings } from "../store/settings";

const BASE = "https://api.openai.com/v1";

function authHeaders(): Record<string, string> {
  const key = useSettings.getState().openaiApiKey;
  if (!key) throw new Error("Falta la clave de OpenAI. Configúrala en Ajustes.");
  return { Authorization: `Bearer ${key}` };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chat(args: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      temperature: args.temperature ?? 0.7,
      max_tokens: args.maxTokens,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI chat error (${res.status}): ${text}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI chat: respuesta sin contenido.");
  }
  return content.trim();
}

export async function transcribe(args: {
  model: string;
  blob: Blob;
  filename?: string;
  language?: string; // ISO-639-1, e.g. "es"
  prompt?: string;
}): Promise<string> {
  const form = new FormData();
  form.append("file", args.blob, args.filename ?? "audio.webm");
  form.append("model", args.model);
  if (args.language) form.append("language", args.language);
  if (args.prompt) form.append("prompt", args.prompt);
  // response_format=text returns plain text, simplest to parse.
  form.append("response_format", "text");

  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: authHeaders(), // do NOT set Content-Type — fetch handles multipart boundary
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI transcribe error (${res.status}): ${text}`);
  }
  return (await res.text()).trim();
}

// Lightweight validation: list models endpoint should return 200 with a valid key.
export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
