## 22 Kasım 2026 06:46 TRT — DOM-103 COMPATIBILITY FIX, Actions pending

- CSV comparison parser exposes detected `formatVersion` (`1 | 2 | 3`) on successful results, directly accessible to UI; it is intentionally **non-enumerable** so existing strict JSON serializer accepts the parser result and does not leak CSV-only metadata into JSON. Blocked imports still have no version.
- Code/test: `domain/production/projectQuoteRevisionComparisonCsv.ts` and `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`; v3 and legacy v1/v2 version assertions, blocked-result assertions, and an `Object.keys` non-enumerability assertion.
- Initial commit [361bfa1](https://github.com/Taylan789/MobilyaCAD/commit/361bfa152c1e4137592757e26911ae0d8230a3db): CI [#44982412017](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982412017) succeeded; QA [#44982412023](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982412023) failed in DOM-100 cross-format serialization because the added enumerable field violated strict top-level keys (627/628 domain tests passed). This fix preserves strict validation; no assertions were weakened.
- **Pages:** build succeeded, but exact-SHA verification failed because QA failed; Pages [#44982412028](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982412028) did not deploy. Last verified test-site deployment remains Pages [#44974762969](https://github.com/Taylan789/MobilyaCAD/actions/runs/44974762969) on pre-feature SHA `bb40a20`.
- No frontend, adapter/performance-owned files, or machine-specific output changed. Local tests were unavailable; Actions are the verification source. AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) remains blocked by OpenRouter free-model daily HTTP 429; no rerun or paid/quota/secrets change.
- **Next:** verify the non-enumerable correction on exact SHA; then DOM-104 byte-stable repeated CSV export, INT-001 frontend-owned, INT-002/PERF-001 specialist-owned, QA-003 dependent.

- Legacy quote-comparison matrix covers JSON v1/v2 and CSV v1/v2/v3. JSON v1 remains readable; JSON v2 preserves resource identity and rejects partial/mismatched metadata; legacy CSV v1/v2 preserves supported line/roll provenance while omitting resource identity unavailable in their columns; CSV v3 preserves complete resource identity and rejects partial metadata.
- Added explicit CSV v1/v2 resource-identity omission coverage while retaining sourceReference and Part IDs. Initial QA failed because test-only legacy conversion helpers split CSV on commas and corrupted JSON-array Part IDs; corrected in [fix commit 8bc5ede](https://github.com/Taylan789/MobilyaCAD/commit/8bc5ede4c2f34158929d1272ffbc253184380242), reusing quote-aware test parsing/encoding. No production parser changes or weakened assertions.
- Exact-SHA CI [#44974595633](https://github.com/Taylan789/MobilyaCAD/actions/runs/44974595633), QA [#44974595666](https://github.com/Taylan789/MobilyaCAD/actions/runs/44974595666), and Pages [#44974595608](https://github.com/Taylan789/MobilyaCAD/actions/runs/44974595608) all succeeded. QA: **142 frontend + 628 domain tests**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build and audit **0 vulnerabilities**.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. This was a domain/test-only slice; no visible frontend redesign.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed with OpenRouter free-model daily HTTP 429; no paid fallback, quota/secrets change or rerun. Integration/performance job skipped.
- Next: DOM-103 additive CSV formatVersion disclosure for legacy import; frontend warning remains UI-agent-owned. No frontend files changed.

## 22 Kasım 2026 03:44 TRT — DOM-101 VERIFIED

- Added adversarial regression coverage in `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`: valid BOM/no-BOM and CRLF/LF/single-CR record delimiters round-trip exactly; malformed quote boundaries, trailing characters, unquoted quotes, extra blank record and unfinished quoted field fail closed with `comparison=null`.
- Production CSV parser/serializer unchanged. DOM-099's 1 MiB UTF-8 and 2,000-line bounds remain intact.
- Code/test commit: [24b5bdc](https://github.com/Taylan789/MobilyaCAD/commit/24b5bdc358d6b8e5fa8404a063dde0f024fd3068). Exact-SHA CI [#44968313006](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968313006), QA [#44968312997](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312997), and Pages [#44968312947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312947) succeeded.
- QA: 142 frontend + 624 domain tests, strict domain type-check, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. No visible UI change.
- AI Developer [#44953172176](https://github.com/Taylan789/MobilyaCAD/actions/runs/44953172176) still failed on OpenRouter free-model daily HTTP 429; integration/performance job skipped, no specialist branch/PR; no quota, paid-service or secret changes.
- Next: DOM-102 legacy JSON v1/v2 and CSV v1/v2/v3 compatibility matrix; INT-001 frontend-owned, INT-002/PERF-001 specialist-owned.

## 22 Kasım 2026 02:34 TRT — DOM-100 VERIFIED

- Code/test commit: [f704bbd6](https://github.com/Taylan789/MobilyaCAD/commit/f704bbd6af908a1626c61c9d9aa13663ed313087). JSON v2 → CSV v3 → JSON v2 cross-format exact round-trip preserves catalog resource IDs/units, Part IDs and provenance; malformed CSV line-row version rejects with no partial comparison.
- First attempt [5f6b3b19](https://github.com/Taylan789/MobilyaCAD/commit/5f6b3b19d33a50942e61a43f5930d160dbed9d08) failed QA because CSV serializer rejects the parser result's extra file envelope property. Correction explicitly passes only status, diagnostics, and comparison; no test was weakened.
- Exact-SHA CI [#44962373022](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373022), QA [#44962373046](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373046), Pages [#44962373013](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373013) all succeeded. QA: 142 frontend + 622 domain tests, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployment confirmed. Local tests were not run in this runtime; exact-SHA Actions are the evidence.
- Next: DOM-101 adversarial CSV quoting/record boundaries; DOM-102 legacy format compatibility; INT-001 remains frontend-owned.


## 22 Kasım 2026 00:15 TRT — DOM-097 VERIFIED

- Fractional hardware quantity and labor/operation tariff revisions reconcile rounded line/category/grand totals over r1→r3; exact JSON v2/CSV v3 round-trip is covered.
- DOM-097 code/test commit: [56e00eef](https://github.com/Taylan789/MobilyaCAD/commit/56e00eefa5d8a29a77362bea10345a3b31586745). Current exact-SHA CI [#44948272866](https://github.com/Taylan789/MobilyaCAD/actions/runs/44948272866), QA [#44948272895](https://github.com/Taylan789/MobilyaCAD/actions/runs/44948272895), and Pages [#44948272855](https://github.com/Taylan789/MobilyaCAD/actions/runs/44948272855) succeeded.
- This verification was superseded by the DOM-098 exact-SHA run; no frontend, adapter/performance-owned files or CNC output changed.

## 22 Kasım 2026 00:15 TRT — DOM-098 VERIFIED

- **Code/test:** [feature commit 88bb19f](https://github.com/Taylan789/MobilyaCAD/commit/88bb19f441349563fb7c23fd858a2ba0df490755); [fixture correction 2ed95db](https://github.com/Taylan789/MobilyaCAD/commit/2ed95db6639a1f9bdb70cb95c5f9e156f6136e2e). Changes limited to `domain/production/projectQuoteRevisionComparisonFile.ts` and its test.
- JSON comparison imports reject payloads above 1 MiB UTF-8 before parsing, and line-change arrays above 2,000 before mapping. Serializer applies the same line cap and byte limit; all failures return null JSON/file/comparison rather than partial data. Tests cover multibyte UTF-8, 2,001 rows and 2,000 long lines.
- Exact-SHA CI [#44950880826](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880826), QA [#44950880888](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880888), Pages [#44950880938](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880938) all succeeded: **142 frontend + 620 domain tests**, strict domain TS, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ (exact-SHA Pages deployment succeeded).
- Initial QA #44950816716 failed on a syntax typo in the multibyte fixture; corrected in 2ed95db and final QA passed. No tests weakened.
- **Next:** DOM-099 bounded comparison CSV import; DOM-100 cross-format JSON/CSV integrity tests. INT-001 remains frontend-owned; INT-002/PERF-001 specialist-owned and no active specialist PR found.


## 21 Kasım 2026 21:14 TRT — DOM-095 VERIFIED

- **Test commit:** [9258473e](https://github.com/Taylan789/MobilyaCAD/commit/9258473ebe4521ee1df5143c8215e1ab4772fb0f); only domain/production/projectQuoteRevision.test.mjs changed for the feature slice.
- **Coverage:** r1→r3 skips the middle r2, compares a 1.25 m² material line reduced 1000→800 minor units plus a 0.5 m² material addition at 600, hardware 250→300 with quantity 2, labor 200→250, operation removal (400), waste reduction 300→100, and unchanged profit.
- **Reconciliation:** material +50, hardware +100, labor +50, operation −400, waste −200, profit 0; grand total −400. Added/removed/changed counts 1/1/4. Part provenance and exact JSON v2 / CSV v3 round-trip are asserted.
- **Exact-SHA Actions:** CI [#44934335237](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335237), QA [#44934335265](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335265), and Pages [#44934335205](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335205) succeeded. QA: **142 frontend + 614 domain tests**, strict domain TS, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- **Test site:** https://taylan789.github.io/MobilyaCAD/; exact-SHA deployment succeeded. No frontend, production engine or CNC output changed.
- **Incident/recovery:** first Git tree commit [aca859e8](https://github.com/Taylan789/MobilyaCAD/commit/aca859e88ba6071c474001f2a0f04512811f6357) omitted the base tree. Immediate restoration commit [c97986a8](https://github.com/Taylan789/MobilyaCAD/commit/c97986a88bda5c9afac200ce382143795049396e) restored all **253 tree entries and 4 workflows**; no history rewrite was used. That restoration SHA's QA exposed invalid quote-adjustment categories, fixed in 9258473e; final exact-SHA CI/QA/Pages are green.
- **AI Developer:** [run #44934045185](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934045185) failed with “Unsupported event type: push”; previous run [#44924539196](https://github.com/Taylan789/MobilyaCAD/actions/runs/44924539196) hit OpenRouter free-model daily 429. No rerun (deterministic trigger/quota); no paid retry or secret/quota changes. Integration/performance specialist job skipped.
- **Next:** DOM-096 malformed comparison JSON/CSV fail-closed tests; INT-001 adapter contract; DOM-097 fractional hardware and labor/operation revision reconciliation.

## 21 Kasım 2026 20:35 TRT — DOM-094 VERIFIED

- **Test commit:** [3235df04](https://github.com/Taylan789/MobilyaCAD/commit/3235df04df6fc0d3e7c4937590f9c3ac8dd60bb5); regression in `domain/production/projectQuoteRevision.test.mjs`. Three-revision r1→r3 test verifies fractional quantity rounding, price reduction, and intermediate r2 isolation.
- **Behavior:** 0.375 m² at 101→80 minor-unit/m² rounds line totals 38→30; a 0.5×1 minor-unit line rounds half-up to 1 while 0.4×1 rounds to 0. Comparison has exactly one changed line and material/grand deltas −8 minor units; other categories are 0. JSON v2 and CSV v3 round-trip exactly.
- CI [#44931241164](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241164), QA [#44931241180](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241180), Pages [#44931241155](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241155) all succeeded: **142 frontend + 613 domain tests**, strict domain type-check, lint 32 warnings / 0 errors, production build, production audit 0 vulnerabilities.
- **Test site:** https://taylan789.github.io/MobilyaCAD/; deployment verified. Regression-only slice; no production calculations or frontend files changed.
- **Limits:** first QA attempts exposed test fixture source-ID expectations; corrected and reverified. AI Developer [#44924539196](https://github.com/Taylan789/MobilyaCAD/actions/runs/44924539196) remains blocked by OpenRouter free-model daily HTTP 429; no paid retry or quota/secrets change. Integration/performance lane skipped. UI PRs #140 and #141 are drafts; no visible frontend redesign is included in this domain slice.
- **Next:** DOM-096 adversarial comparison JSON/CSV rejection without partial payload; INT-001 adapter contract remains shared with frontend; DOM-097 fractional hardware quantity and labor/operation revision reconciliation.

## 21 Kasım 2026 19:27 TRT — DOM-093 VERIFIED

- **Code/test commit:** [34381ae4](https://github.com/Taylan789/MobilyaCAD/commit/34381ae4231f291c2826509fa7b3369a6e3964ff); regression test in `domain/production/projectQuoteRevision.test.mjs`. Coordination and roadmap also updated.
- **Behavior:** r1→r3 ignores the intermediate r2 quantity change, isolates the one Part-scope replacement as a removed/added pair, keeps the other Part-scoped line unchanged, and reconciles material/grand totals to 0. JSON v2 and CSV v3 round-trip exactly.
- Exact-SHA CI [#44925107973](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925107973), QA [#44925108135](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925108135), and Pages [#44925107985](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925107985) succeeded. QA: **142 frontend + 612 domain tests**, DOM-093 passed, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, audit **0 vulnerabilities**.
- **Test site:** https://taylan789.github.io/MobilyaCAD/; deployment run verified. Local tests were not run in this runtime; remote Actions are the verification source.
- **Limits:** no frontend/runtime calculation changes. AI Developer [#44924539196](https://github.com/Taylan789/MobilyaCAD/actions/runs/44924539196) failed on OpenRouter free-model daily 429; no paid retry, quota/secrets change. Integration/performance job skipped; UI PR #139 remains draft/unmerged.
- **Next:** DOM-094 price reductions and fractional quantities with rounded line/category/grand-total reconciliation; DOM-095 mixed-category comparison.

## 21 Kasım 2026 22:46 TRT — DOM-096 VERIFIED

- Final code/test commit: [798e29b84731352e8249012c16e635a6a97d28f0](https://github.com/Taylan789/MobilyaCAD/commit/798e29b84731352e8249012c16e635a6a97d28f0). Changes: \`domain/production/projectQuoteRevisionComparisonFile.ts\`, \`domain/production/projectQuoteRevisionComparisonFile.test.mjs\`, \`domain/production/projectQuoteRevisionComparisonCsv.test.mjs\`.
- Duplicate guard rejects repeated exact line snapshots per from/to side. Repeated source identity with differing quantity/price is allowed, preserving DOM-091. Inconsistent JSON/CSV category/grand totals return blocked/null payload; valid JSON v2 and CSV v3 round-trip remains exact.
- Exact-SHA Actions: CI [#44943420344](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420344), QA [#44943420373](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420373), Pages [#44943420330](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420330) succeeded. QA: **142 frontend + 616 domain tests**, strict domain TS, production build, audit 0 vulnerabilities; lint 32 warnings / 0 errors.
- Test site verified: https://taylan789.github.io/MobilyaCAD/.
- Earlier iterations failed QA (DOM-091 repeated identity regression; duplicate-test diagnostic assertion; CSV metadata fixture). These were corrected and rerun; only final SHA is marked verified.
- AI Developer [#44934045185](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934045185) failed deterministically on unsupported \`push\` event; no rerun or paid/quota/secrets changes. Integration/performance lane skipped; UI PRs #140/#141 remain separate frontend ownership.
- Next: DOM-097 fractional hardware + labor/operation reconciliation; INT-001 frontend/domain export contract; DOM-098 bounded comparison JSON import.

## 21 Kasım 2026 23:44 TRT — DOM-097 IMPLEMENTED, Actions verification pending

- **Code/test commit:** [56e00eef](https://github.com/Taylan789/MobilyaCAD/commit/56e00eefa5d8a29a77362bea10345a3b31586745); added regression coverage in `domain/production/projectQuoteRevision.test.mjs`.
- **Coverage:** r1→r3 comparison includes fractional hardware quantity (1.25→2.5), existing labor quantity/tariff change (1.5 h × 2,400→1.75 h × 2,800), and operation change (0.125 h × 1,010→0.5 h × 1,020); the intermediate r2 is deliberately ignored.
- **Expected reconciliation asserted:** hardware +1,000, labor +1,300, operation +384, grand total +2,684 minor currency units; line totals use the shared half-up rounding helper. Exact comparison JSON v2 and CSV v3 round-trip assertions included.
- **Files:** only `domain/production/projectQuoteRevision.test.mjs` changed for code/test; no frontend, adapter/performance-owned file, production calculation or CNC output changed.
- **Actions:** push CI/QA are configured for `dev/github-work`; this run could not retrieve the exact-SHA workflow run list, and the current combined status was empty. CI/QA therefore remain **unverified/pending**, not green. Test site https://taylan789.github.io/MobilyaCAD/ is not claimed updated; latest known verified deployment is Pages [#44943420330](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420330) on the DOM-096 SHA.
- **Next:** verify DOM-097 exact-SHA CI/QA and Pages deployment; then DOM-098 bounded comparison JSON import rejection.


## 22 Kasım 2026 01:37 TRT — DOM-099 VERIFIED

- **Code/test commit:** [24f945c0](https://github.com/Taylan789/MobilyaCAD/commit/24f945c0dd05c2653daaacdba5361460f20883b6); changed \`domain/production/projectQuoteRevisionComparisonCsv.ts\` and \`domain/production/projectQuoteRevisionComparisonCsv.test.mjs\`, plus roadmap/progress/coordination.
- CSV parser now rejects UTF-8 payloads above 1 MiB before parsing and caps records to 8 fixed rows + 2,000 line changes. CSV serializer enforces the same byte cap. v1/v2/v3 headers remain unchanged.
- Regression tests cover a multibyte input that is under the character-count limit but over the byte limit, and 2,001 line rows in a 640,024-byte fixture; rejected imports return no comparison.
- Exact-SHA CI [#44958138720](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138720), QA [#44958138801](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138801), and Pages [#44958138729](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138729) all succeeded. QA: **142 frontend + 621 domain tests**, strict domain TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ — Pages deployment confirmed; direct browser fetch was unavailable in this runtime.
- AI Developer [#44953172176](https://github.com/Taylan789/MobilyaCAD/actions/runs/44953172176) failed on OpenRouter free-model daily HTTP 429; integration/performance specialist job skipped and no specialist branch/PR found. No quota, paid service, or secrets changed.
- **Next:** DOM-100 cross-format JSON v2 ↔ CSV v3 integrity tests; DOM-101 adversarial CSV quoting/record boundaries; INT-001 remains frontend-owned.
