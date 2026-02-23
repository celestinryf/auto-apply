# Auto Apply

Browser extension that helps users fill job applications faster. It is local-first, user-initiated, and does not submit applications automatically.

## Current Scope

- Supports Chrome and Firefox builds from one codebase.
- Detects Greenhouse application pages.
- Injects a bottom-right `Auto Fill` button on supported pages.
- Fills deterministic fields from saved profile data (name, email, phone, links, location, basic preferences).
- Stores profile and response cache locally in IndexedDB.
- Supports resume PDF upload and parsing into structured profile data via Anthropic API.

## Tech Stack

- TypeScript
- Vite + `vite-plugin-web-extension`
- Preact + Signals
- Dexie (IndexedDB)
- `webextension-polyfill`
- `pdfjs-dist`
- Anthropic SDK

## Setup

1. Install dependencies:

```bash
npm install
```

2. Build:

```bash
npm run build
npm run build:firefox
```

3. Optional dev mode:

```bash
npm run dev
npm run dev:firefox
```

## Load Extension

### Chrome

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select `/path/to/auto-apply/dist/chrome`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `/path/to/auto-apply/dist/firefox/manifest.json`.

## First Run

1. Open the extension popup.
2. Go to `Settings` and add an Anthropic API key if you want resume parsing.
3. Go to `Profile` and either:
   - Upload a PDF resume and review parsed fields.
   - Enter profile information manually.
4. Save profile.

## Usage

1. Open a Greenhouse application page.
2. Click the floating `Auto Fill` button.
3. Review the fill summary overlay and manually adjust any skipped fields.
4. Submit manually yourself.

## Commands

- `npm run dev` - Chrome dev build/watch.
- `npm run dev:firefox` - Firefox dev build/watch.
- `npm run build` - Chrome production build.
- `npm run build:firefox` - Firefox production build.
- `npm run build:all` - Build both.
- `npx tsc --noEmit` - Typecheck.

## Project Layout

```text
src/
  background/   # message routing + resume parsing call
  content/      # ATS detection, mapping, fill logic, floating button
  popup/        # profile/settings/responses UI
  shared/       # common types
  storage/      # IndexedDB + extension local storage helpers
manifests/      # chrome/firefox manifests
```

## Known Limitations

- ATS coverage is currently Greenhouse only.
- Free-text question generation is not implemented yet.
- Semantic retrieval (embeddings) for response reuse is not implemented yet.
- Resume parsing quality depends on PDF text extractability and model output quality.
