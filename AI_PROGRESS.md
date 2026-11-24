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
- Implementation commit SHA and exact-SHA CI/QA/Pages results are pending. Do not report test success or test-site deployment until GitHub Actions confirms them.
- Known limits: this does not prevent JavaScript Proxy reflection traps; it rejects accessor descriptors, custom prototypes, symbols, non-enumerable fields, sparse arrays, cycles, non-finite numbers and depth above 64. No frontend, adapter, benchmark, CNC/machine, secrets/settings or main changes.
- AI Developer run [#45450013010](https://github.com/Taylan789/MobilyaCAD/actions/runs/45450013010) failed after retry with OpenRouter free-tier daily HTTP 429 (limit 50, remaining 0; reset 25 November 2026 03:00 TRT). The failed job log was inspected; no rerun or paid fallback was attempted before reset. Integration/Performance job is disabled in the workflow and no specialist branch was found.
- Next: UI-owned INT-003 parser/save/open integration remains in draft PR [#206](https://github.com/Taylan789/MobilyaCAD/pull/206); then DOM-153 editor save/reopen round-trip. INT-002/PERF-001 remain specialist-owned and QA-003 remains blocked.
