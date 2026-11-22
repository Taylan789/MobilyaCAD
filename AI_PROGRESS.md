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
