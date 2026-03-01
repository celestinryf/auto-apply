# Phase 5 Spec: Portal-Agnostic Autofill + User-Invoked Activation

## 1) Problem Statement
Current behavior is tied to Greenhouse URL and DOM assumptions. This blocks usage on most job portals and makes extension activation opaque.

The next milestone must make the extension usable on arbitrary application pages by:
1. Removing ATS/platform-first assumptions from the fill engine.
2. Allowing the user to invoke autofill on demand from the browser action icon.
3. Parsing and filling fields using generic form intelligence, not portal adapters.

## 2) Product Goals
1. User can run extension on any page that contains form fields.
2. User can trigger extension explicitly from toolbar action every time.
3. Deterministic and free-text filling continue to work with review-before-fill.
4. No auto-submit behavior is introduced.
5. Privacy remains local-first.

## 3) Non-Goals (This Milestone)
1. Full perfection on every portal on day 1.
2. File upload automation for resume/cover letters.
3. Multi-step application navigation automation.
4. Captcha bypass or anti-bot handling.

## 4) UX Requirements
1. Extension icon is always visible in browser toolbar (user pins if needed).
2. Clicking extension action opens popup with:
   - `Run Autofill On Current Tab`
   - `Open Profile`
   - `Settings`
3. `Run Autofill On Current Tab` triggers script execution on active tab and returns result summary.
4. Free-text answers always go through review modal before being written.
5. User can skip any detected free-text item.
6. If no form fields are detected, show clear message: `No form fields found on this page`.
7. If page is unsupported due to permissions, show clear message and remediation.

## 5) Technical Strategy

### 5.1 High-Level Architecture
Replace ATS adapter architecture with a generic form engine.

New core flow:
1. User clicks action in popup.
2. Background validates tab and injects/activates content engine.
3. Content engine scans page for inputs/selects/textarea/radio/checkbox.
4. Field classifier maps each field to:
   - deterministic profile intent
   - free-text question
   - unknown/skip
5. Deterministic fields fill immediately.
6. Free-text drafts generated through existing semantic+LLM pipeline.
7. Review modal allows accept/edit/skip.
8. Accepted results are written and cached.

### 5.2 New/Updated Components
1. `background/tabRunner.ts`
   - orchestrates active-tab run request
   - injects content entrypoint if needed
   - sends `RUN_AUTOFILL` message and waits for result
2. `content/engine/pageScanner.ts`
   - collects visible fields and contextual text
3. `content/engine/fieldContext.ts`
   - normalizes label/placeholder/aria/name/nearby text
4. `content/engine/classifier.ts`
   - maps field context to canonical intents
5. `content/engine/fillExecutor.ts`
   - writes deterministic values and free-text accepted values
6. `content/engine/freeTextOrchestrator.ts`
   - question extraction + draft request + review overlay integration
7. `popup/pages/RunPage.tsx` or update `App.tsx`
   - adds explicit `Run Autofill On Current Tab` control
8. `shared/types.ts`
   - new messages and scan/fill contracts
9. Existing `background/freeText.ts`, `reviewOverlay.ts`, provider stack remain and are reused.

### 5.3 Manifest and Permissions
Required adjustments:
1. Add `"scripting"` permission.
2. Keep `"activeTab"` permission.
3. Remove hard dependency on static Greenhouse `content_scripts` matching.
4. Use runtime injection via `browser.scripting.executeScript` where supported.
5. Keep host permissions for AI endpoints.

Notes:
1. Firefox compatibility must be validated for `scripting` API behavior.
2. If runtime injection is constrained in Firefox, fallback to `<all_urls>` content script with runtime no-op unless user-invoked.

## 6) Canonical Field Intent Model
Define stable intent keys to decouple parsing from specific portals.

Deterministic intents:
1. `personal.firstName`
2. `personal.lastName`
3. `personal.email`
4. `personal.phone`
5. `personal.location.city`
6. `personal.location.state`
7. `personal.location.country`
8. `personal.linkedIn`
9. `personal.github`
10. `personal.portfolio`
11. `personal.website`
12. `preferences.authorizedToWork`
13. `preferences.requiresSponsorship`
14. `preferences.salaryExpectation`
15. `preferences.willingToRelocate`
16. `preferences.startDate`

Free-text intents:
1. `question.longText`
2. `question.coverLetter`
3. `question.motivation`
4. `question.experience`
5. `question.other` (fallback)

Unknown:
1. `unknown`

## 7) Generic Classification Rules
Classification signal priority:
1. Associated `<label>` text.
2. `aria-label`, `aria-labelledby`.
3. Placeholder.
4. Name/id tokens.
5. Nearby question container text (previous sibling, parent section heading).
6. Field type and constraints (`maxlength`, `rows`, input type).

Classification pipeline:
1. Normalize text (`lowercase`, punctuation flatten, tokenization).
2. Score deterministic intents via weighted keyword dictionary.
3. If deterministic confidence below threshold and field is long-form, classify free-text.
4. If confidence remains low, mark unknown and skip.

Initial thresholds:
1. Deterministic fill threshold: `0.72`
2. Free-text detection threshold: `0.65`
3. Unknown fallback below threshold.

## 8) User-Invoked Activation Design
State model:
1. Run is explicit per button click.
2. No persistent auto-run across every page by default.
3. Optional future setting: `auto-enable on domain`.

Invocation:
1. Popup button sends `RUN_AUTOFILL_ACTIVE_TAB` to background.
2. Background identifies active tab and executes content runner.
3. Runner returns `FillResult` and optional warnings.
4. Popup displays summary toast/status.

## 9) Message Contracts (Draft)
New messages:
1. `RUN_AUTOFILL_ACTIVE_TAB`
2. `RUN_AUTOFILL` (background -> content)
3. `SCAN_FORM_FIELDS` (optional diagnostics)
4. `AUTOFILL_RESULT`

Response shape:
1. `totalDetected`
2. `deterministicFilled`
3. `freeTextProposed`
4. `freeTextFilled`
5. `skipped`
6. `warnings: string[]`

## 10) Phased Ticket Plan

### Phase A: Invocation + Runtime Injection
1. Add popup action button for `Run Autofill On Current Tab`.
2. Implement background tab runner and message route.
3. Implement runtime injection path for content script.
4. Add permission updates and cross-browser fallback logic.

Acceptance:
1. User can click action and trigger run on any tab.
2. Friendly error when page cannot be injected.

### Phase B: Replace ATS Detection with Generic Scanner
1. Build `pageScanner` to collect all visible form controls.
2. Remove hard dependency on `detectATS()` gating.
3. Preserve existing fill safety checks.

Acceptance:
1. Button no longer depends on Greenhouse detection.
2. Scanner detects fields on at least 5 distinct portal/form styles.

### Phase C: Generic Classifier + Deterministic Fill
1. Introduce canonical intent classifier.
2. Replace adapter-specific field mapping with intent mapping.
3. Fill deterministic fields through existing DOM write utilities.

Acceptance:
1. Deterministic profile fields fill correctly on multiple non-Greenhouse forms.
2. Unknown fields are skipped with clear result reporting.

### Phase D: Generic Free-Text Extraction + Existing AI Stack
1. Plug generic long-form detection into existing `generateFreeTextDrafts`.
2. Keep threshold routing behavior (exact/semantic/adapt/generate).
3. Reuse current review modal and batch persistence.

Acceptance:
1. Review-before-fill works independent of portal.
2. Accepted/edited answers persist with metadata and embeddings.

### Phase E: Domain Edge Cases + UX Hardening
1. Handle iframes and shadow DOM where possible.
2. Add warnings for hidden/disabled/read-only fields.
3. Improve success/error summary in popup.

Acceptance:
1. Run summary is clear and actionable.
2. No crashes on pages without forms.

### Phase F: Cleanup and Legacy Removal
1. Remove Greenhouse-specific adapter gating from runtime path.
2. Keep optional compatibility shim only if needed.
3. Update docs and migration notes.

Acceptance:
1. Core run path has no ATS-specific requirement.
2. README/docs reflect portal-agnostic behavior.

## 11) Test Plan

### 11.1 Unit Tests
1. `fieldContext` extraction from synthetic DOM fixtures.
2. Classifier scoring and threshold boundaries.
3. Intent-to-profile path resolution.
4. Unknown/low-confidence skip behavior.

### 11.2 Integration Tests
1. Popup action -> background runner -> content run message path.
2. Runtime injection error handling path.
3. End-to-end deterministic-only form run.
4. End-to-end mixed deterministic+free-text run with mocked providers.

### 11.3 DOM Tests
1. Fixtures for plain HTML forms, portal-like structures, aria-heavy forms.
2. Free-text modal decision handling unchanged and verified.

### 11.4 E2E Smoke
1. Chromium: action click -> run -> summary.
2. Firefox: action click -> run -> summary.
3. Fixture pages:
   - simple form
   - nested form sections
   - long-form questions

### 11.5 Coverage Gate
1. Keep coverage thresholds for unit/integration.
2. Add scanner/classifier modules to coverage include set.

## 12) Risks and Mitigations
1. Risk: False-positive fills.
   - Mitigation: confidence thresholds + skip by default when uncertain.
2. Risk: Browser permission friction.
   - Mitigation: clear UX copy and error guidance for permission-denied cases.
3. Risk: Portal-specific JS frameworks ignore DOM writes.
   - Mitigation: keep native setter + `input/change/blur` dispatch strategy and add retry hooks.
4. Risk: Iframe-isolated forms.
   - Mitigation: detect and report unsupported frame scope; phase incremental iframe support.

## 13) Delivery Definition (Done)
1. User can run autofill from toolbar action on non-Greenhouse pages.
2. Deterministic + free-text flows work without ATS-specific detection.
3. Review-before-fill remains enforced for free-text.
4. Unit/integration/DOM/E2E suites pass.
5. Coverage thresholds pass in CI.
6. Docs updated for new activation model and limitations.

## 14) Immediate Execution Order
1. Implement Phase A and Phase B together in first PR.
2. Implement Phase C in second PR.
3. Implement Phase D in third PR.
4. Implement Phase E and F in fourth PR.

This sequencing ensures the extension becomes user-invokable and portal-agnostic early, then improves fill quality incrementally.
