# MobilyaCAD — AI Coordination Board

Bu dosya dört geliştirme/denetim rolünün ortak görev panosu ve entegrasyon sözleşmesidir.
Çalışma hedefi `dev/github-work`. `main` üzerinde ürün kodu veya ajan geliştirme dosyası değiştirilmez.

## Ajan sahipliği

| Ajan | Sahiplik | Yasak |
|---|---|---|
| Arayüz Tasarımı | `frontend/**` | domain/engine/test/docs/CI dosyalarını değiştirmek |
| Otonom Ürün Geliştirme | frontend dışı domain/engine/production hesapları, testler ve dokümantasyon | `frontend/**` dosyalarını değiştirmek |
| Entegrasyon ve Performans | Sahiplenilmemiş adapter/integration testleri, benchmark/profiling ve ölçülebilir performans işleri | `frontend/**` ve ürün agent'ının sahip olduğu domain/engine kaynaklarını değiştirmek |
| Kalite Denetimi | salt okunur entegrasyon, CI/QA ve PR denetimi | dosya/branch/commit/PR değişikliği veya merge |

## Çalışma protokolü

1. Her ajan bu panoyu, güncel HEAD'i, açık PR'ları ve son Actions sonuçlarını kontrol eder.
2. Yalnızca kendi sahiplik alanındaki, başka ajan tarafından alınmamış görevi yürütür.
3. Sınır aşan değişiklikte dosyaya dokunmaz; net sözleşme ve kabul kriteriyle devir bırakır.
4. Entegrasyon/performans agent'ı izole `agent/integration-performance-<run-id>` dalında çalışır ve PR açar; doğrudan ortak dala yazmaz.
5. Diğer geliştirme agent'ı yalnızca `dev/github-work` dalına commit eder. QA salt okunurdur.
6. Her teslimat gerçek commit/PR, test ve ölçüm kanıtı içermelidir. Çalıştırılmayan kontrol başarılı gösterilmez.
7. Aynı SHA için başarılı kontroller tekrar çalıştırılmaz; yeni SHA/PR veya başarısızlık olduğunda ilgili kontroller incelenir.
8. CNC/makine güvenliği ve üretici standardı doğrulanmadan koordinat veya standart uydurulmaz.

## Ortak entegrasyon sözleşmesi

- Domain/üretim hesaplamalarının tek doğruluk kaynağı domain katmanıdır.
- Kesit/açıklık içeren paneller JSON/CSV dışa aktarımında geometri ve miktar kaybetmemelidir; desteklenmiyorsa export engellenmelidir.
- Frontend üretim raporundaki `canExport`, `exportBlockers` ve parça/operasyon verisini tüketmelidir.
- Ölçü birimi mm; adet, parça miktarı ve operasyon toplamları tüm katmanlarda tutarlı olmalıdır.
- Performans iyileştirmeleri ölçülebilir baseline ve davranış koruyan testlerle sunulmalıdır.

## Öncelikli görev kuyruğu

| ID | Görev | Sahip | Durum | Kabul / teslim kanıtı |
|---|---|---|---|---|
| INT-001 | Domain üretim raporu ile frontend sözleşmesi; JSON/CSV geometri kaybını önleme veya desteklenmeyen export'u engelleme | Arayüz + Ürün | READY | round-trip ve export-block testleri |
| DOM-002 | Banyo dolabı ve diğer ailelerde çoklu açıklık, adet, malzeme ve kalınlık domain testleri | Ürün Geliştirme | DONE | [commit 23385aaf](https://github.com/Taylan789/MobilyaCAD/commit/23385aaf14cac1550a37558cdadb6df3b60d3b1a); [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704571); [QA: 101/101 frontend + 145/145 domain](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704658); [Pages](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704645) — PR yok, doğrudan yetkili dal commit'i |
| DOM-003 | Açık kullanıcı girdili donanım BOM satırları; kimlik/mobilya/miktar/birim doğrulaması ve kayıpsız export kapısı | Ürün Geliştirme | DONE | [commit 6acf8f58](https://github.com/Taylan789/MobilyaCAD/commit/6acf8f58fe3476f17e280cb3c6d580279ae49556); [CI #44024961800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961800); [QA #44024961750](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961750) — 101/101 frontend + 149/149 domain testi, 0 başarısız; Pages #44024961772 başarılı |
| DOM-004 | Donanım BOM miktar özeti: hardwareId/birim gruplama, kesirli miktar ve kaynak izini koruma | Ürün Geliştirme | DONE | [commit a79dd440](https://github.com/Taylan789/MobilyaCAD/commit/a79dd4407f49c2fddd81bd848abf0f97478b834a); [CI #44033999434](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999434) başarılı; [QA #44033999444](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999444) başarılı (101/101 frontend + 153/153 domain); [Pages #44033999427](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999427) başarılı |
| DOM-005 | Kullanıcı girdili proje maliyet özeti: malzeme/donanım/işçilik/operasyon/fire/kâr, para birimi ve birim tutarlılığı | Ürün Geliştirme | DONE | [commit 6d1d820d](https://github.com/Taylan789/MobilyaCAD/commit/6d1d820d6469777f24cb0c7d5e251dfe7ec39c61); [CI #44042058150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058150) başarılı; [QA #44042058139](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058139) başarılı (101/101 frontend + 164/164 domain); [Pages #44042058240](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058240) başarılı |
| DOM-006 | Açık fiyat tablosunu materialId/hardwareId + özgün birim ile malzeme ve donanım tüketim özetlerine bağla; fiyatı eksik satırda toplamı hazır gösterme | Ürün Geliştirme | DONE | [commit 106bb4d6](https://github.com/Taylan789/MobilyaCAD/commit/106bb4d6da1cb1316f5386080e6b34d491a09016); [CI #44048122112](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122112) başarılı; [QA #44048122147](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122147) başarılı (101/101 frontend + 175/175 domain); [Pages #44048122140](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122140) başarılı |
| DOM-007 | Kenar bandı için açık katalog kimliği ve özgün birim sözleşmesi; fiyat kapsamını kesintisiz tamamla | Ürün Geliştirme | DONE | [commit ea78777](https://github.com/Taylan789/MobilyaCAD/commit/ea78777b1f2852f0b81b44eb0fe6bb68a84f5157); [CI #44056080300](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080300), [QA #44056080414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080414) — 101/101 frontend + 178/178 domain testi, 0 başarısız; [Pages #44056080332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080332) başarılı |
| DOM-008 | Kullanıcı girdili işçilik/operasyon tarifesi; süre, özgün birim ve tarife kaynak referansıyla teklif satırı | Ürün Geliştirme | DONE | [commit b42fe770](https://github.com/Taylan789/MobilyaCAD/commit/b42fe770c2045739c12366108489e28bec25591b); [CI #44069400982](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400982), [QA #44069401154](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069401154) — 101/101 frontend + 187/187 domain, 0 başarısız; [Pages #44069400970](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400970) başarılı |
| DOM-009 | Üretim tüketimi ile işçilik/operasyon maliyetlerini tek teklif toplamında birleştir; eksik alt kapsamı hazır gösterme | Ürün Geliştirme | DONE | [commit e7815235](https://github.com/Taylan789/MobilyaCAD/commit/e78152351f679547f064048cceff33063555b9cc); [CI #44072219005](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219005); [QA #44072219133](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219133) — 101/101 frontend + 194/194 domain testi, 0 başarısız; [Pages #44072218712](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072218712) başarılı |
| DOM-010 | Fiyat listesi ve işçilik/operasyon tarifesi için teklif tarihine bağlı katalog sürümü snapshot'ı; eksik veya geçersiz kaynakta snapshot üretme | Ürün Geliştirme | DONE | [commit 215bfbea](https://github.com/Taylan789/MobilyaCAD/commit/215bfbeae1583505936d0f8f2549fe247a36efa9); [CI #44086836332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836332), [QA #44086836369](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836369) — 101/101 frontend + 203/203 domain testi, 0 başarısız; [Pages #44086836270](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836270) başarılı |
| DOM-011 | Teklif revizyon zarfı ve salt okunur maliyet snapshot'ları; eski proje JSON v1 kayıtlarını koru | Ürün Geliştirme | VERIFYING | İlk/sonraki revizyon zinciri, proje/sıra/tarih doğrulaması, tutarlı hazır maliyet snapshot'ı ve runtime immutability testleri; Actions bekleniyor |
| PERF-001 | 2D/3D veri akışında ölçülebilir performans baseline'ı, profiling ve sahiplenilmemiş darboğazların giderilmesi | Entegrasyon/Performans | READY | tekrarlanabilir ölçüm, test, PR |
| INT-002 | JSON/CSV adapter round-trip ve geometri/miktar sadakati için eksik entegrasyon testleri | Entegrasyon/Performans (yalnızca sahiplenilmemiş adapter/test dosyaları) | READY | test raporu ve PR |
| QA-003 | INT-001 ve INT-002 tamamlandığında uçtan uca veri akışı ve export denetimi | Kalite Denetimi | BLOCKED: INT-001/INT-002 | SHA, PR ve gerçek Actions kanıtı |

## Son devir kayıtları

- 2026-11-17 başlangıç HEAD: `ef68f2da2ebd2c18217988875c90e95f4e4383ae`
- Son bilinen CI #324, QA #203 ve Pages #159 başarılıydı; yeni commitlerde tekrar doğrulanmalıdır.
- DOM-002 tamamlandı: commit `23385aaf14cac1550a37558cdadb6df3b60d3b1a`; CI #`44016704571`, QA #`44016704658` (101/101 frontend + 145/145 domain), Pages #`44016704645` başarılı. Doğrudan `dev/github-work` commit'i; PR açılmadı.
- Eski PR #8 yalnızca `frontend/src/App.css` değiştiriyor; arayüz ajanının sahipliğinde bırakıldı ve birleştirilmedi.
- Her raporda güncel HEAD ve gerçek teslimat kanıtları esas alınır.


- DOM-003 tamamlandı: [commit 6acf8f58](https://github.com/Taylan789/MobilyaCAD/commit/6acf8f58fe3476f17e280cb3c6d580279ae49556); [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961800) ve [QA](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961750) başarılı (101 frontend + 149 domain testi, 0 başarısız). Pages #44024961772 başarılı (build/deploy tamamlandı).

- DOM-004 tamamlandı: [özellik commit'i c8ebbf9c](https://github.com/Taylan789/MobilyaCAD/commit/c8ebbf9c9b1aad282a98073b264aac9152d75e70), [test düzeltmesi a79dd440](https://github.com/Taylan789/MobilyaCAD/commit/a79dd4407f49c2fddd81bd848abf0f97478b834a); CI #44033999434, QA #44033999444 (101 frontend + 153 domain, 0 başarısız) ve Pages #44033999427 başarılı. İlk QA'daki tek hata test mesajı regex uyumsuzluğuydu; beklenti düzeltildi, üretim kodu/test kapsamı zayıflatılmadı.

- DOM-005 tamamlandı: [commit 6d1d820d](https://github.com/Taylan789/MobilyaCAD/commit/6d1d820d6469777f24cb0c7d5e251dfe7ec39c61); [CI #44042058150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058150), [QA #44042058139](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058139) ve [Pages #44042058240](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058240) başarılı. QA: 101/101 frontend + 164/164 domain testi, 0 başarısız; yeni maliyet modülü strict TypeScript kapsamına eklendi.


- DOM-006 uygulaması bu committe domain kaynak/test/QA kapsamına alındı; GitHub Actions doğrulaması tamamlanmadan DONE işaretlenmeyecektir.
- Açık arayüz PR'ları #41 (`frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/styles/document-status-accessibility.css`) ve #8 (`frontend/src/App.css`) ayrı frontend sahipliğinde bırakıldı; bu geliştirme hiçbir `frontend/**` dosyasına dokunmaz.

- DOM-006 doğrulama tamamlandı: fiyatlı tüketim özeti tüm açık tüketim satırlarını materialId/hardwareId + özgün birim ile eşleştirir; eksik fiyat/kimlik veya kenar bandı kimliği eksikliğinde toplamı hazır göstermez. CI #44048122112, QA #44048122147 ve Pages #44048122140 başarılıdır.


- DOM-007 tamamlandı: [commit ea78777](https://github.com/Taylan789/MobilyaCAD/commit/ea78777b1f2852f0b81b44eb0fe6bb68a84f5157); [CI #44056080300](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080300), [QA #44056080414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080414) (101/101 frontend + 178/178 domain, 0 başarısız) ve [Pages #44056080332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080332) başarılı. Sorumluluk yalnızca domain/production, domain testleri ve sözleşme dokümantasyonuydu; frontend adapter ayrı sahibindedir ve hiçbir `frontend/**` dosyası değiştirilmedi.


- DOM-009 uygulaması başladı: `domain/production/projectQuoteSummary.ts` üretim tüketimi fiyat özeti ile açık işçilik/operasyon tarifelerini tek maliyet motorunda birleştirir. Her iki alt kapsam ready/empty değilse genel toplam yoktur; para birimi uyuşmazlığı blocked olur. Doğrulama bekleniyor.


- DOM-009 tamamlandı: [commit e78152351f679547f064048cceff33063555b9cc](https://github.com/Taylan789/MobilyaCAD/commit/e78152351f679547f064048cceff33063555b9cc); [CI #44072219005](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219005), [QA #44072219133](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219133) ve [Pages #44072218712](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072218712) başarılı. QA: 101/101 frontend + 194/194 domain testi, 0 başarısız; strict shared-domain TypeScript, lint, production build ve production dependency audit eşiği geçti. 32 lint uyarısı ve 4 orta seviye audit bulgusu sürüyor. Sonraki domain görevi DOM-010 fiyat/tarife snapshot sürümleme.


## 17 Kasım 2026 15:43 TRT — DOM-010 doğrulama bekleniyor

- Ürün Geliştirme, fiyatlı teklifin hangi kullanıcı fiyat listesi ve tarife sürümlerini kullandığını tarihli, değiştirilemez domain snapshot'ında saklayan küçük bir dilim hazırladı.
- Snapshot yalnızca teklif ready olduğunda oluşturulur; üretim tüketimi veya işçilik/operasyon satırı varsa ilgili kaynak kimliği, sürümü ve teklif tarihini kapsayan geçerlilik aralığı zorunludur.
- UI, JSON v1 ve CSV adapter'ı ayrı sahiplik alanındadır; bu commit hiçbir frontend dosyasına dokunmaz.
- Commit ve Actions kanıtı AI_PROGRESS.md içinde doğrulama tamamlandığında eklenecektir.


- DOM-010 tamamlandı: [commit 215bfbeae1583505936d0f8f2549fe247a36efa9](https://github.com/Taylan789/MobilyaCAD/commit/215bfbeae1583505936d0f8f2549fe247a36efa9); [CI #44086836332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836332), [QA #44086836369](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836369) başarılı (101/101 frontend + 203/203 domain testi, 0 başarısız); [Pages #44086836270](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836270) başarılı. Yeni fiyat/tarife snapshot modülü strict TypeScript kontrolünden geçti. Sonraki görev DOM-011 teklif revizyon zarfıdır.


- DOM-011 uygulandı ve doğrulama bekliyor: domain/production/projectQuoteRevision.ts ile hazır teklif snapshot'ını ayrı, salt okunur revizyon zarfına bağlayan domain API'si eklendi. Mevcut proje JSON v1 serializer/parser ve frontend dosyaları değiştirilmedi. CI/QA sonucu gelmeden DONE işaretlenmeyecek.


- DOM-011 ilk QA #44106880875: 203/204 domain testi geçti; tek hata yeni test modülünün proje agregatörü fixture şekliydi. CI #44106880747 ve Pages #44106880876 başarılı. Fixture ve strict TypeScript daraltması düzeltildi; yeni QA doğrulaması bekleniyor.
