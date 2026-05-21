# PRD: Story Capture
### A Spanish-first, self-hosted web app for turning spoken life stories into a book

**Version:** 1.0
**Date:** May 21, 2026
**Status:** Draft — ready for review

---

## 1. Overview

Story Capture is a free, self-hosted web application that helps a Spanish-speaking storyteller record her life stories through voice, organize them with structured metadata, and eventually transform them into book chapters — all through a guided, interview-like experience powered by AI.

The app is built for one specific person but designed to be reusable and open-source. It runs entirely in the browser (Vite + React), can be hosted for free on GitHub Pages or similar, and stores all data locally on the user's device by default. The only recurring cost is the AI API usage for transcription and follow-up questions.

---

## 2. Problem Statement

The storyteller has an entire book in her head — vivid stories full of characters, settings, emotions, and timelines — but no structured way to get them out. She doesn't write, and sitting in front of a blank page is paralyzing. She needs someone to interview her, guide her, and organize what she says.

Existing AI memoir tools (Autobiographer, StoriedLife, MemoirMaker, Remento, Memoirji, Tell Mel, etc.) address parts of this problem, but none combine everything needed for this specific use case. After researching 12 commercial products, the following gaps are clear:

**Gap 1 — No structured metadata capture.** Most apps treat stories as free-flowing text. Only MemoirMaker.ai and Squibler model characters and locations as first-class entities. None capture date, location, environment, and characters together as structured fields per story. This makes it nearly impossible to later organize stories into a coherent book with consistent characters and timelines.

**Gap 2 — Spanish is an afterthought.** Most apps are English-only (Autobiographer, Remento, ChatMemoir, AI Life Story, Times of My Life). Those that claim Spanish support either auto-translate to English for the final output (LifeMemoirs.ai, Tell Mel) or have unverified multilingual claims (StoriedLife's "58 languages"). Only Life-Story.ai and MemoirMaker.ai have been verified to produce Spanish prose end-to-end.

**Gap 3 — No data ownership.** The #1 user complaint across Reddit, ProductHunt, and Trustpilot is fear of losing data when a subscription lapses or a company shuts down. No competitor offers true self-hosting or local-first data storage.

**Gap 4 — AI overwrites the storyteller's voice.** Multiple user complaints about Remento and others: the AI "polishes" too aggressively. Users want control over how much the AI rewrites.

**Gap 5 — No plan-then-record workflow.** Users want to preview questions, think about their answers, and record when ready — not be put on the spot.

---

## 3. Users

### 3.1 The Storyteller (Primary)
- Spanish-speaking woman with a lifetime of stories
- Not tech-savvy — needs a simple, clear interface
- Will use the app solo, talking to it from a browser (desktop or tablet)
- Speaks in long, flowing narratives — needs the app to keep up, not interrupt
- Needs to feel guided but not controlled

### 3.2 The Admin/Editor (Secondary)
- You — the person building this and overseeing the book project
- Needs to review all transcripts, summaries, and metadata
- Needs to organize stories into chapters and trigger chapter generation
- May add notes, corrections, or tags to stories after the fact

---

## 4. Core Concepts

### 4.1 Session
A single recording sitting. The storyteller opens the app, records one or more segments about a topic, and closes the session. A session has:
- A date (when the session happened)
- One or more **recording segments** (audio chunks)
- A growing transcript (accumulates across segments — never wiped)
- AI-generated follow-up questions between segments
- A post-session summary (AI-generated)

### 4.2 Story
A discrete narrative extracted from one or more sessions. A story has structured metadata:
- **Title** — AI-suggested from the first ~2 minutes, editable
- **Summary** — 2-3 sentence overview (AI-generated, editable)
- **Story date** — when the events happened (approximate is fine: "spring 1972", "when I was about 8")
- **Location** — where it happened (free text: "la casa de mi abuela en Salamanca")
- **Environment** — sensory/atmospheric details (was it cold? dark? raining? a crowded market?)
- **Characters** — people present in the story, linked to persistent character profiles
- **Mood/Theme** — emotional tone (joy, loss, adventure, family, etc.)
- **Source sessions** — which session(s) this story was extracted from

### 4.3 Character (Persona)
A persistent profile for a recurring person across stories. Auto-detected from transcripts, confirmed by the storyteller. A character has:
- **Name** (canonical: "Tía María") + aliases ("María", "mi tía", "la tía")
- **Relationship** to the storyteller ("aunt on mother's side")
- **Physical description** (accumulated across stories)
- **Personality traits** (accumulated across stories)
- **Stories they appear in** (auto-linked)
- **Notes** (free text for additional context)

### 4.4 Chapter
A draft book chapter generated from a group of related stories. Created on demand by the admin, not auto-generated. A chapter has:
- **Title**
- **Source stories** (explicitly selected)
- **Generated prose** with configurable style
- **Edit history**

---

## 5. User Flows

### 5.1 Recording Flow (Storyteller)

```
1. Storyteller opens app → sees dashboard with past sessions and suggested topics
2. Taps "Nueva Historia" (New Story)
3. Sees the story setup screen:
   a. "¿De qué trata esta historia?" — 2-minute voice summary (used for title/summary)
   b. "¿Cuándo pasó esto?" — date picker or free text ("cuando tenía 8 años")
   c. "¿Dónde pasó?" — location free text
   d. "¿Cómo era el ambiente?" — environment free text or quick-select chips
      (frío, caluroso, oscuro, de noche, lluvioso, ruidoso, tranquilo...)
   e. "¿Quiénes estaban ahí?" — character selector (from existing) + add new
4. Taps "Empezar a Grabar" (Start Recording)
5. BIG red record button — speaks freely — taps "Parar" (Stop) when done
6. Audio chunk is sent for transcription (gpt-4o-mini-transcribe, cheapest/fastest)
7. Transcript appears on screen. Below it, AI follow-up question appears
   (generated by mid-tier model reading full session context)
   Example: "Mencionaste que tu abuela estaba cocinando. ¿Recuerdas qué estaba
   preparando? ¿Cómo olía la cocina?"
8. Storyteller can:
   a. Tap Record again → answer the question → new chunk added to session
   b. Skip the question → get a different one
   c. End session → AI generates session summary
9. Repeat steps 5-8 as many times as needed. Context accumulates.
10. On "Terminar Sesión" (End Session):
    - AI generates a 3-5 sentence summary of the full session
    - AI auto-detects any new characters mentioned and prompts for confirmation
    - Everything is saved locally
```

### 5.2 Review Flow (Admin/Editor)

```
1. Admin opens app → sees all sessions, stories, characters, and chapters
2. Can browse sessions chronologically or filter by character/theme/date
3. Can read full transcripts, listen to original audio, edit metadata
4. Can merge/split stories (e.g., combine two sessions about the same event)
5. Can select stories and trigger chapter generation
6. Can review and edit generated chapters
7. Can export everything (ZIP with audio, transcripts, metadata JSON, chapters)
```

### 5.3 Chapter Generation Flow

```
1. Admin selects 2-5 related stories (e.g., all stories about childhood in Salamanca)
2. Configures generation settings:
   a. Writing style: verbatim transcript / cleaned transcript / literary prose
   b. Creative license slider: "solo los hechos" ←→ "libertad creativa"
   c. Person: first person ("yo") or third person ("ella")
   d. Tone: neutral / warm / dramatic / humorous
3. AI generates chapter draft using all selected story transcripts + character profiles
4. Admin reviews, edits, regenerates sections as needed
5. Chapter is saved and can be exported
```

---

## 6. Feature Specification

### 6.1 Voice Recording & Transcription

| Aspect | Specification |
|--------|---------------|
| Recording | Browser-native via MediaRecorder API; WAV or WebM format |
| Chunk model | Record → Stop creates one chunk; multiple chunks per session |
| Transcription engine | OpenAI `gpt-4o-mini-transcribe` via API ($0.003/min) |
| Language | Spanish (primary); model handles Latin American + peninsular variants |
| Fallback | If API is down or user prefers free: browser-local Whisper via `transformers.js` (slower, ~2-3x realtime on modern hardware) |
| Audio preservation | Original audio files always saved locally; never discarded |
| Max chunk length | No hard limit; recommend ~5 minutes per chunk for natural pauses |

**Why gpt-4o-mini-transcribe over alternatives:** OpenAI now recommends it over gpt-4o-transcribe for best results. At $0.003/min it's the cheapest option — a 1-hour session costs $0.18. It handles Spanish well with low word error rates. For comparison: Whisper (legacy) is $0.006/min with higher error rates; gpt-4o-transcribe is $0.006/min with marginal accuracy gains not worth 2x cost for this use case.

**Why not fully local Whisper:** transformers.js Whisper works but is slow on older devices and requires downloading ~1.5GB of model weights. The API at $0.003/min is so cheap that 100 hours of recording would cost $18 total. Offer local as an optional fallback, not the default.

### 6.2 AI Follow-Up Questions

| Aspect | Specification |
|--------|---------------|
| Model | Mid-tier: GPT-4o-mini or Claude 3.5 Haiku (fast, cheap, good at Spanish) |
| Context window | Full session transcript so far + story metadata + character profiles mentioned |
| Prompt strategy | System prompt instructs the AI to act as a warm, curious interviewer; ask one question at a time; probe for sensory details, emotions, character descriptions; never interrupt or redirect aggressively |
| Language | All prompts and responses in Spanish |
| User control | Storyteller can skip any question; can end session at any time; AI never blocks |

**Prompt design principles (informed by competitor analysis):**
- Autobiographer uses Claude 3 for "emotionally supportive conversations" — emulate this warmth
- Squibler explicitly probes sensory details ("what did the kitchen smell like") — build this into prompts
- Tell Mel follows tangents naturally in 10-15 min calls — allow the same wandering
- Multiple competitors fail by making the experience feel like homework (weekly-email fatigue) — keep it conversational, not procedural

### 6.3 Character Auto-Detection

| Aspect | Specification |
|--------|---------------|
| Trigger | After each recording chunk, AI scans transcript for person mentions |
| Matching | Fuzzy match against existing character database (handles "María", "mi tía María", "la tía") |
| New character | If unmatched, AI asks: "Mencionaste a [nombre]. ¿Es alguien nuevo o es [existing character]?" |
| Profile enrichment | Each mention adds context to the character's profile (new traits, descriptions, relationships) |
| Cross-story linking | Characters persist across all sessions; mentioning "Abuela Rosa" in session 12 links to the profile built in session 2 |

**Why this matters:** Only MemoirMaker.ai and Squibler track characters as structured entities. Every other memoir app treats characters as free text in prose, making it impossible to maintain consistency in a 200-page book. This is Story Capture's single biggest structural differentiator.

### 6.4 Session Summaries

| Aspect | Specification |
|--------|---------------|
| Trigger | Automatically generated when storyteller ends a session |
| Content | 3-5 sentences covering: what stories were told, key characters mentioned, emotional tone, any unfinished threads |
| Purpose | Enables the storyteller and admin to quickly scan past sessions without re-reading full transcripts; enables the AI to reference past sessions in future follow-ups |
| Editable | Yes — admin can refine |

### 6.5 Story Organization

Three views, switchable (inspired by Life-Story.ai's multi-view approach):

1. **Chronological** — stories ordered by their story date (when events happened), grouped by life decade or era
2. **Thematic** — stories grouped by mood/theme tags (family, adventure, loss, love, work, childhood, immigration, faith, etc.)
3. **By Session** — raw session list ordered by recording date

Additionally, a **Character View** — click any character to see all stories they appear in, with their accumulated profile.

### 6.6 Topic Library (Spanish-Native)

A curated set of ~20 Spanish-language story prompts to help the storyteller when she doesn't know what to talk about. Inspired by Memoirji's 9 themes and Times of My Life's topic library. Examples:

- Mi infancia — ¿Cómo era tu casa cuando eras niña?
- Mi familia — ¿Quién era la persona más importante en tu familia?
- Un momento que cambió todo — ¿Cuál fue un momento que cambió el rumbo de tu vida?
- El amor — ¿Cómo conociste a tu pareja?
- La cocina — ¿Cuál era tu comida favorita de niña? ¿Quién la preparaba?
- El barrio — ¿Cómo era tu barrio o pueblo?
- La escuela — ¿Cuál es tu recuerdo más fuerte de la escuela?
- El trabajo — ¿Cuál fue tu primer trabajo?
- Las tradiciones — ¿Qué tradiciones familiares recuerdas?
- Una aventura — ¿Cuál fue el viaje más memorable de tu vida?
- La pérdida — ¿Has perdido a alguien importante? ¿Cómo lo recuerdas?
- La fe — ¿Qué papel ha jugado la fe o la espiritualidad en tu vida?
- Los amigos — ¿Quién fue tu mejor amigo/a de la infancia?
- La música — ¿Qué canción te transporta a otro momento de tu vida?
- Un consejo — ¿Qué consejo le darías a tu yo de 20 años?
- El orgullo — ¿De qué logro te sientes más orgullosa?
- La maternidad — ¿Cómo fue convertirte en madre?
- La inmigración — ¿Cómo fue dejar tu tierra? (if applicable)
- Las fiestas — ¿Cómo celebraban la Navidad/tu cumpleaños cuando eras niña?
- Este año — ¿Qué ha sido lo más significativo de este último año?

### 6.7 Chapter Generation

| Aspect | Specification |
|--------|---------------|
| Trigger | Manual — admin selects stories and initiates |
| Model | Higher-tier: GPT-4o or Claude Sonnet (better prose quality for long-form Spanish) |
| Inputs | Selected story transcripts + character profiles + story metadata + style settings |
| Style controls | Writing style (verbatim / cleaned / literary), creative license slider, person (1st/3rd), tone (neutral / warm / dramatic / humorous) |
| Output | Markdown chapter draft, editable in-app |
| Iteration | Admin can regenerate individual paragraphs or the full chapter |

**Style control rationale:** The #1 creative complaint across all competitors is AI overwriting the storyteller's authentic voice. Remento's 3-style toggle (verbatim transcript / polished 1st person / polished 3rd person) is the most praised UX in the category. MemoirMaker.ai's creative-license slider adds granularity. Combining both gives the admin full control.

### 6.8 Export & Data Portability

| Format | Contents |
|--------|----------|
| **Full ZIP export** | All audio files (WAV/WebM), all transcripts (Markdown), all metadata (JSON), all character profiles (JSON), all generated chapters (Markdown), session summaries |
| **PDF** | Generated chapters formatted as a readable book (client-side via react-pdf or similar) |
| **DOCX** | Generated chapters as a Word document (for print shops or further editing) |
| **JSON** | Complete data export for backup or migration |

The ZIP export is designed to be human-readable without the app. Transcripts are Markdown, metadata is JSON, audio is standard formats. If Story Capture disappeared tomorrow, all data remains usable.

---

## 7. Technical Architecture

### 7.1 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Vite + React + TypeScript | Fast dev, you know it, free hosting on GitHub Pages |
| Styling | Tailwind CSS | Rapid UI development, good for accessible/senior-friendly design |
| State management | Zustand or React Context | Lightweight, sufficient for single-user app |
| Local storage | IndexedDB (via Dexie.js) | Handles large blobs (audio files), structured queries, no size limits |
| Audio recording | MediaRecorder API (browser-native) | No dependencies needed |
| Transcription | OpenAI `gpt-4o-mini-transcribe` API | $0.003/min, best accuracy-to-cost ratio, Spanish-capable |
| Follow-up AI | OpenAI `gpt-4o-mini` API | Fast, cheap ($0.15/1M input tokens), good Spanish |
| Chapter generation | OpenAI `gpt-4o` or Anthropic Claude Sonnet API | Higher quality prose for long-form content |
| PDF generation | `@react-pdf/renderer` or `jspdf` | Client-side, no server needed |
| Hosting | GitHub Pages (static) | Free, reliable, version-controlled |

### 7.2 Data Model (IndexedDB)

```
sessions
├── id (auto)
├── date (ISO timestamp)
├── status ("recording" | "completed")
├── summary (string, AI-generated)
└── storyId (FK, nullable — linked after extraction)

segments
├── id (auto)
├── sessionId (FK)
├── order (number)
├── audioBlob (Blob)
├── transcript (string)
├── timestamp (ISO)
└── followUpQuestion (string, nullable)

stories
├── id (auto)
├── title (string)
├── summary (string)
├── storyDate (string, flexible: "primavera 1972")
├── location (string)
├── environment (string)
├── mood (string[])
├── characterIds (FK[])
├── sessionIds (FK[])
└── createdAt (ISO)

characters
├── id (auto)
├── name (string, canonical)
├── aliases (string[])
├── relationship (string)
├── description (string, accumulated)
├── traits (string[])
├── storyIds (FK[])
└── notes (string)

chapters
├── id (auto)
├── title (string)
├── storyIds (FK[])
├── style (object: { writingStyle, creativeLicense, person, tone })
├── content (string, Markdown)
├── editHistory (object[])
└── createdAt (ISO)
```

### 7.3 API Key Management

Since this is a static site with no backend, API keys are stored in the browser's localStorage (encrypted with a user-set passphrase) or entered per-session. The user provides their own OpenAI API key. This keeps the app truly free — no server costs, no auth system, no subscription.

For added security, a minimal Cloudflare Worker or Vercel Edge Function could proxy API calls (free tier covers the volume). This is optional but recommended.

### 7.4 Cost Estimate

For a typical book project (~50 sessions × 30 min average = 25 hours of recording):

| Service | Usage | Cost |
|---------|-------|------|
| Transcription (gpt-4o-mini-transcribe) | 25 hours × $0.003/min | **$4.50** |
| Follow-up questions (gpt-4o-mini) | ~500 questions × ~500 tokens each | **~$0.50** |
| Chapter generation (gpt-4o) | ~20 chapters × ~2000 tokens each | **~$2.00** |
| Hosting (GitHub Pages) | Static site | **$0.00** |
| **Total** | | **~$7.00** |

Compare to: Autobiographer $99/yr, StoriedLife $99+/yr, Remento $99/yr, MemoirMaker $99/memoir.

---

## 8. UI/UX Principles

### 8.1 Design for the Storyteller

- **Senior-friendly**: Large text (minimum 16px body), high contrast, big tap targets (minimum 48px), no small icons without labels
- **Minimal cognitive load**: One action per screen. Never show the full data model. The storyteller sees: Record, Listen Back, and My Stories
- **Warm and encouraging**: UI copy in conversational Spanish, not formal. "¡Qué buena historia!" after a long recording, not "Session saved successfully"
- **Forgiveness**: No destructive actions without confirmation. Audio is never deleted. Undo everywhere
- **No weekly-email pressure**: The storyteller records when she wants, not on a schedule. The app suggests topics but never nags (direct response to the #1 pacing complaint across competitors)

### 8.2 Design for the Admin

- **Full visibility**: See all data, metadata, transcripts, character profiles
- **Power tools**: Search across all transcripts, filter by character/date/theme, bulk-edit metadata
- **Chapter workshop**: Side-by-side view of source transcripts and generated chapter, with inline editing

---

## 9. Phased Roadmap

### Phase 1 — MVP (Months 1-3)
**Goal: A Spanish-speaking person can record stories, get follow-ups, and see organized transcripts.**

Core deliverables:
- Voice recording with chunked segments (Record/Stop/Record flow)
- Transcription via gpt-4o-mini-transcribe API
- AI follow-up questions in Spanish via gpt-4o-mini
- Session transcript accumulation (nothing wiped between chunks)
- Story metadata capture at session start (date, location, environment, characters)
- Character creation and basic linking (manual)
- Session summaries (AI-generated on end)
- Three organization views (chronological, thematic, by session)
- Local-only storage (IndexedDB)
- Basic export (JSON dump)

**Success benchmark:** A Spanish-speaking tester records 10 sessions and produces organized transcripts with metadata, without needing help navigating the app.

### Phase 2 — Intelligence (Months 3-5)
**Goal: AI actively helps organize content and detect patterns.**

Deliverables:
- Character auto-detection from transcripts with confirmation prompts
- Character profile enrichment (traits, descriptions accumulated across stories)
- Cross-story character linking ("¿Es la misma María?")
- Topic library (20 Spanish-native prompts)
- Story merging (combine sessions about the same event)
- Full-text search across all transcripts
- PDF export of transcripts with metadata

**Success benchmark:** After 20+ sessions, the character database is 90%+ accurate (tested against manual review). Storyteller uses topic suggestions at least 30% of the time.

### Phase 3 — Chapter Generation (Months 5-7)
**Goal: Transform raw transcripts into publishable book chapters.**

Deliverables:
- Chapter generation with style controls (verbatim / cleaned / literary)
- Creative license slider
- First/third person toggle
- Tone selector
- Paragraph-level regeneration
- Side-by-side transcript/chapter editor (admin)
- DOCX export
- Full ZIP export (audio + transcripts + metadata + chapters)

**Success benchmark:** Generated chapter drafts require ≤2 substantive edits per paragraph. Admin says the prose "sounds like her."

### Phase 4 — Polish & Portability (Months 7-10)
**Goal: Production-quality experience with collaboration options.**

Deliverables:
- Optional cloud sync (Google Drive or GitHub repo — user's own account)
- Interviewer mode (family member submits questions to storyteller's queue)
- Photo attachment with inline placement in chapters
- EPUB export
- Audio archive export (MP3 + linked transcripts)
- Offline-capable PWA mode
- Whisper-in-browser fallback for zero-API-cost operation

**Success benchmark:** Full book exported as PDF with photos, consistent characters, and the storyteller's authentic voice preserved. A family member successfully uses Interviewer mode for a month.

### Deferred / V2+
- Voice cloning narration (ElevenLabs)
- Print-on-demand integration (Lulu, Blurb APIs)
- Multi-user simultaneous editing
- Dementia-friendly mode (shorter sessions, more guidance, memory prompts)
- Memorial/tribute mode (stories about someone who has passed)

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Storyteller finds the interface confusing | Medium | High | User-test with actual user every 2 weeks from Phase 1. Senior-friendly design principles. Iterate fast |
| Spanish transcription quality is poor | Low | High | gpt-4o-mini-transcribe handles Spanish well (~4% WER). Test with actual storyteller's accent early. Add custom vocabulary prompting for proper nouns |
| API costs spiral | Low | Medium | At $0.003/min transcription, even 100 hours = $18. Set budget alerts. Offer local Whisper fallback |
| Character auto-detection produces too many false positives | Medium | Medium | Always confirm with the user before creating a new character. Conservative matching (better to miss than to miscreate) |
| AI follow-up questions feel robotic or repetitive | Medium | High | Invest in prompt engineering. Test with 20+ sessions. Rotate question styles (sensory, emotional, factual, character-focused). Give storyteller power to skip |
| Storyteller loses motivation mid-project | Medium | High | No weekly pressure. Celebrate milestones ("¡Ya tienes 20 historias!"). Topic library for inspiration when stuck. Keep sessions short (15-30 min recommended) |
| Browser storage limits (IndexedDB) | Low | Medium | IndexedDB has no practical size limit on modern browsers. For very large projects (50+ hours of audio), offer periodic ZIP export as backup |
| OpenAI API changes or pricing increases | Low | Medium | Abstract the API layer — models are configurable. Can swap to Groq free tier (Whisper), Claude, or local models without app changes |

---

## 11. Competitive Positioning Summary

**What we take from competitors:**
- From **Autobiographer**: warm, emotionally supportive conversational AI tone (they use Claude 3 for this)
- From **MemoirMaker.ai**: structured character/location entities; writing style selector; creative license slider
- From **Remento**: 3-style toggle (verbatim/polished 1st person/polished 3rd person); lifetime audio archive; QR-code-to-audio concept
- From **StoriedLife**: themed chapter auto-organization; multi-language vision (we'll actually deliver on Spanish)
- From **Squibler**: Elements system (characters, locations, objects as first-class entities); timeline tracking
- From **Life-Story.ai**: three organization views (chronological/thematic/free-form); collaboration roles
- From **Memoirji**: zero-friction entry; themed prompts; WhatsApp-level simplicity as a UX north star
- From **Tell Mel**: adaptive follow-up questions that follow tangents naturally; 10-15 min session length as ideal
- From **Times of My Life**: curated topic library; "it's free" positioning

**What we do that nobody does:**
1. **Structured metadata per story** (date + location + environment + characters) as first-class data — not buried in prose
2. **Persistent, cross-story character profiles** that accumulate details and maintain consistency
3. **Spanish-first** — not translated, not "supported." Built in Spanish from the UI copy to the AI prompts to the topic library
4. **Self-hosted, local-first** — all data on the user's device. No account, no subscription, no vendor lock-in
5. **Session-based accumulating context** — the AI reads the full conversation so far before asking the next question. Nothing is wiped between recording chunks
6. **Full data portability** — one-click ZIP export with human-readable files (Markdown + JSON + audio). If the app disappears, the data lives on

---

## 12. Open Questions

These need answers before or during Phase 1 development:

1. **Session length guidance** — Should we enforce a max session length (e.g., 45 min) to prevent fatigue, or leave it open? Tell Mel's 10-15 min calls work well; Autobiographer allows unlimited. Recommend testing both.

2. **Audio format** — WAV (lossless, large) vs. WebM/Opus (compressed, smaller)? For archival quality, WAV is better. For storage, WebM. Could offer both: record in WAV, keep a compressed copy for playback.

3. **Offline-first from day 1?** — A full PWA with service workers adds complexity. Recommend starting with online-required (for API calls) and adding offline in Phase 4.

4. **AI model flexibility** — Should we build an abstraction layer from day 1 so models are swappable (OpenAI ↔ Anthropic ↔ local Ollama)? Adds ~1 week of work but future-proofs significantly. Recommend yes.

5. **How much should the AI "remember" across sessions?** — Should follow-up questions in Session 15 reference something said in Session 2? This requires passing historical context to the AI, which increases token usage and cost. Recommend: pass session summaries (not full transcripts) of past sessions as context. Keeps cost low while enabling continuity.

6. **Admin editing of transcripts** — Should the admin be able to edit transcripts (fix transcription errors, add punctuation), or should transcripts be treated as immutable records? Recommend: allow edits but keep the original audio as the source of truth, and show edit history.

---

## Appendix A: Transcription Model Comparison (May 2026)

| Model | Provider | Cost | WER | Spanish | Diarization | Streaming | Notes |
|-------|----------|------|-----|---------|-------------|-----------|-------|
| gpt-4o-mini-transcribe | OpenAI | $0.003/min | ~4.5% | Yes | No | Yes (with stream=True) | **Recommended for this project**. Best cost/quality ratio |
| gpt-4o-transcribe | OpenAI | $0.006/min | ~4.1% | Yes | No | Yes | Marginally better accuracy, 2x cost. Not worth it here |
| gpt-4o-transcribe-diarize | OpenAI | $0.006/min | ~4.1% | Yes | Yes (speaker labels) | No | Useful if interview mode (2 speakers) is added later |
| Whisper large-v3 (API) | OpenAI | $0.006/min | ~5.3% | Yes | No | No | Legacy. No reason to use over gpt-4o-mini-transcribe |
| Whisper large-v3 (local) | Open-source | Free (GPU cost) | ~5.3% | Yes | No | With custom setup | Good fallback via transformers.js or whisper.cpp |
| Whisper large-v3-turbo (Groq) | Groq | Free tier (2K req/day) | ~5.5% | Yes | No | Yes | Free option. 228x realtime speed. Good zero-cost fallback |
| Deepgram Nova-3 | Deepgram | ~$4.30/1K min | ~18% WER (mixed) | Yes | Yes | Yes (<300ms) | Better for real-time; worse accuracy |
| AssemblyAI Universal-2 | AssemblyAI | ~$0.15-0.27/hr | ~14.5% | Yes (99+ langs) | Yes | Yes | Feature-rich but more expensive |

## Appendix B: AI Model Recommendations by Task

| Task | Model | Approx. Cost | Why |
|------|-------|-------------|-----|
| Transcription | gpt-4o-mini-transcribe | $0.003/min audio | Cheapest, OpenAI-recommended, good Spanish |
| Follow-up questions | gpt-4o-mini | $0.15/1M input, $0.60/1M output | Fast (~500ms), cheap, good conversational Spanish |
| Session summaries | gpt-4o-mini | Same as above | Summaries are short; doesn't need a powerful model |
| Character detection | gpt-4o-mini | Same as above | Pattern matching + entity extraction; mini handles it fine |
| Chapter generation | gpt-4o or Claude Sonnet | $2.50-$3.00/1M input | Long-form Spanish prose needs a stronger model for quality |
| Character profile enrichment | gpt-4o-mini | Same as mini | Incremental updates; doesn't need top-tier |

---

*This PRD is a living document. Update it as user testing reveals new needs and as the competitive landscape evolves.*
