## 26 Kasım 2026 05:35 TRT — DOM-179 VERIFIED

- **Base / implementation:** `dev/github-work` base HEAD `1faaaae212f2d3afe7afa07c29ab10b6c547b870`; code/test + contract/coordination/roadmap commit [`d6a654c76cb1315c9857e09c36b665067f9fa948`](https://github.com/Taylan789/MobilyaCAD/commit/d6a654c76cb1315c9857e09c36b665067f9fa948).
- **Delivery:** standalone quote history is imported into an empty JSON v2 envelope, restored through JSON stringify/parse, appended immutably with revision 2, re-read and exported again. Unknown top-level/nested metadata and own `__proto__` JSON data properties survive; prototypes remain ordinary; target/restored inputs remain unchanged; revision sequence and previous link reconcile.
- **Changed files in implementation commit:** `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. No production source/API, `frontend/**`, adapter/benchmark-owned files, CNC/machine, secrets/settings or `main` changed.
- **Exact-SHA automation:** CI [#45742984051](https://github.com/Taylan789/MobilyaCAD/actions/runs/45742984051) succeeded; QA [#45742983965](https://github.com/Taylan789/MobilyaCAD/actions/runs/45742983965) succeeded with 337/337 frontend + 799/799 domain tests; DOM-179 regression test #514 passed; strict shared-domain TypeScript passed; lint 36 warnings / 0 errors; production build passed; production-only dependency audit found 0 vulnerabilities.
- **Test-site deployment:** Pages [#45742983909](https://github.com/Taylan789/MobilyaCAD/actions/runs/45742983909) succeeded. Deployment log confirms `pages_build_version` exactly equals `d6a654c76cb1315c9857e09c36b665067f9fa948`; test site deployed at https://taylan789.github.io/MobilyaCAD/.
- **Measured limits:** Vite JS 1,699.10 kB (475.21 kB gzip), CSS 463.83 kB (77.95 kB gzip); the >500 kB chunk warning remains. Viewport p95/memory are NOT MEASURED; overall 10/10 gate remains unchecked. Physical CNC/machine/workshop validation remains human validation.
- **Parallel roles:** UI-owned INT-001 project CSV identity/parser round-trip is partial verified on [commit 1faaaae](https://github.com/Taylan789/MobilyaCAD/commit/1faaaae212f2d3afe7afa07c29ab10b6c547b870); unsupported cutout geometry, catalog edge-band assignments and CNC operations fail closed. UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft/unmergeable and untouched. Integration/Performance job was skipped and no specialist branch was found; INT-002/PERF-001 remain specialist-owned, QA-003 remains blocked on INT-002 evidence.
- **AI Developer:** run [#45732081049](https://github.com/Taylan789/MobilyaCAD/actions/runs/45732081049) failed with OpenRouter free daily quota HTTP 429 (limit 50, remaining 0; reset 27 November 2026 03:00 TRT). No rerun before reset, paid fallback, secret or quota change.
- **Next:** DOM-180 — verify inclusive 64-level / 16 MiB JSON v2 envelope resource boundaries; preserve atomic blocking at boundary +1 and all existing restore/append behavior.

## 26 Kasım 2026 01:35 TRT — DOM-176 VERIFIED

- Base `dev/github-work` HEAD: `4afe0d37ae2f816837d3d2e0c37504ef0eed26c1`. Initial test commit [`988638a`](https://github.com/Taylan789/MobilyaCAD/commit/988638a6472a4d5dd6711a2de85d1b04e33b762b) passed CI but exact-SHA QA found one fixture projection mismatch: legacy `sourceIntegrityVersion` is intentionally absent (`undefined`), not `null`. No domain implementation failure was observed and the failed SHA was not deployed. Corrected test commit: [`4f628835`](https://github.com/Taylan789/MobilyaCAD/commit/4f6288356e361d98197202fc9683bb9bf6ad7973).
- Added DOM-176 regression in `domain/production/projectQuoteRevision.test.mjs`: serialize/parse a five-revision mixed material-basis history (v2 manifest, legacy v1, v2, v1, v2), append a strict v2 revision and a strict no-basis revision after parse, serialize/parse again, and prove the history remains byte-stable on re-export. The test also verifies legacy marker absence, new marker presence, sequence/previous links, immutable inputs, duplicate-ID fail-closed behavior, exact source-map/source-integrity audit equality and five non-adjacent pair comparisons across group/full/source-map APIs.
- Reconciled totals: 6 stock-sheet purchase revisions, 4 manifest-v2, 2 legacy, 8 manifest Part references / 5 unique manifest Part IDs, and 10 total stock-sheet Part references / 7 unique Part IDs; strict/legacy source integrity 2 + 5. Manifest availability remains explicit for legacy/no-basis comparisons; no Part delta is fabricated.
- Changed in implementation commits: `domain/production/projectQuoteRevision.test.mjs`, `AI_COORDINATION.md`. Documentation follow-up: `AI_PROGRESS.md`, `PRODUCT_ROADMAP.md`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`. No production calculation source changed because existing serializer/parser/append/audit/comparison APIs satisfied the contract.
- Exact-SHA CI [#45715035645](https://github.com/Taylan789/MobilyaCAD/actions/runs/45715035645), QA [#45715035664](https://github.com/Taylan789/MobilyaCAD/actions/runs/45715035664), and Pages [#45715035731](https://github.com/Taylan789/MobilyaCAD/actions/runs/45715035731) all succeeded for `4f6288356e361d98197202fc9683bb9bf6ad7973`. QA: 323/323 frontend + 794/794 shared-domain tests; DOM-176 test #435 passed; strict shared-domain TypeScript; lint 36 warnings / 0 errors; production build; production-only audit 0 vulnerabilities.
- Pages deploy log confirms `pages_build_version` exactly equals `4f6288356e361d98197202fc9683bb9bf6ad7973`; test site deployed at https://taylan789.github.io/MobilyaCAD/.
- Known limits: Vite JS bundle 1,698.57 kB (475.10 kB gzip), CSS 452.87 kB (76.20 kB gzip), and the >500 kB chunk warning remain. Full-install audit's previous baseline had 4 moderate findings; this run only executed the production-only audit (0 vulnerabilities). Viewport p95/memory remain NOT MEASURED. No physical CNC/machine/workshop validation or UI editor startup/new/save/open integration is claimed.
- AI Developer run [#45690500003](https://github.com/Taylan789/MobilyaCAD/actions/runs/45690500003) was inspected and failed on OpenRouter free daily quota HTTP 429 (limit 50, remaining 0; reset 26 Nov 2026 03:00 TRT). At this run it was still before reset, so no rerun or paid fallback was attempted. Integration/Performance job remains disabled (`if: false`) and branch search found no specialist branch. UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and unmerged.
- `frontend/**`, adapter/benchmark ownership, secrets/settings, and `main` were not changed.
- Next: DOM-177 — import the same mixed standalone history into an empty project-v2 envelope, JSON stringify/parse/restore, append and re-export, then reconcile exact audits and pairwise comparison coverage. Keep editor wiring with UI-owned INT-003; DOM-153 follows only after that integration. PERF-001/INT-002 remain specialist-owned.

## 26 Kasım 2026 00:56 TRT — DOM-175 VERIFIED

- Base \`dev/github-work\` HEAD: \`dc173adfbd467f093f783777e23310496e2daf8e\`. Test + contract/roadmap/coordination implementation commit: [\`132e20a6\`](https://github.com/Taylan789/MobilyaCAD/commit/132e20a6dec1f2fa1322cb5b2acad5fc01bec900).
- Domain behavior: a five-revision mixed history (manifest v2, legacy v1, v2, v1, v2) receives an immutable manifest-v2 append and a second immutable no-basis append. The test verifies derived sequence/previous links, strict source-integrity markers on appended revisions, frozen outputs, and that the original history and first append remain unchanged.
- Reconciled totals after both appends: 6 stock-sheet purchase revisions, 4 manifest-v2 revisions, 2 legacy revisions, 8 manifest Part references / 5 unique manifest Part IDs, and 10 total stock-sheet Part references / 7 unique Part IDs. Strict/legacy audit: 2 strict + 5 legacy revisions. Five selected pairwise comparisons agree across group, full quote and source-map APIs; legacy/no-basis coverage never invents Part deltas. Duplicate revisionId append is blocked with \`history: null\` and no mutation.
- Changed files: \`domain/production/projectQuoteRevision.test.mjs\`, \`docs/production-domain-contract.md\`, \`AI_COORDINATION.md\`, \`PRODUCT_ROADMAP.md\`. No production calculation source changed because the existing append API satisfied the new regression contract; this slice adds proof rather than changing pricing behavior.
- Exact-SHA CI [#45708700332](https://github.com/Taylan789/MobilyaCAD/actions/runs/45708700332), QA [#45708700517](https://github.com/Taylan789/MobilyaCAD/actions/runs/45708700517), and Pages [#45708700298](https://github.com/Taylan789/MobilyaCAD/actions/runs/45708700298) all succeeded for \`132e20a6dec1f2fa1322cb5b2acad5fc01bec900\`. QA: 323/323 frontend + 793/793 shared-domain tests; DOM-175 test #434 passed; strict shared-domain TypeScript; lint 36 warnings / 0 errors; production build; production-only audit 0 vulnerabilities.
- Pages deploy log confirms \`pages_build_version\` equals the exact implementation SHA and deployment succeeded at https://taylan789.github.io/MobilyaCAD/.
- Known limits: Vite JS bundle 1,698.57 kB (475.10 kB gzip) and CSS 452.87 kB (76.20 kB gzip); the 500 kB chunk warning remains. Full-install audit retains 4 moderate findings from the prior baseline; production-only audit is clean. Viewport p95/memory remain NOT MEASURED. No physical CNC/machine/workshop validation, UI editor save/open integration, or JSON/CSV adapter integration is claimed.
- AI Developer run [#45690500003](https://github.com/Taylan789/MobilyaCAD/actions/runs/45690500003) failed on OpenRouter free daily quota (HTTP 429, remaining 0; reset 26 Nov 2026 03:00 TRT). It was not rerun before reset. Integration/Performance specialist job remains disabled (\`if: false\`); no specialist branch found. UI-owned INT-003 PR #206 remains draft and isolated.
- \`frontend/**\`, adapter/benchmark ownership, secrets/settings, and \`main\` were not changed.
- Next: DOM-176 — round-trip the mixed revision history through the standalone quote-revision JSON file serializer/parser, then append and reconcile audit/comparison results; keep editor-level JSON v2 wiring with UI owner INT-003.

## 25 Kasım 2026 14:07 TRT — DOM-165 VERIFIED

- Base `dev/github-work` HEAD: `9940200117b4f7011ccb1567be266b4353d74c82`. İlk implementation commit: [`e77957c`](https://github.com/Taylan789/MobilyaCAD/commit/e77957c2d5472a539f2f2a64c37be56d3744d1f2); strict TypeScript QA `TS18046` ile ham `rollSpecs.length` okumasını yakaladı. Bu SHA test sitesine dağıtılmadı. Düzeltilmiş code/test commit: [`ffab4aa`](https://github.com/Taylan789/MobilyaCAD/commit/ffab4aa29051182a825c1ba77428a911a48fad55).
- Domain behavior: ortak `copyDenseDataRecordList` helper'ı rulo ölçü ve rulo fiyat listelerini en fazla 1.000 satırlık standart yoğun diziler ve plain/null-prototype satırlar olarak descriptor üzerinden kopyalar. Accessor/inherited/custom prototype, symbol/unknown/non-enumerable alan, sparse/extended array ve Proxy reflection trap fail-closed engellenir; getter çalıştırılmaz. Hem doğrudan rulo hesaplayıcıları hem birleşik quote yolu aynı sınırları kullanır.
- Ek regresyon: boş tüketimde bile raw Proxy array `length` getter'ı okunmaz; yalnızca normalize edilmiş liste uzunluğu kullanılır. Geçerli mm/0.1 mm, açık ek pay, roll count, kullanıcı fiyatı, para birimi ve kaynak provenance davranışı korunur.
- Değişen dosyalar: `domain/production/descriptorSafeInput.ts`, `domain/production/projectEdgeBandingRollPlan.ts`, `domain/production/projectEdgeBandingRollPlan.test.mjs`, `domain/production/projectEdgeBandingRollCostSummary.ts`, `domain/production/projectEdgeBandingRollCostSummary.test.mjs`, `domain/production/projectQuoteSummary.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Exact-SHA CI [#45602592844](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602592844), QA [#45602592876](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602592876) ve Pages [#45602593126](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602593126) başarılı. QA: 290/290 frontend + 777/777 domain testi; strict shared-domain TypeScript; lint 36 uyarı/0 hata; production build; production-only audit 0 vulnerability.
- Test sitesi doğrulanmış SHA'dan dağıtıldı: https://taylan789.github.io/MobilyaCAD/.
- Bilinen kısıtlar: production JS ana chunk 1.698 MB (gzip 475 kB), Vite 500 kB uyarısı sürüyor; viewport p95 ve bellek ölçümü NOT MEASURED. Fiziksel CNC/makine standardı veya atölye doğrulaması yapılmadı. UI-owned INT-003 PR #206 açık/draft; merge edilmedi. Integration/Performance specialist branch bulunmadı; PERF-001/INT-002 sahipliği korunuyor. AI Developer son run'ı OpenRouter free-tier HTTP 429 ile başarısız; reset 26 Kasım 2026 03:00 TRT öncesinde rerun yapılmadı.
- `frontend/**`, adapter/benchmark dosyaları, secrets/settings ve `main` değiştirilmedi.
- Next: DOM-166 — production report, consumption price table, work items ve tariff table public quote sınırlarının nested descriptor audit'i; UI-owned INT-003/DOM-153 bağımlılığını ayrı tut.

## 25 Kasım 2026 14:03 TRT — DOM-164 VERIFIED

- Base `dev/github-work` HEAD: `7e3a14f3c3daab52da3451d795b0aa8dc41ac643`. Final verified code/test commit: [`b932c60`](https://github.com/Taylan789/MobilyaCAD/commit/b932c60acfc6d673155721398abc777ca5d124b1). Intermediate commits: [`56e270f`](https://github.com/Taylan789/MobilyaCAD/commit/56e270f79b28e8a03cba5827962556ff54760bd3) and [`7bd58ca`](https://github.com/Taylan789/MobilyaCAD/commit/7bd58caaa47799c130b5c113def453ca1d06cbdf); both were corrected before final exact-SHA verification.
- Domain behavior: `calculateProjectCostSummary` now copies a standard dense cost-line array (maximum 10,000 entries) and plain/null-prototype line records through own enumerable data descriptors. Accessors, inherited fields, symbols, non-enumerable/unknown fields, custom prototypes, sparse/extended/oversized arrays and thrown reflection traps fail closed without invoking getters. Quote-specific waste/profit and mandatory source-reference checks use only normalized summary lines.
- Public quote options and the top-level material-cost-basis request are descriptor-safe copied before field reads. The same adjustment guard covers direct quote, material-basis quote and immutable pricing-snapshot paths. Invalid input returns no partial cost summary, quote total or pricing snapshot.
- Changed files: `domain/production/projectCostSummary.ts`, `domain/production/projectCostSummary.test.mjs`, `domain/production/projectQuoteSummary.ts`, `domain/production/projectQuoteSummary.test.mjs`, `domain/production/projectMaterialCostBasis.ts`, `domain/production/projectMaterialCostBasis.test.mjs`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Exact-SHA CI [#45600686688](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686688), QA [#45600686727](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686727) and Pages [#45600686669](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686669) all succeeded for `b932c60`. QA: 290/290 frontend + 773/773 domain tests; strict shared-domain TypeScript; lint 36 warnings/0 errors; production build; production-only dependency audit 0 vulnerabilities. Pages build, exact-SHA gate and deploy job succeeded.
- Test site deployed from the verified SHA: https://taylan789.github.io/MobilyaCAD/.
- Validation history: `56e270f` first passed CI but QA found a stale `isRecord` reference (117 shared-domain test failures); removed in `7bd58ca`. That correction exposed one assertion-order mismatch in the extended-array regression; validation order was corrected in `b932c60`. The final exact SHA passed all tests; earlier failed runs did not deploy.
- Known limits: nested roll-spec/roll-price arrays and production/price/work-item source payloads remain delegated to their respective validators; this slice does not claim to deep-clone every nested quote source. The 10,000-line cap is explicit. AI Developer's latest OpenRouter free-quota run remains HTTP 429 until 26 Nov 2026 03:00 TRT; it was not rerun. Integration/Performance workflow job remains disabled (`if: false`) and no specialist branch exists. UI-owned INT-003 PR #206 remains draft/unmergeable; no frontend integration is claimed.
- No `frontend/**`, adapter/performance-owned files, secrets/settings or `main` changes. No physical CNC or machine validation is claimed.
- Next: DOM-165 — descriptor-safe validation of nested roll-spec/roll-price arrays and their line records; keep INT-003 UI editor integration and DOM-153 save/reopen work under the frontend owner's separate scope.

## 25 Kasım 2026 09:53 TRT — DOM-161 VERIFIED

- Base `dev/github-work` HEAD before the slice: `860af5abee1bed478368897a86abbabff310d8d0`. Code/test commit: [`279067c7`](https://github.com/Taylan789/MobilyaCAD/commit/279067c73135e19e36392be76f0fb2ca75e206cc).
- Persisted JSON v2 `edgeBandingRollPricing` now feeds `createProjectQuotePricingSnapshot` when `edgeBandingPricingMode: "roll"` is explicit. Legacy v1, malformed/blocked extensions, ambiguous mode and duplicate persisted/explicit sources fail closed; roll count, price, Part IDs and plan/price provenance remain in the immutable snapshot.
- Changed files: `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Exact-SHA CI [#45563745096](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745096), QA [#45563745095](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745095) and Pages [#45563745097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745097) all succeeded. QA: 277/277 frontend + 754/754 domain tests; strict shared-domain TypeScript; lint 36 warnings/0 errors; production build; production dependency audit 0 vulnerabilities.
- Test site deployed from the verified SHA: https://taylan789.github.io/MobilyaCAD/.
- Known limits: UI must pass the current v2 envelope after INT-003 is integrated; roll mode is explicit and never inferred. Legacy v1 roll persistence, CNC/machine output and physical production validation are not included. No frontend, adapter/performance-owned files, secrets/settings or `main` changes.
- Next: UI-owned INT-003 editor save/open integration (draft PR #206); then DOM-153 editor append → save → reopen → append.

## 25 Kasım 2026 09:04 TRT — DOM-160 VERIFIED

- Code commit [757e959](https://github.com/Taylan789/MobilyaCAD/commit/757e959842a24c697ae1d5f92ce1b96f6a80359d) and test correction [357198f](https://github.com/Taylan789/MobilyaCAD/commit/357198fda15f71ae10aabf0a541174fcd05ebe19) added descriptor-safe JSON v2 edge-band roll-pricing reads, a 16 MiB UTF-8 / 64-level bounded deep clone, nested metadata isolation and fail-closed reflection-trap handling.
- Exact-SHA CI [#45557877841](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877841), QA [#45557878887](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557878887) and Pages [#45557877766](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877766) succeeded; QA: 272/272 frontend + 752/752 domain, strict TypeScript, lint 36 warnings/0 errors, production build and production dependency audit 0 vulnerabilities.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. Full dependency installation audit still reported 4 moderate findings; production-only audit reported 0 vulnerabilities.
- Next: INT-003 UI-owned JSON v2 editor save/open integration; DOM-153 remains dependent on it.

## 25 Kasım 2026 07:18 TRT — DOM-159 VERIFIED

- Base `dev/github-work` HEAD: `f3d38be0c385b631031db81ecf05429aa1833330`. Code/test commit: [`585a4d4a`](https://github.com/Taylan789/MobilyaCAD/commit/585a4d4a01c4e097ca63a06bedcd86be58c4da49).
- Finding: legacy v1 `inspectProjectEnvelope` checked own-property presence of `quoteRevisionHistory` outside a try/catch. A Proxy `getOwnPropertyDescriptor` trap could leak an exception from public quote-history read, append and import APIs.
- Change: reflection failure now returns a generic fail-closed blocked result. Regression covers all three public APIs, null partial payloads and exactly one descriptor-trap call per API. Normal v1 legacy read and v1 history rejection remain unchanged.
- Changed files: `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFileResourceLimits.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Exact-SHA CI [#45545857249](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857249), QA [#45545857344](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857344) and Pages [#45545857268](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857268) all succeeded. QA: 272/272 frontend + 746/746 domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit 0 vulnerabilities. Full install audit still reports 4 moderate findings; no dependency change was made.
- Test site deployed from the verified SHA: https://taylan789.github.io/MobilyaCAD/. The preceding UI-owned PRs #216 and #217 were also merged and deployed on their own verified SHA before this domain delivery.
- Known limit: Proxy reflection traps can still execute; this change only contains thrown reflection errors and does not claim safe arbitrary Proxy execution. No frontend, adapter/performance-owned files, CNC output, secrets/settings or `main` changes.
- Next: UI-owned INT-003 JSON v2 editor save/open integration; then DOM-153 editor append → save → reopen → append contract tests.

## 25 Kasım 2026 06:48 TRT — DOM-158 VERIFIED

- Base `dev/github-work` HEAD: `9c18bcea5d9b27321ef671d20da380e4ce496eab`. Code/test commit: [`8b5d2fda`](https://github.com/Taylan789/MobilyaCAD/commit/8b5d2fdacc06825b568c944857a1da7aa14357e4).
- Import preflight: the target v2 envelope's own enumerable data descriptor for `quoteRevisionHistory` is inspected and validated before parsing the standalone history file or cloning unrelated project fields. A non-empty valid history blocks immediately; project identity mismatch and malformed/accessor-backed histories fail closed.
- Regressions: oversized envelope + non-empty history returns the existing-history blocker before the 16 MiB limit; own accessor getter remains uncalled; explicit empty-history import remains ready; JSON v1 import remains blocked. No partial project/history and no source mutation.
- Changed files: `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFileResourceLimits.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Exact-SHA CI [#45542323197](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323197), QA [#45542323156](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323156) and Pages [#45542323163](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323163) all succeeded. QA: 259/259 frontend + 745/745 domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, TypeScript + production build, production dependency audit 0 vulnerabilities. Exact-SHA deployment to https://taylan789.github.io/MobilyaCAD/ completed. Build retains the existing ~1.70 MB minified entry-chunk warning.
- Known limits: JavaScript Proxy reflection traps remain outside descriptor-safety guarantees; this is not editor JSON v2 save/open integration or CNC/physical-production validation. No `frontend/**`, adapter/performance-owned files, secrets/settings or `main` changes.
- Next: UI-owned INT-003 parser/save/open integration; then DOM-153 editor append → save → reopen → append contract tests.

## 25 Kasım 2026 05:27 TRT — DOM-157 VERIFIED

- Base `dev/github-work` HEAD before the code slice: `c2a6364a809e01ebedecf02e9656d8a373104c8b`. Code/test commit: [`9a109959`](https://github.com/Taylan789/MobilyaCAD/commit/9a10995914e6d36cbd954acee3565b263a521701).
- Domain behavior: project-v2 append now checks the own data descriptor for `quoteRevisionHistory` and the shared append-capacity guard before cloning the full envelope. At 2,000 revisions it blocks before reading existing entries or the incoming revision, and before the 16 MiB envelope traversal.
- Regression: a project already over 16 MiB with a full sparse 2,000-slot history returns the revision-cap diagnostic first; both the first existing-entry getter and incoming `revisionId` getter remain uncalled. The operation returns no partial project/history and leaves source references unchanged.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFileResourceLimits.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Exact-SHA CI [#45532828711](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532828711) and QA [#45532829097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532829097) passed. QA: 259/259 frontend + 742/742 domain tests; strict domain TypeScript, lint 36 warnings/0 errors, production build, production-only audit 0 vulnerabilities. The full `npm ci` audit still reports 4 moderate findings; no dependency changes were made.
- Exact-SHA Pages [#45532828671](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532828671) passed and deployed to https://taylan789.github.io/MobilyaCAD/.
- AI Developer [#45526607336](https://github.com/Taylan789/MobilyaCAD/actions/runs/45526607336) failed on the older `0d169e5` SHA because OpenRouter's free daily quota was exhausted (HTTP 429, 50/50 used; reset 26 Nov 2026 03:00 TRT). It was not rerun: the run is stale and another shared-branch writer would conflict. The integration/performance specialist job remains disabled (`if: false`); no specialist branch/PR exists.
- Known limits: Proxy reflection traps remain outside descriptor-safety guarantees; JSON v2 editor save/open integration is UI-owned; no CNC/machine output or physical-production claim was added. No `frontend/**`, adapter/performance-owned files, secrets/settings, or `main` changed.
- Next: DOM-158 — reject importing standalone quote history into a project that already has history before cloning a potentially large target envelope; keep empty-history import and JSON v1 legacy behavior unchanged.

## 25 Kasım 2026 02:29 TRT — DOM-156 VERIFIED

- Base dev/github-work HEAD: b11b0f39742181b67317187a018c2c3137a0180a. Write-time preflight re-read the branch HEAD, all six target blob SHAs and workflow status; no active CI/QA/AI Developer/Pages run was present.
- Domain behavior: appendProjectQuoteRevision now reads the own enumerable data descriptor for revisions and the array's own length before validating/copying any existing revision entry or reading the incoming revision. At 2,000 existing revisions it returns blocked immediately; the standalone history validator still accepts exactly 2,000 records for read/export.
- Regression: a 2,000-length sparse array with an accessor at index 0 and an incoming snapshot accessor are both rejected without either getter being called; result contains no partial history and the source length remains unchanged.
- Changed files: domain/production/projectQuoteRevision.ts, domain/production/projectQuoteRevision.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Exact-SHA CI [#45510837681](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837681), QA [#45510837534](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837534) and Pages [#45510837542](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837542) all succeeded. QA: 245/245 frontend + 741/741 domain tests; strict domain TypeScript, lint 36 warnings/0 errors, production build and production-only dependency audit (0 vulnerabilities). The full npm ci audit summary reported 4 moderate findings; no dependency changes were made.
- Known limits: JavaScript Proxy reflection traps are not suppressed; project-v2 envelope cloning still occurs before its project-file append reaches this direct history API. No frontend, adapter/performance-owned files, CNC/machine profiles, secrets/settings, or main changed.
- AI Developer [#45450013010](https://github.com/Taylan789/MobilyaCAD/actions/runs/45450013010) was inspected again: free-model daily quota HTTP 429, limit 50/remaining 0, reset at 25 Nov 2026 03:00 TRT; specialist job skipped because its workflow job is disabled. No rerun before reset, no paid fallback, and no secret/quota changes.
- Next: DOM-157 — move the same append-capacity preflight to the project-v2 append boundary before the 16 MiB envelope copy, preserving read/restore semantics; INT-003 remains UI-owned.

## 24 Kasım 2026 18:48 TRT — DOM-149 VERIFIED

- Ürün dilimi: JSON v2 teklif geçmişi append/import için tüm proje zarfında 16 MiB UTF-8 JSON byte sınırı ve 64 iç içe nesne/dizi seviyesi. Giriş ve revizyon eklenmiş son sonuç ayrı ayrı doğrulanır; sınır aşımında `blocked`, `project: null`, `history: null`, kaynak nesne değişmeden kalır.
- İlk implementation commit [488ca963](https://github.com/Taylan789/MobilyaCAD/commit/488ca9635def2417dc18dd0acae16eb8c83306c1) QA'da `projectIdPattern is not defined` ve import kontrol sıralaması nedeniyle başarısız oldu; CI #45429155224 geçti, QA [#45429155456](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429155456) başarısız olduğu için Pages [#45429155410](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429155410) deploy'u doğru biçimde atladı. Bu SHA yayımlanmadı.
- Düzeltme commit [4c9c14c6](https://github.com/Taylan789/MobilyaCAD/commit/4c9c14c6acb3d059d7fe91783a4b931f54c06542) pattern tanımını geri koydu ve import akışında güvenli kopya → history read → overwrite kontrolü sırasını düzeltti.
- Exact-SHA CI [#45429499653](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429499653), QA [#45429500219](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429500219) ve Pages [#45429500230](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429500230) başarılı. QA: 235/235 unit + 730/730 domain; strict TypeScript, lint 36 uyarı / 0 hata, production build ve production dependency audit 0 açık zafiyet.
- Pages yalnızca doğrulanmış düzeltme SHA'sını yayımladı: https://taylan789.github.io/MobilyaCAD/. Değişen dosyalar: `domain/production/projectQuoteRevisionProjectFile.ts`, yeni `domain/production/projectQuoteRevisionProjectFileResourceLimits.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Standalone geçmiş dosyasının 1 MiB sınırı ve 2.000 revizyon sınırı ayrı kaldı; JSON v1 legacy read, şema, mm/adet hesapları, adapter/CNC ve frontend davranışı değiştirilmedi. Doğrudan history read/restore API sınırı DOM-150'ye bırakıldı.
- AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) logları OpenRouter ücretsiz günlük model kotası HTTP 429 olduğunu doğruladı; tekrar çalıştırılmadı. Workflow içindeki integration/performance job `if: false`; gerçek specialist branch/PR yok. Ücretli fallback, secret/kota değişikliği, frontend/**, adapter, CNC veya main değişikliği yapılmadı.
- Sonraki görev: DOM-150 — doğrudan project-v2 history read/restore yolunda aynı sınırları uygularken v1 legacy okumasını koru.

## 24 Kasım 2026 02:51 TRT — DOM-137 VERIFIED
- Code/test commit [4f67c7d6](https://github.com/Taylan789/MobilyaCAD/commit/4f67c7d6d205f054faef866e93bc574b23bbf613): JSON v2 append/read cross-consumer test starts from legacy marker-absent revision, appends two strict revisions, and reconciles readback audit to `[null, 1, 1]` (strict=2, legacy=1, total=3). Revision links and both prior project snapshots are preserved.
- Exact-SHA CI [#45292256838](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256838) and QA [#45292256730](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256730) passed; QA **201 frontend + 679 domain tests**, strict TypeScript, lint **34 warnings / 0 errors**, production build and audit **0 vulnerabilities**. Pages [#45292256696](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256696) successful; deployed test site https://taylan789.github.io/MobilyaCAD/.
- Files: `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`. Local Node tests were not run; exact-SHA Actions are the evidence.
- DOM-136 [commit 384a1f94](https://github.com/Taylan789/MobilyaCAD/commit/384a1f94a031622b3db03dc5db712e62f037d30a) was separately verified by CI [#45275145213](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145213), QA [#45275145182](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145182) and Pages [#45275145114](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145114).
- AI Developer [#45278475274](https://github.com/Taylan789/MobilyaCAD/actions/runs/45278475274) remains failed on OpenRouter free daily quota HTTP 429 (50/50 exhausted); no retry, paid fallback, secret/quota change. Integration/performance specialist is disabled/skipped and no separate agent PR verified. UI PRs remain separate/unmerged; no frontend, adapter/performance-owned files or `main` changes.
- Next: DOM-139 explicit nesting stock-sheet cost summary; DOM-138 and DOM-130 stay deferred until adapter ownership is available.


## 22 Kasım 2026 21:38 TRT — DOM-115 VERIFIED

- Test-only commit [d04b156](https://github.com/Taylan789/MobilyaCAD/commit/d04b156fdb49ff742659194cda3938df4c607fa1): blocked mixed-family conflict kaynak Part ID'leri unique set olarak karşılaştırılıyor ve her conflict diagnostic'in kaynak kapsamı ayrı doğrulanıyor. İki önceki QA başarısızlığı yalnız assertion beklentilerinden kaynaklandı; üretim tanı kodu değiştirilmedi.
- Exact-SHA CI [#45056168193](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168193), QA [#45056168306](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168306), Pages [#45056168182](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168182) başarılı. QA: **165 frontend + 641 domain testi**, strict domain TypeScript, lint **32 warning / 0 error**, production build ve dependency audit **0 vulnerability**.
- Test site deploy doğrulandı: https://taylan789.github.io/MobilyaCAD/. Frontend, production calculation source, adapter/performance-owned files, CNC output ve `main` değişmedi.
- AI Developer [#45045107407](https://github.com/Taylan789/MobilyaCAD/actions/runs/45045107407) OpenRouter free-model günlük kotası HTTP 429 nedeniyle başarısız; specialist job skipped/disabled, ayrı specialist branch/PR doğrulanmadı. Paid fallback, secret veya quota değişikliği yapılmadı.
- Next: DOM-116 ready nesting-batch selected/excluded Part snapshot ve material/thickness group consistency.


## 22 Kasım 2026 21:30 TRT — DOM-115 ikinci QA düzeltmesi, doğrulama bekliyor

- [Commit 1324c78](https://github.com/Taylan789/MobilyaCAD/commit/1324c78c7bce82b4dff5bf60f567e2355deb3dec) CI [#45055923770](https://github.com/Taylan789/MobilyaCAD/actions/runs/45055923770) başarılı; QA [#45055923801](https://github.com/Taylan789/MobilyaCAD/actions/runs/45055923801) başarısız: 640 domain testi geçti, 1 DOM-115 assertion failed. İlk regex düzeltmesi geçti; yeni hata, her blocked-furniture tanısının aynı tam conflict kaynak listesini taşıması ve testin flatten edilmiş tekrarları tekil listeyle karşılaştırmasıydı.
- Yeni test düzeltmesi conflict kaynak Part ID'lerini unique set olarak karşılaştırıyor ve her conflict diagnostic'in kendi kaynak listesini ayrıca doğruluyor. Üretim tanı kodu değiştirilmedi; bu commit için Actions henüz tetiklenmedi.
- Pages run [#45055923800](https://github.com/Taylan789/MobilyaCAD/actions/runs/45055923800) site build/artifact adımları başarılı; exact-SHA QA kapısı önceki QA failure nedeniyle son kontrolümde beklemede. Test site henüz yeni SHA'yı almamıştır; son başarılı deploy [#45049246309](https://github.com/Taylan789/MobilyaCAD/actions/runs/45049246309), [URL](https://taylan789.github.io/MobilyaCAD/).
- AI Developer [#45045107407](https://github.com/Taylan789/MobilyaCAD/actions/runs/45045107407) ücretsiz model kotası HTTP 429; specialist job skipped/disabled, ayrı uzman branch/PR doğrulanmadı. Ücret/secrets/kota değişmedi.
- Bu düzeltmenin commit SHA'sı ve exact-SHA CI/QA/Pages sonuçları sonraki progress kaydında yer alacak. Next: DOM-115 testini doğrula, ardından DOM-116 ready nesting-batch kaynak/grup tutarlılığı.


## 22 Kasım 2026 21:30 TRT — DOM-115 QA düzeltmesi, doğrulama bekliyor

- İncelenen branch HEAD: `f909ed3a3f55b1fd1308217f15a62f9d3a76963a`. CI [#45051528250](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528250) başarılı; QA [#45051528277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528277) başarısız: 640 domain testi geçti, yalnız DOM-115 testinin tanı mesajı regex'i gerçek metinle uyuşmadı. Üretim tanısı `katalog kimliği farklı adlarla kullanılıyor` diyor; test beklentisi `farklı malzeme adlarıyla` idi.
- Test beklentisi gerçek mevcut mesajla hizalandı; üretim kodu ve davranışı değiştirilmedi. CI/QA/Pages yeni SHA için bekleniyor; bu runtime'da yerel Node testleri çalıştırılamadı.
- Pages run [#45051528272](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528272) build'i başarılı olsa da QA kapısı başarısız olduğundan deploy atlandı. Son başarılı test-site sürümü [#45049246309](https://github.com/Taylan789/MobilyaCAD/actions/runs/45049246309); [test site](https://taylan789.github.io/MobilyaCAD/).
- AI Developer [#45045107407](https://github.com/Taylan789/MobilyaCAD/actions/runs/45045107407) OpenRouter ücretsiz model günlük kotası HTTP 429 nedeniyle başarısız; integration/performance job skipped/disabled, ayrı uzman branch/PR doğrulanmadı. Ücret, secret veya kota değişikliği yapılmadı.
- Files in this correction: `domain/production/projectSheetNestingBatches.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`. Commit SHA and exact-SHA Actions evidence will be recorded in the next progress update. Next: verify DOM-115 and then DOM-116.


## 22 Kasım 2026 20:43 TRT — DOM-115 IMPLEMENTED, Actions pending

- Added a cross-consumer regression: blocked mixed-family material-conflict Part/furniture provenance must exactly reconcile with material summaries from isolated valid source reports and a validated full Part snapshot; no partial nesting result or project snapshot is exposed.
- Files: `domain/production/projectSheetNestingBatches.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`.
- Test/contract-only slice; no production engine behavior/schema, frontend, adapter/performance-owned files, CNC output or `main` changes.
- Commit SHA and exact-SHA CI/QA/Pages are pending. Local execution unavailable in this runtime; no test success is claimed before Actions.
- AI Developer run [#45045107407](https://github.com/Taylan789/MobilyaCAD/actions/runs/45045107407) failed on OpenRouter free-model daily quota HTTP 429. No rerun/paid fallback/secret/quota changes; integration-performance job is disabled/skipped and no specialist branch was found.
- Next: DOM-116 ready nesting-batch consistency between selected/excluded Part snapshots and material/thickness batch source groups.

## 22 Kasım 2026 19:19 TRT — DOM-114 VERIFIED

- Blocked nesting-batch reports now preserve validated source-aware production diagnostics via the additive `productionDiagnostics` field; legacy human-readable diagnostics remain, and no partial batch/layout result is returned.
- Added a mixed cabinet/bookshelf conflict regression that checks complete sorted source-Part coverage, per-furniture diagnostic coverage, input-order invariance, input immutability, and fail-closed incomplete provenance.
- Files: `domain/production/projectSheetNestingBatches.ts`, `domain/production/projectSheetNestingBatches.test.mjs`, `domain/production/projectSheetCutPlanExport.ts`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Code/test commit: [751065b](https://github.com/Taylan789/MobilyaCAD/commit/751065b1437da702200696da588949bc0243596d). Exact-SHA [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968666), [QA](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968727) and [Pages](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968653) succeeded. QA: 162 frontend + 640 domain tests, strict TypeScript, lint 32 warnings/0 errors, production build and dependency audit 0 vulnerabilities.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. Local tests were not run in this runtime; GitHub Actions is the verification evidence.
- AI Developer [run #44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model quota HTTP 429; no rerun, paid fallback, or quota/secret change. Integration/Performance job remains disabled/skipped; no specialist agent run is claimed. Frontend PRs remain separate and unmerged.
- Documentation/progress commit [3eaf7f8](https://github.com/Taylan789/MobilyaCAD/commit/3eaf7f82a89f8b5eebc65b91fd382fbd8c72aabb) was also verified at exact SHA: [CI #45044150354](https://github.com/Taylan789/MobilyaCAD/actions/runs/45044150354), [QA #45044150376](https://github.com/Taylan789/MobilyaCAD/actions/runs/45044150376), [Pages #45044150367](https://github.com/Taylan789/MobilyaCAD/actions/runs/45044150367) all succeeded.
- Next: DOM-115 blocked mixed-family nesting/material-summary/Part-snapshot reconciliation.

## 22 Kasım 2026 11:10 TRT — DOM-108 VERIFIED

- Mixed-family material-reference regression covers a cabinet override to a missing catalog ID alongside a valid table, and a valid cabinet alongside a table assigning an 8 mm top to an 18 mm-only material. Both must block the project, return no partial Parts, retain family-specific diagnostics, throw through the strict aggregator, and leave request inputs unchanged.
- Files: domain/production/projectProduction.test.mjs, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md. No production source, frontend, adapter/performance-owned files, schema, or machine output changed.
- [Test commit 5595e8c9](https://github.com/Taylan789/MobilyaCAD/commit/5595e8c9a36b4edf8dd1decb2dbfc27dc1fb7ef7) passed exact-SHA [CI #45001931586](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931586), [QA #45001931594](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931594), and [Pages #45001931632](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931632). QA: 148 frontend + 632 domain tests; strict domain TypeScript, lint 32 warnings/0 errors, production build, and audit 0 vulnerabilities passed. Local tests unavailable; Actions are the evidence.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. Pages deployment success confirmed from run #45001931632.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model daily quota HTTP 429 (remaining 0; reset 23 Nov 2026 03:00 TRT). No rerun, paid fallback, secret, or quota change.
- UI PRs #151, #149 and #147 remain draft/unmerged; the visible redesign is not yet on the test site. No frontend ownership boundary crossed.
- Next: DOM-109 cross-family material ID/name reconciliation; DOM-110 material-summary quantity/thickness invariants; DOM-111 deterministic diagnostics. INT-001 frontend-owned, INT-002/PERF-001 specialist-owned; QA-003 blocked until integration evidence.


## 22 Kasım 2026 10:32 TRT — DOM-107 VERIFIED

- Added a table-family project aggregation regression: the tabletop uses an explicit 8 mm catalog override, legs use the 60 mm group material, and aprons retain the default material. The test checks Part rows, snapshot serialize/validate/compare, material summary quantity/line count/area/volume, and input immutability.
- Files: `domain/production/projectProduction.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. No production calculation/schema, frontend, adapter/performance-owned files, or machine output changed.
- [Commit 55d8e104](https://github.com/Taylan789/MobilyaCAD/commit/55d8e104d8842f48faad1b53f6e32230ec88eb89) passed exact-SHA [CI #44999210991](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210991), [QA #44999210952](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210952), and [Pages #44999210947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210947). QA unit/domain tests, strict domain TypeScript, lint (32 warnings/0 errors), production build, and dependency audit (0 vulnerabilities) succeeded. Local tests unavailable; Actions provide evidence. Test site deployed: https://taylan789.github.io/MobilyaCAD/.
- Latest AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model HTTP 429; no rerun, paid fallback, quota, or secret change.
- Next: DOM-108 mixed-family invalid material/catalog reference atomicity and diagnostics, without frontend or specialist-owned adapter/performance files.


## 22 Kasım 2026 09:31 TRT — DOM-106 VERIFIED

- Added a cross-format regression slice to the existing legacy CSV v1/v2 fixture: import → canonical CSV v3 parse → JSON v2 serialize/parse → CSV v3 serialize/parse. Each transition checks exact normalized comparison equality, supported metadata and legacy catalog-identity omission.
- Files: `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. No production serializer/schema, frontend, adapter/performance-owned file or machine-specific output changed.
- Verified on branch SHA `9f3d8ba3a180cf18b83b9b18d528c11c6a4f80fb`: [CI #44996078563](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078563), [QA #44996078516](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078516), and [Pages #44996078532](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078532) all succeeded. QA completed unit/domain tests, strict TypeScript, lint, production build and dependency audit; local test execution unavailable
- Latest AI Developer run [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed with OpenRouter free-model daily quota HTTP 429; specialist job was skipped. No quota/secrets/paid fallback change or rerun.
- Next: DOM-107 table-family material group override propagation through aggregated Parts, snapshot and consumption summary; project JSON/frontend persistence remains frontend-owned

## 22 Kasım 2026 08:29 TRT — DOM-105 VERIFIED

- Canonical export test: legacy CSV v1/v2 imports → current v3 serializer → v3 parse equality. Supported line provenance, source Part IDs, edge direction, tariffs and quote adjustment references remain intact; v2 additionally retains roll count/length, furniture IDs, plan/price references. Missing catalog resource identity stays absent instead of being inferred.
- Code/test correction commit [1d4503be](https://github.com/Taylan789/MobilyaCAD/commit/1d4503be5a277ec8a9eca8e1c5fc71120caee214). Initial commit [28ed773](https://github.com/Taylan789/MobilyaCAD/commit/28ed773e8b8dc3a266d0eead4ecb1f8c739ef488) passed CI but QA failed a test helper's baseline total expectation (1,075 vs v2 fixture 1,375); explicit expected totals fixed the fixture, with no assertion weakening.
- Exact-SHA CI [#44990018540](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018540), QA [#44990018528](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018528), and Pages [#44990018506](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018506) all succeeded. QA: **144 frontend + 630 domain tests**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build, audit **0 vulnerabilities**.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/. Local tests were unavailable; exact-SHA Actions are the verification evidence. No frontend, production serializer/schema, adapter/performance-owned files, or CNC output changed.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model daily HTTP 429; integration/performance job skipped. No rerun, paid fallback, quota or secret changes. No specialist integration/performance branch/PR found.
- UI PRs [#145](https://github.com/Taylan789/MobilyaCAD/pull/145) and [#147](https://github.com/Taylan789/MobilyaCAD/pull/147) remain draft/unmerged; their QA runs [#44975896881](https://github.com/Taylan789/MobilyaCAD/actions/runs/44975896881) and [#44984158739](https://github.com/Taylan789/MobilyaCAD/actions/runs/44984158739) succeeded, but neither is deployed. Visible frontend redesign is not yet on the test site.
- Next: DOM-106 legacy v1/v2 → canonical v3 → JSON v2 → CSV v3 cross-format round-trip; INT-001 frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 blocked until adapter evidence.

## 22 Kasım 2026 07:07 TRT — DOM-104 VERIFIED

- Repeated quote-comparison CSV exports from the same and equivalent deep-copy inputs are byte-identical. Regression coverage also verifies UTF-8 BOM, CRLF terminator, v3 parse equality, and no input mutation.
- Serializer/schema unchanged; this is a behavior-contract test slice. Files: `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Code/test commit [614d559](https://github.com/Taylan789/MobilyaCAD/commit/614d559c902cc4038f9c177eaa31ce86045ef3fe). Exact-SHA CI [#44983853404](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853404), QA [#44983853400](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853400), and Pages [#44983853533](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853533) succeeded: **142 frontend + 629 domain tests**, strict domain TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/. Local tests were unavailable; exact-SHA Actions passed.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model daily HTTP 429; integration/performance job skipped. No rerun due explicit daily quota exhaustion, and no paid fallback/secrets/quota settings changed. No specialist integration/performance branch or PR was found.
- UI PR [#145](https://github.com/Taylan789/MobilyaCAD/pull/145) is draft/unmerged; QA [#44975896881](https://github.com/Taylan789/MobilyaCAD/actions/runs/44975896881) succeeded. No visible frontend redesign deployed yet.
- Next: DOM-105 legacy CSV v1/v2 import → canonical v3 export and metadata preservation/omission tests; INT-001, INT-002, PERF-001 remain agent-owned.

## 22 Kasım 2026 07:07 TRT — DOM-104 IN_PROGRESS

- Added repeated quote-comparison CSV export regression coverage across three equivalent inputs: exact byte equality, BOM/CRLF contract, CSV v3 parser round-trip, and input immutability.
- Existing serializer already has deterministic fixed-column/category/input-line ordering; no production code/schema changes were necessary. No frontend, adapter/performance-owned files, or machine-specific output changed.
- Commit SHA and exact-SHA CI/QA/Pages verification are pending. Local tests are unavailable; do not claim success before GitHub Actions results.
- Next: DOM-105 legacy CSV v1/v2 import followed by canonical v3 export with supported metadata round-trip and explicit catalog-identity omission; INT-001/INT-002/PERF-001 remain separately owned.

## 22 Kasım 2026 06:46 TRT — DOM-103 VERIFIED

- Quote-comparison CSV parser success results expose the detected `formatVersion` (`1 | 2 | 3`) for direct UI disclosure; the property is non-enumerable so the existing strict JSON serializer can accept a CSV parser result without leaking CSV metadata. Blocked imports omit version.
- Code/test: [fix commit 431b044](https://github.com/Taylan789/MobilyaCAD/commit/431b044cd20d07209104f2fdd422352400c56750), files `domain/production/projectQuoteRevisionComparisonCsv.ts` and `.test.mjs`. Tests cover v3, legacy v1/v2, blocked results, and non-enumerability.
- **Recovery:** initial commit [361bfa1](https://github.com/Taylan789/MobilyaCAD/commit/361bfa152c1e4137592757e26911ae0d8230a3db) passed CI but failed QA in the DOM-100 cross-format JSON serializer because enumerable metadata broke strict exact-key validation. The correction kept direct version access while making the field non-enumerable; no tests or strict validation were weakened.
- Exact-SHA CI [#44982525644](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982525644), QA [#44982525656](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982525656), and Pages [#44982525667](https://github.com/Taylan789/MobilyaCAD/actions/runs/44982525667) all succeeded. QA: **142 frontend + 628 domain tests**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build and audit **0 vulnerabilities**.
- **Test site deployed:** https://taylan789.github.io/MobilyaCAD/ (Pages exact-SHA run succeeded). Domain-only slice; no visible frontend redesign.
- No frontend, adapter/performance-owned files, or machine-specific/CNC output changed. Local tests were unavailable; exact-SHA Actions are the evidence. AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed on OpenRouter free-model daily HTTP 429; integration/performance job skipped. No paid fallback, rerun, quota or secrets changes.
- **Next:** DOM-104 byte-stable repeated CSV export; INT-001 frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 remains dependent on INT-001/INT-002.

## 22 Kasım 2026 05:03 TRT — DOM-102 VERIFIED
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

- Final code/test commit: [798e29b84731352e8249012c16e635a6a97d28f0](https://github.com/Taylan789/MobilyaCAD/commit/798e29b84731352e8249012c16e635a6a97d28f0). Changes: `domain/production/projectQuoteRevisionComparisonFile.ts`, `domain/production/projectQuoteRevisionComparisonFile.test.mjs`, `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`.
- Duplicate guard rejects repeated exact line snapshots per from/to side. Repeated source identity with differing quantity/price is allowed, preserving DOM-091. Inconsistent JSON/CSV category/grand totals return blocked/null payload; valid JSON v2 and CSV v3 round-trip remains exact.
- Exact-SHA Actions: CI [#44943420344](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420344), QA [#44943420373](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420373), Pages [#44943420330](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420330) succeeded. QA: **142 frontend + 616 domain tests**, strict domain TS, production build, audit 0 vulnerabilities; lint 32 warnings / 0 errors.
- Test site verified: https://taylan789.github.io/MobilyaCAD/.
- Earlier iterations failed QA (DOM-091 repeated identity regression; duplicate-test diagnostic assertion; CSV metadata fixture). These were corrected and rerun; only final SHA is marked verified.
- AI Developer [#44934045185](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934045185) failed deterministically on unsupported `push` event; no rerun or paid/quota/secrets changes. Integration/performance lane skipped; UI PRs #140/#141 remain separate frontend ownership.
- Next: DOM-097 fractional hardware + labor/operation reconciliation; INT-001 frontend/domain export contract; DOM-098 bounded comparison JSON import.

## 21 Kasım 2026 23:44 TRT — DOM-097 IMPLEMENTED, Actions verification pending

- **Code/test commit:** [56e00eef](https://github.com/Taylan789/MobilyaCAD/commit/56e00eefa5d8a29a77362bea10345a3b31586745); added regression coverage in `domain/production/projectQuoteRevision.test.mjs`.
- **Coverage:** r1→r3 comparison includes fractional hardware quantity (1.25→2.5), existing labor quantity/tariff change (1.5 h × 2,400→1.75 h × 2,800), and operation change (0.125 h × 1,010→0.5 h × 1,020); the intermediate r2 is deliberately ignored.
- **Expected reconciliation asserted:** hardware +1,000, labor +1,300, operation +384, grand total +2,684 minor currency units; line totals use the shared half-up rounding helper. Exact comparison JSON v2 and CSV v3 round-trip assertions included.
- **Files:** only `domain/production/projectQuoteRevision.test.mjs` changed for code/test; no frontend, adapter/performance-owned file, production calculation or CNC output changed.
- **Actions:** push CI/QA are configured for `dev/github-work`; this run could not retrieve the exact-SHA workflow run list, and the current combined status was empty. CI/QA therefore remain **unverified/pending**, not green. Test site https://taylan789.github.io/MobilyaCAD/ is not claimed updated; latest known verified deployment is Pages [#44943420330](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420330) on the DOM-096 SHA.
- **Next:** verify DOM-097 exact-SHA CI/QA and Pages deployment; then DOM-098 bounded comparison JSON import rejection.


## 22 Kasım 2026 01:37 TRT — DOM-099 VERIFIED

- **Code/test commit:** [24f945c0](https://github.com/Taylan789/MobilyaCAD/commit/24f945c0dd05c2653daaacdba5361460f20883b6); changed `domain/production/projectQuoteRevisionComparisonCsv.ts` and `domain/production/projectQuoteRevisionComparisonCsv.test.mjs`, plus roadmap/progress/coordination.
- CSV parser now rejects UTF-8 payloads above 1 MiB before parsing and caps records to 8 fixed rows + 2,000 line changes. CSV serializer enforces the same byte cap. v1/v2/v3 headers remain unchanged.
- Regression tests cover a multibyte input that is under the character-count limit but over the byte limit, and 2,001 line rows in a 640,024-byte fixture; rejected imports return no comparison.
- Exact-SHA CI [#44958138720](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138720), QA [#44958138801](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138801), and Pages [#44958138729](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138729) all succeeded. QA: **142 frontend + 621 domain tests**, strict domain TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ — Pages deployment confirmed; direct browser fetch was unavailable in this runtime.
- AI Developer [#44953172176](https://github.com/Taylan789/MobilyaCAD/actions/runs/44953172176) failed on OpenRouter free-model daily HTTP 429; integration/performance specialist job skipped and no specialist branch/PR found. No quota, paid service, or secrets changed.
- **Next:** DOM-100 cross-format JSON v2 ↔ CSV v3 integrity tests; DOM-101 adversarial CSV quoting/record boundaries; INT-001 remains frontend-owned.


## 22 Kasım 2026 13:52 TRT — DOM-109 VERIFIED

- **Commit:** [a6d34fe17bf7eddc26f2aac97373adb61e346d03](https://github.com/Taylan789/MobilyaCAD/commit/a6d34fe17bf7eddc26f2aac97373adb61e346d03). Same material catalogue ID across mixed-family Parts now must use a single normalized label; conflicting names diagnose both source furniture/Part rows and block the project without partial results.
- Compatible labels normalize Unicode compatibility, case and whitespace; the consumption summary groups them by ID and thickness, and direct summary input rejects conflicting labels.
- Files: `domain/production/projectProduction.ts`, `projectProduction.test.mjs`, new `materialIdentity.ts`, `projectMaterialSummary.ts`, `projectMaterialSummary.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. No frontend, adapter/performance-owned files, export schema or CNC output changed.
- **Exact-SHA Actions:** CI [#45014447877](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447877), QA [#45014447767](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447767), and Pages [#45014447798](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447798) succeeded. QA **150/150 frontend + 635/635 domain**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, dependency audit **0 vulnerabilities**. The Pages deploy job completed successfully.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ — updated and deployment confirmed.
- AI Developer [#45004322556](https://github.com/Taylan789/MobilyaCAD/actions/runs/45004322556) failed because OpenRouter free-model daily quota returned HTTP 429; specialist lane skipped. No paid retry, quota or secrets changes.
- **Next:** DOM-110 mixed-family material summary invariants, then DOM-111 deterministic multi-error diagnostics.



## 22 Kasım 2026 16:30 TRT — DOM-111 VERIFIED

- **Code commit:** [864f37d](https://github.com/Taylan789/MobilyaCAD/commit/864f37d2523b71bf360f9b3e1d62410d9f4345a2). Material-ID groups now gather all Parts, use deterministic normalized-label representatives, narrow materialId for strict TypeScript, and block every furniture source sharing a conflicting catalogue ID. Diagnostic messages also list the full sorted affected furniture IDs, including label peers; project result remains null (no partial Parts).
- **Exact-SHA verification:** CI [#45027201001](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027201001) passed; QA [#45027201043](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027201043) passed **150/150 frontend + 637/637 domain**, strict TypeScript, lint **32 warnings / 0 errors**, production build, audit **0 vulnerabilities**. Pages [#45027200963](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027200963) deployed successfully.
- **Test site updated:** https://taylan789.github.io/MobilyaCAD/ — deployment run success confirmed. No CNC output/schema/frontend files changed.
- Prior failed runs were investigated and corrected: [CI #45021592403](https://github.com/Taylan789/MobilyaCAD/actions/runs/45021592403), [QA #45021592322](https://github.com/Taylan789/MobilyaCAD/actions/runs/45021592322); intermediate QA [#45027062707](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027062707) identified message completeness, fixed without weakening tests.
- AI Developer latest known run [#45004322556](https://github.com/Taylan789/MobilyaCAD/actions/runs/45004322556) failed on OpenRouter free-model daily HTTP 429; no paid retry, quota/secret changes or rerun. No integration/performance branch found. Frontend PR [#155](https://github.com/Taylan789/MobilyaCAD/pull/155) remains draft/unmerged, so the full redesign is not deployed.
- **Next:** DOM-112 additive structured material conflict provenance (catalog ID + all source furniture/Part IDs), retaining the legacy diagnostic message contract; INT-001 frontend-owned, INT-002/PERF-001 specialist-owned.


## 22 Kasım 2026 17:22 TRT — DOM-112 IMPLEMENTED, Actions pending

- Added the optional typed `materialIdentityConflict` metadata to blocked material diagnostics: catalogue `materialId`, plus a complete deterministic list of source furniture IDs, Part IDs, and original material labels. Each blocked contributor receives the complete source set; legacy message/order and atomic failure behavior are preserved.
- Regression coverage derives expected provenance from independently calculated cabinet/bookshelf/table requests, checks every source and every blocked diagnostic, and confirms table provenance remains stable when request order is reversed.
- Files: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. No frontend/**, adapter/performance-owned files, project JSON/CSV schema or CNC output changed.
- Final code/test commit [2cf8ff82](https://github.com/Taylan789/MobilyaCAD/commit/2cf8ff82fbae62ef8b8d7ca9bd807d2653e7ffcf) passed CI [#45032940332](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940332) and QA [#45032940341](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940341): **158 frontend + 637 domain tests**, strict domain TypeScript, lint **32 warnings/0 errors**, production build, dependency audit **0 vulnerabilities**. Pages [#45032940318](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940318) deployed successfully. Local tests unavailable; exact-SHA Actions are the evidence.
- Next: DOM-113 structured provenance consumer validation and fail-closed export-readiness contract.


## 22 Kasım 2026 17:24 TRT — DOM-112 QA test correction

- Exact-SHA CI [#45032813075](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813075) passed build/lint, but QA [#45032813113](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813113) failed one test: the new `Array.every` assertion passed a boolean rather than a callback (TypeError: `boolean false is not a function`). **636/637 domain tests passed; this was a test harness assertion error, not a reported production behavior failure.**
- Pages [#45032813098](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813098) failed its CI+QA gate and did not deploy.
- Corrected the assertion to a direct loop with `assert.deepEqual`; assertions are not weakened. Final code/test commit [2cf8ff82](https://github.com/Taylan789/MobilyaCAD/commit/2cf8ff82fbae62ef8b8d7ca9bd807d2653e7ffcf) passed CI [#45032940332](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940332) and QA [#45032940341](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940341) (**158 frontend + 637 domain tests**, strict TS, lint 32 warnings/0 errors, build, audit 0 vulnerabilities); Pages [#45032940318](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940318) deployed successfully.


## 22 Kasım 2026 17:28 TRT — DOM-112 VERIFIED

- Final code/test SHA: [2cf8ff82](https://github.com/Taylan789/MobilyaCAD/commit/2cf8ff82fbae62ef8b8d7ca9bd807d2653e7ffcf). The test callback correction is included; no assertions were weakened.
- Exact-SHA CI [#45032940332](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940332) and QA [#45032940341](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940341) passed: **158 frontend + 637 domain tests**, strict domain TypeScript, lint **32 warnings/0 errors**, production build, and dependency audit **0 vulnerabilities**.
- Pages [#45032940318](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940318) succeeded. Test site: https://taylan789.github.io/MobilyaCAD/.
- First attempt failed only because the new test assertion was not a callback; CI was successful, QA found the TypeError, and the test was corrected in the verified SHA. No frontend, adapter/performance-owned files, persistence/export schemas or CNC output changed.
- Next: DOM-113 validate structured provenance consumers and fail-closed export readiness; INT-001 remains frontend-owned, INT-002/PERF-001 specialist-owned.


## 22 Kasım 2026 18:51 TRT — DOM-113 IMPLEMENTED, Actions pending
- **Code/test:** cut-plan export diagnostics now preserve optional structured material conflict provenance. Strict consumer validation checks the material ID, exact source fields, sorted unique source Part identities, genuinely conflicting normalized labels, blocked furniture source membership, and complete source-furniture diagnostic coverage per catalog ID. Malformed/incomplete provenance blocks; no partial JSON or cut-plan result is emitted.
- **Tests:** one valid metadata-preservation regression plus malformed/out-of-order/duplicate/normalized-label/source-membership/code/unknown-field/incomplete-coverage cases. Assertions are fail-closed and retain legacy diagnostics.
- **Files:** `domain/production/projectSheetCutPlanExport.ts`, `domain/production/projectSheetCutPlanExport.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`. No frontend, adapter/performance-owned files, persistence schema or CNC output changed.
- **Commit/Actions:** exact SHA and CI/QA/Pages evidence will be recorded after the initial commit completes; local execution is unavailable in this runtime.
- **Next:** DOM-114 conflict provenance coverage/order invariants; frontend structured diagnostic display remains UI-owned and specialist INT-002/PERF-001 remains isolated.


## 22 Kasım 2026 18:58 TRT — DOM-113 test-fixture correction
- Initial code commit [e19ee858](https://github.com/Taylan789/MobilyaCAD/commit/e19ee85861d43734e4acf70039213f5b8e87b9bf): CI [#45040992194](https://github.com/Taylan789/MobilyaCAD/actions/runs/45040992194) succeeded. QA [#45040992251](https://github.com/Taylan789/MobilyaCAD/actions/runs/45040992251) failed one acceptance test because the valid source list was not sorted lexically (638/639 domain tests passed); the consumer correctly blocked the malformed fixture. Pages [#45040992198](https://github.com/Taylan789/MobilyaCAD/actions/runs/45040992198) did not deploy.
- Reordered only the valid and shared malformed-case fixture sources to canonical furniture/Part order; assertions unchanged. Correction commit and exact-SHA CI/QA/Pages pending.


## 22 Kasım 2026 19:01 TRT — DOM-113 VERIFIED
- **Final code/test commit:** [b8fdbda7](https://github.com/Taylan789/MobilyaCAD/commit/b8fdbda7c1175afa766712c471ed8974c5ba369a). Added explicit narrowing of diagnostic furniture identity after the prior strict TypeScript run rejected a nullable ID in conflict-coverage accumulation; null identity now has a fail-closed regression.
- **Exact-SHA Actions:** CI [#45041353850](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353850), QA [#45041353786](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353786), and Pages [#45041353780](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353780) succeeded. QA: **162 frontend + 639 domain tests**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, and production audit **0 vulnerabilities**.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ — deployment run succeeded on this SHA.
- **Correction history:** e19ee858 failed one ordered-fixture assertion; dc204108 fixed fixture ordering but strict TypeScript exposed nullable narrowing; b8fdbda7 fixed the guard. No test assertions were weakened. Local test execution unavailable in this runtime.
- **Next:** DOM-114 structured conflict provenance through nesting-batch diagnostics; UI/adapter ownership remains unchanged.


## 22 Kasım 2026 22:48 TRT — DOM-116 VERIFIED

- **Test-only commit:** [5fd1b751](https://github.com/Taylan789/MobilyaCAD/commit/5fd1b751e0b8d1c0de5ee32ababfdf92f73f00c6). `domain/production/projectSheetNestingBatches.test.mjs` verifies selected/excluded ID separation and project order, complete canonical snapshot coverage, excluded cutout metadata preservation, and batch source/material/normalized 0.1 mm thickness/per-Part quantity/total-piece consistency.
- **Exact-SHA CI:** [#45063059018](https://github.com/Taylan789/MobilyaCAD/actions/runs/45063059018) succeeded. **QA:** [#45063059051](https://github.com/Taylan789/MobilyaCAD/actions/runs/45063059051) succeeded — 165 frontend + 642 domain tests (0 failures), strict domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities. **Pages:** [#45063058957](https://github.com/Taylan789/MobilyaCAD/actions/runs/45063058957) succeeded; test site updated: https://taylan789.github.io/MobilyaCAD/.
- **Files:** domain regression test, AI_COORDINATION.md, PRODUCT_ROADMAP.md and AI_PROGRESS.md. No production engine/schema, frontend, adapter/performance-owned files, CNC output or `main` changed. Local tests unavailable; Actions evidence is authoritative.
- **Known limitation:** npm install surfaced 4 moderate dependency advisories; production-only audit is clean. The excluded cutout Part remains snapshot-only, not nestable.
- **Next:** DOM-117 grouped Part quantity and aggregate total reconciliation against canonical snapshots, including safe-integer boundaries.



## 22 Kasım 2026 — DOM-117 VERIFIED

- **Code/test commit:** [492fed69](https://github.com/Taylan789/MobilyaCAD/commit/492fed69afe459e436e2ba603968da3ed088d187). Added two nesting-batch regressions: grouped Part quantity/material/normalized-thickness reconciliation from the canonical snapshot, and exact `Number.MAX_SAFE_INTEGER` acceptance versus overflow atomic blocking (no partial result/snapshot).
- **Exact-SHA Actions:** CI [#45066750467](https://github.com/Taylan789/MobilyaCAD/actions/runs/45066750467) and QA [#45066750708](https://github.com/Taylan789/MobilyaCAD/actions/runs/45066750708) passed. QA: **165 frontend + 644 domain tests (0 failures)**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, production dependency audit **0 vulnerabilities**.
- **Test site:** Pages [#45066750453](https://github.com/Taylan789/MobilyaCAD/actions/runs/45066750453) succeeded and deployed to https://taylan789.github.io/MobilyaCAD/.
- **Known limits:** Local tests unavailable; GitHub Actions is authoritative. npm install reports 4 moderate dependency advisories (production audit is clean). The production bundle remains oversized (1.687 MB minified JS / 472.29 KB gzip; Vite >500 kB warning). AI Developer run [#45045107407](https://github.com/Taylan789/MobilyaCAD/actions/runs/45045107407) failed due OpenRouter free-model daily 429; no rerun on stale SHA and no paid fallback. Integration/performance job is disabled; no specialist branch/PR verified.
- **Scope:** test file and project records only; no production calculation source, frontend, adapter/performance-owned files, project schema, CNC output or `main`.
- **Next:** DOM-118 deterministic stock-sheet group/order diagnostics; DOM-119 ready batch → cut-plan source coverage and atomic reconciliation; INT-001 UI-owned, INT-002/PERF-001 specialist-owned.

## 23 Kasım 2026 00:35 TRT — DOM-118 VERIFIED

- **Code/test commit:** [d081696ce27d6ad9f9a52604a3c47ef2a8ad4700](https://github.com/Taylan789/MobilyaCAD/commit/d081696ce27d6ad9f9a52604a3c47ef2a8ad4700). Stock-definition reversal preserves ready batch payload/group order; missing and unused diagnostics sort canonically by material ID and numeric normalized thickness; duplicate normalized groups block with order-invariant diagnostics.
- **Tests:** exact-SHA QA passed **169 frontend + 647 domain tests (0 failures)**. CI [#45072743130](https://github.com/Taylan789/MobilyaCAD/actions/runs/45072743130) and QA [#45072741019](https://github.com/Taylan789/MobilyaCAD/actions/runs/45072741019) passed; strict domain TypeScript, lint, production build, production audit **0 vulnerabilities**. Pages [#45072740981](https://github.com/Taylan789/MobilyaCAD/actions/runs/45072740981) deployed successfully.
- **Test site:** https://taylan789.github.io/MobilyaCAD/ — Pages deployment verified for the code/test SHA.
- **Files:** domain/production/projectSheetNestingBatches.ts, domain/production/projectSheetNestingBatches.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md. No frontend/**, adapter/performance-owned files, schema, CNC output or main changed.
- **Known limits:** local tests unavailable; GitHub Actions is authoritative. npm install reports 4 moderate advisories, while the production dependency audit is clean. Existing bundle warning remains (1.687 MB JS / 472.30 KB gzip).
- **Next:** DOM-119 ready batch → cut-plan source coverage and atomic reconciliation; INT-001 frontend-owned, INT-002/PERF-001 specialist-owned.

## 23 Kasım 2026 01:48 TRT — DOM-119 (verification pending)

- **Slice:** Added a mixed-material project cut-plan regression that reconciles each group to its nesting batch and canonical Part snapshot, preserves material/measure/grain/quantity, verifies physical piece numbers 1..quantity exactly once, checks group/layout totals, and keeps excluded Parts snapshot-only.
- **Files:** `domain/production/projectSheetCutPlan.test.mjs`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`.
- **Commit:** pending; exact-SHA CI, QA, production build, audit and Pages are not yet observed.
- **Known limits:** test-only slice; no production code or frontend change. Local tests unavailable; GitHub Actions is authoritative.
- **Next:** DOM-120 project cut-plan area-summary reconciliation; DOM-121 edge-band/material summary provenance; DOM-122 priced-consumption/quote total reconciliation.
- **AI Developer:** run [#45075174069](https://github.com/Taylan789/MobilyaCAD/actions/runs/45075174069) failed on OpenRouter free-model daily 429. The reset is scheduled for 23 Nov 2026 03:00 TRT; do not rerun before reset. No paid fallback or quota/secrets changes.
- **Test site:** latest verified deployment remains [#45074176186](https://github.com/Taylan789/MobilyaCAD/actions/runs/45074176186) for previous SHA; new deployment is pending. URL: https://taylan789.github.io/MobilyaCAD/.

## 23 Kasım 2026 01:55 TRT — DOM-119 QA correction

- **Initial verification:** CI [#45079989113](https://github.com/Taylan789/MobilyaCAD/actions/runs/45079989113) passed. QA [#45079989219](https://github.com/Taylan789/MobilyaCAD/actions/runs/45079989219) failed in the shared domain tests: 647 passed, 1 failed; the new test referenced `validateProjectPartSnapshot` without importing it.
- **Correction:** added the missing test import. No production behavior was changed. The first Pages run [#45079989158](https://github.com/Taylan789/MobilyaCAD/actions/runs/45079989158) was still waiting for exact-SHA QA and is expected to be superseded by the corrected commit's deployment workflow.
- **Correction commit:** pending SHA; new exact-SHA CI/QA/Pages runs are pending.

## 23 Kasım 2026 02:05 TRT — DOM-119 VERIFIED

- **Code/test:** [e778a992](https://github.com/Taylan789/MobilyaCAD/commit/e778a992b068cc6cd21b7a992427b033b8d31947). Added validator import after first QA caught it; no production behavior changed.
- **Exact-SHA Actions:** CI [#45080100519](https://github.com/Taylan789/MobilyaCAD/actions/runs/45080100519) and QA [#45080100502](https://github.com/Taylan789/MobilyaCAD/actions/runs/45080100502) succeeded. QA: **172 frontend + 648 domain tests, 0 failures**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, audit **0 vulnerabilities**.
- **Pages:** [#45080100538](https://github.com/Taylan789/MobilyaCAD/actions/runs/45080100538) succeeded; test site deployed: https://taylan789.github.io/MobilyaCAD/.
- **Scope:** test only, plus product/coordination records. No production source, frontend, adapter/performance-owned files, schema, CNC output, or `main` changed.
- **Known limitations:** bundle remains 1.687 MB JS / 472.42 KB gzip (Vite warning); npm install reports 4 moderate advisories, production audit remains clean. Local test execution unavailable; Actions evidence is authoritative.
- **AI Developer:** [#45075174069](https://github.com/Taylan789/MobilyaCAD/actions/runs/45075174069) failed with OpenRouter free-model daily 429; specialist integration/performance job skipped. No rerun before the documented 03:00 TRT reset, no paid fallback, quota or secrets changes.
- **Next:** DOM-120 area-summary reconciliation, then DOM-121 edge-band/material summary provenance, DOM-122 priced-consumption/quote totals. INT-001 frontend-owned, INT-002/PERF-001 specialist-owned; QA-003 blocked.

## 23 Kasım 2026 02:23 TRT — DOM-120 VERIFIED

- **Slice:** Test-only cross-consumer reconciliation for project cut-plan area summaries. Independent geometry arithmetic verifies each group's per-sheet gross/trim/usable/placed/unoccupied areas and occupancy, then reconciles mixed-stock project sums and weighted occupancy. The plywood fixture requires multiple sheets; MDF uses nonzero trim.
- **Code/test commit:** [31ca52de](https://github.com/Taylan789/MobilyaCAD/commit/31ca52de6334d4f36b0b37e7594d20affde91c16); test file `domain/production/projectSheetCutPlanAreaSummary.test.mjs`.
- **Exact-SHA Actions:** CI [#45083257996](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257996) and QA [#45083257987](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257987) succeeded. QA: **172 frontend + 649 domain tests**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, audit **0 vulnerabilities**.
- **Pages:** [#45083257991](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257991) deployed successfully to https://taylan789.github.io/MobilyaCAD/.
- **Scope:** test and coordination/roadmap only; no frontend, production algorithm, schema, export adapter, machine-specific output or `main` changed. Local tests unavailable; GitHub Actions is authoritative.
- **Known blockers:** AI Developer run [#45075174069](https://github.com/Taylan789/MobilyaCAD/actions/runs/45075174069) failed with OpenRouter free-model daily 429; exact logs confirm quota exhaustion. The recorded reset is 03:00 TRT. No rerun before reset or paid fallback.
- **Next:** DOM-121 edge-band/material summary provenance across mixed-family snapshots; DOM-122 priced-consumption/quote reconciliation. INT-001 frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 remains blocked.

## 23 Kasım 2026 03:46 TRT — DOM-121 VERIFIED

- **Slice:** mixed-family material and edge-band summaries reconciled their Part/furniture provenance, material grouping, quantities, directional edge assignments and unit conversions against canonical Part snapshots; reversed source Part/furniture order leaves both summaries identical.
- **Code/test commit:** [96f122d8](https://github.com/Taylan789/MobilyaCAD/commit/96f122d8be2fbeedcb8d3b11df7aea0d713cdc50); test file `domain/production/projectEdgeBandingConsumption.test.mjs`.
- **Exact-SHA Actions:** CI [#45090552662](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552662) and QA [#45090552670](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552670) succeeded. QA: **172 frontend + 650 domain tests, 0 failures**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build and production audit **0 vulnerabilities**.
- **Pages:** [#45090552717](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552717) succeeded; test site deployed to https://taylan789.github.io/MobilyaCAD/.
- **Scope:** test-only plus coordination/roadmap records; no production algorithm, frontend, adapter/performance-owned files, schema, CNC output or `main` changed. Local tests unavailable; Actions is authoritative.
- **Known blockers:** INT-001 remains frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 is blocked until integration evidence. AI Developer run [#45075174069](https://github.com/Taylan789/MobilyaCAD/actions/runs/45075174069) failed with OpenRouter free daily 429; logs confirm quota exhaustion. Reset passed; a safe failed-job rerun is considered after this docs update. No paid fallback or quota/secrets changes.
- **Next:** DOM-122 reconcile priced-consumption and quote totals against source pricing/labor-operation rows.

## 23 Kasım 2026 04:48 TRT — DOM-122 (VERIFIED)

- **Slice:** Mixed quote regression reconciles material, hardware BOM, directional edge-band, labor, operation, explicit waste and profit; independent source quantities, pricing/source references, per-line rounded totals, all seven quote source mappings, category totals and grand total.
- **Code/test commit:** [467627bd](https://github.com/Taylan789/MobilyaCAD/commit/467627bd1ca85e5d70ed21c451a6cecfbd1633ce); test `domain/production/projectQuoteSummary.test.mjs`.
- **Exact-SHA Actions:** CI [#45097364302](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364302) and QA [#45097364273](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364273) passed. QA: **175 frontend + 651 domain tests, 0 failures**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build and production audit **0 vulnerabilities**.
- **Pages:** [#45097364279](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364279) succeeded; test site deployed: https://taylan789.github.io/MobilyaCAD/.
- **Scope:** test/documentation only; no production algorithm, frontend, specialist-owned adapter/performance files, project schema, CNC output or main branch changed. Local test execution unavailable; GitHub Actions is authoritative.
- **Known blockers:** AI Developer [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) still failed on OpenRouter free daily 429; reset is 24 Nov 2026 03:00 TRT. Integration/performance job skipped and no specialist branch/PR found. No paid fallback or quota/secrets changes.
- **Next:** DOM-123 preserve hardware BOM furniture/source references in priced-consumption and quote provenance.


## 23 Kasım 2026 05:23 TRT — DOM-123 VERIFIED

- **Slice:** additive `lineHardwareSources` maps each priced hardware cost line to hardware ID, original unit, sorted furniture IDs and optional sorted BOM references. BOM references stay separate from price-list `sourceReference`; no hardware-to-Part IDs are fabricated.
- **Regression:** two furniture IDs, multiple hardware/unit groups, repeated BOM references, source-reference-free rows, cost-line IDs/quantities/units/prices, input immutability, reversed BOM/furniture order invariance, and incomplete-pricing no-partial-mapping behavior.
- **Code/test commit:** [2362065f](https://github.com/Taylan789/MobilyaCAD/commit/2362065f73426adce64cade856d4e4fb180c39fc); test `domain/production/projectHardwarePricedSource.test.mjs`.
- **Exact-SHA Actions:** CI [#45099919245](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919245) and QA [#45099919275](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919275) successful. QA: **175 frontend + 653 domain tests, 0 failures**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build, production audit **0 vulnerabilities**. Full install reports 4 moderate dependency findings.
- **Pages:** [#45099919290](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919290) successful and deployed to https://taylan789.github.io/MobilyaCAD/.
- **Scope:** domain priced-consumption API/test + docs; no frontend, quote source/snapshot/CSV schema, CNC output, price defaults, adapter/performance files or `main` changed. Local Node syntax check passed; full test execution was Actions-only.
- **Known blockers:** AI Developer [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) failed with OpenRouter free-model daily 429; reset is 24 Nov 2026 03:00 TRT. No rerun before reset; no paid fallback/secrets changes. Integration/performance job skipped; no specialist branch/PR found; QA-003 remains blocked. UI PR [#166](https://github.com/Taylan789/MobilyaCAD/pull/166) is still draft and not deployed.
- **Next:** DOM-126 quote revision/snapshot hardware-provenance coverage and cross-consumer reconciliation.


## 23 Kasım 2026 07:28 TRT — DOM-124 VERIFIED

- Combined quote `lineSources` now carry hardware BOM identity (`hardwareId`), original unit, sorted furniture IDs and optional BOM source references in dedicated fields; the price-list `sourceReference` remains on the priced cost line and is never conflated with BOM references.
- Fail-closed coverage checks require exactly one source map for every priced hardware line; no hardware Part IDs are fabricated. The mixed two-furniture regression covers repeated/unsorted BOM references, input immutability and reversed-input invariance.
- **Code/test commit:** [2621c51c](https://github.com/Taylan789/MobilyaCAD/commit/2621c51cfc507627f5b5b929f7a71e0995d38449).
- **Exact-SHA CI:** [#45111962178](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111962178) successful; build and lint jobs passed.
- **Exact-SHA QA:** [#45111961982](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961982) successful — **175 frontend + 654 domain tests, 0 failures**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build and production audit **0 vulnerabilities**.
- **Pages:** [#45111961983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961983) successful; test site deployed: https://taylan789.github.io/MobilyaCAD/.
- **Scope:** quote domain source/test + roadmap/progress/coordination/domain contract; no frontend, adapter/performance-owned files, quote JSON/CSV validator, CNC output or `main` changed. Local full suite unavailable; Actions is authoritative.
- **Compatibility (DOM-125 verified):** quote JSON/CSV v1 preserves hardware provenance with strict validation and legacy CSV header support.
- AI Developer [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) logs confirm OpenRouter free-model daily quota HTTP 429; reset is 24 Nov 2026 03:00 TRT. No rerun before reset; specialist job skipped and no integration/performance branch or PR verified.
- Next: DOM-126 quote revision/snapshot hardware-provenance coverage and cross-consumer reconciliation.


## 23 Kasım 2026 08:27 TRT — DOM-125 IMPLEMENTED
- Quote-summary JSON v1 strict validator now preserves optional hardware BOM fields (hardware ID, unit, sorted furniture IDs, optional sorted source references) only on production-consumption hardware cost lines; partial metadata fails closed. Legacy JSON without these fields remains valid.
- Quote-summary CSV v1 adds four trailing columns and parses legacy v1 headers by normalizing missing columns to blanks; no provenance is invented. Added round-trip and negative/legacy compatibility tests.
- Files: `domain/production/projectQuoteSummaryFile.ts`, `projectQuoteSummaryFile.test.mjs`, `projectQuoteSummaryCsv.ts`, `projectQuoteSummaryCsv.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`. No frontend, specialist-owned adapter/performance files, machine output or `main` changed.
- Local full suite unavailable; GitHub Actions is authoritative. AI Developer last run [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) failed due OpenRouter free daily quota 429; specialist job skipped, no separate integration/performance branch/PR verified.
- Next: DOM-126 quote revision/snapshot hardware-provenance coverage and cross-consumer reconciliation.


## 23 Kasım 2026 08:30 TRT — DOM-125 QA regresyon düzeltmesi
- Exact-SHA QA [#45118632745](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118632745) initially failed only because the new CSV assertion had a missing quote; no tests were weakened. The assertion was corrected in [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e).


## 23 Kasım 2026 08:36 TRT — DOM-125 doğrulandı
- Feature commit: [6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456); CSV test assertion correction: [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e). This entry's code SHA was 332299f; current branch includes documentation-only follow-ups.
- Exact-SHA CI [#45118738218](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738218) successful (production build + lint); QA [#45118738120](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738120) successful — 175 frontend + 658 domain tests, strict domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities.
- Pages deployment [#45118738144](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738144) successful: https://taylan789.github.io/MobilyaCAD/. This domain-only slice updates the deployed build but makes no visible frontend redesign; UI-agent PRs remain separate and unmerged.
- Initial QA failure was a typo in the new CSV test assertion; corrected without weakening coverage. No local tests run (repository checkout/network unavailable).
- Next: DOM-126 quote revision/snapshot hardware-provenance coverage and cross-consumer reconciliation.


## 23 Kasım 2026 08:38 TRT — Roadmap/contract consistency cleanup
- Verified DOM-125 links/status and next task DOM-126 are synchronized; stale DOM-124/125 “next” wording removed. Contract separates DOM-124 and DOM-125 exact-SHA evidence correctly.
- Documentation-only commit [0a5082f](https://github.com/Taylan789/MobilyaCAD/commit/0a5082f9efc4ca81d2cc5aee97ce842428ff0072) passed CI #45119088992, QA #45119089072 and Pages #45119089128. Final cleanup [7326aea](https://github.com/Taylan789/MobilyaCAD/commit/7326aea5e4e25e3b4eb8e460bf8796a71a5fb218) passed CI #45119292180, QA #45119292188 and Pages #45119292242.


## 23 Kasım 2026 08:42 TRT — Final SHA and documentation verification
- Current checked branch head before this record: [7326aea](https://github.com/Taylan789/MobilyaCAD/commit/7326aea5e4e25e3b4eb8e460bf8796a71a5fb218). Feature [6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456) and CSV test correction [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e) are verified by exact-SHA CI/QA/Pages #45118738218 / #45118738120 / #45118738144.
- Latest docs cleanup [7326aea](https://github.com/Taylan789/MobilyaCAD/commit/7326aea5e4e25e3b4eb8e460bf8796a71a5fb218) passed exact-SHA CI #45119292180, QA #45119292188 and Pages #45119292242. QA: 175 frontend + 658 domain tests, strict TypeScript, production build, lint 32 warnings/0 errors, production audit 0 vulnerabilities.
- No local test run; no manual test requested. UI agent PRs remain separate; domain-only deployment does not claim visible UI redesign.
- AI Developer #45091325066 remains blocked by OpenRouter free-model quota HTTP 429; specialist integration/performance job/PR not found. Next DOM-126.


## 23 Kasım 2026 10:38 TRT — DOM-126a verified
- Code/test commit: [53c72cbd](https://github.com/Taylan789/MobilyaCAD/commit/53c72cbdf8e04c9df46d2ab13b7d499fe7fae5b4); changed domain/production/projectQuoteRevision.ts, new projectQuoteRevisionHardwareProvenance.test.mjs, production-domain contract, roadmap, progress and coordination.
- Quote revisions now accept DOM-125 hardware BOM fields with strict all-or-nothing identity/unit/furniture validation; units reconcile to the cost line, optional BOM refs remain sorted, and misplaced metadata blocks.
- CI: [#45132439080](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439080) successful. QA: [#45132439155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439155) successful — 175 frontend + 660 domain tests, 0 failures; strict domain TypeScript, lint 32 warnings/0 errors, production build, production dependency audit 0 vulnerabilities.
- Pages: [#45132439031](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439031) successful; test site deployed: https://taylan789.github.io/MobilyaCAD/.
- Known gap: revision comparison snapshots/JSON/CSV still do not expose hardware BOM metadata; next DOM-126b. Local tests unavailable (no checkout mounted); exact-SHA Actions is authoritative. AI Developer [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) failed on OpenRouter free-model quota 429; specialist job skipped and no specialist branch/PR verified. No paid fallback/quota/secrets changes.


## 23 Kasım 2026 11:47 TRT — DOM-126b VERIFIED
- **Commit:** [ec937609](https://github.com/Taylan789/MobilyaCAD/commit/ec9376091721bee90605caf292b5e88af3f2748d). Revision comparison line snapshots preserve hardware BOM identity, unit, furniture IDs and BOM source references; BOM-source-only changes now appear as line-level changes without monetary delta.
- **Test:** added an actual two-revision regression changing BOM source references only; validates line comparison, unchanged hardware category/grand totals and exact sorted provenance. **Actions:** CI [#45144318230](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144318230), QA [#45144317923](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317923) succeeded; 661 domain tests, strict TypeScript, lint 32 warnings/0 errors, build and audit 0 vulnerabilities.
- **Test site:** Pages deployment [#45144317913](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317913) succeeded at https://taylan789.github.io/MobilyaCAD/ for this exact SHA.
- **Known limits:** comparison JSON/CSV hardware fields are not yet implemented; no local checkout/manual test, CNC/machine output, UI, integration/performance-owned files or `main` changes. AI Developer run [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) remains quota-blocked (OpenRouter free-model daily 429); specialist integration/performance evidence is not present.
- **Next:** DOM-126c comparison JSON v3, then DOM-126d CSV v4 and DOM-127 traceability review.


## 23 Kasım 2026 12:23 TRT — DOM-126c JSON v3 VERIFIED

- Comparison JSON emits v3 only when hardware BOM metadata is present; legacy no-BOM exports remain v2. v1/v2 imports stay supported; BOM identity/unit/furniture/source metadata is strict and restricted to production-consumption hardware lines.
- Tests cover BOM round-trip and source-only changes without monetary delta, partial/misplaced/wrong-unit/non-hardware/empty or unsorted metadata rejection, and legacy v1/v2 readers. No CSV adapter or frontend files changed.
- Code/test commit: [8af748584c5f301b38a5ee6daff783b49c69ded4](https://github.com/Taylan789/MobilyaCAD/commit/8af748584c5f301b38a5ee6daff783b49c69ded4). CI [#45148425243](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425243) succeeded; QA [#45148425227](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425227) passed: 178 frontend + 664 domain tests, strict domain TypeScript, production build, lint 32 warnings/0 errors, production audit 0 vulnerabilities. Pages [#45148425478](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425478) deployed to https://taylan789.github.io/MobilyaCAD/.
- AI Developer attempt 3 [#45091325066](https://github.com/Taylan789/MobilyaCAD/actions/runs/45091325066) failed again; its job-log endpoint returned 404/BlobNotFound, so no new error detail was available. The run did not move branch HEAD. Integration/performance specialist job was skipped; no integration-performance PR is open. UI agent PRs remain separate and unmerged; frontend files were not changed here.
- Local tests could not be run because the repository is not mounted in this runtime; exact-SHA Actions are authoritative.
- Next: DOM-126d comparison CSV v4 BOM columns and v1/v2/v3 compatibility, then DOM-127 traceability boundary review.


## 23 Kasım 2026 13:08 TRT — DOM-126d CSV v4 implementation (verification pending)
- Comparison CSV v4 adds paired hardware BOM ID/unit/furniture/source-reference columns; v1/v2/v3 readers remain strict and compatible. Tests added for hardware metadata round-trip, partial/unsorted rejection, JSON v3 cross-format preservation and legacy v3 compatibility.
- Code/test commit: pending creation. Exact-SHA CI, QA and Pages results pending. Local test execution unavailable because the runtime could not resolve GitHub for a read-only clone.
- Frontend files, machine-specific output, integration/performance-owned adapters and `main` remain untouched. Next: DOM-127 hardware traceability boundary.


## 23 Kasım 2026 13:08 TRT — DOM-126d verification correction
- Commit `6a6f2c6c7d79bdf94505a3aa553ac0add313eeb1` added CSV v4 implementation and regression tests.
- CI build/lint: **success** (run 45156744492). QA shared-domain suite: **failure** (run 45156744371): 656/666 pass; ten tests expected CSV version 3 but current serializer is version 4. New DOM-126d hardware-BOM test itself passed.
- Pages build started but is gated by QA; deployment is not verified. Fixing the ten stale version assertions and the DOM-084 test title now.


## 23 Kasım 2026 13:08 TRT — DOM-126d verified delivery
- Code/test commit: `6a6f2c6c7d79bdf94505a3aa553ac0add313eeb1`. QA initially caught ten stale shared-domain assertions expecting CSV v3; tests were corrected to v4 without weakening behavior.
- Fix/test/docs commit: `32e15e753f02c3d43d2be2eb660c31d1154e840b`. CI **success** (run 45157106818). QA **success** (run 45157106928): unit 184/184 and shared-domain 666/666; type-check, lint, production build and dependency audit all passed.
- Pages deployment **success** (run 45157106790), exact SHA. Test site: https://taylan789.github.io/MobilyaCAD/ .
- Next: DOM-127 hardware BOM-to-furniture/Part traceability boundary; no UI/CNC mapping is claimed.


## 23 Kasım 2026 14:07 TRT — DOM-127a explicit hardware BOM-to-Part mapping (verified)
- Added optional `hardwareItems[].sourcePartIds`; production rejects empty/oversized, unsorted/duplicate, unknown Part IDs and cross-furniture mappings. No link is inferred when absent.
- Hardware summary aggregates explicit Part-ID union; priced-consumption and quote source metadata carry it through revision/history and comparison JSON v3/CSV v4. The grouped summary does not allocate hardware quantities per Part.
- Domain regressions added for valid/invalid mapping, summary aggregation, priced source map, standalone/project-v2 revision history, and comparison JSON/CSV round-trip.
- Code commit: `5ecbeeec9aff394782f9df866e09b1b6445827b1`; follow-up type-check fix: `4808746daa13d4bbce55ff78657098308c4f4694`. Files: projectProduction.ts/.test.mjs, projectMaterialSummary.ts/.test.mjs, projectPricedConsumption.ts/.test.mjs, projectQuoteSummary.ts, projectQuoteRevisionHardwareProvenance.test.mjs, production-domain-contract.md, PRODUCT_ROADMAP.md, AI_COORDINATION.md, AI_PROGRESS.md.
- Exact-SHA CI `45165232791` and QA `45165232778` **success** (unit/shared-domain tests, type-check, lint, build, production dependency audit); Pages build, exact-SHA gate and deploy `45165232708` **success**, URL: https://taylan789.github.io/MobilyaCAD/ . Local tests not run; Actions are the verification evidence.
- AI Developer run `45160490760` failed due OpenRouter free-model daily quota 429 (remaining 0); not rerun because quota is still exhausted. Integration/performance specialist job was skipped. Frontend files and `main` untouched. Next: DOM-127b per-BOM-row Part/quantity traceability.


## 23 Kasım 2026 15:22 TRT — DOM-127b VERIFIED
- Added `calculateProjectHardwareBomTrace`: each validated BOM row retains its own quantity/unit/reference and explicit same-furniture Part links. Linked Part snapshots expose ID/name, production quantity, material identity and mm dimensions; BOM quantity is not allocated across Parts.
- Regression coverage: grouped rows across two furniture, fractional per-row quantities, distinct Part mappings/references, unlinked rows, aggregate total/union consistency, input immutability, legacy empty projects, missing/cross-furniture links. No tests were deleted or weakened.
- Commits: feature [8d2df770](https://github.com/Taylan789/MobilyaCAD/commit/8d2df77027b19bb4c36e694207871cb481043331); corrections [7e334d77](https://github.com/Taylan789/MobilyaCAD/commit/7e334d770ec26acc44a08637cd6639cc9ee6b06b); final code [a87c46f6](https://github.com/Taylan789/MobilyaCAD/commit/a87c46f6f0ecf57eccd327004ac1ae743ac81dc8).
- First two QA attempts exposed callback syntax errors; logs [#45172983047](https://github.com/Taylan789/MobilyaCAD/actions/runs/45172983047) and [#45173218272](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173218272) were inspected and corrected. Final exact-SHA CI [#45173461621](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461621) and QA [#45173461653](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461653) succeeded: **188 frontend + 668 domain tests**, strict TypeScript, lint **34 warnings/0 errors**, production build, audit **0 vulnerabilities**. Pages [#45173461683](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461683) succeeded and deployed the final code SHA. Test site: https://taylan789.github.io/MobilyaCAD/.
- AI Developer [#45160490760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45160490760) failed with OpenRouter free daily quota HTTP 429; no paid fallback, secret or quota changes. Integration/performance specialist job skipped; no specialist PR verified. UI PRs remain unmerged; frontend untouched and `main` untouched.
- Next: DOM-128 cross-consumer quote source-map identity/unit reconciliation.


## 23 Kasım 2026 16:53 TRT — DOM-128 implementation (verification pending)

- Reconciled quote revision comparison identity across the engine and strict comparison JSON/CSV validator: hardware catalog ID, hardware unit, furniture scope and explicit Part links are identity fields. Source-reference-only changes remain value changes.
- Regression coverage exercises hardware ID, furniture scope and Part-link changes as removed/added pairs through JSON and CSV round-trips; monetary deltas remain zero. Wrong hardware unit is blocked, and forged changed-line metadata with different hardware identity fails JSON and CSV serialization.
- Code/test/docs initial commit [68439af3](https://github.com/Taylan789/MobilyaCAD/commit/68439af3056311ae2a1109951f36fc17abd157bc). CI [#45190007818](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190007818) passed; QA [#45190007996](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190007996) failed only because the new unit-mismatch regression expected different diagnostic wording. The validator correctly blocked the mismatch. Pages build [#45190007847](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190007847) succeeded but the exact-SHA gate failed and deployment was skipped. Correcting the assertion; full local test execution unavailable.
- Verified preceding SHA 7c674ce50588d43a6a86881fc674eadbf75ecc82 had CI [#45174000820](https://github.com/Taylan789/MobilyaCAD/actions/runs/45174000820), QA [#45174000901](https://github.com/Taylan789/MobilyaCAD/actions/runs/45174000901), Pages [#45174000796](https://github.com/Taylan789/MobilyaCAD/actions/runs/45174000796) all successful. Test site: https://taylan789.github.io/MobilyaCAD/.
- AI Developer [#45160490760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45160490760) log confirmed OpenRouter free-model daily quota 429 (limit 50, remaining 0); integration/performance job skipped. No paid fallback, secret or quota changes. No specialist PR verified.
- No frontend, adapter/performance-owned files, CNC output or main changes. Next: DOM-129 lossless production metadata import/export compatibility guards.


## 23 Kasım 2026 16:55 TRT — DOM-128 QA assertion correction (verification pending)

- QA log confirmed the feature comparisons passed; failure was the wrong expected diagnostic text in the unit-mismatch regression. Actual validator message: “Teklif donanım birimi maliyet satırı birimiyle uyuşmalıdır.”
- Corrected only the assertion; production logic unchanged in this follow-up.
- Follow-up commit [75a88485](https://github.com/Taylan789/MobilyaCAD/commit/75a884850b631716c35232c1ce699b19bb4ddedb). CI [#45190394525](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394525) and QA [#45190394796](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394796) passed: 188 frontend + 669 domain tests, strict domain TypeScript, lint 34 warnings/0 errors, production build, audit 0 vulnerabilities. Pages [#45190394590](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394590) succeeded and deployed this SHA to https://taylan789.github.io/MobilyaCAD/. Local full tests were not run.


## 23 Kasım 2026 18:05 TRT — DOM-129 QA düzeltmesi, doğrulama bekliyor

- İlk test commit [55377614](https://github.com/Taylan789/MobilyaCAD/commit/553776146bdb2d049336bf5d19ac76bfebc76caa) CI [#45201279037](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201279037) başarılı; QA [#45201278908](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201278908) başarısız: test fixture raporun `firstError` alanını kullanması gerekirken olmayan `diagnostics` alanına erişti. DOM-129 test yüklemesi durdu; 666 test geçti, 1 test modülü başarısız.
- Pages [#45201279068](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201279068) exact-SHA QA kapısında durdu; test sitesi bu commit'e deploy edilmedi.
- Düzeltme: rapor hata mesajı `firstError` üzerinden alındı; hardware source-map assertions JSON/CSV parse sonuçlarını karşılaştırmadan önce tanımlandı. Üretim davranışı veya test kriteri gevşetilmedi.
- Kapsam yalnızca `domain/production/projectQuoteRevisionExports.test.mjs`, koordinasyon, roadmap ve progress; frontend, adapter/performance-owned dosyalar, CNC ve `main` değişmedi. Yerel test çalıştırılmadı.
- Next: corrected DOM-129 exact-SHA CI/QA/Pages; başarılı Actions kanıtı olmadan doğrulanmış sayma.


## 23 Kasım 2026 18:10 TRT — DOM-129 ikinci QA düzeltmesi

- Correction commit [51da41df](https://github.com/Taylan789/MobilyaCAD/commit/51da41dfdc38b4cd39366d1d10a6310a3935b086) CI [#45201700181](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201700181) successful; QA [#45201699809](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201699809) failed only in the new integration test: `hardwareSource` was read before its declaration (ReferenceError). Pages [#45201699855](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201699855) exact-SHA gate failed, deployment skipped.
- Correction moves JSON/CSV source-map comparisons after the source declaration. No production behavior, serializer schema, or test assertions are weakened. This remains a test-only export-compatibility slice; local tests unavailable.
- Next: corrected exact-SHA CI/QA/Pages; DOM-129 is not VERIFIED until those results succeed.


## 23 Kasım 2026 18:18 TRT — DOM-129 VERIFIED

- Final code/test commit [16d64031](https://github.com/Taylan789/MobilyaCAD/commit/16d640313b056c57385fbbdbc8a93ccb1d921147) corrected assertion ordering. DOM-129 now proves hardware BOM provenance (catalog ID/unit, furniture IDs, sorted BOM source references) survives project JSON v2 revision history, standalone history JSON v1, quote-summary JSON v1 and CSV v1; price source reference remains separate from BOM provenance.
- Exact-SHA CI [#45201700181](https://github.com/Taylan789/MobilyaCAD/actions/runs/45201700181) and QA [#45202029123](https://github.com/Taylan789/MobilyaCAD/actions/runs/45202029123) succeeded. QA: **188 frontend + 669 domain tests**, strict shared-domain TypeScript, lint **34 warnings / 0 errors**, production build and dependency audit **0 vulnerabilities**.
- Pages [#45202029099](https://github.com/Taylan789/MobilyaCAD/actions/runs/45202029099) succeeded and deployed to https://taylan789.github.io/MobilyaCAD/. This was a domain/test slice; no visible UI redesign is included.
- Changed files: `domain/production/projectQuoteRevisionExports.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. No production calculation, frontend, adapter/performance-owned file, CNC/machine output or `main` changed. Local tests unavailable; exact-SHA Actions are the evidence.
- Earlier QA fixture failures were fixed without weakening assertions. Next: DOM-130 hardware BOM trace persistence/export contract and schema compatibility; DOM-131 immutable quote source-map audit summary.


## 23 Kasım 2026 18:14 TRT — DOM-131 VERIFIED

- **Code/test SHA:** [5f1fbf1f55ff2bd45468939abf7d2e76fecd0cdf](https://github.com/Taylan789/MobilyaCAD/commit/5f1fbf1f55ff2bd45468939abf7d2e76fecd0cdf).
- **Deliverable:** `calculateProjectQuoteRevisionSourceMapAudit` validates all quote history before returning immutable per-revision source lines/counts and global totals. It preserves price-list source references, hardware BOM references, resource/Part provenance and legacy `sourceIntegrityVersion=null`; empty and invalid histories are handled atomically.
- **Changed files:** `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `docs/production-domain-contract.md`.
- **Exact-SHA Actions:** CI [#45204878883](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204878883) and QA [#45204879024](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204879024) succeeded. QA: **188 frontend + 671 domain tests**, strict domain TS, production build, lint 34 warnings/0 errors, production audit 0 vulnerabilities. Pages [#45204879129](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204879129) deployed https://taylan789.github.io/MobilyaCAD/.
- Local tests unavailable in this runtime. `npm ci` showed 4 moderate full-tree dependency findings; production-only audit is clean. The 34 existing lint warnings remain.
- No frontend, adapter/performance-owned files, machine/CNC output or `main` changed. DOM-130 is deferred until adapter ownership; next domain tasks are DOM-132 legacy duplicate identity audit and DOM-133 provenance-only revision deltas.


## 23 Kasım 2026 19:32 TRT — DOM-132 VERIFIED
- Code/test commit [7b52344dff6d848b238971060b68e9eeefda6c8d](https://github.com/Taylan789/MobilyaCAD/commit/7b52344dff6d848b238971060b68e9eeefda6c8d); legacy quote source-map audit reports duplicate source-identity groups and stable sorted cost-line references, with counts per revision and totals.
- Regression: legacy history remains valid/ready, source mapping is immutable, duplicate line references stay stable under paired reordering, and strict integrity v1 still rejects duplicates.
- Exact-SHA CI [#45217498055](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217498055) and QA [#45217498277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217498277) passed; **191 frontend + 672 domain tests**, strict shared-domain TypeScript, production build, lint **34 warnings / 0 errors**, production dependency audit **0 vulnerabilities**.
- Pages [#45217499095](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217499095) succeeded and deployed https://taylan789.github.io/MobilyaCAD/. Local test execution unavailable; exact-SHA Actions is authoritative.
- No frontend, adapter/performance-owned files, CNC/machine output or main changed.
- Latest AI Developer run [#45160490760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45160490760) failed on OpenRouter free daily 429 quota; specialist job skipped. No retry was issued because the daily quota exhaustion is not transient and no paid fallback/secret was changed.
- Next: DOM-133 provenance-only comparison; DOM-134 three-revision audit reconciliation; DOM-135 legacy integrity-marker disclosure.



## 23 Kasım 2026 20:40 TRT — DOM-133 implementation (verification pending)
- Added a domain-only revision source-map comparison that matches validated cost-line IDs and reports source metadata changes separately from money, quantity, unit-price and line-total arithmetic.
- Regression coverage: source-only identity/Part/reference change with zero monetary delta; added/removed/unchanged row reconciliation; paired source/cost row reorder determinism; immutable result/input; missing revision and invalid-history fail-closed behavior.
- Files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`.
- Corrected code/test commit [0944028fdf51c3b3e4fce0f5395e74885029239a](https://github.com/Taylan789/MobilyaCAD/commit/0944028fdf51c3b3e4fce0f5395e74885029239a) is verified by CI [#45231997148](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231997148), QA [#45231996953](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231996953) and Pages [#45231997189](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231997189); local tests are unavailable in this runtime.
- Ownership: no frontend, adapter/performance-owned files, CNC/machine output or `main` changes.
- Next: DOM-134 three-revision source-map audit reconciliation; DOM-135 legacy integrity-marker disclosure. DOM-130 remains deferred because adapter ownership is unavailable.


## 23 Kasım 2026 20:40 TRT — DOM-133 QA correction
- Initial code/test commit [f9bdafd4](https://github.com/Taylan789/MobilyaCAD/commit/f9bdafd4f9565921a23c61b6a4cf715d43bed958): CI [#45231664059](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231664059) succeeded. QA [#45231664097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231664097) failed only in the added DOM-133 deterministic ordering assertion: implementation sorts costLineIds lexically, while the expected list had the reverse order (673/674 domain tests passed).
- Pages [#45231664060](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231664060) built successfully but its exact-SHA CI/QA gate failed; deploy was skipped. No broken version was published.
- Correction changes the expected added/removed row order to match lexical costLineId sorting. Assertions and production behavior are unchanged; no tests were weakened. Corrected commit SHA and exact-SHA Actions results are pending.
- Next: DOM-134 three-revision source-map audit reconciliation; DOM-135 legacy source-integrity disclosure. DOM-130 stays deferred due adapter ownership.


## 23 Kasım 2026 20:40 TRT — DOM-133 VERIFIED
- **Code/test commit:** [0944028fdf51c3b3e4fce0f5395e74885029239a](https://github.com/Taylan789/MobilyaCAD/commit/0944028fdf51c3b3e4fce0f5395e74885029239a).
- Exact-SHA CI [#45231997148](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231997148) and QA [#45231996953](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231996953) passed; QA **191 frontend + 674 domain tests**, strict domain TypeScript, production build, lint **34 warnings / 0 errors**, production dependency audit **0 vulnerabilities**.
- Pages [#45231997189](https://github.com/Taylan789/MobilyaCAD/actions/runs/45231997189) succeeded; test site deployed: https://taylan789.github.io/MobilyaCAD/.
- Initial QA failure was only the new deterministic-order expectation; corrected expected lexical costLineId order without changing production behavior or weakening tests. Exact-SHA revalidation passed.
- Local test execution unavailable in this runtime; Actions is the verification evidence. No frontend, adapter/performance-owned files, CNC/machine output or `main` changed.
- Next: DOM-134 three-revision source-map audit reconciliation; DOM-135 legacy source-integrity disclosure. DOM-130 remains deferred due adapter ownership.


## 23 Kasım 2026 20:40 TRT — documentation SHA bb794e2f verified
- Documentation/coordination commit [bb794e2fdcc4ec4b4d9e9b081239f36eeaf42de0](https://github.com/Taylan789/MobilyaCAD/commit/bb794e2fdcc4ec4b4d9e9b081239f36eeaf42de0) exact-SHA CI [#45232392957](https://github.com/Taylan789/MobilyaCAD/actions/runs/45232392957), QA [#45232393080](https://github.com/Taylan789/MobilyaCAD/actions/runs/45232393080) and Pages [#45232393061](https://github.com/Taylan789/MobilyaCAD/actions/runs/45232393061) all succeeded.
- Pages deploy run [#45232393061](https://github.com/Taylan789/MobilyaCAD/actions/runs/45232393061) deployed the documentation commit and verified https://taylan789.github.io/MobilyaCAD/.


## 23 Kasım 2026 22:19 TRT — DOM-134 VERIFIED
- Test-only commit [cbbe098c](https://github.com/Taylan789/MobilyaCAD/commit/cbbe098cc7e86d50b9c08a2c24bf752e09c1a09b) adds three-revision coverage for two revision-local duplicate identity groups per revision, deterministic group/line-ID ordering, additive count reconciliation and project-wide unique Part/hardware IDs. Paired source/cost-row reversal leaves the audit summary unchanged; input and nested output remain immutable.
- Exact-SHA CI [#45248747459](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747459) and QA [#45248747535](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747535) passed: **191 frontend + 675 domain tests**, strict shared-domain TypeScript, lint **34 warnings / 0 errors**, production build, and production dependency audit **0 vulnerabilities**. Pages [#45248747497](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747497) succeeded; test site: https://taylan789.github.io/MobilyaCAD/.
- Local tests are unavailable in this runtime; exact-SHA Actions are the evidence. No production calculation, export schema/adapter, frontend, CNC/machine output or main changes.
- Latest AI Developer run [#45160490760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45160490760) failed on OpenRouter free daily quota HTTP 429; specialist job skipped. No paid fallback, secret/quota change or retry was made.
- Next: DOM-135 legacy source-integrity marker disclosure. DOM-130 remains deferred until adapter ownership is available.


## 23 Kasım 2026 23:06 TRT — DOM-135 VERIFIED
- Code/test commit [2db79730c805ebcc12148ac25d9362fa63591776](https://github.com/Taylan789/MobilyaCAD/commit/2db79730c805ebcc12148ac25d9362fa63591776) adds `fromSourceIntegrityVersion` / `toSourceIntegrityVersion` to source-map revision comparisons. Strict marker `1` and legacy missing marker `null` are copied from the validated audit; no integrity is inferred and no history is rewritten.
- Regression covers legacy → strict v1 → legacy (`null / 1 / null`), zero provenance deltas, unchanged line reconciliation, validated history and immutability.
- Exact-SHA CI [#45256565667](https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565667), QA [#45256565549](https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565549), and Pages [#45256565818](https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565818) all succeeded. QA: **194 frontend + 676 domain tests**, strict TypeScript, production build, lint **34 warnings / 0 errors**, production dependency audit **0 vulnerabilities**.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. Local tests unavailable in this runtime; exact-SHA Actions are the verification evidence.
- Files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`. No frontend, adapter/performance-owned files, CNC/machine output or `main` changes.
- Latest AI Developer run [#45160490760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45160490760) failed on OpenRouter free-model daily quota HTTP 429; integration specialist was skipped. No rerun, paid fallback, secret or quota change.
- Next: DOM-136 strict/legacy revision-count reconciliation. DOM-130 remains deferred until adapter ownership is available.



## 24 Kasım 2026 00:55 TRT — DOM-136 implementation (verification pending)
- Added `calculateProjectQuoteRevisionSourceIntegrityAudit`: strict marker `1` and legacy `null` counts derived from validated source-map audit snapshots, with project revision-count reconciliation and ordered per-revision markers.
- Regression coverage: legacy → strict v1 → legacy, strict/legacy totals equal revisionCount, repeat-call determinism, input/output immutability, empty history and malformed marker fail-closed.
- Files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`. Commit SHA is reported in the run notification.
- CI/QA/Pages exact-SHA verification pending. This runtime can read commit-associated PR runs and commit status, but no push-run/check-run listing is exposed; therefore no Actions success or deployment is claimed. Test site remains https://taylan789.github.io/MobilyaCAD/ until deployment is verified.
- No frontend, adapter/performance-owned files, machine/CNC output or `main` changes. Next: DOM-137 append/read integrity coverage reconciliation; DOM-130 remains adapter-owned/deferred.


## 24 Kasım 2026 03:29 TRT — DOM-139 VERIFIED
- Code/test [commit 538c3bd46514de1b5e0aabd7dc1e8714bdda569c](https://github.com/Taylan789/MobilyaCAD/commit/538c3bd46514de1b5e0aabd7dc1e8714bdda569c) adds `calculateProjectSheetNestingStockCostSummary`: fresh cut-plan area validation, explicit per-group sheet prices, currency/source references, exact group identity and reconciled purchase totals. Net-consumption quote pricing remains separate.
- Regression suite covers mixed material groups, multi-sheet cost, reversed price-definition order, empty plans, missing/duplicate/unused/mismatched prices, invalid currency/price/reference, mixed currencies, overflow, blocked plans and input/output immutability.
- Exact-SHA CI [#45298432627](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432627), QA [#45298432528](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432528) and Pages [#45298432481](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432481) all succeeded. Test site: https://taylan789.github.io/MobilyaCAD/.
- Files: `domain/production/projectSheetNestingStockCostSummary.ts`, its test, and QA strict TypeScript target list (in the code commit); this follow-up records verified status in `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`, and `docs/production-domain-contract.md`.
- No frontend, adapter/performance-owned files, CNC/machine output or `main` changes. Next: DOM-140 explicit material-cost basis contract before quote integration; DOM-138/DOM-130 remain adapter-owned/deferred.


## 24 Kasım 2026 05:50 TRT — DOM-140 implementation (verification pending)
- Added `calculateProjectMaterialCostBasisSummary`: selects one explicit basis (`net-consumption` or `stock-sheet-purchase`), validates currency/category/group totals and source consistency, and never combines the two bases.
- Regression covers ready net consumption, a real nesting stock-cost report, incomplete/empty input, inconsistent totals, unsupported request fields, deterministic output and immutability.
- Code commit SHA and exact-SHA CI/QA/Pages status pending. No frontend or adapter/performance-owned files changed; `main` untouched.
- Next: DOM-141 quote integration remains separate and must preserve basis selection without double counting; DOM-138/DOM-130 remain adapter-owned/deferred.


## 24 Kasım 2026 05:50 TRT — DOM-140 initial verification failure and correction
- Initial code/test commit [92f361b9](https://github.com/Taylan789/MobilyaCAD/commit/92f361b9f01df1be96c064c4cf39cd045ebc7d09) CI passed, but QA domain tests reported **691 pass / 2 fail**: incomplete missing-price fixture used issue objects (the helper incorrectly required strings), and the stock-cost test attempted to mutate a frozen calculator output. Pages build passed, exact-SHA QA gate failed, deploy was skipped; test site was not updated.
- Fix: accept missing-price issue records as a list while requiring string diagnostics; clone the immutable stock report before corrupting its test fixture. No test weakened.
- Fix commit SHA and rerun results pending. No frontend or adapter/performance-owned files changed; `main` untouched. Next: verify corrected DOM-140 and then DOM-141 quote basis integration contract.


## 24 Kasım 2026 05:57 TRT — DOM-140 VERIFIED
- Code/test commit [207df9aa](https://github.com/Taylan789/MobilyaCAD/commit/207df9aa51548ab1156aed8327173f4cfc6dbc52) fixes the initial QA failures (missing-price issue records remain objects; immutable stock reports are cloned before test corruption). Selector API and tests now pass.
- Exact-SHA CI [#45315954884](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954884), QA [#45315954813](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954813), and Pages [#45315954792](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954792) succeeded. QA: **204 frontend + 693 domain tests**, strict domain TypeScript, production build, lint **34 warnings / 0 errors**, production audit **0 vulnerabilities**. Pages deployment confirmed at https://taylan789.github.io/MobilyaCAD/.
- First attempt [92f361b9](https://github.com/Taylan789/MobilyaCAD/commit/92f361b9f01df1be96c064c4cf39cd045ebc7d09) had CI success but QA 691/693 and Pages gate failed; the two test issues were fixed without weakening tests. No frontend, adapter/performance-owned files, CNC/machine output or `main` changes.
- Next: DOM-141 versioned quote integration carrying the selected material basis; DOM-138/DOM-130 remain adapter-owned/deferred. QA-003 stays blocked on INT-001/INT-002 evidence.


## 24 Kasım 2026 07:23 TRT — DOM-141 first verification and scope correction
- Feature commit: `890f7872ab71e382d190feeaff3f8b5ba2b15e07` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/890f7872ab71e382d190feeaff3f8b5ba2b15e07).
- Changed in feature commit: `domain/production/projectPricedConsumption.ts`, `domain/production/projectQuoteSummary.ts`, `domain/production/projectMaterialCostBasis.ts`, `domain/production/projectMaterialCostBasis.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Exact-SHA CI: **success** ([45326042764](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326042764)); frontend production build and lint completed successfully.
- Exact-SHA QA: **failure** ([45326042829](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326042829)); shared domain suite reported 64 failures from one `ReferenceError` scope regression. 558/622 tests passed; no tests were removed or weakened. Domain type-check, QA lint/build and audit were skipped after the test step failed.
- Pages: build artifact succeeded, but gate failed and deploy job was skipped ([45326042849](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326042849)); test site was not updated.
- Follow-up fix commit: `2daf2046d37cc2d0aaf562c4e61da5ea455852d9`. Shared cost arrays/counters and thickness lookup now sit outside the optional panel-price block; only panel net-area line generation is conditional. Exact-SHA CI, QA and Pages all passed.
- Known external blocker: AI Developer run [45322819775](https://github.com/Taylan789/MobilyaCAD/actions/runs/45322819775) hit OpenRouter free daily quota HTTP 429, remaining 0; reset timestamp resolves to 25 Nov 2026 03:00 TRT. No rerun, paid credits, secret or quota setting changed.
- Next: verify the scope fix on a new SHA; only then persist selected basis/provenance into a backward-compatible quote pricing snapshot.


## 24 Kasım 2026 07:26 TRT — DOM-141 verified; UI integration also deployed
- Verified domain fix commit: `2daf2046d37cc2d0aaf562c4e61da5ea455852d9` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/2daf2046d37cc2d0aaf562c4e61da5ea455852d9).
- Domain CI: **success** — [45326255975](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326255975).
- Domain QA: **success** — [45326255984](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326255984): 206/206 unit tests, 701/701 shared-domain tests, strict domain TypeScript check, lint, production build and security audit passed; audit reported 0 vulnerabilities.
- Domain Pages deployment: **success** — [45326256041](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326256041).
- Separate UI agent PR [#187](https://github.com/Taylan789/MobilyaCAD/pull/187) was merged by its owner. Merge commit `ab570f680acd7dd4d5eace0452b728747fd22385` changes only the viewport HUD CSS and its test. Exact-merge CI [45326441304](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441304) passed; QA [45326441439](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441439) passed with 208/208 unit tests and 701/701 shared-domain tests, strict type-check, lint, build and 0 audit vulnerabilities; Pages [45326441274](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441274) passed.
- Current test site: https://taylan789.github.io/MobilyaCAD/ (deployed branch head `adc448d58a3c905e602515f3d4bfe207737b1c5c`; Pages run [45326675155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326675155)).
- Next: DOM-142 — persist the selected material basis and stock-group provenance in quote pricing snapshots/revisions with backward-compatible v1 reads.
- AI Developer [45322819775](https://github.com/Taylan789/MobilyaCAD/actions/runs/45322819775) remains blocked by OpenRouter free-models-per-day quota (429, remaining 0, reset 25 Nov 2026 03:00 TRT); no paid credits, secret or quota setting was changed.


## 24 Kasım 2026 07:30 TRT — verification record finalized
- Documentation handoff commit: `adc448d58a3c905e602515f3d4bfe207737b1c5c` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/adc448d58a3c905e602515f3d4bfe207737b1c5c).
- CI passed: [45326675153](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326675153).
- QA passed: [45326675196](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326675196); shared-domain tests, strict domain type-check, lint, production build and dependency audit passed.
- Pages deployment passed: [45326675155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326675155). Test site is deployed at the exact documentation handoff SHA.
- This entry supersedes the earlier pending-fix note above; the first failed SHA remains recorded as history.


## 24 Kasım 2026 08:31 TRT — DOM-142 quote snapshot v2 implementation (verification pending)
- Base branch HEAD: b52d4795eb3379b8962ec773f6d5a348d76daf2f; the branch had no active CI, QA or deployment runs before this change.
- Added explicit material-cost-basis support to quote pricing snapshots. New snapshots use schema v2 only when the caller supplies a basis; existing v1 snapshot shape remains unchanged.
- Snapshot v2 stores selected basis, panel/edge/material/category/grand totals and immutable stock-sheet group provenance (material ID, normalized mm thickness, source Part IDs, sheet count, per-sheet price, group cost, currency and optional price source reference).
- Stock-only quotes can create a ready snapshot even when the line-level quoteSummary is empty; the v2 basis carries the independently validated purchase cost.
- Revision validation accepts legacy v1 and strict v2 snapshots, checks group arithmetic, Part identity uniqueness/order, currency and quote-total reconciliation. Stock-sheet revision comparison and source-map audit fail closed until group-aware consumers are implemented.
- Changed files: domain/production/projectQuotePricingSnapshot.ts, domain/production/projectQuotePricingSnapshot.test.mjs, domain/production/projectQuoteRevision.ts, domain/production/projectQuoteRevisionProjectFile.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Automated CI/QA/Pages: pending exact-SHA GitHub Actions.
- Known limitation: stock-sheet group comparison/source-map reporting is deliberately blocked; DOM-143 will add group-aware comparison and audit before enabling those consumers.
- AI Developer run 45322819775 failed with provider HTTP 429 (free-models-per-day, remaining 0, reset 25 Nov 2026 03:00 TRT); the integration/performance specialist job was skipped. No rerun, paid credits, secrets or quota settings were changed.
- Next: verify this exact SHA, then implement DOM-143 group-aware revision comparison and source-map audit.


## 24 Kasım 2026 08:34 TRT — DOM-142 exact-SHA QA correction
- CI for implementation SHA d54077703b80f26f95837245cb613fa2c68d1c6c passed; QA found exactly one domain regression test: net-consumption basis was incorrectly compared with the stock-sheet group count.
- Corrected the guard so group-count reconciliation applies only to stock-sheet-purchase mode; net-consumption source count remains the number of priced panel lines and its group list remains empty.
- The stock-sheet snapshot and Part-coverage tests passed in the same QA run; only the net-consumption snapshot test failed.
- Pages build/artifact succeeded, but the exact-SHA CI+QA gate failed and deployment was skipped. No broken build was published.
- Fix commit: pending creation; exact-SHA CI/QA/Pages verification pending.


## 24 Kasım 2026 08:36 TRT — DOM-142 verified
- Fix commit: 0f72244657a3f0c940529e1f3299eb53c9b271b7 — [commit](https://github.com/Taylan789/MobilyaCAD/commit/0f72244657a3f0c940529e1f3299eb53c9b271b7).
- CI [45335196984](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335196984): success; TypeScript and production build, lint all passed.
- QA [45335197030](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335197030): success; 208/208 unit tests, 706/706 shared-domain tests, shared-domain type-check, lint, production build and production dependency audit passed.
- Pages [45335197060](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335197060): success; exact-SHA CI/QA gate, site build, artifact upload and deployment passed.
- Current test site: https://taylan789.github.io/MobilyaCAD/ — deployed from 0f72244657a3f0c940529e1f3299eb53c9b271b7.
- QA history: initial implementation SHA d54077703b80f26f95837245cb613fa2c68d1c6c had one failing net-consumption test; corrected in 0f722446. The failed SHA was not deployed.
- Security: production dependency audit passed at the configured high threshold; four moderate findings remain in development dependencies. No dependencies or secrets were changed.
- AI Developer [45322819775](https://github.com/Taylan789/MobilyaCAD/actions/runs/45322819775) remains blocked by OpenRouter free-model daily quota (HTTP 429, remaining 0; reset 25 Nov 2026 03:00 TRT). No rerun or paid credit purchase.
- Next task: DOM-143 group-aware stock-sheet revision comparison and source-map audit. Stock-sheet consumers remain fail-closed until that slice is tested.


## 24 Kasım 2026 08:48 TRT — DOM-143A stock-sheet source-map audit (verification pending)
- Base branch HEAD: 50a9db88690201dcd5a7386e838fb02e2d93319d; no active CI, QA or AI Developer run was present before the change.
- Extended `calculateProjectQuoteRevisionSourceMapAudit` to preserve stock-sheet purchase group provenance separately from quote cost lines.
- Added per-revision and project-level group, Part-reference, unique-Part and explicit price-source-reference counts. Project-level unique stock-sheet Part IDs are deduplicated across revisions.
- Valid stock-only snapshots with an empty base quote summary and no cost lines are now auditable; they produce zero quote lines while retaining the snapshot's explicit stock-sheet groups.
- Added regression tests for mixed quote + stock-sheet revisions, stock-only empty quote revisions, immutable group provenance and cross-revision Part de-duplication.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [f0209200](https://github.com/Taylan789/MobilyaCAD/commit/f0209200e1a50ea326fe06547d33b8f17e6794b9); CI [45336429047](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336429047) passed. QA [45336429057](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336429057) found 1 stale integration-test expectation (707/708 domain tests passed): the project-file test still expected the source-map audit to be blocked. Pages [45336428994](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336428994) remained gated and did not deploy the failed-QA SHA.
- Known limits: stock-sheet revision comparison, source-map provenance comparison and JSON/CSV group-delta exports remain fail-closed; no frontend, adapter/performance-owned files or CNC output changed.
- Next: verify this exact commit, then implement group-aware revision comparison and its backward-compatible JSON/CSV representation.


## 24 Kasım 2026 08:49 TRT — DOM-143A integration-test correction (verification pending)
- QA evidence: the source-map implementation and its two new domain tests passed; the only failure was the older project-file integration assertion at `projectQuoteRevisionProjectFile.test.mjs:680`, which still expected the audit to be blocked.
- Updated that integration test to require a ready audit and verify the persisted stock-sheet group, explicit Part ID, separate line count and project-level unique-Part count. Revision comparison remains intentionally blocked.
- Changed files: `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `AI_PROGRESS.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `docs/production-domain-contract.md`.
- Follow-up test correction commit: [12687c9b](https://github.com/Taylan789/MobilyaCAD/commit/12687c9b2fb6c7a9623cbdea0f604a6ff8aeb66c); CI [45336610959](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336610959), QA [45336611027](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336611027) and Pages [45336610985](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336610985) all passed.
- The failed-QA SHA was not deployed; Pages is re-triggered from the follow-up commit and must pass its exact-SHA CI/QA gate.
- Next: verify the follow-up SHA; only after all gates pass proceed to DOM-143B group-aware revision comparison.


## 24 Kasım 2026 08:50 TRT — DOM-143A verified
- Final code/test commit: [12687c9b2fb6c7a9623cbdea0f604a6ff8aeb66c](https://github.com/Taylan789/MobilyaCAD/commit/12687c9b2fb6c7a9623cbdea0f604a6ff8aeb66c).
- CI [45336610959](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336610959): success; production TypeScript build and lint passed.
- QA [45336611027](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336611027): success; 211/211 unit tests, 708/708 shared-domain tests, shared-domain type-check, lint, production build and production dependency audit passed; 0 vulnerabilities reported by the configured audit.
- Pages [45336610985](https://github.com/Taylan789/MobilyaCAD/actions/runs/45336610985): success; exact-SHA CI/QA gate, site build, artifact upload and deployment passed.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployed from the verified follow-up SHA.
- The initial DOM-143A commit f0209200 passed CI but QA caught one stale project-file assertion; the failed SHA was not deployed. Commit 12687c9b updated the integration assertion and all exact-SHA gates passed.
- DOM-143 remains IN PROGRESS: stock-sheet revision comparison and backward-compatible JSON/CSV group-delta output are not implemented yet.
- Next: DOM-143B group-aware revision comparison, keeping unsupported/ambiguous group identity changes fail-closed.


## 24 Kasım 2026 09:39 TRT — DOM-143B stock-sheet group comparison core (VERIFIED)

- Base dev/github-work HEAD: d52f98ff71b5e3e76381cef2af49e60514041f80; no active MobilyaCAD AI Developer or QA run was present before the write. Latest CI #45336813670, QA #45336813656 and Pages #45336813951 passed on that base SHA.
- Added compareProjectQuoteRevisionStockSheetGroups, a dedicated immutable comparison API for validated revisions with at least one explicit stock-sheet purchase basis.
- Stable group IDs match groups in place; material/thickness identity changes are represented as removed + added. Same-identity changes preserve full before/after Part IDs, sheet count, explicit unit price, group cost, currency and optional price-source reference.
- Group purchase-cost deltas must reconcile to the stored panel stock-purchase delta; material-category and grand-total deltas use the selected snapshot basis and must reconcile across all categories. Unsafe integer arithmetic and currency mismatch block the whole comparison.
- Stock-only revisions with an empty line-level quote summary are supported without creating synthetic quote lines. Legacy v1/net-consumption revisions can be compared against a stock-sheet revision with zero stock-sheet groups on the legacy side.
- Added four regression tests for changed/removed/added groups, Part/source-reference preservation, material and grand-total reconciliation, stock-only empty summaries, legacy-v1 transition and unsupported-basis blocking.
- Changed files: domain/production/projectQuoteRevision.ts, domain/production/projectQuoteRevision.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Implementation commit: [b6b39177ea93a56b1679fb871b8a4e23a18537bc](https://github.com/Taylan789/MobilyaCAD/commit/b6b39177ea93a56b1679fb871b8a4e23a18537bc). CI [#45343121349](https://github.com/Taylan789/MobilyaCAD/actions/runs/45343121349) passed; QA [#45343121488](https://github.com/Taylan789/MobilyaCAD/actions/runs/45343121488) passed with 211/211 unit tests and 712/712 domain tests, domain type-check, lint, production build and production dependency audit (0 production vulnerabilities). Pages [#45343121506](https://github.com/Taylan789/MobilyaCAD/actions/runs/45343121506) passed the exact-SHA gate, site build, artifact upload and deployment. npm install still reports four moderate development-dependency advisories; the production-only audit reports zero.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployed from the verified DOM-143B commit via Pages #45343121506.
- Known limits: the existing full quote-comparison API and JSON/CSV stock-sheet exports remain fail-closed until DOM-143C/D integrate and round-trip the new group comparison. No frontend, adapter/performance-owned files or CNC output changed.
- AI Developer #45338253254 failed because OpenRouter free-model daily quota returned HTTP 429 (limit 50, remaining 0; reset 25 November 2026 03:00 TRT). Its integration/performance specialist job was skipped. No retry, paid credits, secrets or quota settings were changed.
- Next: after exact-SHA gates pass, DOM-143C integrates the group comparison into backward-compatible comparison JSON while preserving legacy comparison files; DOM-143D adds CSV group rows and source-map provenance deltas.


## 24 Kasım 2026 10:57 TRT — DOM-143B1 stock-sheet group count contract (verification pending)

- Base `dev/github-work` HEAD: `31e5828a291a08f393d7a721ed44430219b7fb78`. Before this change, exact-SHA CI [#45351731249](https://github.com/Taylan789/MobilyaCAD/actions/runs/45351731249), QA [#45351731323](https://github.com/Taylan789/MobilyaCAD/actions/runs/45351731323) and Pages [#45351731251](https://github.com/Taylan789/MobilyaCAD/actions/runs/45351731251) all completed successfully. No active CI, QA or AI Developer job was present before the write.
- Added immutable `groupCounts` to `ProjectQuoteRevisionStockSheetGroupComparison`: added, removed, changed and unchanged groups are now explicit. The counters are derived from the sorted union of validated stable group IDs; unchanged groups remain omitted from `groupChanges`.
- Added regression assertions for the existing changed/removed/added fixture and a separate identical-revision fixture requiring two unchanged groups, zero change records and a frozen count object.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [511796f60b5274ee8cacf93a85f5ef1944f8df66](https://github.com/Taylan789/MobilyaCAD/commit/511796f60b5274ee8cacf93a85f5ef1944f8df66). CI [#45352730741](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730741) and QA [#45352730704](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730704) passed; QA reported 218/218 unit tests and 713/713 domain tests, strict domain type-check, lint (34 warnings/0 errors), production build and production dependency audit (0 vulnerabilities). Pages [#45352730829](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730829) passed its exact-SHA CI/QA gate, site build, artifact upload and deployment.
- Known constraints: no frontend, comparison JSON/CSV adapter, benchmark, machine-specific CNC output, secret/setting or `main` changes. The integration/performance branch search returned no matching specialist branch; AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed with OpenRouter free-model daily quota HTTP 429 and its specialist job was skipped. JSON/CSV adapter work remains deferred to that owner.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployed from verified code/test SHA 511796f60b5274ee8cacf93a85f5ef1944f8df66 via Pages #45352730829.
- Next domain slice: expose stable changed-field reasons for matched stock-sheet groups so downstream consumers can distinguish price, sheet count, Part provenance and source-reference changes without re-deriving them.


## 24 Kasım 2026 11:33 TRT — DOM-143B2 alan bazlı levha grubu farkları (VERIFIED)

- Base dev/github-work HEAD: 111e91257d7f72e70ffb6503900d68131e879006; write preflight re-read confirmed the same branch HEAD and all target blob SHAs before creating the code/test commit.
- Implementation commit: [a294cb7bd2bd2546f7c2e10e9464f64c2b13d182](https://github.com/Taylan789/MobilyaCAD/commit/a294cb7bd2bd2546f7c2e10e9464f64c2b13d182).
- Changed files: domain/production/projectQuoteRevision.ts; domain/production/projectQuoteRevision.test.mjs; docs/production-domain-contract.md; AI_COORDINATION.md; PRODUCT_ROADMAP.md; AI_PROGRESS.md.
- Exact-SHA CI [#45357651839](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651839): success (frontend production build and lint).
- Exact-SHA QA [#45357651760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651760): success — 218/218 unit tests, 713/713 domain tests, strict domain type-check, lint 34 warnings/0 errors, production build, production dependency audit found 0 vulnerabilities.
- Exact-SHA Pages [#45357651858](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651858): success — build, exact-commit CI/QA gate and GitHub Pages deployment all completed.
- Domain result: each changed stock-sheet group exposes ordered changedFields for sourcePartIds, sheetCount, pricePerSheetMinor, stockSheetCostMinor and sourceReference. Added/removed groups expose []; material/thickness identity changes remain explicit remove/add records. The immutable result contract is preserved.
- Known constraints: no frontend/**, JSON/CSV adapter, benchmark, CNC/machine output, secrets/settings or main changes. Integration/performance specialist branch was not found; INT-002/PERF-001 remain specialist-owned. AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed with OpenRouter free-model daily quota HTTP 429 and its specialist job was skipped; no retry or paid fallback was attempted because the daily limit was exhausted until 25 November 2026 03:00 TRT.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployed from exact verified commit a294cb7 via Pages #45357651858.
- Next: DOM-143C-domain — integrate the validated stock-sheet comparison primitive into the full revision-comparison envelope with fail-closed behavior, while keeping JSON/CSV adapter files outside this domain lane.


## 24 Kasım 2026 12:09 TRT — DOM-143C-domain implementation (verification pending)

- Base `dev/github-work` HEAD: `c9e8a2bfc828d11e1203610710fea9023aef9dc4`; exact-SHA base CI [#45357879265](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357879265), QA [#45357879360](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357879360) and Pages [#45357879321](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357879321) were successful. The test site was deployed from this base SHA.
- Implemented optional immutable `stockSheetGroupComparison` on the full `compareProjectQuoteRevisions` envelope whenever either revision uses explicit stock-sheet purchase basis. Top-level currency, grand totals and category deltas come from the validated group comparison and are reconciled again.
- Preserved line-level changes independently; valid empty stock-only quote summaries now return an empty line-change list without synthetic cost lines. Legacy/non-stock comparisons omit the optional property and retain their previous shape.
- Added two regression tests for mixed stock-group + hardware line changes and stock-only empty quote revisions. No adapter or adapter-owned test files changed; JSON/CSV strict schemas remain fail-closed for this additive field.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [cdc483f33bd2c83b5f63842870c2ecdd470e9307](https://github.com/Taylan789/MobilyaCAD/commit/cdc483f33bd2c83b5f63842870c2ecdd470e9307). QA correction commits: [6037bb2c](https://github.com/Taylan789/MobilyaCAD/commit/6037bb2c4b1e22330bedab90fd0c1bc2c90d6b7a) and [0c75f4b1](https://github.com/Taylan789/MobilyaCAD/commit/0c75f4b1e3a1008df2e4bad688b1527bc15b74d3).
- Final exact-SHA CI [#45364406712](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406712), QA [#45364406673](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406673), and Pages [#45364406852](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406852) all passed. QA: 218/218 unit + 715/715 domain tests, strict TypeScript, lint, production build, production audit 0 vulnerabilities.
- AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed because OpenRouter free-model daily quota returned HTTP 429 (limit 50, remaining 0; reset 25 November 2026 03:00 TRT); integration/performance specialist job was skipped. No retry, paid fallback, secret or quota setting was changed. No specialist branch/PR was verified.
- Test site deployed from the final verified SHA: https://taylan789.github.io/MobilyaCAD/ — Pages [#45364406852](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406852).
- Next: verify this commit, then keep JSON/CSV round-trip work with the integration/performance owner; continue with a separate domain-only cross-revision provenance task.


## 24 Kasım 2026 12:09 TRT — DOM-143C-domain QA correction (verification pending)

- Initial implementation commit: [cdc483f33bd2c83b5f63842870c2ecdd470e9307](https://github.com/Taylan789/MobilyaCAD/commit/cdc483f33bd2c83b5f63842870c2ecdd470e9307).
- Exact-SHA CI [#45363669819](https://github.com/Taylan789/MobilyaCAD/actions/runs/45363669819) passed. QA [#45363669828](https://github.com/Taylan789/MobilyaCAD/actions/runs/45363669828) failed with **713/715 domain tests**: the new mixed fixture has a labor line, not a hardware line; the project-file integration assertion still expected the former blocked result. No production behavior failure was reported in the test log.
- Pages [#45363669878](https://github.com/Taylan789/MobilyaCAD/actions/runs/45363669878) built the site artifact but the exact-SHA CI/QA gate failed and deployment was skipped. The failed SHA was not deployed.
- Correction: update the mixed regression to mutate/reconcile its actual labor line and update the project-file round-trip assertion to require the ready stock-sheet group comparison. No tests removed or weakened; production source remains unchanged.
- Correction files: `domain/production/projectQuoteRevision.test.mjs`, `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Correction commit SHA and exact-SHA CI/QA/Pages: pending.


## 24 Kasım 2026 12:09 TRT — DOM-143C-domain second QA correction (verification pending)

- Correction commit [6037bb2c4b1e22330bedab90fd0c1bc2c90d6b7a](https://github.com/Taylan789/MobilyaCAD/commit/6037bb2c4b1e22330bedab90fd0c1bc2c90d6b7a) passed CI [#45364042394](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364042394).
- QA [#45364042088](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364042088) reported 714/715 domain tests passing. The only remaining failure was a fixture-source mismatch: the test updated quoteSummary labor totals but not the matching materialCostBasis labor category total. The project-file ready assertion and labor-line selection now pass.
- Pages [#45364042077](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364042077) built successfully but correctly skipped deployment because the exact-SHA QA gate failed.
- Fix updates the materialCostBasis labor category by the same calculated line delta; no production code or test assertions were weakened.
- Next correction commit and exact-SHA CI/QA/Pages verification: pending.


## 24 Kasım 2026 12:09 TRT — DOM-143C-domain VERIFIED

- Final code/test SHA: [0c75f4b1e3a1008df2e4bad688b1527bc15b74d3](https://github.com/Taylan789/MobilyaCAD/commit/0c75f4b1e3a1008df2e4bad688b1527bc15b74d3).
- Exact-SHA CI [#45364406712](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406712) passed: TypeScript production build and lint.
- Exact-SHA QA [#45364406673](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406673) passed: 218/218 unit + 715/715 shared-domain tests, strict domain TypeScript, lint, production build and production dependency audit (0 production vulnerabilities).
- Exact-SHA Pages [#45364406852](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406852) passed its CI/QA gate, site build, artifact upload and deployment. Test site: https://taylan789.github.io/MobilyaCAD/.
- QA history: initial implementation cdc483f had two stale test expectations; 6037bb2 corrected those but exposed one materialCostBasis fixture-total mismatch; 0c75f4b reconciled both independent total sources. The failed intermediate SHAs were not deployed; no assertions were weakened.
- Remaining constraints: JSON/CSV comparison serializers still reject the additive nested group-comparison field by design; adapter schema/round-trip remains specialist-owned. No integration/performance specialist branch or PR was verified. Build continues to warn that the main JS bundle is about 1.69 MB (gzip about 473 kB), so measured code splitting remains a performance follow-up.
- No frontend, adapter/performance-owned files, CNC output, secrets/settings or main changes. AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed on OpenRouter free-model daily HTTP 429; reset is 25 November 2026 03:00 TRT; no retry or paid fallback.
- Next: verify a real specialist branch/PR before JSON/CSV schema integration; continue domain-side cross-revision source-map and stock-sheet Part reconciliation without touching adapter files.


## 24 Kasım 2026 13:26 TRT — DOM-144 stock-sheet Part ownership (verification pending)

- Base branch HEAD: `d05ae40622f277e3ec2c9ba67615b72d43a65a0f`; the branch and all six target blob SHAs were re-read immediately before authoring. No queued/in-progress Actions run existed on `dev/github-work`.
- Added `stockSheetPartCounts` and deterministic `stockSheetPartChanges` to the stock-sheet group comparison. Part IDs moved between material/thickness groups now retain identity with explicit from/to group IDs; unchanged Parts remain count-only.
- Added a three-revision regression that checks the source-map audit's per-revision and project-wide unique Part counts, then compares r1→r2 and r2→r3 for added, removed, moved and unchanged Parts. Counts reconcile to both revision snapshots; input remains immutable.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [65060046d16c3e93fbc3cf40e58295ffec64ae4f](https://github.com/Taylan789/MobilyaCAD/commit/65060046d16c3e93fbc3cf40e58295ffec64ae4f).
- Exact-SHA CI [#45375791634](https://github.com/Taylan789/MobilyaCAD/actions/runs/45375791634) passed. QA [#45375791806](https://github.com/Taylan789/MobilyaCAD/actions/runs/45375791806) passed 715/716 shared-domain tests; the sole failure was the new fixture's expected unchanged count (actual 3, expected 2).
- Pages build completed, but its exact-SHA gate failed and deployment was skipped [#45375791704](https://github.com/Taylan789/MobilyaCAD/actions/runs/45375791704). The failed implementation SHA was not published.
- Base SHA checks were successful before this change: CI [#45366454894](https://github.com/Taylan789/MobilyaCAD/actions/runs/45366454894), QA [#45366455124](https://github.com/Taylan789/MobilyaCAD/actions/runs/45366455124), Pages [#45366454872](https://github.com/Taylan789/MobilyaCAD/actions/runs/45366454872). Test site base: https://taylan789.github.io/MobilyaCAD/.
- AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed with OpenRouter free-model daily HTTP 429; its integration/performance specialist job was skipped. No specialist branch/PR was found; no rerun, paid fallback, secret or quota setting was changed. Provider reset reported as 25 November 2026 03:00 TRT.
- Known limits: stock-sheet Part IDs are persisted source-group provenance, not proof of completeness against the current project Part snapshot. JSON/CSV comparison adapters remain fail-closed and specialist-owned; no frontend, adapter, benchmark, CNC/machine, secrets/settings or `main` changes.
- Next: exact-SHA CI/QA/Pages verification; then DOM-145 history-size/performance and fail-closed import/export boundaries.


## 24 Kasım 2026 13:27 TRT — DOM-144 VERIFIED

- Root cause: the three-revision fixture's r1→r2 transition retains three Parts in the same group (part-a, part-c and part-stay); the expected unchanged count was incorrectly set to two. The production result was correct and its from/to reconciliation passed.
- Corrected only the regression expectation to 3. No production code changed, and no test was removed or weakened.
- Correction commit: [90523051fafadda9001e7ad405628b5a63e8ff8e](https://github.com/Taylan789/MobilyaCAD/commit/90523051fafadda9001e7ad405628b5a63e8ff8e). Exact-SHA CI [#45376004983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004983), QA [#45376004882](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004882) and Pages [#45376005022](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376005022) all passed. QA: 221/221 unit + 716/716 domain; strict TypeScript, lint, production build and production audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. The initial 65060046 SHA was not deployed because one expected-count assertion failed; correction changed only the expected unchanged count from 2 to 3.
- Next: verify the correction SHA; only after CI, QA and production build gates pass may Pages deploy the updated test site.


## DOM-144 VERIFIED — 24 Kasım 2026 13:27 TRT

- Final correction commit: [90523051fafadda9001e7ad405628b5a63e8ff8e](https://github.com/Taylan789/MobilyaCAD/commit/90523051fafadda9001e7ad405628b5a63e8ff8e).
- Exact-SHA CI [#45376004983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004983), QA [#45376004882](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004882) and Pages [#45376005022](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376005022) all completed successfully.
- QA: 221/221 unit + 716/716 shared-domain tests; strict domain TypeScript, lint, production build and production dependency audit passed (0 production vulnerabilities).
- Test site deployed from the verified correction SHA: https://taylan789.github.io/MobilyaCAD/.
- Initial 65060046 implementation SHA had one test-only expectation error (three unchanged Parts, not two); it was not deployed. The correction commit changed only that expected count, with no test weakening.
- No frontend, JSON/CSV adapter, benchmark-owned file, CNC/machine output, secrets/settings or `main` changes.
- Next: DOM-145 history-size/performance bounds and fail-closed import/export limits; specialist-owned JSON/CSV group serializers remain blocked until a real specialist branch/PR is verified.


## 24 Kasım 2026 14:45 TRT — DOM-145 VERIFIED

- Base `dev/github-work` HEAD: `0450f958928183ed98b8014b6e9488d58fc3fb06`; current base CI #45377173510, QA #45377173553 and Pages #45377173673 were successful before this change. No queued/in-progress run existed on the owned branch; the AI Developer run was inactive and its free-model quota failure was left untouched.
- Added a shared 2,000-revision maximum to `validateProjectQuoteRevisionHistory`; the count is rejected before per-revision snapshot validation, and all callers (including project-v2 history reads/appends) inherit the same fail-closed rule.
- Added a 1 MiB UTF-8 byte limit to standalone quote-history JSON parse/serialize. Parsing rejects oversized input before `JSON.parse`; oversized serialization returns `json: null`; no truncation or partial history is emitted.
- Added regressions for the 2,001-revision boundary and a multi-byte UTF-8 payload whose JavaScript string length remains below 1 MiB while encoded bytes exceed it.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `domain/production/projectQuoteRevisionFile.ts`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [ea8d1d6dbb25c9737347c66a357981c56a505cbc](https://github.com/Taylan789/MobilyaCAD/commit/ea8d1d6dbb25c9737347c66a357981c56a505cbc). Exact-SHA CI [#45388338099](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338099) passed; exact-SHA QA [#45388338060](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338060) passed; exact-SHA Pages [#45388338056](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338056) passed and deployed the same SHA. No local test runner was available in this automation; Actions is authoritative.
- QA evidence: 225/225 frontend unit tests and 718/718 shared-domain tests passed; strict shared-domain TypeScript, lint (34 warnings/0 errors), production build and production dependency audit (0 vulnerabilities) passed. The new revision-count and multi-byte UTF-8 regressions both passed.
- Known limits: no automatic history pruning/archive, no schema version bump, no frontend changes, no JSON/CSV comparison adapter or benchmark files changed. The 1 MiB guard applies to the standalone history JSON file; project-v2 embedded history inherits the 2,000 revision count guard through the shared validator.
- Test site: https://taylan789.github.io/MobilyaCAD/ — deployed from exact verified code/test SHA `ea8d1d6dbb25c9737347c66a357981c56a505cbc` via Pages [#45388338056](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338056).
- Next: DOM-146 revision-chain import/restore linkage audit; keep stock-sheet comparison JSON/CSV serialization with a verified specialist owner only.


## 24 Kasım 2026 15:39 TRT — DOM-146 VERIFIED

- Base `dev/github-work` HEAD: `366a2727976c658a7585607ba9eb8125061aec92`; branch HEAD ve beş hedef dosyanın blob SHA'ları yazma öncesinde yeniden okundu. Bu sırada sahip olunan dalda queued/in-progress Actions run bulunmadı.
- DOM-145 exact-SHA CI #45388338099, QA #45388338060 ve Pages #45388338056 başarılıydı; güncel base SHA 366a272 için CI #45388615961, QA #45388616004 ve Pages #45388616015 de başarılı.
- Import ve project-v2 restore yolları zaten ortak domain geçmiş doğrulayıcısını kullanıyor; üretim davranışını değiştirmek yerine eksik uçtan uca regresyon kanıtı eklendi. İki yeni test, kopuk `previousRevisionId` zincirini ve snapshot `lineSources[].costLineId` bozulmasını hem standalone import hem proje geri yükleme sırasında reddeder; hiçbirinde kısmi geçmiş/proje dönmez ve hedef girdi değişmez.
- Değişen dosyalar: `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [b0bf259cb5b68b61ad69f3c2bb4ba6963cac3992](https://github.com/Taylan789/MobilyaCAD/commit/b0bf259cb5b68b61ad69f3c2bb4ba6963cac3992). Exact-SHA CI [#45396661732](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661732), QA [#45396661870](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661870) ve Pages [#45396661726](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661726) başarılı; Pages aynı SHA'yı deploy etti.
- Bilinen sınırlar: frontend/**, JSON/CSV comparison adapter, benchmark, CNC/makine çıktısı ve main dalı değiştirilmedi. Integration/Performance uzman dalı bulunmadı; PERF-001/INT-002 uzman sahipliğinde kalıyor. AI Developer #45338253254 OpenRouter free-model daily HTTP 429 nedeniyle başarısız; uzman job atlandı, ücretli fallback veya kota/secrets değişikliği yapılmadı.
- QA kanıtı: 225/225 frontend unit + 720/720 domain test; strict domain TypeScript, lint 34 warnings/0 errors, production build ve production dependency audit (0 vulnerabilities) başarılı. İki yeni import/restore bağlantı regresyonu geçti.
- Test sitesi: https://taylan789.github.io/MobilyaCAD/ — exact verified SHA b0bf259 üzerinden Pages [#45396661726](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661726) ile deploy edildi.
- Sonraki görev: DOM-147 project-v2 append derin kopya/immutability sınırı; uzman adapter işleri için gerçek branch/PR kanıtını bekle.

## 24 Kasım 2026 16:32 TRT — DOM-147 implementation (verification pending)

- Base `dev/github-work` HEAD: `ba2d0f263b4310a29bd5b5523de83789fce7feb0`. Branch HEAD ve altı hedef dosyanın blob SHA'ları yazma öncesinde yeniden okundu; owned branch üzerinde queued/in-progress Actions run bulunmadı.
- Base SHA CI [#45396997065](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396997065), QA [#45396997090](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396997090) ve Pages [#45396997357](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396997357) başarılıydı. QA kanıtı: 225/225 frontend + 720/720 domain test, strict TypeScript, lint 34 warning/0 error, production build ve production dependency audit 0 vulnerability.
- DOM-147, `appendProjectQuoteRevisionToProjectFile` için import yolunda zaten kullanılan `cloneAndFreezeProjectEnvelope` sınırını uygular. Başarılı append nested project verisini girişten ayırır ve dondurur; cyclic/non-JSON envelope `blocked` döner.
- Yeni regresyonlar: nested room/furniture/material/custom metadata referans ayrımı ve deep-freeze; non-JSON/cyclic envelope için `project: null`, `history: null`, input immutability.
- Değişen dosyalar: `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFileImportImmutability.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [61184f659213ce56b2e4c7c961ba58f963366f4d](https://github.com/Taylan789/MobilyaCAD/commit/61184f659213ce56b2e4c7c961ba58f963366f4d). Exact-SHA CI [#45405142317](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142317), QA [#45405142329](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142329) ve Pages [#45405142314](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142314) successful; Pages aynı SHA'yı https://taylan789.github.io/MobilyaCAD/ adresine deploy etti.
- QA kanıtı: 225/225 frontend unit + 722/722 domain test; iki DOM-147 regresyonu geçti; strict TypeScript, lint 34 warnings/0 errors, production build ve production dependency audit (0 vulnerabilities) başarılı. CI build/lint ve Pages build/deploy de başarılı. Yerel test runner kullanılmadı; Actions authoritative doğrulama kaynağıdır.
- Bilinen sınırlar: frontend/**, JSON/CSV comparison adapter, benchmark, CNC/makine çıktısı ve `main` değiştirilmedi. Integration/Performance specialist branch/job doğrulanmadı; INT-002/PERF-001 uzman sahipliğinde kalıyor. AI Developer #45338253254 OpenRouter free-model günlük kotası HTTP 429 nedeniyle başarısız; kota reseti bekleniyor, rerun/ücretli fallback/secrets değişikliği yapılmadı.
- Sonraki görev: DOM-148 adversarial project-envelope JSON sınır testleri; ardından yalnızca gerçek uzman sahipliği ve round-trip kanıtı geldiğinde DOM-143C-json/INT-002 adapter işi.


## 24 Kasım 2026 17:37 TRT — DOM-148 VERIFIED

- Base `dev/github-work` HEAD: `7f050c53ca1d68394280fa488bc6f1335be8e438`; implementation commit: [7f050c53ca1d68394280fa488bc6f1335be8e438](https://github.com/Taylan789/MobilyaCAD/commit/7f050c53ca1d68394280fa488bc6f1335be8e438).
- Exact-SHA CI [#45415951229](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951229), QA [#45415951209](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951209) and Pages [#45415951415](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951415) all succeeded.
- QA: 228/228 frontend unit tests and 726/726 shared-domain tests passed; all four DOM-148 regressions passed. Strict domain TypeScript, lint (34 warnings / 0 errors), production build and production dependency audit (0 vulnerabilities) passed.
- Test site deployed from the exact verified implementation SHA: https://taylan789.github.io/MobilyaCAD/.
- Changed files: `domain/production/projectQuoteRevisionProjectFileImportImmutability.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Production behavior and JSON schema were unchanged; no tests were removed/weakened. No frontend, adapter/performance-owned file, CNC/machine output, secrets/settings or `main` changes.
- Known limits: specialist Integration/Performance branch/PR remains unverified; INT-002/PERF-001 remain specialist-owned. AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed on OpenRouter free-model daily HTTP 429; no rerun or paid fallback was used.
- Next: DOM-149 — assess project-envelope size/depth resource guards without changing the standalone-history 1 MiB limit.


## 24 Kasım 2026 19:40 TRT — DOM-150 VERIFIED

- Base `dev/github-work` HEAD: `7647af2e293ffa7acd76535915e435a5ce49f954`; base exact-SHA CI [#45433287316](https://github.com/Taylan789/MobilyaCAD/actions/runs/45433287316), QA [#45433287250](https://github.com/Taylan789/MobilyaCAD/actions/runs/45433287250) ve Pages [#45433287402](https://github.com/Taylan789/MobilyaCAD/actions/runs/45433287402) başarılıydı; branch üzerinde aktif run yoktu.
- Read API'deki boşluk: `readProjectQuoteRevisionHistoryFromProjectFile` yalnızca üst seviye v2 format/projectId ve history alanını doğruluyor, tam proje zarfına DOM-149 kaynak limitlerini uygulamıyordu.
- Uygulama: public read, history validation öncesinde aynı 16 MiB UTF-8 / 64-level resource guard'ını çalıştırır. Append/import, zaten `cloneAndFreezeProjectEnvelope` ile doğrulanmış immutable clone üzerinde internal helper kullanır; gereksiz tekrar taraması yapılmaz. Yeni append/import sonucu için son envelope guard korunur.
- Yeni testler: exact 16 MiB read kabulü; +1 byte read block; exact 64-level kabulü; 65-level block; JSON v1 legacy read preservation; accessor getter'ın çağrılmaması ve kaynak değişmezliği.
- Implementation commit: [36d38aec](https://github.com/Taylan789/MobilyaCAD/commit/36d38aec3199a2b76f9397bcfb4a30bd9b20fe84). Changed files: `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFileResourceLimits.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Exact-SHA CI [#45441047955](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047955) passed; QA [#45441047792](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047792) passed: 239/239 frontend unit + 733/733 domain tests; strict domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit (0 vulnerabilities) passed.
- Exact-SHA Pages [#45441047926](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047926) passed its CI/QA gate, site build, artifact upload and deployment. Test site: https://taylan789.github.io/MobilyaCAD/.
- Known limits: no separate restore API exists; current import function already checks target and merged envelope. Full project schema validation remains the main parser's responsibility. No frontend, JSON/CSV adapter, benchmark, CNC/machine, secrets/settings or `main` changes.
- Latest AI Developer [#45338253254](https://github.com/Taylan789/MobilyaCAD/actions/runs/45338253254) failed due OpenRouter free-model daily HTTP 429 (limit 50, remaining 0); specialist job skipped. No rerun or paid fallback.
- Next: DOM-151 — verify the full project parser/save-load path preserves quote history and unknown envelope metadata without changing JSON v1 compatibility.


## 24 Kasım 2026 21:04–21:15 TRT — DOM-151 DOMAIN SLICE VERIFIED

- Base dev/github-work HEAD: c2c8602d0726b60ffad5e3007633c3f598f0793c; base exact-SHA CI #45452648538, QA #45452648463 ve Pages #45452648316 başarılıydı; base SHA üzerinde aktif CI/QA/Pages yoktu.
- Implementation commit: [748d9aa4c2101d62fb137532b4d2408ec9193900](https://github.com/Taylan789/MobilyaCAD/commit/748d9aa4c2101d62fb137532b4d2408ec9193900). Yeni domain test dosyası, production-domain contract, roadmap, coordination board ve progress kaydı eklendi.
- İlk QA #45456898652, 733/734 domain test ile başarısız oldu: fixture'ın quote snapshot sonucu empty idi, test ready bekliyordu. CI #45456898432 başarılıydı; Pages #45456898370 exact-SHA gate nedeniyle başarısız oldu ve bu SHA yayınlanmadı. Log incelendi; test fixture'ına açık quote adjustment eklendi.
- Correction commit: [640dbf51c225b5595fa7c706901f4749bc8cc138](https://github.com/Taylan789/MobilyaCAD/commit/640dbf51c225b5595fa7c706901f4749bc8cc138). Testler silinmedi veya gevşetilmedi.
- Final exact-SHA CI [#45457153776](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153776), QA [#45457153728](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153728) ve Pages [#45457153747](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153747) başarılı. QA: 242/242 frontend + 735/735 domain; DOM-151 JSON v2 2→3 revision, unknown metadata ve own __proto__ round-trip ile v1 legacy testleri geçti; strict TypeScript, lint 36 uyarı/0 hata, production build ve audit 0 açık production vulnerability.
- Test sitesi exact-SHA Pages deployment ile https://taylan789.github.io/MobilyaCAD/ adresine güncellendi. Bu domain/test/dokümantasyon dilimi görünür frontend tasarımını değiştirmez.
- Bilinen sınır: frontend/src/engine/projectFile.ts halen JSON v1 parser/serializer; v2 quote history ve unknown top-level metadata editörün save/open akışına henüz bağlı değil. frontend/** UI sahibinde; INT-003 UI-owned handoff olarak READY. Tam uygulama save/load entegrasyonu tamamlandı iddiası yok.
- AI Developer [#45450013010](https://github.com/Taylan789/MobilyaCAD/actions/runs/45450013010) OpenRouter free-model daily quota HTTP 429 (limit 50, remaining 0) ile başarısız; log reset zamanını 25 Kasım 2026 03:00 TRT olarak verdi. Kota tükenmişken rerun yapılmadı; ücretli fallback, secret veya kota ayarı değiştirilmedi.
- Integration/Performance job .github/workflows/ai-developer.yml içinde if: false; uzman branch/PR bulunamadı. INT-002/PERF-001 uzman sahipliğinde kaldı. No frontend, adapter, benchmark, CNC/machine, secrets/settings or main changes.
- Next: INT-003 UI-owned v2 project parser/save/open integration; then DOM-152 exact editor save/reopen round-trip. INT-002/PERF-001 and QA-003 remain specialist/QA-owned.

## 24 Kasım 2026 23:31 TRT — DOM-152 VERIFIED

- Base `dev/github-work` HEAD: `c3700e533791b6dacce0e58aea236bab82bcccc3`; implementation commit: [dd8061718c88b2e0ddad2f6994a64a3362c88726](https://github.com/Taylan789/MobilyaCAD/commit/dd8061718c88b2e0ddad2f6994a64a3362c88726).
- Write-time preflight re-read the owned branch and all six target blob SHAs; no queued/in-progress Actions run existed. No frontend, adapter, benchmark, CNC/machine, secrets/settings or `main` changes.
- `inspectProjectEnvelope` previously read `format`, `formatVersion` and `projectId` directly, which could execute own or inherited accessors before the later JSON descriptor validator rejected the envelope. It now accepts only own, enumerable data descriptors for those discriminator fields.
- Added six regressions across read and append entry points: own and inherited accessors for all three discriminator fields. All assert zero getter calls, blocked status and no partial project/history.
- Exact-SHA CI [#45482452559](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452559) passed. Exact-SHA QA [#45482452470](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452470) passed: 245/245 frontend unit + 737/737 shared-domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit (0 vulnerabilities).
- Exact-SHA Pages [#45482452461](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452461) passed its CI/QA gate, site build, artifact upload and deployment. Test site: https://taylan789.github.io/MobilyaCAD/.
- Known performance note: production build still reports a 1.69 MB minified JS entry chunk (>500 kB warning); no bundle split or viewport profiling was attempted in this domain security slice. INT-002/PERF-001 remain specialist-owned; no `agent/integration-performance-*` branch was found. AI Developer [#45450013010](https://github.com/Taylan789/MobilyaCAD/actions/runs/45450013010) remains blocked by OpenRouter free-model daily HTTP 429 until 25 November 2026 03:00 TRT; no rerun, paid fallback, secret or quota change.
- INT-003 remains UI-owned: [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206) is still draft and not mergeable; its scope is limited to `frontend/src/engine/projectFile.ts` and `frontend/tests/projectFileV2Envelope.test.mjs`. This domain commit does not claim editor save/open v2 integration is complete.
- Next: INT-003 UI parser/save/open integration; then DOM-153 exact editor v2 append/save/reopen/append round-trip. No manual user test is required for this domain slice; exact-SHA Actions are authoritative.


## 25 Kasım 2026 00:54 TRT — DOM-154 implementation (verification pending)

- Base dev/github-work HEAD: c18830a08e9958b967acec179eedd0e8e28307d0. Write-time preflight re-read the branch HEAD, current target blob SHAs and Actions state; no active AI Developer or QA run existed.
- Code change: validateProjectQuoteRevisionHistory, createProjectQuoteRevision and appendProjectQuoteRevision now copy unknown inputs through own enumerable data descriptors before reading fields. Object copies use null prototypes so inherited getters cannot supply missing optional values.
- Regressions cover own top-level, inherited top-level, nested snapshot, direct create and append accessors; every getter call count must remain zero and each operation must return blocked without partial history.
- Changed files: domain/production/projectQuoteRevision.ts, domain/production/projectQuoteRevision.test.mjs, docs/production-domain-contract.md, PRODUCT_ROADMAP.md, AI_COORDINATION.md, AI_PROGRESS.md.
- First implementation commit [6ecde75](https://github.com/Taylan789/MobilyaCAD/commit/6ecde75d272e7337b7f73b6955eacf1e96d64594) passed exact-SHA CI [#45496632246](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632246), QA [#45496632307](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632307) and Pages [#45496632088](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632088); QA 245/245 frontend + 738/738 domain.
- Known limits: this does not prevent JavaScript Proxy reflection traps; it rejects accessor descriptors, custom prototypes, symbols, non-enumerable fields, sparse arrays, cycles, non-finite numbers and depth above 64 total object/array levels. No frontend, adapter, benchmark, CNC/machine, secrets/settings or main changes.
- AI Developer run [#45450013010](https://github.com/Taylan789/MobilyaCAD/actions/runs/45450013010) failed after retry with OpenRouter free-tier daily HTTP 429 (limit 50, remaining 0; reset 25 November 2026 03:00 TRT). The failed job log was inspected; no rerun or paid fallback was attempted before reset. Integration/Performance job is disabled in the workflow and no specialist branch was found.
- Next: UI-owned INT-003 parser/save/open integration remains in draft PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206); then DOM-153 editor save/reopen round-trip. INT-002/PERF-001 remain specialist-owned and QA-003 remains blocked.


## 25 Kasım 2026 01:02 TRT — DOM-154 boundary correction (verification pending)

- Prior implementation [6ecde75](https://github.com/Taylan789/MobilyaCAD/commit/6ecde75d272e7337b7f73b6955eacf1e96d64594) passed exact-SHA CI [#45496632246](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632246), QA [#45496632307](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632307) and Pages [#45496632088](https://github.com/Taylan789/MobilyaCAD/actions/runs/45496632088). QA: 245/245 frontend + 738/738 domain tests; strict domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit (0 vulnerabilities).
- Review found two boundary details before finalizing: the depth counter needed to count the root as level 1, and the internal normalized revision input needed an own optional sourceIntegrityVersion property even when undefined.
- Correction sets the exact boundary to 64 total object/array levels and adds regressions for 64/65 levels plus an Object.prototype getter on the omitted optional marker.
- Boundary correction commit [f5d8581](https://github.com/Taylan789/MobilyaCAD/commit/f5d8581d9dd250dacd410136a0755d693dc18c98) passed exact-SHA CI [#45497019522](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019522), QA [#45497019530](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019530) and Pages [#45497019534](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019534). QA: 245/245 frontend + 740/740 domain; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit (0 vulnerabilities). Test site deployed from the verified correction SHA: https://taylan789.github.io/MobilyaCAD/.


## 25 Kasım 2026 01:06 TRT — DOM-155 VERIFIED

- Base `dev/github-work` HEAD: `2615c058d8b544239b4062e6ec8b4defc606177b`; write preflight re-read the branch HEAD and all six target blob SHAs immediately before creating the commit. No active CI, QA, AI Developer or Pages run was present.
- Domain change: `validateProjectQuoteRevisionHistory` now checks the own enumerable data descriptor for `revisions` and its own array-length descriptor before recursively copying revision entries. Histories above 2,000 are blocked before nested payload traversal; the original post-copy count/schema check remains.
- Regression coverage: exactly 2,000 entries continue to schema validation; 2,001 entries are rejected with the limit diagnostic before a nested accessor is traversed; an accessor-backed `revisions` property is not invoked.
- Changed files: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Exact-SHA CI [#45498324216](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324216), QA [#45498324252](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324252) and Pages [#45498324257](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324257) all succeeded. QA: 245/245 frontend + 740/740 domain tests; strict domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit (0 vulnerabilities). Test site deployed from the verified SHA: https://taylan789.github.io/MobilyaCAD/.
- Known limits: JavaScript Proxy reflection traps are not suppressed; this count preflight does not replace the existing standalone/project-v2 byte guards. No frontend, adapter, benchmark, CNC/machine, secrets/settings or `main` files were changed.
- Next: verify exact-SHA Actions; keep INT-003 with the UI owner, then continue to DOM-153 after editor integration. INT-002/PERF-001 remain specialist-owned.


## 25 Kasım 2026 08:56 TRT — DOM-160 implementation (verified after correction)

- Base `dev/github-work` HEAD: `cdf4b0345cc91a792b11db0b59e04bbca659e13f`; pre-write file SHA checks: code `ee83e1aafd46270fd4d71138e200ae9ac76a2fd4`, test `db174fb234d251a20c8acf7f92cdaf731db899b7`, contract `8837d3821765229691df10478b743c3ed644ba90`, coordination `66e06801892c270e57774beb9d174656b79ec6e9`, roadmap `85191f288f0158545e41feda61ac24dbf79716bd`, progress `53bbac9be17164533e22a41b52b001313f460654`. No active CI, QA, AI Developer or Pages run existed at preflight.
- Domain change: JSON v2 edge-band roll-pricing reads now use own enumerable data descriptors; v2 writes clone/freeze the complete project envelope with the same 16 MiB UTF-8 / 64-level bound as quote-history project envelopes. Pricing input is descriptor-cloned before validation. Nested project metadata no longer aliases the source object.
- Regression coverage added for own/inherited envelope and nested pricing accessors (zero getter calls), Proxy reflection failures (blocked result, no exception escape), deep clone/freeze, own `__proto__` metadata, and 16 MiB/64-depth limits.
- Changed files: `domain/production/projectEdgeBandingRollPricingProjectFile.ts`, `domain/production/projectEdgeBandingRollPricingProjectFile.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- First exact-SHA CI [#45557729163](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557729163) succeeded. QA [#45557728923](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557728923) failed 751/752: the Proxy test expected a read-only API to invoke an ownKeys trap it did not need to enumerate. Production code was not weakened; the test now checks descriptor-trap failures on read/write and ownKeys-trap failure on write. Pages [#45557728945](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557728945) failed its exact-SHA QA gate; this SHA was not deployed. Physical CNC/roll supplier validation is not part of this domain safety slice.
- Latest AI Developer run [#45526607336](https://github.com/Taylan789/MobilyaCAD/actions/runs/45526607336) failed with OpenRouter free-tier daily HTTP 429 (limit 50, remaining 0; reset 26 November 2026 03:00 TRT). No rerun or paid fallback was attempted before the published reset; integration/performance specialist job was skipped. INT-003 remains UI-owned in draft [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206); DOM-153 remains dependent on that editor integration.
- Next: verify this exact SHA; keep INT-003 with the UI owner, then implement DOM-153 editor append → save → reopen → append only after the UI handoff is complete.


## 25 Kasım 2026 — DOM-160 QA correction (verified)

- Failed test was isolated from [QA #45557728923](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557728923), job 139013738201: 751/752 domain tests passed. The only failure was a test expectation, not a production regression: the read API checks own descriptors for known fields and does not enumerate unrelated project keys, so an ownKeys-only Proxy trap is not invoked on that read path.
- Correction preserves production behavior and strengthens the test's precision: a getOwnPropertyDescriptor trap must produce blocked for read and write; an ownKeys trap must produce blocked for the full-envelope write clone. No assertion or existing test was removed or relaxed.
- The initial CI [#45557729163](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557729163) passed. Initial Pages [#45557728945](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557728945) failed its exact-SHA QA gate; the unverified SHA was not deployed.
- Test correction commit: [357198f](https://github.com/Taylan789/MobilyaCAD/commit/357198fda15f71ae10aabf0a541174fcd05ebe19). Exact-SHA CI [#45557877841](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877841), QA [#45557878887](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557878887), and Pages [#45557877766](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877766) all succeeded; QA 272 frontend + 752 domain, strict TypeScript, lint 36 warnings/0 errors, production build, production audit 0 vulnerabilities. The verified test-site deployment is https://taylan789.github.io/MobilyaCAD/.

## 25 Kasım 2026 10:53 TRT — DOM-162 implementation (verification pending)

- Base branch: `dev/github-work`; exact pre-write HEAD `fda35c4b61aae9fea128d3eb7b21b359df8bdf51`. Immediately before writes, all six target blob SHAs were re-read and matched; no queued/in-progress Actions run existed.
- Latest verified base evidence: CI [#45571389399](https://github.com/Taylan789/MobilyaCAD/actions/runs/45571389399), QA [#45571389330](https://github.com/Taylan789/MobilyaCAD/actions/runs/45571389330), Pages [#45571389340](https://github.com/Taylan789/MobilyaCAD/actions/runs/45571389340) succeeded on the same SHA. QA: 283/283 frontend + 754/754 domain; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production audit 0 vulnerabilities.
- Domain behavior: quote snapshot request, catalog-version records and material-cost-basis metadata now copy only own enumerable data descriptors into null-prototype records before field reads. Own accessors, symbols, non-enumerable fields and custom prototypes are blocked. Proxy reflection errors are caught and returned as blocked with null quote/snapshot.
- Regressions added: own top-level accessor; inherited Object.prototype pricing-mode getter; nested catalog accessor; nested material-cost-basis accessor; getPrototypeOf/ownKeys/getOwnPropertyDescriptor trap failures; null-prototype request/catalog compatibility.
- Changed files: `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- First implementation commit: [537c447](https://github.com/Taylan789/MobilyaCAD/commit/537c447eedfed46c2c81cadc397e1a23a5713d48). CI passed; QA found one downstream inherited-getter leak (759/760); Pages correctly skipped deployment. No frontend, adapter/performance-owned, CNC/machine, secrets/settings or `main` changes.
- AI Developer [#45526607336](https://github.com/Taylan789/MobilyaCAD/actions/runs/45526607336) failed with OpenRouter free-tier daily HTTP 429 (remaining 0; reset 26 Kasım 2026 03:00 TRT). It was not rerun before reset. Integration/Performance job is disabled in `.github/workflows/ai-developer.yml` and no specialist branch was found. UI-owned INT-003 [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and intentionally unmerged.
- Known limit: nested production reports, price tables, work-item/roll arrays and stock-sheet reports remain validated by downstream domain APIs; this slice does not claim recursive sanitization, Proxy suppression or physical CNC validation.
- Next: verify this exact SHA; then continue INT-003 handoff and DOM-153 only after editor save/open integration is complete.

## 25 Kasım 2026 10:55 TRT — DOM-162 QA correction (verification pending)

- First implementation commit [537c447](https://github.com/Taylan789/MobilyaCAD/commit/537c447eedfed46c2c81cadc397e1a23a5713d48): CI [#45572449314](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572449314) passed; QA [#45572449465](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572449465) failed 759/760 domain tests. One new test proved that an ordinary empty options object still inherited Object.prototype.edgeBandingPricingMode inside the downstream quote calculator.
- Pages [#45572449362](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572449362) built the site but its exact-SHA QA gate failed; deployment was skipped. The failed SHA was not published.
- Correction: both resolved roll options and the internal material-cost-basis request are now null-prototype records. The inherited getter test covers normal quote and material-cost-basis paths. No test/assertion was removed or relaxed.
- Changed files in correction: `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Correction commit: [25f04468](https://github.com/Taylan789/MobilyaCAD/commit/25f044686aa7cbed89ed73d0bd8285a09908fe8e). Exact-SHA CI [#45572928664](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928664), QA [#45572928650](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928650) and Pages [#45572928855](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928855) all passed. No frontend, adapter/performance-owned, CNC/machine, secrets/settings or `main` changes.
- Next: inspect the correction's exact-SHA Actions; publish only after CI, QA and Pages all pass.

## 25 Kasım 2026 11:00 TRT — DOM-162 VERIFIED

- Final code/test correction commit [25f04468](https://github.com/Taylan789/MobilyaCAD/commit/25f044686aa7cbed89ed73d0bd8285a09908fe8e); it includes descriptor-safe request/catalog/material-basis records and null-prototype resolved roll options plus the material-basis internal request.
- The first implementation [537c447](https://github.com/Taylan789/MobilyaCAD/commit/537c447eedfed46c2c81cadc397e1a23a5713d48) passed CI but QA found one real inherited-getter leak in the downstream options object (759/760). That SHA was not deployed. The correction covers both normal and material-cost-basis quote paths; no test was removed or weakened.
- Exact-SHA CI [#45572928664](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928664), QA [#45572928650](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928650) and Pages [#45572928855](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928855) all succeeded. QA: 283/283 frontend + 760/760 domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build, production dependency audit 0 vulnerabilities.
- Test site deployed from verified SHA: https://taylan789.github.io/MobilyaCAD/.
- Changed files: `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- No frontend, adapter/performance-owned file, CNC/machine output, secrets/settings or `main` changes. Nested production reports/tables remain the responsibility of downstream validators; physical production/CNC validation is not claimed.
- Next: UI-owned INT-003 JSON v2 editor save/open integration; then DOM-153 append → save → reopen → append contract. Keep INT-003 PR #206 draft until App.tsx owners complete; specialist INT-002/PERF-001 remains unverified/disabled.


## 25 Kasım 2026 11:23 TRT — DOM-163 implementation (verification pending)

- Base dev/github-work HEAD: 952d485b4992c61426de2380ea96a7fbb3d4e689. Write preflight re-read the branch ref, all six target blob SHAs and Actions state; no active CI, QA, AI Developer or Pages run existed.
- Domain change: stock-sheet purchase report input is now copied through own enumerable data descriptors before any material-cost-basis or quote snapshot consumer reads it. Nested accessors, inherited values, custom prototypes, symbol/non-enumerable fields, sparse/extended arrays, cycles, non-JSON values, oversized depth/node/UTF-8 payload and throwing Proxy reflection traps fail closed.
- The same bounded clone is used by the material-cost calculator and the final snapshot group/provenance projection; the raw nested report is not read again.
- Regressions cover nested group accessor, source Part array index accessor, Object.prototype inherited sheetCount, Proxy prototype reflection failure, depth 64/65 and payload size over 16 MiB. Existing valid stock-sheet and net-consumption snapshot cases remain in the suite.
- Changed files: domain/production/projectQuotePricingSnapshot.ts, domain/production/projectQuotePricingSnapshot.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Implementation commit: [ae76e538](https://github.com/Taylan789/MobilyaCAD/commit/ae76e538fcbd1aa60b22a5d42c602b04e58e4d42). Exact-SHA CI [#45576697914](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697914), QA [#45576697866](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697866) and Pages [#45576697868](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697868) all succeeded. QA: 283/283 frontend + 763/763 domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production-only dependency audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. Build reports main JS chunk 1.698 MB (475 kB gzip) and a Vite >500 kB chunk warning; viewport p95 and memory remain NOT MEASURED.
- No frontend, adapter/performance-owned, CNC/machine, secrets/settings or main changes. UI-owned INT-003 PR #206 remains draft; no specialist agent/integration-performance branch was found.
- Next: inspect exact-SHA Actions, then audit DOM-164 nested quote-adjustment/report inputs without touching UI or adapter ownership.


## 25 Kasım 2026 11:31 TRT — DOM-163 VERIFIED

- Exact implementation commit: [ae76e538](https://github.com/Taylan789/MobilyaCAD/commit/ae76e538fcbd1aa60b22a5d42c602b04e58e4d42).
- CI [#45576697914](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697914) passed. QA [#45576697866](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697866) passed 283/283 frontend + 763/763 domain tests, strict shared-domain TypeScript, lint (36 warnings / 0 errors), production build and production-only audit (0 vulnerabilities).
- Pages [#45576697868](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697868) passed the exact-SHA CI/QA gate and deployed this SHA to https://taylan789.github.io/MobilyaCAD/.
- Build baseline: main JS chunk 1.698 MB (475 kB gzip), CSS 430.45 kB; Vite emitted the existing >500 kB chunk warning. Viewport p95, scene update latency and memory remain NOT MEASURED; 10/10 reliability/performance gate stays unchecked.
- The new regressions prove nested group/sourcePartIds accessors are not invoked, inherited sheetCount cannot supply a missing value, Proxy prototype reflection failures block without escaping, depth 64 is accepted/65 blocked and payload above 16 MiB is blocked. Existing stock-sheet and net-consumption snapshot tests remain green.
- AI Developer [#45526607336](https://github.com/Taylan789/MobilyaCAD/actions/runs/45526607336) remains failed on OpenRouter free-tier daily HTTP 429 (remaining 0; reset 26 Kasım 2026 03:00 TRT); no premature rerun, quota purchase or secret change. Integration/Performance job remains disabled and no specialist branch exists. UI-owned INT-003 [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft; no merge attempted.
- Next: DOM-164 nested quote-adjustment and remaining public quote input boundary audit; UI-owned INT-003 save/open integration stays separate.


## 25 Kasım 2026 15:16 TRT — DOM-166 public quote input boundary

- **Branch:** `dev/github-work` only. Implementation commit: [ca1a3768dad42cf7dec91be5ba6bbeb2c91caab8](https://github.com/Taylan789/MobilyaCAD/commit/ca1a3768dad42cf7dec91be5ba6bbeb2c91caab8). Test expectation correction: [15583066d9f77a243c03a74d083154a826a55439](https://github.com/Taylan789/MobilyaCAD/commit/15583066d9f77a243c03a74d083154a826a55439).
- **Changed files:** `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. The correction commit changed the domain test and coordination/roadmap evidence only. No `frontend/**` files changed.
- **Capability delivered:** `productionReport`, `consumptionPriceTable`, `workItems` and `tariffTable` are copied through own enumerable data descriptors before downstream quote calculators run. The four sources share a 64-depth, 250,000-node and 16 MiB UTF-8 JSON budget. Accessors, inherited-only fields, custom prototypes, sparse/extended arrays, cycles and Proxy reflection failures fail closed without a partial quote.
- **Automated verification:** CI [#45611964638](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964638) success; QA [#45611964676](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964676) success — frontend 294/294 and domain 781/781, shared-domain TypeScript, lint, production build and production dependency audit all passed; Pages [#45611964911](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964911) success for exact SHA `15583066d9f77a243c03a74d083154a826a55439`.
- **Deployment:** https://taylan789.github.io/MobilyaCAD/ — exact-SHA deployment reported success by GitHub Pages.
- **Correction history:** first implementation SHA `ca1a3768` had CI success but QA 779/781 because two new assertions expected `quoteSummary: null` where the existing API correctly returns a blocked summary, and used a mismatched Turkish diagnostic regex. The test expectations were corrected; the first SHA was not deployed. The corrected SHA passed all checks and was deployed.
- **Known constraints:** this boundary accepts JSON-like source inputs only; it does not add price defaults, currency conversion, CNC operations, machine postprocessors or physical-production guarantees. Those remain explicit catalogue/operator inputs and human verification. No UI changes were made.
- **Other agent status:** AI Developer run [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) failed because OpenRouter returned HTTP 429 `free-models-per-day`, limit 50/remaining 0; reset timestamp resolves to 26 Nov 2026 03:00 TRT. No rerun was attempted because the daily quota had not reset and paid credits are not authorized. Integration/performance specialist job was skipped and no `integration-performance` branch was found. UI-owned PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains open/draft and is not owned or merged by this automation.
- **Next:** DOM-167 saved/direct JSON v2 roll quote parity tests; continue to keep INT-003 with the UI agent and PERF-001/INT-002 with the integration/performance owner.

## 25 Kasım 2026 16:39 TRT — DOM-167 VERIFIED

- **Implementation commit:** [45121ab9](https://github.com/Taylan789/MobilyaCAD/commit/45121ab9c96f786d51c65af7976e3ae24cb1f14c).
- **Base:** dev/github-work HEAD 318f72391bd9eac9ac6ff5f26db6b7fe62d98220; no active CI, QA or AI Developer run existed at write preflight. All five target blob SHAs were re-read and matched immediately before creating Git objects.
- **Change:** Added a domain regression comparing direct roll specs/prices against the same values persisted in a MobilyaCAD JSON v2 envelope. The test checks both line-only and net-consumption material-cost-basis snapshot paths.
- **Assertions:** Complete quoteSummary and immutable snapshot equality; grand total; roll count and purchased length; source Part IDs, furniture IDs, plan source reference and price source reference.
- **Changed files:** domain/production/projectQuotePricingSnapshot.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- **Automated verification:** CI [#45626563361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45626563361), QA [#45626563381](https://github.com/Taylan789/MobilyaCAD/actions/runs/45626563381) and Pages [#45626563478](https://github.com/Taylan789/MobilyaCAD/actions/runs/45626563478) all succeeded for exact SHA 0c9bc0d2c77c644a275d5e9b5ed475561f502a22. QA: 297/297 frontend + 782/782 domain tests; strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production-only audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. No local test execution is claimed.
- **Known limits:** No production calculator behavior changed. UI-owned INT-003 editor save/open wiring remains draft in PR #206; the integration/performance workflow specialist job is disabled and no specialist branch was found. AI Developer run #45594366361 failed on OpenRouter free-tier HTTP 429 (50/50 daily requests); paid fallback, secret changes and quota purchase are not authorized. No frontend, adapter/benchmark, CNC/machine, secrets/settings or main files changed.
- **Branch head after evidence update:** 0c9bc0d2c77c644a275d5e9b5ed475561f502a22; implementation/test commit 45121ab9c96f786d51c65af7976e3ae24cb1f14c.
- **Next:** DOM-168 — extend parity to the stock-sheet-purchase material-cost-basis path and reconcile stock-group totals with roll-line Part/price provenance.



## 25 Kasım 2026 17:07 TRT — DOM-168 ilk doğrulama bulgusu ve fixture düzeltmesi

- İlk implementation/test commit: [7fbaa51ff24cb784752428f3afac519196053279](https://github.com/Taylan789/MobilyaCAD/commit/7fbaa51ff24cb784752428f3afac519196053279).
- Exact-SHA CI [#45631251152](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631251152) başarılı. QA [#45631251161](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631251161) domain testlerini 783 çalıştırdı: 782 geçti, yeni DOM-168 fixture'ı eksik tarihli `consumptionPriceList` kimlik/sürüm metadata'sı nedeniyle başarısız oldu.
- Pages [#45631251069](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631251069) build başarılıydı; exact-SHA QA gate başarısız olduğu için deploy atlandı. Başarısız SHA test sitesine yayınlanmadı.
- Kök neden: roll satırı mevcut API'de `production-consumption` kaynak türünde olduğundan snapshot, açık fiyat girdilerinden bağımsız olarak tarihli consumption price-list metadata'sı ister. Fixture mevcut `consumptionPriceList` örneğini kullanacak şekilde düzeltildi; fiyat, kur veya rulo standardı uydurulmadı.
- Düzeltme commit SHA ve exact-SHA Actions sonuçları sonraki doğrulama kaydında eklenecek. Frontend, adapter/performance-owned dosyalar, CNC/makine, secrets/settings ve `main` değiştirilmedi.
- Next: verify the corrected DOM-168 exact-SHA CI, QA, production build and Pages deployment; then DOM-169 — combine stock-sheet + roll material costs with explicit labor/operation and quote-adjustment lines.


## 25 Kasım 2026 17:14 TRT — DOM-168 VERIFIED

- **Implementation/test commit:** [9ff2f0a195c2810b4d8df47d2578e71140d03559](https://github.com/Taylan789/MobilyaCAD/commit/9ff2f0a195c2810b4d8df47d2578e71140d03559). İlk test commit'i [7fbaa51ff24cb784752428f3afac519196053279](https://github.com/Taylan789/MobilyaCAD/commit/7fbaa51ff24cb784752428f3afac519196053279) QA'da 782/783 ile kaldı; tek yeni testte eksik tarihli `consumptionPriceList` metadata'sı bulundu. Bu SHA Pages'e deploy edilmedi.
- **Düzeltme:** Mevcut `consumptionPriceList` metadata fixture'ı kullanıldı. Bu yalnızca katalog kimliği/sürüm/geçerlilik kaydıdır; yeni fiyat, para birimi dönüşümü, rulo ölçüsü veya makine standardı uydurulmadı.
- **Değişen ürün dosyaları:** `domain/production/projectQuotePricingSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. Yalnızca test ve sözleşme/koordinasyon dokümantasyonu değişti; production calculator kaynak kodu değişmedi.
- **Exact-SHA CI:** [#45631529177](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631529177) successful.
- **Exact-SHA QA:** [#45631529133](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631529133) successful — frontend 297/297, domain 783/783; strict shared-domain TypeScript, lint 36 warnings / 0 errors, production build and production-only dependency audit (0 vulnerabilities).
- **Pages:** [#45631528919](https://github.com/Taylan789/MobilyaCAD/actions/runs/45631528919) successful. Deploy log confirms exact SHA `9ff2f0a195c2810b4d8df47d2578e71140d03559` at https://taylan789.github.io/MobilyaCAD/.
- **Regression assertions:** Direct roll lists and saved JSON v2 roll extension produce identical complete quoteSummary and v2 snapshot under `stock-sheet-purchase`. Stock-sheet group Part coverage, sheet/cost/currency totals and price source are checked independently from roll line Part/furniture IDs, roll count, purchased mm, plan reference and price reference. Panel purchase cost remains outside line-level quote to prevent double counting.
- **Known constraints:** UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and intentionally unmerged; its editor startup/new/save/open wiring is still deferred. Integration/Performance specialist job is disabled and no specialist branch was verified. Latest AI Developer [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) remains failed on OpenRouter free-tier HTTP 429; no paid fallback, quota purchase, secret change or premature rerun. Vite main JS bundle remains 1,698.03 kB (475.00 kB gzip); viewport p95/memory remain NOT MEASURED. No frontend, adapter/benchmark, CNC/machine, secrets/settings or `main` files changed.
- **Next:** DOM-169 — verify stock-sheet + roll material costs with explicit labor/operation tariff lines and quote adjustments; then keep INT-003 with the UI owner and DOM-153 dependent on its completed editor integration.


## 25 Kasım 2026 18:53 TRT — DOM-169 implementation submitted; exact-SHA verification pending

- Base: dev/github-work HEAD eb17f0d8a165074a2d35d5e5e1123b35350392c4; write preflight re-read this SHA and all five target blob SHAs. No active CI, QA or AI Developer Actions run existed at preflight.
- Development slice: added a full stock-sheet-purchase + saved/direct JSON v2 roll + labor + operation + explicit waste/profit adjustment integration regression. It independently checks the stock-sheet panel amount, roll line, tariff/source mappings, quote category totals, grand total, no panel double-counting and half-up rounding of a 50.5 minor-unit operation amount to 51.
- Changed files: domain/production/projectQuotePricingSnapshot.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Implementation/test commit: [26294b35](https://github.com/Taylan789/MobilyaCAD/commit/26294b35e00d0d5d57c81a6ca7408b48c995d13d).
- Base SHA evidence: CI #45636714715 passed; QA #45636714549 passed (783 domain tests, 0 failures; strict shared-domain TypeScript, lint 36 warnings / 0 errors, production build, production-only audit 0 vulnerabilities); Pages #45636714784 deployed exact base SHA to https://taylan789.github.io/MobilyaCAD/.
- Exact-SHA CI [#45650070879](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650070879) passed. QA [#45650070989](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650070989) passed: 300/300 frontend + 784/784 domain tests; strict shared-domain TypeScript, lint 36 warnings / 0 errors, production build and production-only dependency audit 0 vulnerabilities. Full install audit still reports 4 moderate findings; no dependency update was made. No local test run is claimed.
- Known constraints: no production calculator source change was necessary; this slice hardens the end-to-end regression contract around existing calculators. UI-owned INT-003 PR #206 and UI PR #227 were not modified or merged. No frontend, adapter, benchmark, CNC/machine, secrets/settings or main changes.
- AI Developer: run #45594366361 failed on OpenRouter free-tier HTTP 429 (50/50 daily quota; reset 26 Nov 2026 03:00 TRT). It was not rerun before reset; no paid fallback, credit purchase or secret/quota change is authorized.
- Integration/Performance: specialist job was skipped and no agent/integration-performance-* branch was found; PERF-001 / INT-002 remain specialist-owned.
- Next: verify exact-SHA CI/QA/Pages; then DOM-170 quote revision snapshot preservation. INT-003 remains UI-owned and DOM-153 waits for its save/open integration.


## 25 Kasım 2026 19:03 TRT — DOM-169 Pages retry outcome

- Documentation evidence commit: [693b6de6](https://github.com/Taylan789/MobilyaCAD/commit/693b6de6abc1098f78e35c68b9725e6de8fedd09); it records the implementation SHA 26294b35 and its exact-SHA CI/QA results.
- Exact-SHA CI [#45650478874](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650478874) succeeded. QA [#45650479011](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650479011) succeeded: 300/300 frontend + 784/784 domain tests; strict shared-domain TypeScript, lint 36 warnings / 0 errors, production build and production-only audit 0 vulnerabilities.
- Pages [#45650478862](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650478862): build and exact-SHA CI/QA verification jobs succeeded, but the deploy job again failed creating the GitHub Pages deployment with HTTP 500 (request ID 5940:F7B88:22888AD:6CFC7AD:6B0706AF). No deployment for 693b6de was published.
- The previous verified test-site deployment remains the 25 November 14:42 UTC deployment from SHA eb17f0d8: [Pages run #45636714784](https://github.com/Taylan789/MobilyaCAD/actions/runs/45636714784), https://taylan789.github.io/MobilyaCAD/.
- A targeted rerun of the failed deploy job was attempted but the GitHub rerun tool returned an internal error. No rerun is claimed; no workflow, secret, environment or Pages setting was changed.
- **Current limitation:** GitHub Pages deployment API is returning server-side HTTP 500 for two consecutive exact-SHA deployments even though CI, QA, build and gate succeed. Product code/tests are verified, but the test site is not updated to the new DOM-169 SHA.
- **Next:** continue DOM-170 domain revision snapshot preservation; retry the Pages deployment only when the GitHub deployment endpoint is available. UI-owned INT-003 and specialist-owned PERF-001 / INT-002 remain untouched.


## 25 Kasım 2026 19:55 TRT — DOM-170 implementation submitted; exact-SHA verification pending

- **Base / preflight:** `dev/github-work` HEAD `dbe63fee4dcc2db5655d1f30505dec5551442099`; all five target file blob SHAs were re-read immediately before creating Git objects. No active CI, QA or AI Developer workflow run existed.
- **Current baseline evidence:** CI [#45655745937](https://github.com/Taylan789/MobilyaCAD/actions/runs/45655745937) and QA [#45655745930](https://github.com/Taylan789/MobilyaCAD/actions/runs/45655745930) passed for exact base SHA dbe63fee; QA 302/302 frontend + 784/784 domain, strict shared-domain TypeScript, lint 36 warnings / 0 errors, production build, production-only audit 0 vulnerabilities. Pages [#45655746021](https://github.com/Taylan789/MobilyaCAD/actions/runs/45655746021) deployed that exact SHA to https://taylan789.github.io/MobilyaCAD/. Bundle: JS 1,698.03 kB (475.00 kB gzip), CSS 437.26 kB (74.44 kB gzip); viewport p95/memory remain NOT MEASURED.
- **DOM-169 closure:** implementation/test [26294b35](https://github.com/Taylan789/MobilyaCAD/commit/26294b35e00d0d5d57c81a6ca7408b48c995d13d) passed exact-SHA CI [#45650070879](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650070879) and QA [#45650070989](https://github.com/Taylan789/MobilyaCAD/actions/runs/45650070989). Its earlier Pages attempt failed HTTP 500, but verified deployed descendant dbe63fee contains 26294b35 in its parent chain; no claim is made that the failed 693b6de deployment succeeded.
- **DOM-170 slice:** added a single end-to-end regression for schemaVersion 2 stock-sheet purchase basis through project append, standalone history serialization/import, JSON stringify/parse restore and a subsequent append. It reconciles material/category/grand totals, preserves stock-group Part/source references and line-source/cost-line mapping, then verifies the two-revision chain, comparison and source-map audit.
- **Changed files:** `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. No production calculator source, frontend, adapter/performance-owned, CNC/machine, secrets/settings or `main` files changed.
- **Verification status:** the DOM-170 commit's exact-SHA CI/QA/Pages results are pending. No local test run is claimed; GitHub Actions are the verification source.
- **Known constraints:** UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains separate; editor startup/save/open wiring is not claimed. Integration/Performance specialist job was skipped and no specialist branch was verified; PERF-001 / INT-002 remain specialist-owned. AI Developer [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) failed on OpenRouter free-model daily HTTP 429; it was not rerun before its 26 November 2026 03:00 TRT reset, and no paid fallback or secret/quota change was made.
- **Next:** inspect exact-SHA CI/QA/Pages; then DOM-171 — reject imported/restored stock-sheet snapshots whose category totals or Part-group coverage have been tampered with, without partial project output.


## 25 Kasım 2026 20:02 TRT — DOM-170 QA fixture correction

- Implementation/test commit [97e83df3](https://github.com/Taylan789/MobilyaCAD/commit/97e83df30aa05bb1d9be3c26413e77c57cdee58e): CI [#45660172685](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660172685) passed; QA [#45660172615](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660172615) failed 784/785 on one new test assertion only. The quote calculator correctly canonicalizes adjustment line IDs to `adjustment-0001` / `adjustment-0002`; the test had incorrectly expected caller-supplied fixture IDs. No production behavior failed.
- Pages [#45660172951](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660172951) built the artifact but its exact-SHA CI/QA gate failed, so deployment was skipped; the failed SHA was not published.
- **Correction:** changed only the new regression's expected canonical line IDs. Source references, waste/profit categories, line-source mapping, stock-sheet basis and total assertions remain intact. No tests were removed/weakened and no production source changed.
- Changed files in correction commit: `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Frontend, adapter/performance-owned, CNC/machine, secrets/settings and `main` remain untouched.
- **Next:** exact-SHA CI/QA/Pages for the corrected commit; only after all gates pass may the test site move from verified base SHA dbe63fee.


## 25 Kasım 2026 20:04 TRT — DOM-170 VERIFIED

- **Corrected implementation/test SHA:** [bab26550](https://github.com/Taylan789/MobilyaCAD/commit/bab26550e0bd28239c0150721ceb2de42af7bba8). Exact-SHA CI [#45660461079](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660461079), QA [#45660461372](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660461372) and Pages [#45660460992](https://github.com/Taylan789/MobilyaCAD/actions/runs/45660460992) all succeeded.
- **QA:** 302/302 frontend + 785/785 domain tests; strict shared-domain TypeScript passed; lint 36 warnings / 0 errors; production build passed; production-only dependency audit found 0 vulnerabilities. Dependency-install/full audit still reports 4 moderate findings; no dependency changes were made.
- **Initial failure and correction:** first test commit [97e83df3](https://github.com/Taylan789/MobilyaCAD/commit/97e83df30aa05bb1d9be3c26413e77c57cdee58e) passed CI but QA failed 784/785 because the new assertion expected caller-provided adjustment IDs. The quote calculator correctly assigns canonical IDs `adjustment-0001` / `adjustment-0002`; only the fixture expectation was corrected in bab26550. No test was removed/weakened and no production calculator source changed. The failed SHA was not deployed.
- **Test-site deployment:** Pages log confirms `pages_build_version` and deployment ID both equal `bab26550e0bd28239c0150721ceb2de42af7bba8`; deployment reported success at https://taylan789.github.io/MobilyaCAD/.
- **Scope / constraints:** stock-sheet v2 basis, Part/source group provenance, category/grand totals, adjustment line-source mapping, standalone JSON export/import, project JSON restore, next append, revision comparison and source-map audit are covered. This is synthetic domain regression coverage, not physical CNC/workshop certification. Frontend, adapter/performance-owned, CNC/machine, secrets/settings and `main` were not changed.
- **Parallel roles:** UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains separate; editor save/open integration is not claimed. Integration/Performance specialist job was skipped and no specialist branch was verified; PERF-001 / INT-002 remain specialist-owned. AI Developer [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) remains blocked by OpenRouter free-model HTTP 429; no rerun, paid fallback, secret or quota change was made.
- **Next:** DOM-171 — add fail-closed import/restore tests for tampered stock-sheet category totals and Part-group source coverage; keep INT-003 and specialist-owned tasks isolated.


## 25 Kasım 2026 20:26 TRT — DOM-171 VERIFIED

- Base/preflight HEAD: `b0981e0b9e90fc73672129ec27d71bb4300e35ad`; no queued/in-progress workflow run existed. Base exact-SHA CI [#45661236019](https://github.com/Taylan789/MobilyaCAD/actions/runs/45661236019), QA [#45661235989](https://github.com/Taylan789/MobilyaCAD/actions/runs/45661235989) and Pages [#45661236014](https://github.com/Taylan789/MobilyaCAD/actions/runs/45661236014) all succeeded; Pages logs confirm `b0981e0b9e90fc73672129ec27d71bb4300e35ad` was deployed to https://taylan789.github.io/MobilyaCAD/.
- New stock-sheet-purchase material-cost-basis snapshots now emit inner schemaVersion 2 with a sorted aggregate `sourcePartIds` manifest; revision validation compares it exactly with the union of group Part IDs. Legacy inner schemaVersion 1 and net-consumption snapshots remain readable.
- Added regressions for tampered category totals and changed group Part coverage through standalone-history import and JSON v2 project restore; both paths must return blocked/null without mutating the target. Added legacy v1 compatibility and generated-manifest coverage assertions.
- Changed files: `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Implementation commit: [deb962ff3813b8a4257ef0fc361bb79cba391cb9](https://github.com/Taylan789/MobilyaCAD/commit/deb962ff3813b8a4257ef0fc361bb79cba391cb9). Exact-SHA CI [#45665861844](https://github.com/Taylan789/MobilyaCAD/actions/runs/45665861844), QA [#45665861889](https://github.com/Taylan789/MobilyaCAD/actions/runs/45665861889) and Pages [#45665861859](https://github.com/Taylan789/MobilyaCAD/actions/runs/45665861859) all succeeded. QA: 306/306 frontend + 787/787 domain; strict shared-domain TypeScript; lint 36 warnings / 0 errors; production build; production-only audit 0 vulnerabilities. Pages log reports exact deployed SHA `deb962ff3813b8a4257ef0fc361bb79cba391cb9`. No local test run is claimed; GitHub Actions executed the checks.
- Known limits: the manifest detects one-sided inconsistencies, not coordinated malicious edits; no cryptographic signature or external trusted source record exists. Legacy material-basis v1 has no aggregate manifest. No frontend, adapter/benchmark-owned, CNC/machine, secrets/settings or `main` files changed.
- Latest AI Developer [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) was inspected: OpenRouter free-model daily limit 50/50, HTTP 429, reset 26 November 2026 03:00 TRT. It was not rerun before reset; no paid fallback or secret/quota change. Integration/Performance job was skipped and branch search found no specialist branch; PERF-001/INT-002 remain specialist-owned.
- UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains open/draft; it was not modified or merged.
- Next: verify exact-SHA CI/QA/Pages, then DOM-172 — expose schema-v2 Part-manifest coverage distinctly in revision comparison/source-audit output without touching adapter-owned files.


## 25 Kasım 2026 21:52 TRT — DOM-172 VERIFIED

- **Base / preflight:** `dev/github-work` HEAD `66cd8ccecc2e07090454a00d2989d4afbfe48ed4`; no active CI, QA or AI Developer run was present. The base SHA's CI [#45671911991](https://github.com/Taylan789/MobilyaCAD/actions/runs/45671911991), QA [#45671912129](https://github.com/Taylan789/MobilyaCAD/actions/runs/45671912129) and Pages [#45671911758](https://github.com/Taylan789/MobilyaCAD/actions/runs/45671911758) all succeeded; Pages deployed that exact SHA to https://taylan789.github.io/MobilyaCAD/.
- **DOM-172 slice:** domain revision audit now distinguishes stock-sheet purchase basis schema v1 (legacy, no aggregate manifest) from schema v2 (validated aggregate Part manifest). Per-revision and project-wide counters expose manifest coverage separately from quote cost-line provenance and legacy group Part references.
- **Comparison:** stock-sheet group comparison, full quote comparison (through its group comparison), and source-map provenance comparison expose `stockSheetManifestComparison`. Added/removed Part IDs are returned only for v2→v2 comparisons; legacy/absent sides explicitly report unavailable coverage with null diff counts/changes.
- **Acceptance tests added:** v1/v2/no-basis audit coverage, aggregate counters, exact v2→v2 Part diff, full comparison and source-map comparison propagation, legacy↔v2 non-inference, immutability and input non-mutation.
- **Changed files:** `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- **Implementation commit:** [0a04f260387d66b01e0c4879f4afe16e6fab8718](https://github.com/Taylan789/MobilyaCAD/commit/0a04f260387d66b01e0c4879f4afe16e6fab8718) on `dev/github-work`.
- **Exact-SHA verification:** CI [#45681167545](https://github.com/Taylan789/MobilyaCAD/actions/runs/45681167545) passed; QA [#45681167621](https://github.com/Taylan789/MobilyaCAD/actions/runs/45681167621) passed with 310/310 frontend tests and 790/790 domain tests, strict shared-domain TypeScript, production build, lint (36 existing warnings / 0 errors) and production-only dependency audit (0 vulnerabilities). Pages [#45681167542](https://github.com/Taylan789/MobilyaCAD/actions/runs/45681167542) passed; deployment log confirms `pages_build_version` = `0a04f260387d66b01e0c4879f4afe16e6fab8718` and environment URL https://taylan789.github.io/MobilyaCAD/. No local test run is claimed; GitHub Actions performed these checks.
- **Parallel roles:** UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and untouched. Integration/Performance specialist job is disabled/skipped and no agent/integration-performance branch was verified; INT-002/PERF-001 adapter/benchmark files were not changed.
- **AI Developer blocker:** run [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) failed with OpenRouter free-model daily HTTP 429 (limit 50, remaining 0; reset 26 November 2026 03:00 TRT). It was not rerun before reset; no paid fallback, secret, quota or workflow setting was changed.
- **Next:** hand off the additive comparison contract for a versioned JSON/CSV adapter round-trip to its designated owner; keep the adapter files untouched until INT-002 ownership is active.


## 25 Kasım 2026 22:21 TRT — DOM-173 VERIFIED

- **Preflight:** target branch dev/github-work HEAD was d5de6d2c3a721fb1d5eb57702f76fb90ba366c81. No active CI, QA or AI Developer run was present before editing. Latest base SHA CI #45683761827, QA #45683761812 and Pages #45683761775 were successful. The base QA had 314/314 frontend + 790/790 domain tests. The UI-owned PR #206 remained draft and untouched.
- **Delivery:** added a multi-revision regression for two schema-v2 stock-sheet manifests with one overlapping Part ID, a legacy schema-v1 stock-sheet revision, and a revision without stock-sheet basis. It verifies additive v2 manifest references, project-wide unique-ID de-duplication, separation from all-stock-sheet group counts, parity with the source-integrity audit, paired cost/source-line order invariance, input immutability and frozen output.
- **Changed files:** domain/production/projectQuoteRevision.ts; domain/production/projectQuoteRevision.test.mjs; docs/production-domain-contract.md; AI_COORDINATION.md; PRODUCT_ROADMAP.md. No frontend, JSON/CSV adapter, benchmark, CNC/machine, secret/settings or main changes.
- **Implementation commit:** [a021b0a5db7de0634ab33443d43890df20736db9](https://github.com/Taylan789/MobilyaCAD/commit/a021b0a5db7de0634ab33443d43890df20736db9) on dev/github-work.
- **Exact-SHA automation:** CI [#45685137601](https://github.com/Taylan789/MobilyaCAD/actions/runs/45685137601) passed. QA [#45685137577](https://github.com/Taylan789/MobilyaCAD/actions/runs/45685137577) passed: 314/314 frontend + 791/791 domain tests; the new DOM-173 regression is test 432 and passed; strict shared-domain TypeScript passed; lint reported 36 warnings / 0 errors; production build passed; production-only audit found 0 vulnerabilities. Full npm install audit still has 4 moderate findings; no dependency change was made. Vite output: JS 1,698.03 kB (475.00 kB gzip), CSS 442.80 kB (75.05 kB gzip); viewport p95/memory remain NOT MEASURED.
- **Test-site deployment:** Pages [#45685137617](https://github.com/Taylan789/MobilyaCAD/actions/runs/45685137617) succeeded. Deployment logs confirm pages_build_version = a021b0a5db7de0634ab33443d43890df20736db9 and environment URL https://taylan789.github.io/MobilyaCAD/.
- **Parallel roles:** UI-owned INT-003 PR #206 remains open/draft and untouched. Integration/Performance job was skipped; no specialist branch was verified, so INT-002/PERF-001 adapter/benchmark files remain specialist-owned and unchanged. QA-003 remains blocked until INT-001/INT-002 evidence is available.
- **AI Developer:** run [#45594366361](https://github.com/Taylan789/MobilyaCAD/actions/runs/45594366361) was inspected. Its OpenRouter free-model call failed with HTTP 429, daily limit 50/50 and remaining 0; provider reset is 26 November 2026 03:00 TRT. It was not rerun before reset; no paid fallback, secret, quota or workflow setting was changed.
- **Known limits:** the manifest is an internal consistency record, not a cryptographic signature or external trusted source; legacy schema-v1 records have no aggregate manifest. This slice does not validate physical stock usage, workshop yield, CNC coordinates or machine output. Frontend editor save/open wiring and adapter round-trip are not claimed.
- **Next:** DOM-174 — compare manifest coverage for non-adjacent revision pairs in a mixed v2/v1 history and reconcile each comparison with source-map audit counts. Keep INT-003, INT-002 and PERF-001 with their designated owners.


## 25 Kasım 2026 23:31 TRT — DOM-174 VERIFIED

- Preflight: base dev/github-work HEAD 77dc6e3763509667bdbb95b7a96499df8067d7cf; no active CI, QA or AI Developer job before the code write. Exact-SHA CI #45695587251, QA #45695587084 and Pages #45695587158 succeeded for implementation commit ea724ee532dcbe4f86c5143ec598b918fecab0f3.
- Delivery: added a six-revision mixed history (v2, legacy v1, v2, legacy v1, v2, no basis) and checked all 10 non-adjacent pairs. Group comparison, full quote comparison and source-map comparison expose identical manifest coverage; every endpoint's from/to coverage reconciles with source-map audit basis/schema/version/Part counts. v2→v2 Part counts and deterministic added/removed IDs reconcile; legacy/no-basis transitions retain null counts/changes. Inputs remain unchanged and results are frozen.
- Implementation/test commit: [ea724ee532dcbe4f86c5143ec598b918fecab0f3](https://github.com/Taylan789/MobilyaCAD/commit/ea724ee532dcbe4f86c5143ec598b918fecab0f3), on dev/github-work.
- Changed files: domain/production/projectQuoteRevision.test.mjs (regression only); documentation follow-up updates docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md and AI_PROGRESS.md.
- Exact-SHA automation: CI [#45695587251](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695587251) passed. QA [#45695587084](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695587084) passed: 314/314 frontend + 792/792 domain tests; new DOM-174 test 433 passed; strict shared-domain TypeScript; lint 36 warnings / 0 errors; production build; production-only audit 0 vulnerabilities. Full npm install audit still reports 4 moderate findings; no dependency change was made. JS bundle 1,698.03 kB (475.00 kB gzip), CSS 442.80 kB (75.05 kB gzip); viewport p95/memory NOT MEASURED.
- Test-site deployment: Pages [#45695587158](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695587158) succeeded. Deployment logs confirm pages_build_version = ea724ee532dcbe4f86c5143ec598b918fecab0f3 and https://taylan789.github.io/MobilyaCAD/.
- Follow-on UI agent delivery (read-only): commit [3532ee7122769ebf7d171e629696f0ded01e0846](https://github.com/Taylan789/MobilyaCAD/commit/3532ee7122769ebf7d171e629696f0ded01e0846) changed only frontend/src/components/ui/cad-transform-mode-rail.css, frontend/src/components/ui/toggle-group.tsx and frontend/tests/cadTransformModeRail.test.mjs. CI [#45695923410](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695923410), QA [#45695923351](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695923351), Pages [#45695923248](https://github.com/Taylan789/MobilyaCAD/actions/runs/45695923248) all succeeded; QA 318/318 frontend + 792/792 domain, 36 lint warnings/0 errors, production build and production audit 0 vulnerabilities. Pages deployed exact SHA 3532ee7122769ebf7d171e629696f0ded01e0846 to https://taylan789.github.io/MobilyaCAD/. No frontend file was modified by Product Development.
- Parallel roles: UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains open/draft, unmergeable and untouched. Integration/Performance job was skipped; branch search found no agent/integration-performance-* branch, so INT-002/PERF-001 remain specialist-owned. No JSON/CSV adapter, benchmark, CNC/machine, secrets/settings or main changes.
- AI Developer blocker: run [#45690500003](https://github.com/Taylan789/MobilyaCAD/actions/runs/45690500003) failed with OpenRouter free-model daily HTTP 429 (limit 50, remaining 0; reset 26 November 2026 03:00 TRT). It was inspected and not rerun before reset; no paid fallback, secret, quota or workflow setting was changed.
- Known limits: this is test/contract coverage for existing generic pair comparison logic, not a new UI capability. JSON/CSV round-trip and editor save/open are not claimed; manifest is an internal consistency record, not a cryptographic signature. Physical stock use, CNC coordinates, machine output and workshop validation remain outside automated evidence.
- Next: DOM-175 — verify appendProjectQuoteRevision preserves mixed manifest coverage, pairwise comparisons and project-wide audit totals after immutable appends; keep INT-003, INT-002 and PERF-001 with their designated owners.


## 26 Kasım 2026 02:16 TRT — DOM-177 VERIFIED

- **Base / implementation:** dev/github-work base HEAD 83f2e884f3bb329c4364a7cd3a9046c7531bed91; implementation commit [a0b9bce37321bce696896689a762cb7e0e461eb1](https://github.com/Taylan789/MobilyaCAD/commit/a0b9bce37321bce696896689a762cb7e0e461eb1).
- **Delivery:** a seven-revision mixed manifest-v2 / legacy material-basis-v1 / no-basis standalone history is imported into an empty matching project-v2 envelope, stringified/parsed/restored, appended with an eighth strict no-basis revision, and re-exported/parsed.
- **Changed files:** domain/production/projectQuoteRevisionProjectFile.test.mjs; docs/production-domain-contract.md; AI_COORDINATION.md; PRODUCT_ROADMAP.md; AI_PROGRESS.md. No production calculator source, frontend, adapter/benchmark, CNC/machine, secrets/settings or main files changed.
- **Exact-SHA automation:** CI [#45720805718](https://github.com/Taylan789/MobilyaCAD/actions/runs/45720805718), QA [#45720805740](https://github.com/Taylan789/MobilyaCAD/actions/runs/45720805740), and Pages [#45720805720](https://github.com/Taylan789/MobilyaCAD/actions/runs/45720805720) all succeeded for a0b9bce37321bce696896689a762cb7e0e461eb1. QA: 323/323 frontend + 795/795 domain tests; DOM-177 regression test #510 passed; strict shared-domain TypeScript passed; lint 36 warnings / 0 errors; production build passed; production-only dependency audit found 0 vulnerabilities.
- **Test-site deployment:** Pages log confirms pages_build_version exactly equals a0b9bce37321bce696896689a762cb7e0e461eb1; deployment succeeded at https://taylan789.github.io/MobilyaCAD/.
- **Measured limits:** Vite JS 1,698.57 kB (475.10 kB gzip), CSS 452.87 kB (76.20 kB gzip); the >500 kB chunk warning remains. Viewport p95/memory are NOT MEASURED. This domain test does not complete editor startup/new/save/open wiring, JSON/CSV adapter integration, or physical CNC/workshop validation.
- **Parallel roles:** UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and untouched; dev/assistant-visual-design remains UI-owned. Integration/Performance job is disabled and no specialist branch was found; INT-002/PERF-001 remain specialist-owned. QA-003 remains blocked pending integration evidence.
- **AI Developer:** run [#45690500003](https://github.com/Taylan789/MobilyaCAD/actions/runs/45690500003) was inspected and failed with OpenRouter free-model daily HTTP 429 (limit 50/50; reset 26 November 2026 03:00 TRT). It was not rerun before reset; no paid fallback, quota, secret or workflow setting was changed.
- **Next:** DOM-178 — preserve unrelated project-v2 envelope metadata and prototype-sensitive own JSON fields through standalone import/restore, with atomic fail-closed tests. DOM-153 follows only after UI-owned INT-003 editor save/open wiring.


## 26 Kasım 2026 03:43 TRT — DOM-178 IMPLEMENTED (exact-SHA verification pending)

- **Preflight:** dev/github-work HEAD 2fe37df24a0fd495962ca130727ceb5ac5125c49; current-head CI [#45729456572](https://github.com/Taylan789/MobilyaCAD/actions/runs/45729456572), QA [#45729456678](https://github.com/Taylan789/MobilyaCAD/actions/runs/45729456678), and Pages [#45729456589](https://github.com/Taylan789/MobilyaCAD/actions/runs/45729456589) all completed successfully before this change. Pages log confirmed that exact base SHA at https://taylan789.github.io/MobilyaCAD/. No active CI/QA run was observed in the latest run list. The last AI Developer run [#45690500003](https://github.com/Taylan789/MobilyaCAD/actions/runs/45690500003) failed on OpenRouter free-model daily HTTP 429; the recorded provider reset was 26 November 2026 03:00 TRT. No paid fallback, secret or quota setting was changed.
- **Delivery:** added three domain regressions for standalone history import into a project-v2 envelope: preservation of unknown top-level/nested metadata and own __proto__ JSON data through stringify/parse/restore; zero-invocation accessor and fail-closed Proxy reflection handling; and atomic blocking when envelope depth exceeds 64 or UTF-8 size exceeds 16 MiB.
- **Changed files:** domain/production/projectQuoteRevisionProjectFile.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md and AI_PROGRESS.md. No production source, frontend/**, adapter/benchmark, CNC/machine, secrets/settings or main files changed.
- **Implementation commit:** [b16c5534297a632db5415bd3e7397317256bd8be](https://github.com/Taylan789/MobilyaCAD/commit/b16c5534297a632db5415bd3e7397317256bd8be) on dev/github-work.
- **Exact-SHA automation:** CI [#45731610179](https://github.com/Taylan789/MobilyaCAD/actions/runs/45731610179) passed; QA [#45731610384](https://github.com/Taylan789/MobilyaCAD/actions/runs/45731610384) passed with 330/330 frontend + 798/798 domain tests. DOM-178 regressions #511-#513 passed; strict shared-domain TypeScript passed; lint 36 warnings / 0 errors; production build passed; production-only audit found 0 vulnerabilities. JS bundle 1,698.57 kB (475.10 kB gzip), CSS 462.39 kB (77.81 kB gzip); the >500 kB chunk warning remains.
- **Test-site deployment:** Pages [#45731610243](https://github.com/Taylan789/MobilyaCAD/actions/runs/45731610243) succeeded; deployment log confirms pages_build_version exactly equals b16c5534297a632db5415bd3e7397317256bd8be at https://taylan789.github.io/MobilyaCAD/. The merged UI-owned PR [#236](https://github.com/Taylan789/MobilyaCAD/pull/236) is included in the deployed branch; its visible graphite launch-screen work was authored by the UI owner, not Product Development.
- **Known limits:** this is regression coverage for the existing bounded descriptor-safe import implementation, not editor startup/new/save/open integration or JSON/CSV adapter round-trip. Viewport p95/memory remain NOT MEASURED; physical CNC/workshop validation remains human validation. UI-owned INT-003 PR #206 stays draft/untouched; Integration/Performance job is disabled and no specialist branch was found; QA-003 remains blocked on INT-001/INT-002.
- **Next:** verify exact-SHA CI/QA/Pages. If green, record the actual commit/run links and proceed to the next unclaimed domain contract; keep DOM-153 dependent on UI-owned INT-003.

## 26 Kasım 2026 06:29 TRT — DOM-180 VERIFIED

- **Preflight:** dev/github-work HEAD d75ef5e528a1b1a5819523956a8c9eb3cb66548a; no active CI, QA or AI Developer run was present before the write. Base CI [#45743219773](https://github.com/Taylan789/MobilyaCAD/actions/runs/45743219773), QA [#45743219610](https://github.com/Taylan789/MobilyaCAD/actions/runs/45743219610) and Pages [#45743219725](https://github.com/Taylan789/MobilyaCAD/actions/runs/45743219725) all succeeded. Pages log confirmed pages_build_version exactly equals the base SHA at https://taylan789.github.io/MobilyaCAD/.
- **Delivery:** two new domain regressions verify root-inclusive 64-level mixed object/array acceptance and level-65 blocking across project-history read, append and standalone import. UTF-8 byte tests accept exactly 16 MiB; they verify read at the input boundary and append/import at the final output boundary after history is added, then block at +1 byte without partial project/history output. Multi-byte é payloads distinguish UTF-8 bytes from UTF-16 string.length.
- **Changed files:** domain/production/projectQuoteRevisionProjectFile.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md. No production source/API, frontend, adapter/benchmark, CNC/machine, secrets/settings or main files changed.
- **Implementation commit:** [4792c96ed9175b1af3dd556ef2424c356f8d15fe](https://github.com/Taylan789/MobilyaCAD/commit/4792c96ed9175b1af3dd556ef2424c356f8d15fe) on dev/github-work.
- **Exact-SHA automation:** CI [#45749853857](https://github.com/Taylan789/MobilyaCAD/actions/runs/45749853857) passed; QA [#45749853815](https://github.com/Taylan789/MobilyaCAD/actions/runs/45749853815) passed with 337/337 frontend + 801/801 domain tests. DOM-180 regressions #515 and #516 passed; strict shared-domain TypeScript passed; lint 36 warnings / 0 errors; production build passed; production-only audit found 0 vulnerabilities. JS bundle 1,699.10 kB (475.21 kB gzip), CSS 463.83 kB (77.95 kB gzip); the >500 kB chunk warning remains.
- **Test-site deployment:** Pages [#45749853790](https://github.com/Taylan789/MobilyaCAD/actions/runs/45749853790) succeeded; deployment log confirms pages_build_version exactly equals 4792c96ed9175b1af3dd556ef2424c356f8d15fe at https://taylan789.github.io/MobilyaCAD/.
- **AI Developer / parallel roles:** latest AI Developer [#45743919035](https://github.com/Taylan789/MobilyaCAD/actions/runs/45743919035) failed with OpenRouter free-model HTTP 429 (limit 50, remaining 0; provider reset 27 November 2026 03:00 TRT). It was not rerun before reset; no paid fallback, secret or quota setting was changed. Integration/Performance specialist job was skipped and no agent/integration-performance branch was found; INT-002/PERF-001 remain specialist-owned. UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft with App startup/new/save/open wiring intentionally deferred. UI-owned PR [#240](https://github.com/Taylan789/MobilyaCAD/pull/240) changes only frontend/src/components/catalog/FurnitureCatalogCardAction.css and frontend/tests/catalogAddActionAffordance.test.mjs; its head CI [#45748096263](https://github.com/Taylan789/MobilyaCAD/actions/runs/45748096263) and QA [#45748099955](https://github.com/Taylan789/MobilyaCAD/actions/runs/45748099955) passed, but it remains unmerged and not deployed. No UI-owned PR/branch was modified or merged.
- **Known limits:** viewport p95/memory remain NOT MEASURED; the latest base build reports JS 1,699.10 kB (475.21 kB gzip) and CSS 463.83 kB with the >500 kB chunk warning. Physical CNC/machine/workshop validation remains human validation.
- **Next:** DOM-181 — verify JSON escaped control-character and lone-surrogate byte accounting at the 16 MiB boundary. Keep DOM-153 dependent on UI-owned INT-003; INT-002/PERF-001 remain specialist-owned and QA-003 remains blocked until integration evidence.

## 26 Kasım 2026 07:06 TRT — DOM-181 VERIFIED

- **Preflight:** dev/github-work HEAD was 2ab8b79357e22894aefa3d6aa64f666722cba2f1; no active AI Developer, CI or QA run was present before this verification record. The previous base SHA f4acde80202eba404c15d0e01fff14da11224fc3 had successful CI #45750095181, QA #45750095240 and Pages #45750095205.
- **Delivery:** added one focused domain regression to domain/production/projectQuoteRevisionProjectFile.test.mjs. It uses a JSON payload with U+0000/U+001F, LF/TAB, lone high/low surrogates and a valid astral character. Buffer.byteLength(JSON.stringify(project), "utf8") is the byte oracle. Read, append and standalone import accept exactly 16 MiB; +1 byte is blocked. Append/import cases keep the input envelope below the limit, prove no partial project/history result, and assert input immutability. Existing byte-accounting implementation and serializer contract were unchanged.
- **Changed files:** domain/production/projectQuoteRevisionProjectFile.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md. No production source/API, frontend/**, adapter/benchmark, CNC/machine, secrets/settings or main files changed.
- **Implementation commit:** [2ab8b79357e22894aefa3d6aa64f666722cba2f1](https://github.com/Taylan789/MobilyaCAD/commit/2ab8b79357e22894aefa3d6aa64f666722cba2f1) on dev/github-work.
- **Exact-SHA automation:** CI [#45752954951](https://github.com/Taylan789/MobilyaCAD/actions/runs/45752954951) passed; QA [#45752954816](https://github.com/Taylan789/MobilyaCAD/actions/runs/45752954816) passed with 337/337 frontend + 802/802 domain tests. DOM-181 test #517 passed; shared-domain TypeScript and production build passed; lint reported 36 warnings / 0 errors; production-only audit found 0 vulnerabilities.
- **Test-site deployment:** Pages [#45752954849](https://github.com/Taylan789/MobilyaCAD/actions/runs/45752954849) succeeded. Deployment logs confirm pages_build_version exactly equals 2ab8b79357e22894aefa3d6aa64f666722cba2f1; URL: https://taylan789.github.io/MobilyaCAD/.
- **Parallel lanes:** AI Developer [#45743919035](https://github.com/Taylan789/MobilyaCAD/actions/runs/45743919035) failed on OpenRouter free-model daily HTTP 429 (50/50 quota exhausted; reset 27 November 2026 03:00 TRT). No rerun before reset, paid fallback, secret or quota change. UI-owned INT-003 PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206) remains draft and untouched. UI PR [#240](https://github.com/Taylan789/MobilyaCAD/pull/240) has successful exact-head CI [#45748096263](https://github.com/Taylan789/MobilyaCAD/actions/runs/45748096263) and QA [#45748099955](https://github.com/Taylan789/MobilyaCAD/actions/runs/45748099955), but remains open/unmerged and is not in this deployment. No agent/integration-performance branch was found; the specialist job is disabled, so INT-002/PERF-001 remain specialist-owned.
- **Known limits:** viewport p95/memory remain NOT MEASURED; the production build still emits the existing >500 kB chunk warning; CNC/machine/workshop validation remains human-only. DOM-181 does not claim editor save/open integration or JSON/CSV adapter round-trip.
- **Next:** preserve UI ownership for INT-003; once editor startup/new/save/open wiring is complete, continue DOM-153 append → save → reopen → append. Keep INT-002/PERF-001 and QA-003 blocked on the specialist adapter/measurement evidence.


## 26 Kasım 2026 08:48 TRT — DOM-182 kitaplık dikey bölücüler (verified)

- **Implementation commit:** `6e33056474c1c23d0cc7c667b670fcb44a80ad18` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/6e33056474c1c23d0cc7c667b670fcb44a80ad18). İlk commit `1af2a2d08b94b17efb4554c32f6dd383167620a1` strict TypeScript hataları verdi; `6e33056` eksik `CabinetConstructionPart` import'unu ve cutout callback tipini düzeltti.
- **Değişen dosyalar:** `domain/production/bookshelfConstruction.ts`, `domain/production/bookshelfConstruction.test.mjs`, `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- **Ürün davranışı:** opsiyonel v1 `verticalDividers`; katalogda gerçek kalınlık, benzersiz ID, 0.1 mm normalizasyon, iç genişlik/çakışma kontrolü, damar yönü ve kenar bant bayrakları; tam yükseklik/derinlik Part satırı; proje agregasyonu ve material/edge-banding summary. Eski istekte alan yoksa sonuç aynı kalır.
- **Otomatik doğrulama:** [CI #45763849005](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763849005) SUCCESS; [QA #45763848992](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763848992) SUCCESS — 807 test, 807 pass, 0 fail; shared-domain type-check, lint, production build ve production-only audit başarılı; [Pages #45763849102](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763849102) SUCCESS.
- **Test sitesi:** https://taylan789.github.io/MobilyaCAD/ — Pages deploy exact SHA `6e33056474c1c23d0cc7c667b670fcb44a80ad18` ile tamamlandı. Bu teslimat domain kabiliyetidir; görünür UI yenilemesi değildir.
- **Bilinen sınırlar:** dikey bölücü varken tam genişlik raf adedi reddedilir; bölme bazlı raflar DOM-183'tür. Bağlantı/delik, yük taşıma, makine postprocessor veya CNC koordinatı üretilmez. 36 frontend lint uyarısı ve 1,703.34 kB JS / 475.72 kB gzip bundle uyarısı mevcut; p95 viewport/bellek ölçülmedi. npm install 4 moderate toplam dependency bulgusu gösterdi; production-only audit 0 bulgu.
- **İlk deneme / düzeltme kanıtı:** [CI #45763718867](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763718867), [QA #45763718912](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763718912) ve [Pages #45763718913](https://github.com/Taylan789/MobilyaCAD/actions/runs/45763718913) ilk SHA'da başarısızdı; loglara göre test komutu geçti, ancak iki strict TypeScript hatası build'i ve deploy gate'ini durdurdu. Düzeltme sonrası exact-SHA kontrollerinin tamamı başarılı.
- **Sonraki görev:** DOM-183 — kitaplık dikey bölücü aralıklarına bağlı açık ölçülü bölme rafları; önce 3D/üretim konum sözleşmesi ve çakışma/kenar bant/katalog testleri. UI sahibi frontend/** alanında kalır.
