# MobilyaCAD — AI Coordination Board

Bu dosya üç mevcut ajanın ortak görev panosu ve entegrasyon sözleşmesidir.
Çalışma dalı: `dev/github-work`. `main` kesinlikle kullanılmaz.

## Ajan sahipliği

| Ajan | Sahiplik | Yasak |
|---|---|---|
| Arayüz Tasarımı | `frontend/**` | domain/engine/test/docs/CI dosyalarını değiştirmek |
| Otonom Ürün Geliştirme | frontend dışı domain/engine/production hesapları, testler, dokümantasyon ve CI | `frontend/**` dosyalarını değiştirmek |
| Kalite Denetimi | salt okunur entegrasyon, CI/QA ve PR denetimi | dosya/branch/commit/PR değişikliği veya merge |

## Çalışma protokolü

1. Her ajan çalışmaya başlamadan önce bu panoyu, güncel `dev/github-work` HEAD'ini, açık PR'ları ve son Actions sonuçlarını kontrol eder.
2. Yalnızca kendi sahiplik alanındaki görevi alır. Başka ajanın dosyalarını değiştirmez.
3. Bir görev başka ajanın alanına giriyorsa uygulamaya kalkışmaz; gerekli API/veri sözleşmesini ve kabul kriterini bu panoya veya PR açıklamasına yazar.
4. Aynı görevin iki kez yapılmasını önlemek için görev kimliği, sahip, durum ve son commit/PR kaydı kullanılır.
5. Geliştirme ajanı görevi bitirince gerçek commit/PR ve test sonuçlarını ekler. Test çalışmadıysa başarılı diye işaretlemez.
6. QA ajanı panoyu salt okunur kullanır; çakışma, eksik sözleşme veya test riski bulursa raporunda görev kimliğiyle belirtir.
7. Aynı SHA için başarılı kontroller tekrar çalıştırılmaz. Yeni SHA/PR veya başarısız sonuç olduğunda ilgili kontroller incelenir.
8. Herhangi bir görev fiziksel CNC/makine güvenliği, doğrulanmamış üretim standardı veya gerçek üretici ölçüsü gerektiriyorsa varsayım uydurulmaz; açıkça blokaj olarak kaydedilir.

## Ortak entegrasyon sözleşmesi

- Domain/üretim hesaplamalarının tek doğruluk kaynağı domain katmanıdır; frontend eski paralel hesaplamayı sessizce farklı sonuç üretecek şekilde sürdürmemelidir.
- Kesit/açıklık içeren paneller JSON/CSV dışa aktarımında geometri ve miktar bilgisi kaybolmadan taşınmalıdır. Adaptör bunu desteklemiyorsa dışa aktarım engellenmelidir.
- Frontend, domain üretim raporunun `canExport`, `exportBlockers` ve ilgili parça/operasyon verilerini tüketmelidir; desteklenmeyen çıktıyı üretilebilir gibi göstermemelidir.
- Ölçü birimi mm; adet, parça miktarı ve operasyon toplamları tüm katmanlarda tutarlı olmalıdır.
- CNC koordinatları ve makineye özel kurallar doğrulanmış üretici/makine girdisi olmadan uydurulmaz.

## Öncelikli görev kuyruğu

| ID | Görev | Sahip | Durum | Kabul / teslim kanıtı |
|---|---|---|---|---|
| INT-001 | Domain üretim raporunun frontend entegrasyon sözleşmesini netleştir; JSON/CSV'de kesit geometrisi kaybını önle veya desteklenmeyen dışa aktarımı engelle | Arayüz Tasarımı (frontend) + Ürün Geliştirme (domain sözleşmesi) | READY | PR/commit, round-trip ve export-block testleri |
| DOM-002 | Banyo dolabı ve diğer ailelerde çoklu açıklık, adet, malzeme ve kalınlık kombinasyonlarının domain entegrasyon testlerini genişlet | Otonom Ürün Geliştirme | READY | regresyon testleri ve başarılı QA |
| QA-003 | INT-001 tamamlandığında domain/frontend veri akışı, export kaybı ve eski PR tabanlarını salt okunur denetle | Kalite Denetimi | BLOCKED: INT-001 | SHA, PR ve gerçek Actions kanıtı |

## Son devir kayıtları

- 2026-11-17 başlangıç HEAD: `ef68f2da2ebd2c18217988875c90e95f4e4383ae`
- Son bilinen CI #324, QA #203 ve Pages #159 başarılıydı; yeni commitlerde tekrar doğrulanmalıdır.
- Eski PR #8 güncel dalın gerisindeydi ve yeni arayüz tasarımını geriye götürme riski taşıyordu; otomatik birleştirilmemelidir.
- Bu dosya yaşayan koordinasyon kaydıdır. Her yeni raporda güncel HEAD ve gerçek teslimat kanıtları esas alınır.
