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
