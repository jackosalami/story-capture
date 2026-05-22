# Project Status & History

Last updated: 2026-05-22 · Maintained by Claude Code across multiple sessions.

This doc captures **everything that's been built**, **how the app is structured**, and **what's pending**. It's the canonical "where are we?" reference — read this first when picking the project back up in a new conversation.

---

## 1. Project at a glance

**Story Capture** — a Spanish-first, self-hosted web app with two distinct workspaces:

1. **Memoir mode** — a Spanish-speaking grandmother (or anyone) records the stories of her life by voice. AI transcribes, asks warm follow-up questions, accumulates context across sessions, and organizes everything into **books → chapters → stories** that can be exported as a 6×9 trade paperback PDF.
2. **Kid stories mode** — adults generate ~7-minute Spanish or English bedtime/adventure stories featuring recurring child characters, illustrated by Gemini Nano Banana with locked Studio Ghibli style, readable in a custom book reader and shareable as a public link.

**Live**: https://jackosalami.github.io/story-capture/
**Repo (original/personal)**: https://github.com/jackosalami/story-capture
**SaaS fork (separate Claude session)**: `/Users/jacob/projects/BookWriter-SaaS/`

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vite + React 19 + TypeScript | Fast dev, simple build, GitHub Pages friendly |
| Styling | Tailwind v4 | Custom theme tokens (memoir warm / kids playful), per-workspace body data attr |
| State | Zustand (with persist for settings) | Small, no boilerplate |
| Local DB | Dexie (IndexedDB) v5 | All data lives client-side. Sessions, segments, stories, characters, kid characters, kid stories, memoir books, chapters, character mentions |
| AI | OpenAI direct from browser (user supplies key, stored in localStorage) | PRD §7.3 — no backend |
| Vision | `gpt-4o-mini` with vision for character photo description |
| Story gen | `gpt-5.5` (default) / fallback `gpt-4o` for kid stories, chapter generation |
| Chat / follow-ups | `gpt-4o-mini` |
| Transcription | `gpt-4o-mini-transcribe` |
| Image gen | Gemini Nano Banana (external — user copy-pastes prompts) |
| PDF | `@react-pdf/renderer` (code-split, loaded on demand) |
| Hosting | GitHub Pages via GitHub Actions on every push to `main` |

**Per-workspace fonts**: Fraunces (memoir headings), Fredoka (kids display), Nunito (kids body), Inter (UI). All from Google Fonts.

---

## 3. What's built — Memoir mode

### Wave A (foundation)
- MediaRecorder-based chunked recording (Record → Stop → Record → Stop)
- `gpt-4o-mini-transcribe` per chunk
- AI follow-up questions per chunk (warm interviewer prompt in Spanish)
- Session-end AI summary
- IndexedDB stores audio blobs + transcripts forever

### Wave B (organization)
- Story metadata captured AFTER recording via AI extraction (story date, location, environment chips, mood, mentioned people) — NOT a form filled before recording. The form is hidden behind "Añadir detalles" for power users.
- Character entities (recurring across stories)
- 20-prompt Topic Library (PRD §6.6)
- Three views: chronological (by storyDate), thematic (by mood), by session
- Walkthrough (first-run tutorial) — 5 friendly Spanish slides
- JSON export

### Wave C — Books (current memoir state)

#### Phase 1 — Memoir Books (built)
- `MemoirBook` entity: title, subtitle, era, dedication, cover image, isActive
- Multiple books from day 1 (each book = one era/topic of the life)
- Memoir dashboard is a **bookshelf** — each book renders as a hardcover-style spine with warm gradient, optional cover photo, "Activo" badge
- `BookDetailScreen`: open a book → cover header + three views (chrono/theme/by session) **filtered to that book** + big "Nueva historia en este libro" CTA
- **Active-book concept**: new recordings auto-attach to the active book. The storyteller doesn't think about structure; admin can switch active.
- Auto-migration: existing pre-book content moves into a default "Mis Recuerdos" book on first load. Idempotent.

#### Phase 2 — AI character auto-detection (built)
- After session ends, AI receives the existing-characters catalog of the book + the transcript
- For each mentioned person, AI emits a structured suggestion: matched character + confidence (high/medium/low/unknown), is-new flag, new traits inferred from this story, new descriptive facts, new relationship if clarified
- Suggestions land in a `CharacterMention` queue
- `StoryScreen` shows a "Personas detectadas" review section per story:
  - **✓ Es <Name>** → enriches the existing character (merges traits, appends descriptive facts) and links to the story
  - **+ Persona nueva** → creates a Character with the AI's draft profile
  - **Descartar** → false positive
- Conservative matching: same-name ambiguity → low confidence + null suggestion, admin decides

#### Phase 3 — Chapters + Memoir PDF (built)
- `Chapter` entity (organizational, manual): bookId, title, description, order, storyIds
- `Story` gains optional `chapterId`
- Fourth tab in BookDetailScreen "Capítulos" — chapters in order with stories under each, "Sin capítulo" group at the end, reorder up/down arrows, edit, delete, inline "Capítulo:" select on each story card
- `@react-pdf/renderer`-based 6×9 trade paperback PDF: cover (full-bleed image), title page, dedication page, table of contents, chapter title pages, story pages (title + storyDate · location + serif body from `story.summary`), page numbers in footer, Fin page
- Code-split: react-pdf chunk loads on demand only when downloading

#### Phase 4 — Guided print handoff (built)
- "📦 Pedir copia impresa" modal on BookDetailScreen
- Compares **Lulu / Amazon KDP / Mixam** with current ballpark prices + tradeoffs
- "Continuar" per vendor: auto-downloads the PDF + opens the vendor's create-book page in a new tab + reveals step-by-step inline instructions (which trim size, paper, binding to choose)
- $0 backend cost — user pays vendor directly
- The "real" automated Lulu API integration is intentionally **deferred** because it needs a backend (Lulu's OAuth secrets can't live in the browser). The SaaS fork will implement it where there's already serverless infra planned.

---

## 4. What's built — Kid stories mode

### Story generation
- Bilingual (Mexican Spanish OR English) — selectable per story
- Age band (3-5, 6-8, 9-12) drives sentence length + vocabulary level
- Length presets: 5/7/10/15 minute read-aloud
- Kid-lit register rules baked in: short sentences, dialogue with em-dashes, abundant onomatopoeia, diminutivos, banned formal vocabulary lists per language
- **Mexican Spanish specifics**: "tú" not "vos", "ustedes" not "vosotros", banned: ordenador/móvil/patata/zumo/tarta/coger
- Story-level translation ES↔EN preserving images, characters, scene metadata
- Special "story behaviors" per character (e.g. Cutie's nervous-fart comedy beat)

### Character system
- `KidCharacter` entity, fully separate from memoir `Character`
- Six canonical recurring characters with hardcoded defaults in `src/lib/characterDefaults.ts`:
  - **Cami** — 2yo toddler, Mei-from-Totoro-inspired, light caramel straight hair in two side pigtails, yellow short-sleeved DRESS (not blouse), white skin
  - **Noah** — 6yo school-age boy, dark espresso hair, white skin, sage-green star t-shirt, navy shorts, brown sandals
  - **Kuma** — fluffy long-coated Pembroke Welsh Corgi, docked tail (nub, not long)
  - **Nugget** — small mixed-breed dog, long tail with bright WHITE TIP on the last third (mandatory visual)
  - **Cutie** — entirely lime-green plush creature including tail (no white anywhere), farts when nervous (story behavior)
  - **Aurelio** — plush stuffed bunny, light gray, beige overalls, embroidered button eyes (NOT a teddy bear, NOT a donkey)
- Each canonical character has a short bullet-style description + a NEGATIVES list (what NOT to draw)
- User can upload a reference photo per character → vision AI describes
- Character defaults REPLACE saved descriptions on the way to the AI (overrides user-typed text). Sidesteps the "user has Cami with curly dark hair saved" problem.

### Image prompts (Gemini Nano Banana)
- After story generation, second AI pass produces 5 structured image prompts
- **Continuity strategy** (the hard-won one): the model returns only `sceneAction` (action + setting + lighting, NO inline character descriptions). A **post-processor** assembles each final prompt from:
  1. Fixed STYLE block (Studio Ghibli inspired art, 3:4 portrait, no watermarks)
  2. CHARACTERS block — byte-identical canonical descriptions across all 5 prompts
  3. NEGATIVES block — explicit "do NOT draw" anchors per character present
  4. SCENE block — model's action paragraph
- This eliminates paraphrase drift between scenes (which was causing characters to change hair/clothes across images)
- **Studio Ghibli style locked** — system prompt requires "Studio Ghibli" verbatim; `ensureGhibli` post-processor safety net prepends the canonical Ghibli style sentence if the model forgets
- **Portrait 3:4** orientation (carta vertical) — letter-printable, subject centered, not widescreen
- Per-scene image upload OR batch upload (5 files sorted by filename → slot 1-5)

### Book reader
- Single-page-per-screen model (NOT two-page spread — that was abandoned because react-pageflip breaks on React 19)
- Each scene = one screen card: image top ~65%, text below ~35%
- Card maintains a 3:4 carta-like aspect ratio
- Cover and back-cover are full 3:4 cards
- CSS keyframe page-in animation with rotateY suggestion (subtle 3D feel without library)
- Keyboard navigation (←/→/Escape), dot pagination, swipe-friendly
- Language toggle 🇪🇸/🇺🇸 in the header if translation exists
- Image rendering: `object-contain` with cream background (full image visible, no cropping)

### Bookshelf + sharing
- `BookshelfScreen` ("Mi librero") — each kid story as hardcover-style book with accent gradient
- **Shareable link**: generates a self-contained HTML file (5 images inlined as data URLs) and uploads to a public file host
  - Fallback chain: catbox.moe → 0x0.st → litterbox.catbox.moe → local download
  - Returns a public URL the user can share via WhatsApp/email — recipient opens in any browser, no app install
- **PDF download** (letter size, 8.5×11, alternating image + text pages, 13 pages total): direct print or upload to Lulu/KDP

---

## 5. Repository structure (key files)

```
src/
├── api/openai.ts             — chat, transcribe, chatWithImage (vision)
├── db/
│   ├── db.ts                 — Dexie schema (v5 currently)
│   ├── types.ts              — all entity types
│   ├── sessions.ts           — Session CRUD + migration helpers
│   ├── stories.ts            — Story CRUD + auto-attach to active book
│   ├── characters.ts         — memoir Character CRUD
│   ├── memoirBooks.ts        — MemoirBook CRUD + active-book + migration
│   ├── chapters.ts           — Chapter CRUD (Phase 3)
│   ├── characterMentions.ts  — AI detection queue (Phase 2)
│   ├── kidCharacters.ts      — kid character CRUD
│   └── kidStories.ts         — kid story CRUD
├── prompts/
│   ├── spanish.ts            — follow-up, summary, title, metadata + people detection
│   ├── kidStory.ts           — kid story system + user prompts (bilingual)
│   ├── kidStoryImages.ts     — image prompt generation + assembleScenePrompt
│   └── translate.ts          — ES↔EN translation for kid stories
├── lib/
│   ├── characterDefaults.ts  — hardcoded kid character canonicals + negatives
│   ├── generateImagePrompts.ts
│   ├── describeCharacter.ts  — vision-based character description
│   ├── translateStory.ts
│   ├── shareBook.ts          — multi-service file upload for kid book sharing
│   ├── generateBookPdf.tsx   — kid story PDF (letter, 13 pages)
│   ├── generateMemoirPdf.tsx — memoir PDF (6×9 trade paperback)
│   ├── splitStory.ts         — divide story content into N sections
│   ├── image.ts              — canvas-based resize + data URL
│   ├── useObjectUrl.ts       — Blob → URL with cleanup
│   └── topicLibrary.ts       — 20 Spanish prompts (PRD §6.6)
├── screens/
│   ├── DashboardScreen.tsx        — memoir bookshelf (Phase C.1)
│   ├── BookDetailScreen.tsx       — inside a memoir book
│   ├── StorySetupScreen.tsx       — prep screen (no form, just prompts)
│   ├── RecordScreen.tsx           — recording UI with all AI calls on end
│   ├── StoryScreen.tsx            — story detail + PendingMentionsSection
│   ├── CharactersScreen.tsx       — memoir character list
│   ├── CharacterScreen.tsx        — character detail
│   ├── TopicLibraryScreen.tsx     — 20 topic prompts
│   ├── WalkthroughScreen.tsx      — first-run tutorial
│   ├── SettingsScreen.tsx         — API key + model overrides + export
│   ├── KidsDashboardScreen.tsx    — kid stories list
│   ├── NewKidStoryScreen.tsx      — kid story creation form
│   ├── KidStoryScreen.tsx         — kid story detail + image upload + share + PDF
│   ├── KidCharactersScreen.tsx
│   ├── KidCharacterScreen.tsx
│   ├── BookshelfScreen.tsx        — kid stories bookshelf
│   └── BookReaderScreen.tsx       — single-page book reader
├── components/
│   ├── ModeToggle.tsx             — memoir / kids workspace switcher
│   ├── CharacterPicker.tsx        — memoir character multi-select
│   ├── KidCharacterPicker.tsx     — kid character multi-select with image upload
│   ├── CharacterImageUpload.tsx   — photo + AI description
│   ├── ChipPicker.tsx             — environment/mood chip selector
│   ├── Mascots.tsx                — SVG dragon/star/moon + emoji helpers
│   └── PrintOrderModal.tsx        — Phase 4 guided print handoff
└── store/
    ├── settings.ts                — Zustand persist (API keys, models, walkthrough flag)
    └── nav.ts                     — screen state + workspaceOf helper
```

---

## 6. Pending / future work

### Memoir side
- **Lulu Direct automated API**: deferred to SaaS fork (needs backend)
- **AI-generated chapter prose** (PRD §6.7 "Chapter Generation"): the `Chapter.prose` field is reserved for it. Would let admin generate publishable prose from raw transcripts with style toggles (verbatim / cleaned / literary), creative-license slider, first/third person, tone selector.
- **Audio QR codes in printed memoir** (à la Remento)
- **Drag-and-drop story reordering within chapters** (currently up/down arrows on chapter, story order driven by storyDate)
- **Book-level summary / synopsis** generated from all stories — for back-cover or intro
- **Cross-session AI memory** (PRD Open Q #5): pass past-session summaries as context to follow-up questions so the AI can reference earlier stories
- **Local Whisper fallback** (PRD §6.1): for offline transcription via transformers.js

### Kid stories side
- **AI narration / TTS** (already analyzed): `tts-1` + audio player on the reader. ~$0.015/1K chars.
- **Custom character avatars** (illustrated SVG mascots per kind) — currently using emoji fallbacks
- **Order-physical-copy from kid stories**: the kid PDF download exists; could add a guided handoff modal like the memoir one
- **Screenshot protection / watermarking**: discussed honestly — not really possible on web, only deterrent via per-recipient watermarks. Not implemented (user paused on this).

### App-wide
- **Backup/restore**: JSON export exists; an import flow would let you move between devices
- **Optional cloud sync** (PRD Phase 4): Google Drive or GitHub-repo backed
- **Mode-toggle theming**: kids workspace styles diverge sharply from memoir (good) but could go further

---

## 7. Known limitations / sharp edges

| Issue | Workaround |
|---|---|
| Audio + image blobs in IndexedDB are per-device | JSON export is the only backup. SaaS fork will solve this with Supabase Storage. |
| OpenAI key in browser localStorage | Acceptable for personal/family use. Don't share the deployed URL with strangers. SaaS fork will proxy via backend with metered budget per user. |
| `react-pageflip` broke on React 19 | Removed entirely. Book reader rebuilt without it. |
| Stories without `language` field (from before Wave C) | Backfilled to "es" on load. |
| `gpt-5.5` as default model | User explicitly set this. If your OpenAI account doesn't have access, change in Ajustes → Modelos de IA. |
| Image generation actually happens in Gemini (external) | App generates the prompts; user manually pastes into Gemini Nano Banana to get images, then uploads back. No automation possible without the Gemini API integrated. |
| Old stories don't get retroactive character detection | Only new sessions trigger Phase 2 detection. If you want retro-processing, ask for a "Detect characters" button on the story screen. |

---

## 8. Architecture decisions worth remembering

1. **IndexedDB via Dexie** is the only persistence. Versions 1 through 5 cover the full schema evolution. Don't add a new index without bumping the version.

2. **Per-user character canonicals** (Cami, Noah, Kuma, Nugget, Cutie, Aurelio) are hardcoded in `lib/characterDefaults.ts`. The SaaS fork must migrate these to a per-tenant `recurring_characters` table — the file's design supports this cleanly (the helper functions take a character object).

3. **Image-prompt continuity** is solved by **post-processor assembly**, NOT by trusting the model to repeat. The model emits only sceneAction; the post-processor builds the final prompt with canonical character descriptions + negatives + Ghibli style enforced. This was a hard lesson — earlier attempts that let the model write inline descriptions produced inconsistent characters across the 5 images.

4. **Studio Ghibli style is enforced both ways**: system prompt requires the literal phrase, AND a post-processor safety net (`ensureGhibli`) prepends the canonical Ghibli sentence if the model omits it.

5. **Active book = one isActive flag** at a time on `MemoirBook`. Switching active is a transactional update.

6. **Chapters are organizational only** (current). The `Chapter.prose` field is reserved for future AI-generated chapter prose.

7. **No spread book reader on memoir side** — the kid-stories reader is single-page. If we add a memoir reader later, use the same model.

8. **The Mexican Spanish requirement** is enforced via two layers: the story-generation system prompt AND the translation system prompt. Both explicitly ban peninsular Spanish vocabulary and conjugations.

9. **PDF rendering uses `@react-pdf/renderer`** for both kid stories (letter) and memoir books (6×9). Both code-split — the heavy bundle only loads on download click.

10. **Hosting**: GitHub Pages serves `dist/`. Deploy happens via `.github/workflows/deploy.yml` on every push to `main`. The Vite config has `base: '/story-capture/'` for the subpath.

---

## 9. SaaS fork

The SaaS-monetized version of the kid-stories side lives at `/Users/jacob/projects/BookWriter-SaaS/`, with a separate Claude Code session driving it. That session has the full mission brief: convert this client-side personal app into a multi-tenant Next.js + Supabase + Clerk + Stripe + Lulu Direct + Vercel SaaS. Preserve the prompts and the UX; rip out IndexedDB and the user-supplied-API-key model; replace with backend proxy + paid auth + per-user usage budgets.

If/when the SaaS version goes live, the personal app **stays as-is** — it's the founder's personal memoir app. The two never merge.

---

## 10. How to pick up future work

When opening a new conversation, point Claude at this file. Then describe what you want to build/change.

**Common starting points:**

- "Continue from Phase X" — refers to the memoir Wave C phases listed above
- "Improve [feature]" — Claude reads STATUS.md and finds the relevant file paths
- "Migrate a hardcoded character to user-data" — should happen mainly in the SaaS fork
- "Add a new memoir/kid feature" — Claude reads the architecture-decisions section first
- "Why does X work this way?" — Look at section 8 (architecture decisions) before diving in

When in doubt, **read `git log`** for the commit history — the messages are detailed.
