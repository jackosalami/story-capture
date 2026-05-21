# Story Capture

A Spanish-first, self-hosted web app for turning spoken life stories into a book.

See `PRD/prd-story-capture.md` for the full product spec.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173/story-capture/`). On first run you'll be asked for your OpenAI API key — it's stored only in your browser's localStorage.

## Live app

Deployed automatically on every push to `main` via GitHub Actions → GitHub Pages. See `.github/workflows/deploy.yml`.

## Architecture

- **Vite + React + TypeScript** for the frontend.
- **Tailwind CSS v4** for styling.
- **Dexie** wraps IndexedDB for local storage (audio blobs, transcripts, metadata).
- **Zustand** for lightweight state.
- **OpenAI API**, called directly from the browser using the user's own key:
  - `gpt-4o-mini-transcribe` for audio → text
  - `gpt-4o-mini` for follow-up questions and session summaries
  - (Wave B+) `gpt-4o` for chapter generation

No backend. No subscriptions. Data stays on the user's device.

## Current scope (Wave A)

- Record voice in chunks (Record → Stop → Record → Stop…)
- Transcribe each chunk in Spanish
- Show a warm AI follow-up question after each chunk
- Accumulate the session transcript
- Generate a session summary when the user ends the session
- All data persists in IndexedDB

Wave B (next): structured story metadata, characters, three organization views, JSON export.
