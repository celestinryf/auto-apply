# Codex History

Use this file to keep important conversation context synced across devices via git.

## How To Use

1. After each session, add a new dated entry at the top.
2. Keep sensitive data (API keys, personal data) out of this file.
3. Commit and push so other devices get the same context.

---

## Entry Template

### Date
YYYY-MM-DD

### Session Summary
- What was discussed.
- What was built/changed.

### Decisions Made
- Decision:
  Reason:

### Commands Run (optional)
```bash
# paste key commands only
```

### Files Added/Changed
- path/to/file

### Open Questions
- Question 1
- Question 2

### Next Steps
1. Step one
2. Step two

### Next Prompt Starter
```text
Continue from docs/codex-history.md latest entry. Focus on...
```

---

## Entries

### Date
2026-02-23

### Session Summary
- Bootstrapped the Auto Apply extension MVP for Chrome/Firefox.
- Added profile management, response storage, Greenhouse filling flow, resume parsing integration, README, and project-specific `.gitignore`.

### Decisions Made
- Decision: Local-first architecture with no backend for now.
  Reason: Faster build, lower complexity, better privacy.
- Decision: User-triggered fill via floating button, no auto-submit.
  Reason: User trust and control.

### Files Added/Changed
- `src/**`
- `manifests/**`
- `README.md`
- `.gitignore`
- `docs/codex-history.md`

### Open Questions
- Provider fallback strategy and UX for Anthropic -> OpenAI.
- Semantic matching thresholds and review UI flow.

### Next Steps
1. Add free-text answer workflow with review-before-fill.
2. Add embeddings-based semantic retrieval for prior answers.
3. Add provider fallback logic for resume parsing and free-text generation.

### Next Prompt Starter
```text
Read docs/codex-history.md and implement the next step: free-text Q&A flow with review-before-fill and provider fallback.
```

---

## Handoff Pack (Ready-To-Implement)

### Current State Snapshot

#### Implemented
- Cross-browser extension builds for Chrome and Firefox.
- Greenhouse ATS detection and deterministic field filling.
- Floating `Auto Fill` button and fill results overlay.
- Popup tabs:
  - Profile editor
  - Responses list (manual edit/delete)
  - Settings with Anthropic API key
- Resume PDF upload and parsing via Anthropic.
- Local-first persistence:
  - Dexie (profile + responses)
  - extension local storage (API key)

#### Not Implemented Yet
- Free-text field generation in live form filling.
- Semantic retrieval using embeddings.
- Provider fallback Anthropic -> OpenAI.
- Provider settings for OpenAI key/model selection.
- Automated tests.

#### Known Constraints
- Current ATS support is Greenhouse only.
- No application submission automation by design (fill only).
- Local-only architecture (no backend/user auth/sync service).

### Next Feature Spec (Phase 4)

#### Goal
Add free-text answer generation with review-before-fill, semantic cache reuse, and provider fallback for both:
1. Resume parsing
2. Free-text answers

#### Required UX Flow
1. Detect open-ended questions/fields (`textarea`, long text fields, common question containers).
2. For each question:
   - exact cache check
   - semantic cache check
   - generate new draft only on miss
3. Always show drafts in review UI before writing to form fields.
4. User can:
   - accept and fill
   - edit then fill
   - skip
5. Accepted/edited answers persist into response cache (with embedding).

#### Similarity Thresholds (initial)
- `>= 0.92`: reuse cached answer directly.
- `0.78 - 0.92`: adapt nearest cached answer with LLM.
- `< 0.78`: generate fresh answer with LLM.

### Acceptance Criteria

#### Free-text Fill
- On Greenhouse form with textarea questions:
  - extension shows review panel with per-question draft
  - no free-text field is filled until user confirms
- Accepted answers are written to fields and trigger `input/change/blur`.

#### Semantic Retrieval
- Each saved response stores:
  - normalized question text
  - embedding vector
  - answer text
- Incoming question uses cosine similarity against stored embeddings.
- Threshold routing behaves exactly as defined above.

#### Provider Fallback
- Primary provider configurable (default Anthropic).
- On retryable/provider failure (network, timeout, 429, 5xx):
  - fallback to secondary provider (OpenAI) automatically.
- On bad key/missing key:
  - clear setup error shown to user (no silent loop).
- Same fallback behavior used by resume parsing and free-text generation.

### Planned Data Model Changes

#### Storage: Settings
- Add settings object with:
  - `anthropicApiKey: string`
  - `openaiApiKey: string`
  - `primaryProvider: 'anthropic' | 'openai'`
  - optional model overrides

#### Storage: Responses
- Extend response record with:
  - `normalizedQuestion: string`
  - `embedding: number[]`
  - `source: 'manual' | 'llm-generated' | 'llm-edited'`

#### Helper Logic
- `normalizeQuestion(text)` for stable matching.
- `cosineSimilarity(a, b)` utility.

### Prompt Contracts (Draft)

#### Free-text generation prompt requirements
- Inputs:
  - applicant profile
  - job title/company (if available from page)
  - job description snippet (if detected)
  - question text
  - optional similar prior answer
- Rules:
  - no fabricated facts
  - concise, natural, applicant voice
  - plain text only

#### Resume parsing prompt requirements
- Keep current schema-based strict JSON parsing.
- If provider returns non-JSON or malformed JSON, treat as parse failure and fallback.

### File-Level Implementation Map

#### Settings and storage
- `src/shared/types.ts`
  - extend settings/message types
- `src/storage/index.ts`
  - save/get provider settings
  - response embedding fields and query helpers

#### Provider abstraction + fallback
- `src/background/` (new files suggested)
  - `ai/providers.ts` (provider clients + fallback orchestration)
  - `ai/prompts.ts` (resume + free-text prompt builders)
  - update `index.ts` message handlers
  - update `resumeParser.ts` to use provider abstraction

#### Free-text detection and review UI
- `src/content/`
  - `filler.ts` split deterministic vs free-text flow
  - new `freeText.ts` for question extraction/request batching
  - new `reviewOverlay.ts` for accept/edit/skip interactions
  - update `index.ts` to orchestrate review-before-fill

#### Embeddings and similarity
- `src/background/ai/embeddings.ts` (or similar)
  - embedding generation and similarity matching

### Commands and Verification Checklist

```bash
npx tsc --noEmit
npm run build
npm run build:firefox
```

Manual checks:
1. Load extension in Chrome and Firefox.
2. Configure Anthropic + OpenAI keys in Settings.
3. Parse a PDF resume:
   - test Anthropic success path
   - simulate Anthropic failure and verify OpenAI fallback
4. Open Greenhouse form with textarea questions:
   - verify review-before-fill
   - verify accept/edit/skip actions
5. Repeat same/similar question:
   - verify exact hit path
   - verify semantic match reuse/adapt path

### Recommended Next Prompt
```text
Read docs/codex-history.md Handoff Pack and implement Phase 4 step 1:
provider settings + provider abstraction with Anthropic->OpenAI fallback
used by resume parsing. Include strict typing and update popup settings UI.
```
