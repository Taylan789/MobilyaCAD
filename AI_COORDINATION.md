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
