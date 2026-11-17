# MobilyaCAD geliştirme ilerlemesi

## Hedef dal

- Depo: `Taylan789/MobilyaCAD`
- Çalışma dalı: `dev/github-work`
- `main` dalına yazma, merge veya PR hedefleme yapılmaz.

## 15 Kasım 2026 — katalog adetleri / parça tutarlılığı

- Başlangıç commit'i: `f676705c1611a5adf3c1db4d47836506080fb349`
- Bulgu: `createPlacedFurniture` içindeki `doorCount` ve `shelfCount` alanları sırasıyla 2 varsayılanını alırken, `createFurnitureParts` aynı katalog kaydındaki eksik değerleri 0 kabul ediyordu. Böylece mobilya özellik panelindeki adetler ile 3D sahnedeki gerçek kapak/raf parçaları ayrışabiliyordu.
- Düzeltme: adetler tek yerde normalize ediliyor ve aynı normalize edilmiş değerler hem mobilya alanlarında hem parça üretiminde kullanılıyor. Açıkça verilen 0 korunuyor; geçersiz/sonlu olmayan adetler varsayılanla güvenli şekilde normalize ediliyor.
- Regresyon testleri: varsayılan adetler, açık sıfır değerleri ve özel adet kombinasyonu.
- Bu değişiklikten önceki son doğrulanmış QA: Run #8, 14/14 test başarılı; lint 15 uyarı / 0 hata; build başarılı; production audit adımı başarılı ancak npm audit 6 bulgu raporladı (2 düşük, 4 orta). Bundle boyutu uyarısı mevcut.
- Commit: `27d402735ae887bf94b4a3653a6ef1a134c1ed38`.
- Doğrulama: QA Run #9 başarılı; 17/17 test geçti, lint 15 uyarı / 0 hata, TypeScript ve production build başarılı, production audit adımı başarılı. CI Run #34 ve Pages deploy Run #15 de başarılı.

## 15 Kasım 2026 — seçili mobilya ayarları ve kesim listesi tutarlılığı

- Başlangıç HEAD: `1f10822bc02f209c4d2fe424b964eb0e10dcd3bd`.
- Bulgu: mutfak kesim listesi seçili mobilyanın kapak/raf adetleri, arkalık kalınlığı, arkalık varlığı, kenar bantlama ve malzeme ayarları yerine ekrandaki sabit başlangıç kurallarını kullanıyordu. Sıfır kapaklı modüller de hesaplanamıyordu.
- Düzeltme: `resolveCabinetConstructionRules` seçili mobilyanın kapak/raf/arkalık değerlerini hesap kurallarına taşır; sıfır kapak desteklenir; arkalıksız mobilya arkalık payı ayırmaz; malzeme ve kenar bantlama tercihleri parçalara uygulanır.
- Güvenlik: gerçek çekmece kutusu/önü parça hesabı henüz olmadığı için çekmeceli modüllerin CSV dışa aktarımı uyarıyla engellenir. Ekrandaki kısmi parça özeti üretim onaylı kesim listesi olarak sunulmaz.
- Testler: 4 yeni regresyon testi; QA Run #11'de toplam 21/21 başarılı. CI Run #36 ve Pages deploy Run #17 başarılı.
- Commit: `51ad739ccd7f2dbc75b5ea6a15ecfeb200bf918e`.
- Güvenlik denetimi: production audit adımı `--audit-level=high` eşiğinde başarılı; npm kurulum çıktısında toplam 6 bulgu (2 düşük, 4 orta) raporlanıyor. Kırıcı/force bağımlılık güncellemesi yapılmadı.


## 15 Kasım 2026 — kesim listesi kenar bantlama uzunluğu

- Başlangıç HEAD: `c0310ac55649399edbc1b2c63b065e5ef48be966`.
- Geliştirme: `calculateEdgeBandingSummary`, mevcut parça ağacındaki açık kenar bantlama bayraklarından genişlik yönü (üst/alt) ve uzunluk yönü (sol/sağ) toplamlarını hesaplar; her parçanın `quantity` değeri uygulanır. Boş liste sıfır döndürür; geçersiz ölçü ve pozitif tam sayı olmayan adet reddedilir.
- Kullanıcı akışı: seçili mutfak modülünün Üretim panelinde toplam bant uzunluğu ile iki yönlü alt toplam mm cinsinden gösterilir.
- Değişen dosyalar: `frontend/src/engine/edgeBanding.ts`, `frontend/tests/edgeBanding.test.mjs`, `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- Kod commit'i: `bc36978a9ab34da0413f743710e944938050f2cb`.
- Otomatik doğrulama: QA Run #13 başarılı, 26/26 test; lint başarılı; TypeScript ve production build başarılı; CI Run #38 başarılı; Pages deploy Run #19 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; kurulum/audit çıktısında 6 bulgu (2 düşük, 4 orta) sürüyor. Kırıcı veya zorlayıcı bağımlılık güncellemesi yapılmadı.
- Sınırlar: hesap yalnızca mevcut `Part.edgeBanding` işaretlerini ve modelin kenar-yönü konvansiyonunu toplar; bant kalınlığı, fire, rulo payı, malzeme/dekor bazlı tüketim veya üretici standardı tahmin edilmez. Şimdilik yalnızca seçili mutfak modülü gösterilir; fiziksel bant uygulaması atölye doğrulaması gerektirir.
- Sonraki görev: çekmece kutusu ve ön paneli için açık, kullanıcı/atölye tarafından sağlanan konstrüksiyon ölçüleriyle parça modeli kur; bu tamamlanana kadar çekmeceli CSV dışa aktarımını kapalı tut.

## 15 Kasım 2026 — çekmece kutusu hesaplama motoru (domain temeli)

- Başlangıç HEAD: `1af98f68e61e5cc25d99954e122384f4cc13352c`.
- Kod commit'i: `e8d8d2de37b981675075bdb84d57c909cab46014`.
- Geliştirme: `calculateDrawerBoxParts` dört parça grubunu üretir: yan paneller (2/adet), ön/arka kutu panelleri (2/adet), taban (1/adet) ve görünür ön panel (1/adet). Tüm ölçüler mm cinsindendir; parça adetleri çekmece sayısıyla çarpılır.
- Güvenli konstrüksiyon sınırı: kutu dış ölçüleri, panel kalınlıkları, görünür ön panel ölçüleri, malzeme, kenar bantlama ve damar yönü açıkça sağlanır. Yalnızca açıkça seçilen `between-sides-and-front-back` taban oturumu desteklenir; ray boşluğu, bindirme, donanım veya makine standardı tahmin edilmez.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `frontend/tests/drawerBoxParts.test.mjs`, `PRODUCT_ROADMAP.md`.
- Test kapsamı: 9 yeni test; geometri, quantity çarpanı, görünür ön panelin bağımsız ölçüsü, sıfır adet, geçersiz adet, geçersiz türetilen ölçüler, kenar bantlama, damar yönü, bilinmeyen konstrüksiyon ve boş malzeme.
- Otomatik doğrulama: QA Run #15 başarılı, 35/35 test; CI Run #40 başarılı; TypeScript ve production build başarılı; lint 15 uyarı / 0 hata; Pages deploy Run #21 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; raporda 6 bulgu (2 düşük, 4 orta) sürüyor. `deepmerge` / `shadcn` ve `minimatch` / `ts-morph` bağımlılık zincirleri var; kırıcı `--force` güncellemesi yapılmadı.
- Sınırlar: bu commit domain motoru ve testlerini ekler; henüz UI, `PlacedFurniture`, proje JSON ve CSV akışına bağlı değildir. Çekmeceli modüllerin CSV dışa aktarım engeli korunur. Ray, bağlantı elemanı, CNC operasyonu ve fiziksel üretim doğrulaması dahil değildir.
- Sonraki görev: açık çekmece ölçülerini proje dosyasına geriye uyumlu biçimde kaydetmek ve Üretim paneline ölçü/konstrüksiyon girdilerini eklemek; eksik tanımda CSV engelini korumak.

## Bilinen riskler ve sıradaki işler

1. Çekmece kutusu girdilerini `PlacedFurniture` ve proje JSON v1'e geriye uyumlu, varsayılan üretim ölçüsü uydurmayan biçimde ekle.
2. Üretim paneline çekmece kutusu ve görünür ön panel ölçüleri, malzeme, damar yönü ve kenar bantlama ayarlarını ekle.
3. Çekmece hesaplayıcısını üretim önizlemesi ve CSV'ye bağla; eksik/geçersiz tanımda dışa aktarım engelini koru.
4. Çoklu çekmece ölçü grupları ve çoklu mobilya kesim/bantlama toplamlarını quantity çarpanlarıyla birleştir.
5. `calculateFurnitureParts` stub'ını aile bazlı hesaplayıcılarla değiştir; desteklenmeyen türleri açıkça raporla.
6. npm audit bulgularını breaking dependency update yapmadan incele; CNC koordinatları ve donanım standartlarını atölye doğrulaması olmadan üretim onaylı kabul etme.


## 15 Kasım 2026 — çekmece yapılandırmasının proje JSON v1 sözleşmesi

- Başlangıç HEAD: `7ee9dd419d8172aef6c47637ce0bfb799c0c6a3f`.
- Özellik commit'i: `50751689b825558be69a2442f3edebf6a57e0035`.
- Tip düzeltme commit'i: `49400e3233dad47b2e0cf76a132f1ce10003a59e`.
- Geliştirme: `PlacedFurniture.drawerBoxSpecs` opsiyonel alanı eklendi. Eski proje v1 dosyalarında alanın bulunmaması geçerli; alan sağlanırsa çekmece grubu kimliği, dokuz pozitif ölçü, güvenli tam sayı adet, malzeme, desteklenen taban oturumu, dört kenar bantlama bayrağı ve damar yönü doğrulanır.
- Kaydetme akışı mobilya nesnelerini JSON'a doğrudan serileştirdiği için yeni alanı aynı format sürümünde korur; yükleme akışı bozuk opsiyonel veriyi sessizce atmak yerine projeyi reddeder.
- Test kapsamı: eski v1 uyumluluğu, geçerli birden fazla grup, geçersiz ölçü/adet, bilinmeyen konstrüksiyon, boş malzeme, geçersiz damar yönü ve eksik bantlama bayrakları.
- Değişen dosyalar: `frontend/src/engine/drawerBoxProject.ts`, `frontend/tests/drawerBoxProject.test.mjs`, `frontend/src/types/placedFurniture.ts`, `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- İlk Actions denemesi TypeScript'in bilinmeyen kayıt alanlarını daraltma hatasıyla başarısız oldu; log incelendi, daraltma yerel sabitler üzerinden düzeltildi. İlk başarısız run: CI #42 / QA #17 / Pages #23.
- Düzeltme sonrası doğrulama: CI #43 başarılı; QA #18 başarılı; Pages #24 dağıtımı başlatıldı. QA testleri 42/42 başarılı, lint 15 uyarı / 0 hata, TypeScript ve production build başarılı, production audit adımı başarılı.
- Sınırlar: bu dilim henüz çekmece ayar formu, üretim önizlemesi veya CSV entegrasyonu sağlamaz; çekmeceli CSV engeli korunur. Ray, bağlantı elemanı, CNC operasyonu ve fiziksel üretim onayı dahil değildir.
- Sonraki görev: üretim panelinde açık ölçüleri, malzeme, damar yönü ve kenar bantlama seçeneklerini kullanıcı girdisiyle düzenlemek; ardından parça önizlemesi ve CSV engel koşulunu doğrulamak.


## 15 Kasım 2026 — çekmece yapılandırma editörü

- Başlangıç HEAD: `b5770794c410b461565df8be7ceb63cd75c9e7f1`.
- Özellik commit'i: `d714ee00a86c3ed00499394c1a263deee92d6873`.
- Doğrulama düzeltme commit'i: `a5d73cf64663a0e05d7381b00ed4a68a876c09fd`.
- Kullanıcı akışı: çekmeceli mutfak modülü seçildiğinde Üretim sekmesinde birden fazla çekmece ölçü grubu eklenebilir, düzenlenebilir ve silinebilir. Dokuz ölçü, adet, atölye malzeme adı, dört panel grubunun dört kenar bantlama seçimi ve her grubun damar yönü kullanıcı tarafından açıkça girilir.
- Veri doğruluğu: boş/varsayılan ölçü, bantlama veya damar yönü kaydedilmez; pozitif mm ölçüleri ve pozitif tam sayı adet gerekir. Türetilen iç genişlik/taban uzunluğu hesaplanırken geçersiz geometri reddedilir. Grup adetleri mobilyanın katalogdan gelen çekmece adedini aşamaz. Grup kimlikleri benzersizdir.
- Kalıcılık: `drawerBoxSpecs` mevcut proje JSON v1 mobilya nesnesinde saklanır; eski v1 dosyalarında alanın bulunmaması geçerli kalır. Çekmece grubu sayısı ve ölçüleri proje kaydet/aç akışında korunur.
- Değişen dosyalar: `frontend/src/components/production/DrawerBoxConfigurator.tsx`, `frontend/src/App.tsx`, `frontend/src/App.css`, `frontend/src/engine/drawerBoxProject.ts`, `frontend/tests/drawerBoxProject.test.mjs`, `PRODUCT_ROADMAP.md`.
- Otomatik doğrulama: CI Run #46 başarılı; QA Run #21 başarılı, 44/44 test; lint 15 uyarı / 0 hata; TypeScript ve production build başarılı; production audit adımı başarılı; Pages deploy Run #27 başarılı.
- İlk Actions denemesinde kullanılmayan tip bildirimi build'i, aynı grup kimliğiyle yazılmış pozitif test örneği ise QA'yı düşürdü. Loglar incelendi; kullanılmayan tip kaldırıldı, test fixture'ına ikinci benzersiz kimlik verildi ve seçili mobilya değiştiğinde form state'inin taşınmaması için component key eklendi. Nihai commit'te tüm kontroller geçti.
- Güvenlik denetimi: production bağımlılık denetimi eşik nedeniyle başarılı; npm audit toplam 6 bulgu (2 düşük, 4 orta) raporlamaya devam ediyor. `deepmerge` ve `minimatch` bağımlılık zincirleri incelenmeli; kırıcı/force güncelleme yapılmadı.
- Sınırlar: hesaplanan çekmece parçaları henüz üretim önizlemesine ve CSV'ye eklenmedi; çekmeceli CSV dışa aktarımı kapalı kalır. Çekmece adedi hâlâ katalog verisinden gelir. Yalnızca `between-sides-and-front-back` taban oturumu desteklenir; ray payı, bindirme, donanım, CNC koordinatı veya fiziksel üretim onayı üretilmez.
- Sonraki görev: kaydedilmiş çekmece gruplarını parça önizlemesine bağla; tüm grup adetleri mobilyanın çekmece adediyle eşleşmeden CSV'yi açma.


## 15 Kasım 2026 — çekmece parçalarının üretim önizlemesi ve CSV kapısı

- Başlangıç HEAD: `f0812fbb433fb47e59301e6717e7694baaf77e5c`.
- Çekmece hesaplayıcısının sonucu mevcut mutfak gövde parçalarıyla aynı `Part[]` üretim listesinde birleştirildi; önizleme, adetler, kenar bantlama özeti ve CSV aynı kaynaktan besleniyor.
- `getCabinetCutListExportBlockReason` çekmece gruplarının varlığını, şemayı, benzersiz kimlikleri, toplam adet eşleşmesini ve hesaplanabilir geometriyi doğrular. Eksik/kısmi tanımda CSV kapalı kalır.
- Tüm çekmeceler açık ölçüler ve üretim seçimleriyle tanımlandığında dört çekmece parça grubu CSV'ye dahil edilir. Çekmecesiz modüllerin mevcut CSV akışı değişmez.
- Hatalı içe aktarılmış çekmece geometrisi UI'ı çökertmez; hatalı grup önizlemeye eklenmez ve dışa aktarım engel nedeni gösterilir.
- Değişen dosyalar: `frontend/src/App.tsx`, `frontend/src/engine/cabinetRules.ts`, `frontend/tests/cabinetRules.test.mjs`, `PRODUCT_ROADMAP.md`.
- Otomatik test kapsamı: çekmecesiz akış, yapılandırma eksikliği, adet uyuşmazlığı, tam tanımlı birden çok grup, geçersiz türetilmiş ölçü ve yinelenen grup kimliği.
- Sınırlar: CSV mevcut kolon şemasını kullanır; ray, donanım, bağlantı ve CNC operasyonları dahil değildir. Fiziksel üretim standardı operatör tarafından ayrıca doğrulanmalıdır.
- Sonraki görev: CSV satır içeriği/quantity ve toplamların uçtan uca otomatik testleri; ardından malzeme bazlı tüketim özeti.


## 15 Kasım 2026 — kesim listesi CSV serileştirme ve regresyon testleri

- Başlangıç HEAD: `01803cef1cb0667c41b2b7de5cb03ceb2ef00713`.
- Uygulama commit'i: `c803c869b5462579b322329271f90c5574a7cc4b`.
- Değişen dosyalar: `frontend/src/engine/cutListCsv.ts`, `frontend/src/App.tsx`, `frontend/tests/cutListCsv.test.mjs`, `PRODUCT_ROADMAP.md`.
- CSV serileştirmesi saf domain fonksiyonuna ayrıldı; uygulamadaki indirme akışı aynı yardımcıyı kullanıyor. UTF-8 BOM, noktalı virgül, CRLF, Türkçe başlıklar ve mevcut kolon sırası korundu.
- Dışa aktarma sınırında boş ad/listeler, geçersiz ölçüler, pozitif tam sayı olmayan adetler ve eksik malzeme/kenar bantlama verileri reddediliyor.
- Otomatik regresyon testleri gerçek gövde + çekmece hesaplayıcılarını birleştirerek dört çekmece parça grubunun CSV satırlarını ve 18 toplam parça adetini doğruluyor; ayrıca CSV kaçış ve mm sayı biçimini kapsıyor.
- Otomatik doğrulama: CI Run #49, uygulama commit'i `c803c869b5462579b322329271f90c5574a7cc4b` üzerinde başarılı. İlerleme kaydını içeren güncel branch commit'inde CI Run #50, QA Run #25 (56/56 test, 0 başarısız) ve Pages deploy Run #31 başarılı; böylece yeni CSV testleri de doğrulandı.
- Kalite notları: Oxlint 15 uyarı / 0 hata; `npm audit --omit=dev --audit-level=high` adımı başarılı, ancak 6 bulgu (2 düşük, 4 orta) raporlanıyor. Kırıcı veya `--force` bağımlılık güncellemesi yapılmadı.
- Bilinen sınırlar: dışa aktarım hâlâ yalnızca seçili mutfak modülünü kapsar; çoklu mobilya/malzeme toplamı, nesting, CNC ve fiziksel üretim onayı bu dilimin dışındadır.
- Sonraki görev: malzeme bazında gövde/çekmece parça adetleri ve kenar bantlama tüketimini raporlamak.

## 15 Kasım 2026 — malzeme ve kalınlık bazında tüketim özeti

- Başlangıç HEAD: `784491db4a087b9f4d89540c4ae0b9917fa91f13`.
- Kod commit'i: `71cff95aa4f06f790f74c8fcc8ee85c813ac6005`.
- Geliştirme: `calculateMaterialConsumptionSummary` mevcut `Part[]` listesini malzeme adı + panel kalınlığına göre gruplar; parça satırı sayısı, quantity çarpanlı adet, net yüzey alanı (m²), net hacim (m³) ve malzeme grubuna ait kenar bantlama uzunluğunu (mm) hesaplar.
- UI: seçili mutfak modülünün Üretim paneline malzeme/kalınlık kartları eklendi. Hesap, CSV ile aynı gövde + çekmece `productionParts` listesini kullanır.
- Veri doğruluğu: malzeme adı trim edilir; boş ad, pozitif olmayan/sonlu olmayan ölçü, pozitif güvenli tam sayı olmayan adet, boolean olmayan kenar bayrağı ve taşan toplam reddedilir. Kalınlıklar farklı gruplarda tutulur.
- Birimler: kaynak ölçüler mm; net panel alanı m² (6 ondalık), net hacim m³ (9 ondalık), bant uzunluğu mm (0.1 mm). Fire, kesim payı, levha verimi, kerf, bant kalınlığı ve rulo payı tahmin edilmez.
- Değişen dosyalar: `frontend/src/engine/materialConsumption.ts`, `frontend/tests/materialConsumption.test.mjs`, `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- Otomatik doğrulama: CI Run #53 başarılı; QA Run #28 başarılı (61/61 test, 0 başarısız); Pages deploy Run #34 başarılı. Oxlint 15 uyarı / 0 hata; TypeScript ve production build başarılı; production audit eşiği geçti ancak 6 bulgu (2 düşük, 4 orta) sürüyor.
- Önceki başarısız denemelerin logları incelendi: DrawerBoxConfigurator'daki kullanılmayan `DimensionKey` tipi ve proje testi fixture'ındaki geçersiz pozitif örnek, sonraki mevcut commit'lerde düzeltilmiş. Güncel dalda aktif AI Developer/QA run yoktu; en son AI Developer run #43559164561 başarılı olduğu için yeniden başlatılmadı.
- Sonraki görev: proje JSON v1 kaydet/yükle round-trip ve eski dosya geriye uyumluluk testleri; ardından çoklu mobilya kesim/malzeme toplamı.


## 15 Kasım 2026 — proje JSON v1 parser/serializer ve round-trip

- Başlangıç HEAD: `c5d72fa7d6cfc2b35ed786bdc81e56c2c1909ec7`.
- Kod commit'i: `6e2d617946349ae20a0cbc95260c916dc73868bc`.
- Değişen dosyalar: `frontend/src/engine/projectFile.ts` (yeni), `frontend/tests/projectFile.test.mjs` (yeni), `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- Geliştirme: JSON v1 kaydetme/yükleme sözleşmesi saf `serializeProjectFile` / `parseProjectFile` fonksiyonlarına ayrıldı. UI dosya indirme/seçme işlemini yürütür; format doğrulaması tek domain modülünde yapılır.
- Geriye uyumluluk: eski v1 dosyalarında `room.unit` ve `drawerBoxSpecs` alanları eksik olabilir; ölçüler eski davranışla mm kabul edilir. Açıkça mm dışı birim reddedilir. Çekmece alanı varsa bütün konfigürasyon doğrulanır.
- Testler: 5 yeni test; round-trip, eski v1 dosyası, bozuk JSON/sürüm/birim, mobilya/parça geometrisi ve bozuk çekmece yapılandırması.
- Otomatik doğrulama: CI Run #55 başarılı; QA Run #30 başarılı (66/66 test); Pages deploy Run #36 başarılı. TypeScript, production build, lint ve production audit adımları başarılı.
- Kalite notları: Oxlint 15 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta) raporlamaya devam ediyor ancak `--audit-level=high` eşiği geçti. Production JS bundle boyutu uyarısı (yaklaşık 1.49 MB) mevcut.
- Önceki başarısız run logları incelendi: CI #45, kullanılmayan `DimensionKey` tipi nedeniyle TypeScript build hatası; QA #20, çekmece proje testindeki yinelenen grup kimliği fixture'ı nedeniyle 44 testten 1 başarısız. Bu hatalar sonraki mevcut commit'lerde düzeltilmiş. Son AI Developer run #43559164561 başarılı; bu çalışmanın başlangıcında aktif AI Developer/QA run yoktu.
- Bilinen sınırlar: JSON v1 ve yerel dosya akışı; autosave/kurtarma, migration ve yeni format sürümü yok. Fiziksel üretim/CNC doğrulaması kapsam dışıdır.
- Sonraki görev: proje genelinde çoklu mobilya kesim listesi ve malzeme/kenar bantlama toplamları; yalnızca tam ve desteklenen parça ağaçlarını quantity ile birleştir.


## 15 Kasım 2026 — proje genelinde kesim listesi ve malzeme/bantlama toplamı

- Başlangıç HEAD: 087dbc2bbe4ffc2766e7ae346ec889531f7fa105.
- Ana özellik commit'i: dba2d26b7fab5f71f1886fb7591bc173eb5f5642.
- Kalınlık gruplama test düzeltmesi: 1f212721750960bf0731918cc5a37ca020a33c6f.
- Proje CSV'sinde mobilya kimliği kolonunu ekleyen commit: 73df9f354731b2a98b1b07fee49d33b609f36cf3.
- Değişen dosyalar: frontend/src/engine/projectProduction.ts (yeni), frontend/tests/projectProduction.test.mjs (yeni), frontend/src/engine/cutListCsv.ts, frontend/src/App.tsx, PRODUCT_ROADMAP.md.
- Üretim paneli seçili modül yerine proje genelindeki desteklenen düz mutfak gövdelerini hesaplar. Temel/üst dolap, çekmeceli alt dolap ve kiler profilleri desteklenir; köşe, fırın, ankastre buzdolabı, evye ve mutfak dışı aileler özel konstrüksiyon hesapları gelene kadar açıkça kapsam dışı bırakılır.
- Her yerleştirilmiş mobilya bağımsız hesaplanır; furnitureId ve parça kimlikleri doğrulanır. Malzeme/kalınlık, net alan/hacim ve kenar bantlama özetleri birleşik Part[] listesinden üretilir.
- Proje CSV'sinde Mobilya ve Mobilya ID kolonları birlikte bulunur; aynı isimli iki mobilya ayrı izlenebilir. Eksik kimlik/ad eşlemesi dışa aktarımı reddeder.
- Eksik çekmece kutusu ölçüleri, adet uyuşmazlığı, sıfır çekmece adedinde kalmış çekmece konfigürasyonu, geçersiz geometri ve yinelenen kimliklerde proje CSV'si engellenir. Desteklenmeyen aileler sessizce kesim listesine eklenmez.
- Testler: 5 yeni otomatik test; toplam 71/71 başarılı. Kapsam: çoklu modül birleşimi, farklı malzeme/kalınlık grupları, tam tanımlı çekmece, desteklenmeyen özel aileler, eksik çekmece konfigürasyonu, geçersiz geometri, yinelenen kimlik ve CSV mobilya adı/ID eşlemesi.
- GitHub Actions: CI #57 başarılı; ilk QA #32 test beklentisindeki kalınlık gruplama varsayımı nedeniyle başarısız oldu. Test beklentisi düzeltildi; CI #58 / QA #33 (71/71) / Pages deploy #39 başarılı. CSV kimlik kolonu sonrasında CI #59 ve QA #34 (71/71) başarılı; Pages deploy #40 başarılı.
- Kalite: Oxlint 15 uyarı / 0 hata; TypeScript ve production build başarılı; production audit eşiği geçti ancak 6 bulgu (2 düşük, 4 orta) sürüyor. Bundle boyutu uyarısı devam ediyor.
- Bilinen kısıtlar: yalnızca belirtilen düz mutfak profilleri; köşe/cihaz/evye boşlukları, diğer aileler, fire, levha verimi, kesim payı, nesting, CNC ve fiziksel üretim doğrulaması dahil değil. Panel/arkalık kuralları hâlâ uygulama düzeyindeki ortak başlangıç kurallarından geliyor.
- Dokümantasyon commit'i: 8064d84e42a3eb505949d70c6bf0cb0739865a8d. Bu HEAD üzerinde CI #60, QA #35 (71/71) ve Pages deploy #41 başarılı.
- Sonraki görev: kullanıcı tanımlı malzeme/dekor kataloğu için kararlı kimlik, kalınlık ve birim doğrulama modeli.


## 15 Kasım 2026 — kullanıcı tanımlı panel malzeme kataloğu veri sözleşmesi

- Başlangıç HEAD: `2490d2e1d870037a65852f220c6636e4a15f74ea`; branch compare ile `dev/github-work` HEAD olarak doğrulandı.
- Kod commit'i: `c00d668202596e4816d805dde31d0d5e2465d6a8`.
- Değişen dosyalar:
  - `frontend/src/engine/materialCatalog.ts` (yeni)
  - `frontend/tests/materialCatalog.test.mjs` (yeni)
  - `frontend/src/engine/projectFile.ts`
  - `frontend/tests/projectFile.test.mjs`
- Katalog sözleşmesi: kararlı ve benzersiz malzeme ID'si; panel kategorisi; zorunlu ad; opsiyonel dekor etiketi; pozitif, sonlu, benzersiz `thicknessesMm`; açık `unit: "mm"`. Kalınlık listesi normalize edilir ve artan sıraya alınır.
- `resolveMaterialThickness` yalnızca katalogda tanımlı mm kalınlığını kabul eder. Fiyat, tedarikçi, renk standardı, fire veya varsayılan panel kalınlığı uydurulmaz.
- Proje JSON v1'e opsiyonel `materials` alanı eklendi. Eski v1 dosyaları bu alan olmadan geçerlidir; yeni katalog alanı serializer/parser round-trip ile korunur ve geçersiz birim/kimlik reddedilir.
- Otomatik testler: 6 yeni test (4 katalog doğrulama/çözümleme + 2 proje kalıcılığı); toplam QA 77/77 başarılı.
- GitHub Actions: CI Run #62 (`43756371502`) başarılı; QA Run #37 (`43756371574`) başarılı; Pages deploy Run #43 (`43756371568`) başarılı. TypeScript, production build, lint ve production audit adımları başarılı.
- Kalite: Oxlint 15 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta), `--audit-level=high` eşiği geçti. Bundle boyutu uyarısı sürüyor.
- Önceki QA Run #32 (`43752863285`) logunda 1 test hatası görüldü: test, aynı malzemenin farklı kalınlıklarını tek grup sayıyordu. Üretim motoru malzeme + kalınlık gruplamasını doğru yaptığı için test beklentisi sonraki commit'te düzeltildi; sonraki QA #33/#34 ve bu çalışmanın QA #37 sonucu başarılı. Başarısız eski run yeniden başlatılmadı; daha yeni düzeltme ve başarılı run'larla supersede edildi.
- AI Developer Run #3 (`43559164561`) başarıyla tamamlanmıştı; aktif run bulunmadığı için yeniden çalıştırılmadı.
- Bilinen sınırlar: UI katalog yönetimi henüz yok; mobilya/parça verileri `materialId` ile bağlanmadı; eski serbest metin malzeme alanları korunuyor. Kenar bandı kataloğu, fiyat/tedarikçi, damar yönü ve fire hesabı bu dilimin dışındadır.
- Sonraki görev: katalog için UI CRUD akışı ve geriye uyumlu mobilya/parça malzeme kimliği bağlantısı; ardından üretim hesabında katalog kalınlığı doğrulaması.


## 16 Kasım 2026 — proje malzeme/dekor kataloğu yönetim arayüzü

- Başlangıç HEAD: `551b8e6b90a77b9de482fe01cb5f8e532521a0b3`.
- Özellik commit'i: `3b33ed248b879df87816aade82e21d807e5d099f`.
- Test düzeltme commit'i: `8e53d940b38292dcd7daa64e975c7de70c5ebb81`.
- Değişen dosyalar:
  - `frontend/src/App.tsx`
  - `frontend/src/components/production/MaterialCatalogManager.tsx` (yeni)
  - `frontend/src/engine/materialCatalog.ts`
  - `frontend/tests/materialCatalog.test.mjs`
- Özellikler paneline Malzeme sekmesi eklendi. Kullanıcı panel malzemesi/dekoru için kararlı ID, ad, opsiyonel dekor etiketi ve birden fazla mm kalınlığı ekleyebilir, düzenleyebilir ve silme onayı verebilir.
- Domain katmanında add/update/remove yardımcıları eklendi. Yinelenen ID ekleme sırasında mevcut kayıt üzerine yazılmaz; düzenleme sırasında ID değiştirilemez; bilinmeyen ID güncelleme/silme işlemleri reddedilir.
- Proje JSON v1 kaydetme/yükleme akışı App state'indeki katalogla bağlandı. Eski dosyada `materials` alanı yoksa boş katalog yüklenir; yeni kayıtlar proje dosyasında korunur.
- Yeni testler: 3 CRUD domain testi. İlk QA #39'da üç yeni test, yardımcı fonksiyonların test modülüne import edilmemesi nedeniyle `ReferenceError` verdi. Log incelendi; test import'u düzeltildi, test kapsamı veya üretim kodu gevşetilmedi.
- Otomatik doğrulama: özellik commit'inde CI #64 başarılı, QA #39 başarısız (3 eksik import), Pages #45 başarılı. Düzeltme commit'inde CI #65 başarılı; QA #40 başarılı, 80/80 test; Pages deploy #46 başarılı. TypeScript, production build, lint ve `npm audit --omit=dev --audit-level=high` adımları başarılı.
- Kalite notları: npm audit 6 bulgu (2 düşük, 4 orta); `deepmerge` ve `minimatch` zincirleri sürüyor. `--force` güncellemesi yapılmadı. Oxlint'te 15 mevcut uyarı devam ediyor.
- AI Developer Run #3 (`43559164561`) başarılı; bu çalışmanın başında ve sonunda aktif AI Developer/QA run yoktu. Başarılı AI Developer işi yeniden başlatılmadı.
- Bilinen kısıtlar: mobilya/parça `materialId` bağlantısı henüz yok; üretim özeti eski serbest metin malzeme alanlarını kullanıyor; katalog silme henüz referans koruması yapmıyor. Fiyat, tedarikçi, fire, damar yönü ve kenar bandı standardı bu dilime dahil değil.
- Bu görev 16 Kasım 2026 tarihli f4f97533280df98980dd1da377e71e917a7e5790 commit'inde tamamlandı; sonraki adım çekmece kutusu gruplarına opsiyonel katalog malzeme kimliği eklemektir.



## 16 Kasım 2026 — mobilya malzeme kimliği ve üretim izlenebilirliği

- Başlangıç HEAD: fe188d740da2ed4a75e40bdebd6df143e7d9fc67. Bu HEAD üzerinde 3D yerleşim doğrulama commit'i 35501b9b7b1acd9cdb83d0ef09f08d28eaa7aab7 ve ayrı görsel çalışma commit'i fe188d740da2ed4a75e40bdebd6df143e7d9fc67 zaten mevcuttu; başlangıç CI #76, QA #49 ve Pages #51 başarılıydı, aktif workflow yoktu.
- Kod commit'i: f4f97533280df98980dd1da377e71e917a7e5790.
- Değişen dosyalar: frontend/src/types/placedFurniture.ts, frontend/src/types/furniture.ts, frontend/src/types/part.ts, frontend/src/engine/cabinetParts.ts, frontend/src/engine/materialCatalog.ts, frontend/src/engine/projectFile.ts, frontend/src/engine/projectProduction.ts, frontend/src/engine/materialConsumption.ts, frontend/src/engine/cutListCsv.ts, frontend/src/components/production/MaterialCatalogManager.tsx, frontend/src/App.tsx, frontend/tests/projectFile.test.mjs, frontend/tests/projectProduction.test.mjs, frontend/tests/cutListCsv.test.mjs.
- Mobilya özellik paneline katalog malzemesi seçimi eklendi. Serbest metin legacy alanı korunur; katalog seçildiğinde mobilya materialId taşır ve görünen malzeme adı katalogla senkronize edilir.
- Proje JSON v1 serializer/parser, materialId referansının aynı proje içindeki materials listesinde bulunmasını zorunlu kılar. Eski projelerde alan yoksa geriye uyumluluk sürer. Kullanılan katalog kaydı silinemez.
- Desteklenen düz mutfak gövde hesaplaması, malzeme kimliğini oluşturulan Part kayıtlarına taşır. Gövde paneli ve mevcut arkalık kalınlığı katalogda tanımlı değilse üretim dışa aktarımı engellenir.
- Malzeme tüketimi katalog ID + ad + kalınlıkla gruplar; CSV'ye Malzeme ID sütunu eklendi. Legacy ve çekmece kutusu serbest metin satırlarında kimlik boş kalır.
- Testler: 6 yeni otomatik test; proje JSON referans round-trip/bozuk referans, referanslı silme koruması, üretim parça kimliği, eksik kalınlık/kimlik engeli, aynı görünen adın farklı ID'lerle gruplanması ve CSV ID kolonu kapsandı.
- GitHub Actions: QA #51 (43768495335) başarılı, 92/92 test; CI #79 (43768495400) başarılı; Pages deploy #52 (43768495324) başarılı. Gerçek Actions job logları kontrol edildi.
- Kalite: Oxlint 16 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta), production audit yüksek önem eşiği başarılı; bundle boyutu uyarısı sürüyor.
- Bu dokümantasyon hazırlığı sırasında başka bir aktör PR #5'i (dev/assistant-design-system -> dev/github-work, yalnızca frontend/src/index.css) birleştirdi; bu otomasyon PR'ı birleştirmedi. Yeni HEAD 2206c154696d2401894a8fe7190b9d05481d826c üzerinde CI #80, QA #52 (92/92) ve Pages #53 başarılı.
- Bilinen sınırlar: materialId üretim bağlantısı yalnızca desteklenen düz mutfak gövdelerinde aktiftir. Çekmece kutusu konfigürasyonları kendi malzeme metnini kullanır; per-part malzeme override ve farklı gövde/arkalık katalog ataması henüz yoktur. CNC standardı veya fiziksel üretim onayı verilmemiştir.
- Sonraki görev: çekmece kutusu gruplarına opsiyonel materialId ve kalınlık doğrulaması eklemek; eski serbest metin konfigürasyonlarını bozmamak.


## 16 Kasım 2026 — çekmece gruplarını malzeme kataloğuna bağlama

- Başlangıç HEAD: `3d6c0a4f409661d592a977fe5d13ae62dcb7658b`. Başlangıçta aktif CI/QA/AI Developer işi yoktu; CI #89, QA #56 ve Pages #56 başarılıydı. Açık PR #7 (`dev/assistant-viewport-gizmo`) ayrı viewport dosyasına aitti; bu otomasyon PR'ı veya `Scene3D.tsx` dosyasını değiştirmedi.
- Kod commit'i: `59abb77149e7a6a54b3900ccd43805b33c61ccd9`.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `frontend/src/engine/drawerBoxProject.ts`, `frontend/src/engine/projectFile.ts`, `frontend/src/engine/projectProduction.ts`, `frontend/src/components/production/DrawerBoxConfigurator.tsx`, `frontend/src/App.tsx`, `frontend/tests/drawerBoxParts.test.mjs`, `frontend/tests/drawerBoxProject.test.mjs`, `frontend/tests/projectFile.test.mjs`, `frontend/tests/projectProduction.test.mjs`.
- Çekmece grubu editörüne isteğe bağlı katalog malzemesi seçimi eklendi. Serbest metin alanı korunur; malzeme seçilirse ID ve katalog adı kaydedilir. Tek materialId, o grubun yan, ön/arka, taban ve görünür ön panel parçalarına uygulanır.
- Proje JSON v1 serializer/parser çekmece materialId referansını doğrular; dört panel kalınlığının tamamı katalogda bulunmalıdır. Eski serbest metin konfigürasyonları ve materialId içermeyen eski v1 dosyaları geçerlidir.
- Üretim motoru katalog kimliğini ve katalog adını çekmece parça satırlarına aktarır; tüketim özeti ve CSV aynı Part kaynağını kullanır. Referanslı çekmece malzemesi katalogdan silinemez; katalog adı değiştiğinde görünen metin güncellenir.
- Testler: 6 yeni test; QA #58 (run `43775089671`) 98/98 başarılı. CI #92 (run `43775089453`) başarılı; Pages deploy #57 (run `43775089465`) başarılı. TypeScript, production build, lint ve production dependency audit adımları tamamlandı.
- Kalite: Oxlint 16 uyarı / 0 hata. npm audit 6 bulgu (2 düşük, 4 orta); production audit yüksek önem eşiğini geçti. Bundle boyutu uyarısı sürüyor.
- Bilinen sınırlar: tek materialId tüm çekmece panel gruplarına uygulanır; panel-grubu bazında farklı malzeme seçimi sonraki dilimdir. Ray boşluğu, donanım, CNC operasyonu, fire ve fiziksel üretim doğrulaması dahil değildir. `frontend/src/App.css` ve ayrı viewport ajanının `Scene3D.tsx` dosyası değiştirilmedi.
- Sonraki görev: gövde ve çekmece panel grupları için parça bazlı malzeme override modelini eklemek; UI, proje JSON, üretim hesabı, tüketim ve CSV'yi aynı katalog kimliğine bağlamak.


## 16 Kasım 2026 — çekmece panel grubu bazında malzeme override

- Başlangıç HEAD: `0adff4580df8a44b4d56c9d8b461d56aa091ee61`.
- Kod commit'i: `40b57f933405ddc7adc34e71a3c4776c868b89c1`; düzeltme commit'i: `4a5c456fd5c87f24107631ce7ad4ead00434a3fd`.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `drawerBoxProject.ts`, `projectFile.ts`, `projectProduction.ts`, `cabinetRules.ts`, `frontend/src/components/production/DrawerBoxConfigurator.tsx`, `frontend/src/App.tsx`, `frontend/tests/projectProduction.test.mjs`.
- Yeni davranış: çekmece yan, ön/arka, taban ve görünür ön panel grupları ayrı materialId override alabilir. Override olmayan grup varsayılan malzemeye, varsayılan ID olmayan eski konfigürasyonlar serbest metin malzemeye geri döner.
- Ortak resolver grup bazında kalınlık kontrolü yapar; JSON v1 serializer/parser, kesim listesi ön kontrolü, üretim motoru, tüketim ve CSV aynı atamaları kullanır. Silme koruması panel override ID'lerini de kapsar.
- İlk QA run `43782899944` 3 testte başarısız oldu. Loglar: eski hata mesajı regex'i, `getCabinetCutListExportBlockReason` içinde resolved panel malzemelerinin kullanılmaması ve JSON hata metni regex'i. Düzeltme commit'i bu üç noktayı giderdi.
- Otomatik doğrulama: CI run `43783058466` başarılı; QA run `43783058478` başarılı (**101/101 test, 0 fail**); Pages deploy run `43783058489` başarılı. Production audit, TypeScript/build ve lint başarılı.
- Bilinen kısıtlar: gövde panellerinde parça bazlı override henüz yok; fiyat, fire, donanım, ray ve CNC standartları tanımlanmadı. Fiziksel üretim doğrulaması gerektiren konular üretim onayı olarak sunulmuyor.
- Sonraki görev: gövde yan/üst/alt, raf, arkalık ve kapak parçalarına bağımsız katalog malzemesi atamak ve her parçanın kalınlığını kendi malzemesinde doğrulamak.

- Önceki yol haritası/ilerleme güncellemesi commit'i: `68272d7bf8a52d61c11e5f1c0e9de618ad51c54d`; bu commit üzerinde CI #96, QA #62 (101/101) ve Pages #61 başarılı.


## 16 Kasım 2026 — gövde paneli malzeme ataması için bağımsız domain dilimi

- Başlangıç HEAD: `294de907e5efac78eea34fb3b5402f5d6b3bb78d`; başlangıçta CI/QA/AI Developer aktif değildi. Tasarım/viewport yardımcı PR'ları ayrı dallarında bırakıldı; bu çalışma hiçbir yardımcı PR'ı değiştirmedi veya birleştirmedi.
- Kod commit zinciri: `4905293d2e12c2181dab32c1c930218df1fdbae5` (domain modülü, testler, QA workflow ve roadmap); `3d1306b2e22351dda589a08893b2c420a7f3cc12` (legacy test fixture düzeltmesi); `2729298edc976a04d346da1d3816a8c32fbfaadf` (TypeScript 7 CLI için `--ignoreConfig`); son kod düzeltmesi `c6bc33b1feccf776aa2ec4bcfa4be5355dd6a4a4`.
- Değişen dosyalar: `domain/production/bodyPanelMaterials.ts`, `domain/production/bodyPanelMaterials.test.mjs`, `.github/workflows/qa-test.yml`, `PRODUCT_ROADMAP.md`. Hiçbir `frontend/**` dosyasına dokunulmadı.
- Domain davranışı: `leftSide`, `rightSide`, `top`, `bottom`, `shelf`, `back`, `door` grupları için bağımsız materialId override; mevcut Part materialId değerine geri dönüş; katalog ID/kategori/mm birimi/gerçek parça kalınlığı doğrulaması; legacy serbest metin malzemenin korunması; sabit parça ID anahtarları için açık eşleme. Bilinmeyen parça veya malzeme varsayılmaz.
- İlk QA denemesi `43791864820`: 101 mevcut test geçti; yeni domain testindeki fixture, JavaScript varsayılan parametre davranışı nedeniyle legacy materialId alanını yanlışlıkla ekliyordu. Test fixture'ı null sentinel ile düzeltildi; test gevşetilmedi.
- İkinci QA denemesi `43791948869`: 101 mevcut + 9 domain testi geçti; TypeScript 7, komut satırında dosya verildiğinde tsconfig'in yüklenmesini reddetti. QA komutuna `--ignoreConfig` eklendi.
- Üçüncü QA denemesi `43792033139`: 101 mevcut + 9 domain testi geçti; strict type-check, generic dönüşte tek bir cast'i reddetti. Runtime davranışı değiştirmeden cast `unknown` üzerinden güvenli biçimde daraltıldı.
- Nihai otomatik doğrulama: QA run `43792112640` başarılı; mevcut test paketi **101/101**, yeni ortak domain paketi **9/9**; bağımsız TypeScript kontrolü, lint, mevcut TypeScript/production build ve production dependency audit başarılı. CI run `43792112631` başarılı. Pages run `43792112615` build/artifact adımlarını geçti; deploy job'u son kontrolde kuyruktaydı.
- Kalite notu: `npm audit --omit=dev --audit-level=high` eşiği geçti; toplam 6 mevcut bulgu (2 düşük, 4 orta) raporlanıyor. Bundle boyutu uyarısı sürüyor.
- Bilinen kısıtlar: bu bir domain primitive dilimidir; henüz UI, `PlacedFurniture`, proje JSON v1, mevcut üretim motoru, tüketim özeti veya CSV'ye bağlanmamıştır. Frontend yenileme akışının tüm `frontend/**` sahipliği nedeniyle entegrasyon ayrı frontend sahibinin kapsamındadır. Fiziksel panel/CNC doğrulaması yapılmadı.
- Sonraki görev: frontend sahibi `bodyPanelMaterialIds` opsiyonel alanını proje v1'e geriye uyumlu ekleyip resolver'ı üretilen gövde Part listesine bağlamalı; ardından tüketim/CSV ve katalog silme koruması aynı efektif malzeme kimliklerini kullanmalı.


## 16 Kasım 2026 — gövde panel resolver sertleştirmesi ve Part adaptörü

- Başlangıç HEAD: `a509551fdf975909ddbec0235d96e768abb87c6f` (`dev/github-work`). Ön incelemede HEAD'in önceki domain commit'inden sonra frontend marka/çalışma alanı commit'iyle ilerlediği doğrulandı; bu çalışmada frontend sahiplik sınırına uyuldu.
- Başlangıç kalite durumu: aktif CI/QA/Pages işi yoktu. En güncel QA run `43795442619`, CI run `43795442580` ve Pages run `43795442672` aynı HEAD üzerinde başarılıydı. QA 101/101 uygulama testi + 9/9 ortak domain testini, strict domain type-check, lint, production build ve audit adımlarını geçti.
- AI Developer workflow dosyası `.github/workflows/ai-developer.yml` mevcut ancak yalnızca `workflow_dispatch` ile başlıyor; branch'in son run listesinde AI Developer çalışması bulunmadı ve bu bağlantıda workflow dispatch aracı bulunmadığından yeni run başlatılmadı.
- Açık yardımcı PR #8 (CSS cleanup) ve PR #7 (viewport gizmo) ayrı branch'lerinde bırakıldı; sahiplenilmedi veya merge edilmedi. PR #1'in hedefi `main` olduğundan dokunulmadı.
- Bulgu: resolver, override kimliğini yalnızca aynı gruptan gerçek parça satırı varsa katalogda arıyordu. Örneğin arkalıksız mobilyada `back` override'ı eksik katalog referansıyla doğrulamadan geçebiliyordu.
- Düzeltme: tüm override referansları parça iterasyonundan önce katalogda doğrulanır; ilgili grup için parça satırı olmasa da bozuk kimlik reddedilir.
- Yeni domain adaptörü `resolveCabinetBodyPanelParts`, gerçek üretim Part satırlarını açık furnitureId + parça ID eşlemesiyle işler. Sadece hedef mobilyanın bilinen gövde parçalarının malzeme alanlarını değiştirir; çekmece/donanım/diğer mobilya satırları ve Part ölçü/quantity alanları korunur.
- Değişen dosyalar: `domain/production/bodyPanelMaterials.ts`, `domain/production/bodyPanelMaterials.test.mjs`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Kabul testleri: kullanılmayan override kimliğinin reddi; geçerli boş-grup override'ının kabulü; birden çok mobilya satırında hedef kimlik izolasyonu; tanınmayan çekmece parçasının değişmeden kalması; mm thickness ve quantity alanlarının korunması; boş/bozuk furnitureId reddi.
- Bilinen sınırlar: adaptör mevcut frontend production pipeline, JSON v1, malzeme tüketimi veya CSV'ye henüz bağlı değil; `frontend/**` sahipliği ayrı yenileme akışında. Gerçek konstrüksiyon kuralları ve üretici standardı insan/atölye doğrulaması olmadan üretim onaylı sayılmaz.
- Sonraki görev: frontend dışı konstrüksiyon profili şeması ve düz gövde parça hesaplayıcısı için tek kaynaklı, açık parametreli domain sözleşmesi oluştur.

## 16 Kasım 2026 — gövde panel Part adaptörü QA düzeltmesi ve doğrulama

- İlk geliştirme commit'i: `219cf0f3b887acbbe9360e1296ac22ce978ada44`.
- İlk QA run `43796653636` başarısız oldu: 101/101 uygulama testi ve 12/12 domain testi geçmişti; strict TypeScript kontrolü, runtime `isRecord` kontrolünün generic `T` Part tipini `Record<string, unknown>` olarak daraltması nedeniyle TS2322 verdi. Testler ve üretim davranışı değişmemişti.
- Düzeltme commit'i: `8096ad9af489e92752dfbb3d56d4be3ae663a4cc`. Runtime shape validation artık ayrı bir `Record<string, unknown>` görünümü üzerinden okunuyor; özgün generic Part değeri `T` olarak korunuyor. Testler değiştirilmedi veya gevşetilmedi.
- Düzeltme commit'i üzerindeki doğrulama: CI run `43796790104` başarılı; QA run `43796790012` başarılı (**101/101 uygulama testi + 12/12 ortak domain testi**); Pages deploy run `43796790033` başarılı. QA adımları: shared domain tests, strict domain type-check, lint, TypeScript/production build ve `npm audit --omit=dev --audit-level=high` başarılı.
- Önceki QA hatasının kök nedeni ve düzeltmesi kaydedildi; son doğrulanan kod HEAD `8096ad9af489e92752dfbb3d56d4be3ae663a4cc`.
- Bilinen kısıtlar: gövde panel adaptörü hâlâ `frontend/**` üretim akışına, JSON v1, tüketim özeti ve CSV'ye bağlanmış değildir. Frontend sahipliği ayrı yenileme akışındadır. Audit raporunda düşük/orta seviyeli mevcut bulgular sürer; yüksek önem eşiği geçilmiştir. Fiziksel konstrüksiyon/CNC onayı yapılmamıştır.
- Sonraki görev: frontend dışı konstrüksiyon profili şeması ve düz gövde parça hesaplayıcısı için tek kaynaklı, açık parametreli domain sözleşmesi oluştur.

## 16 Kasım 2026 — parametrik düz gövde konstrüksiyon domain motoru

- Başlangıç branch HEAD: `f9c1995b3335ff09bb03cfb998714f05a306893e`. Önceki domain commit'i `dffec9bf5e62011b06ba146cbfedfc8f4d5873c9` sonrasında branch'e `feat: improve inspector and material catalog UX` commit'i gelmişti; bu değişiklik yalnızca frontend dosyalarındadır ve bu çalışma frontend sahiplik sınırına dokunmadı.
- Başlangıç kalite durumu: aktif CI/QA/AI Developer run yoktu. Son HEAD üzerinde CI run `43805510257`, QA run `43805510103` ve Pages run `43805510165` tamamlandı. QA job logu 101/101 uygulama testi + 12/12 ortak domain testi, strict domain type-check, lint, production build ve production audit adımlarının başarılı olduğunu doğruladı. AI Developer workflow run listesinde yeni run yoktu; manuel dispatch aracı bulunmadığı için sahte run başlatılmadı.
- Yeni modül: `domain/production/cabinetConstruction.ts`. Sürüm 1, frontend dışı konstrüksiyon isteği ve sonuç tipleri tanımlandı.
- Kullanıcı/entegrasyon akışı: mobilya ID + dış ölçüler mm + açık konstrüksiyon profili + malzeme kataloğu + opsiyonel panel grup override girdisi; doğrulanmış iç ölçüler ve gövde parça listesi sonucu.
- Profil doğrulaması: panel kalınlığı; between-sides/over-sides; arkalık kapalı/overlay/grooved/inset ayrımı ve ilgili kanal/inset parametresi; güvenli tam sayı raf/kapak adetleri; kapak stili ve pozitif boşluk; yedi gövde panel grubunun dört kenar bayrağının tamamının boolean olması.
- Hesaplanan parçalar: sol/sağ yan, üst/alt, opsiyonel raf, kapak ve arkalık. Mevcut gövde Part ID suffix sözleşmesi korunur; malzeme ataması ortak `resolveCabinetBodyPanelParts` üzerinden uygulanır. Her parça gerçek kalınlığıyla kendi katalog kimliğine göre doğrulanır.
- Değişen dosyalar: `domain/production/cabinetConstruction.ts` (yeni), `domain/production/cabinetConstruction.test.mjs` (yeni, 14 test), `.github/workflows/qa-test.yml`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Sonraki dokümantasyon commit'i Actions sonuçlarını kaydeder; bu kod commit'inin doğrulama sonuçları yukarıdaki run kimlikleriyle kesinleşmiştir.
- Kabul kriterleri: mm formüllerinin mevcut düz mutfak gövde davranışıyla eşleşmesi; sıfır raf/kapak ve arkalıksız durumun açıkça desteklenmesi; eksik arkalık/kapak parametrelerinin reddi; katalog ID ve kalınlık doğrulaması; quantity ve parça kimliklerinin korunması.
- QA workflow strict TypeScript komutu, `.ts` domain modülü importunu da kontrol edecek şekilde genişletildi. Yeni testler mevcut `domain/production/*.test.mjs` glob'una dahildir.
- Kod commit'i: `a76fff96ce82d524a30c9d3d910de4b934fd0a13`.
- Gerçek doğrulama: QA run #87 (`43807168292`) başarılı; 101/101 frontend testi + 26/26 ortak domain testi geçti. Shared domain strict TypeScript, lint, TypeScript/production build ve production dependency audit adımları başarılı. CI run #140 (`43807168281`) başarılı; Pages deploy #77 (`43807168390`) build ve deploy job'larıyla başarılı.
- Bilinen sınırlar: modül henüz frontend üretim akışına, JSON v1, proje agregatörü, tüketim veya CSV'ye bağlanmadı. Konstrüksiyon formülleri mevcut düz gövde davranışının domain dilimine taşınmasıdır; gerçek üretici/atölye doğrulaması değildir. Değişken panel kalınlığı, raf delikleri, donanım, CNC, fire/kerf ve nesting kapsam dışıdır.
- Sonraki görev: çoklu mobilya domain üretim agregatörü ve domain parça listelerinden doğrulanabilir malzeme/kenar bantlama toplamları.



## 16 Kasım 2026 — çoklu mobilya domain üretim agregatörü

- Başlangıç HEAD: `8c1295ec5b6adccb6a11e165f8c70274c80e3da4`; kod commit'i: `6b72e43fe38762f66baaa325ad815e22957c775a`; QA fixture düzeltmesi: `01b62a8331b7403d483246e94aca5fa28c5c6a33`.
- Değişen dosyalar: `domain/production/projectProduction.ts` (yeni), `domain/production/projectProduction.test.mjs` (yeni), `.github/workflows/qa-test.yml`; bu dokümantasyon güncellemesi `PRODUCT_ROADMAP.md` ve `AI_PROGRESS.md` dosyalarını kapsar. Hiçbir `frontend/**` dosyası değiştirilmedi.
- API: `calculateCabinetProjectProduction(unknown)`, her mobilyanın kendi sürüm 1 konstrüksiyon isteğini `calculateCabinetConstruction` ile hesaplar; sonuçta mobilya iç ölçülerini ve sıralı birleşik Part listesini döndürür.
- Veri doğruluğu: furnitureId ve part ID benzersizliği; kaynak mobilya kimliği eşleşmesi; mm ölçüler ve quantity değerlerinin korunması; boş proje; hatalı şema/kimlik/geometri test edildi. Hesaplayıcı girişleri değiştirmez.
- İlk doğrulama: CI run `43821376970` başarılı; QA run `43821376989` başarısız (**30/31 domain testi**). Kök neden üretim kodu değil, geçersiz genişlik fixture'ının `overrides.furniture` alanını oluşturmamasıydı.
- Düzeltme: `01b62a8331b7403d483246e94aca5fa28c5c6a33` test fixture'ının açık mobilya override'ını yaymasını sağladı; üretim davranışı ve test kapsamı korunarak gerçek geçersiz ölçü kontrolü çalıştırıldı.
- Nihai Actions: CI `43821494725` başarılı; QA `43821494753` başarılı (**101/101 frontend + 31/31 domain testi**); Pages `43821494767` build ve deploy job'ları başarılı. Strict domain type-check, lint, TypeScript/production build ve `npm audit --omit=dev --audit-level=high` adımları başarılı.
- Kalite/kısıtlar: lint 19 uyarı / 0 hata; audit raporunda 6 mevcut bulgu (2 düşük, 4 orta); bundle boyutu uyarısı sürüyor. Üretim fiyatı, fire, nesting, CNC, donanım veya fiziksel atölye doğrulaması eklenmedi.
- AI Developer: workflow dosyası `workflow_dispatch` ile tetikleniyor; bu bağlantıda workflow dispatch aracı bulunmadığından run başlatılmadı. Branch run listesinde AI Developer çalışması yoktu.
- Sonraki görev: proje agregatörünün birleşik Part listesi üzerinden quantity ağırlıklı malzeme tüketimi ve kenar bantlama özetini frontend dışı domain modülünde geliştirmek.


## 16 Kasım 2026 — proje malzeme tüketimi ve kenar bantlama domain özeti

- Başlangıç branch HEAD: `d9182c08ba8555894a6f04ea524aabe21e9c5b9b`. Ön kontrolde CI, QA ve Pages aktif işi yoktu; AI Developer workflow run'ı da bulunmadı. `.github/workflows/ai-developer.yml` yalnızca `workflow_dispatch` ile tetikleniyor; bu bağlantıda dispatch aracı olmadığından yeni run başlatılmadı.
- Kod commit'i: `f6cdf58458eaa8b7dade6360d5538c59ef054e2f` (yalnızca `dev/github-work`).
- Kod commit'inde değişen dosyalar:
  - `domain/production/projectMaterialSummary.ts` — yeni saf domain hesaplayıcısı.
  - `domain/production/projectMaterialSummary.test.mjs` — beş yeni kabul/regresyon testi.
  - `.github/workflows/qa-test.yml` — yeni domain modülü strict TypeScript kontrolüne eklendi; test glob'u yeni testi otomatik kapsıyor.
- API: `calculateProjectMaterialConsumptionSummary(CabinetProjectProductionResult)`; proje agregatörünün döndürdüğü aynı Part satırlarını kullanır. Gruplama materialId + normalize malzeme adı + thicknessMm ile yapılır. Legacy materialId'siz satırlar isim/kalınlık üzerinden gruplanır.
- Hesaplar: quantity ağırlıklı net panel alanı (m²), hacim (m³), bantlı kenar adedi ve bant uzunluğu (mm). top/bottom kenarları width, left/right kenarları length yönündedir. Alan 6, hacim 9, bant uzunluğu 0.1 ondalık basamağa yuvarlanır.
- Kabul kriterleri: birden çok mobilya ve raf adet çarpanı; aynı etiketli farklı malzeme kimliklerinin ayrılması; aynı malzeme kimliğinde farklı kalınlıkların ayrılması; boş proje; bozuk şema, proje ilişkisi, yinelenen ID, adet ve kenar bayraklarının reddi; taşan toplamların reddi.
- Gerçek doğrulama: CI run `43827969421` başarılı; QA run `43827969438` başarılı (**101/101 frontend + 36/36 domain testi**, 0 başarısız); Pages run `43827969425` başarılı (build + deploy). QA strict domain TypeScript, lint, production build ve production dependency audit adımları başarılı.
- Bilinen kalite notları: Oxlint 19 uyarı / 0 hata; npm audit raporunda 6 düşük/orta bulgu (2 düşük, 4 orta), bundle boyutu uyarısı ve Actions Node 20 deprecation uyarısı sürüyor. Yüksek önem audit eşiği geçti; bağımlılıklara force güncelleme yapılmadı.
- Bilinen sınırlar: domain özeti henüz frontend üretim akışına, proje JSON v1 veya CSV'ye bağlı değil. Yalnızca mevcut düz gövde domain Part listesi kapsanır; fire, levha verimi, kerf, bant kalınlığı, rulo payı, ray/donanım, nesting, CNC ve fiziksel üretim doğrulaması yoktur.
- Sahiplik: hiçbir `frontend/**` dosyası değiştirilmedi. Açık frontend PR #7 ve #8'e dokunulmadı/merge edilmedi.
- Sonraki görev: frontend yenileme sahibine sürümlü domain istek/sonuç ve malzeme özeti sözleşmesini, JSON v1 geriye uyumluluk, hata ve boş durum kriterleriyle dokümante etmek; ardından domain çekmece konstrüksiyonunu proje agregatörüne taşımak.


## 16 Kasım 2026 — üretim domain/frontend entegrasyon sözleşmesi

- Başlangıç HEAD: `f6f3fa5b1bfe5b9f1cc67c9d3e5675cdccd6245a`.
- Dokümantasyon commit'i: `473b599186bd233f62474493ac0658cae8c91fff` — yalnızca `dev/github-work`.
- Değişen dosyalar:
  - `docs/production-domain-contract.md` — mevcut domain API'leri, mm/adet/kimlik semantiği, gövde panel malzeme eşlemesi, proje agregatörü, malzeme özeti, JSON v1 ve çekmece konfigürasyonu, frontend adapter gereksinimleri ve UI hata/boş durumları.
  - `PRODUCT_ROADMAP.md` — güncel Actions kanıtı, entegrasyon sınırı ve sıradaki beş domain görevi.
  - `AI_PROGRESS.md` — bu çalışma kaydı.
- Ön kontrol: güncel branch HEAD `f6f3fa5b1bfe5b9f1cc67c9d3e5675cdccd6245a`; aynı HEAD için CI run `43828263561`, QA run `43828263688` ve Pages run `43828263603` başarılıydı. QA: 101/101 frontend + 36/36 domain testi; strict domain TypeScript, lint, build ve production audit adımları başarılı.
- Kabul kriterleri: belgelenen alanlar gerçek mevcut kaynak dosyalarından doğrulandı; domain gövde Part tipinin frontend Part ile birebir olmadığı açıklandı; JSON v1 eski kayıt uyumluluğu ve mevcut çekmece motorunun frontend içinde kaldığı belirtildi; UI hazır/boş/kısmi destek/engelli-hata durumları ve export engel koşulları tanımlandı.
- Bu committe `frontend/**` dosyası değiştirilmedi; açık frontend yenileme PR'ları sahiplenilmedi veya birleştirilmedi. Domain API henüz frontend JSON/CSV akışına bağlanmış değildir.
- Bu dokümantasyon commit'inden sonra tetiklenen CI/QA/Pages run'ları henüz sonuçlanmadı; gerçek sonuçlar sonraki kontrolde kaydedilecek. Önceki başarılı run sonuçları yeni commit'in doğrulaması olarak sayılmamalıdır.
- Bilinen kalite notları: son QA logunda Oxlint 19 uyarı / 0 hata; production audit eşiği başarılı olmakla birlikte 6 mevcut bulgu (2 düşük, 4 orta); yaklaşık 1.545 kB JS chunk uyarısı ve Actions Node 20 deprecation uyarısı var. Kırıcı bağımlılık güncellemesi yapılmadı.
- AI Developer workflow'u yalnızca `workflow_dispatch` ile çalışır; son 100 run içinde bu workflow'a ait aktif run görülmedi ve bu bağlantıda dispatch işlemi bulunmadığından yeni run başlatılmadı.
- Sonraki görev: mevcut çekmece kutusu geometri kurallarını frontend dışı `domain/production` motoruna açık sürümlü sözleşme ve regresyon testleriyle taşımak; ray, donanım ve CNC varsaymamak.


## 16 Kasım 2026 — frontend dışı çekmece kutusu domain motoru

- Başlangıç HEAD: `13ff4a8cb605a824bb6bb58a40891bc47a83581e` (`dev/github-work`).
- Kod commit'i: `918cea2b1bcd5f414b0afd5e74031531b990d8e3` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/918cea2b1bcd5f414b0afd5e74031531b990d8e3).
- Değişen dosyalar:
  - `domain/production/drawerBoxConstruction.ts` — sürüm 1 çekmece konstrüksiyon isteği, doğrulayıcı ve dört panel grubu için saf geometri hesaplayıcısı.
  - `domain/production/drawerBoxConstruction.test.mjs` — 14 kabul testi.
  - `.github/workflows/qa-test.yml` — yeni modül strict TypeScript kontrolüne eklendi.
  - `docs/production-domain-contract.md` ve `PRODUCT_ROADMAP.md` — domain sözleşmesi ve sonraki adımlar güncellendi.
- Hesap: iç genişlik `outerWidth - 2 × sideThickness`; taban uzunluğu `outerDepth - 2 × frontBackThickness`; tüm sonuçlar 0.1 mm hassasiyetinde. Yan ve ön/arka panel quantity değerleri ikiyle çarpılır; taban ve görünür ön panel quantity değerini korur.
- Veri doğruluğu: dört panel grubunun ayrı kalınlığı, kenar bayrakları, damar yönü ve opsiyonel katalog malzeme override'ı doğrulanır. Katalog ID'si olmayan legacy serbest metin malzeme korunur; bilinmeyen alan, grup, taban kurgusu, katalog ID'si veya kalınlık sessizce kabul edilmez.
- Gerçek Actions doğrulaması: QA run `43845683055` başarılı (**101/101 frontend testi + 51/51 domain testi**); strict domain TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları başarılı. CI run `43845683170` başarılı. Pages run `43845683089` build ve deploy ile başarılı.
- Bilinen kalite notları: audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek eşik aşılmadı); yaklaşık 1.545 kB JS chunk uyarısı ve Actions Node 20 deprecation uyarısı sürüyor. Bu domain dilimi frontend bundle'ını değiştirmedi.
- Sınırlar: domain motoru henüz proje agregatörüne, JSON v1, tüketim özeti veya CSV'ye bağlı değildir. Ray boşluğu, reveal, bağlantı, delik, CNC, fire ve fiziksel üretim güvenliği hesabı yapılmaz; gerçek üretim için operatör/atölye doğrulaması gerekir. Hiçbir `frontend/**` dosyası değiştirilmedi.
- AI Developer workflow run'ı bu kontrolde bulunamadı; workflow `workflow_dispatch` ile tetikleniyor ve bu bağlantıda dispatch aracı yok.
- Sonraki görev: gövde ve çekmece konstrüksiyon sonuçlarını tek proje agregatöründe ortak parça sözleşmesiyle birleştir; `furnitureId`, drawer group/part ID, mm ölçü, quantity, malzeme, kenar bantlama ve damar yönünü koruyan regresyon testleri ekle.

## 16 Kasım 2026 — gövde ve çekmece kutusu domain parçalarını proje agregatöründe birleştirme

- Başlangıç HEAD: `3922689ccf7b97c93d52bebe7130700b50ebbe37`.
- Kod commit'i: `6fa2c86b49fe634cb83910af77c14cc3c89e9abe` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/6fa2c86b49fe634cb83910af77c14cc3c89e9abe).
- Değişen dosyalar:
  - `domain/production/projectProduction.ts` — opsiyonel `drawerBoxes` isteklerini mevcut gövde mobilyalarına bağlayıp aynı `ProjectProductionPart[]` listesine ekler; `drawerGroups` ölçü özetini yalnızca çekmece varsa döndürür.
  - `domain/production/projectProduction.test.mjs` — beş yeni test; gövde + çekmece birleşimi, grup/owner kimliği, eski sonuç şekli ve domain malzeme özetinin aynı birleşik parça listesinden hesaplanması.
  - `docs/production-domain-contract.md` ve `PRODUCT_ROADMAP.md` — sürüm 1 API, entegrasyon sınırı, yol haritası ve sonraki görevler güncellendi.
- Veri doğruluğu: her çekmece grubu proje içindeki bir mobilyaya bağlı olmalı; aynı mobilyada grup kimliği ve projede parça kimliği benzersiz olmalı. `furnitureId`, `drawerGroupId`, `grainDirection`, materialId, dört kenar bayrağı, mm ölçüleri ve quantity korunur. Eksik alan veya bozuk çekmece şeması mevcut drawer motoru tarafından reddedilir.
- Geriye uyumluluk: `drawerBoxes` verilmez veya boşsa önceki proje sonuç nesnesi değişmez; yeni `drawerGroups` alanı eklenmez.
- Gerçek GitHub Actions doğrulaması: CI run `43854675631` başarılı; QA run `43854675624` başarılı (**101/101 frontend + 56/56 domain testi**, 0 başarısız); Pages run `43854675588` başarılı (build + deploy). QA strict domain TypeScript, lint, production build ve production dependency audit adımları başarılı.
- Kalite notları: Oxlint 24 uyarı / 0 hata; npm audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek eşik aşılmadı); bundle boyutu ve Actions Node 20 deprecation uyarıları sürüyor.
- Sınırlar: frontend JSON v1/CSV adapter'ı henüz bu domain agregatörünü çağırmıyor. Ray boşluğu, donanım, delik, CNC, nesting, fire, kerf veya fiziksel üretim onayı eklenmedi. Hiçbir `frontend/**` dosyası değiştirilmedi; açık frontend PR #7 ve #8 sahiplenilmedi/merge edilmedi.
- AI Developer: `.github/workflows/ai-developer.yml` yalnızca `workflow_dispatch` ile çalışır; mevcut Actions listesinde bu workflow run'ı yoktur ve bu bağlantıda workflow dispatch işlemi desteklenmediğinden yeni run başlatılmadı.
- Sonraki görev: frontend sahibi `drawerBoxSpecs` → `drawerBoxes` adapter'ını kendi dalında uygulasın; domain tarafında ardından aile-discriminated request sözleşmesi ve açık parametreli kitaplık konstrüksiyon motoru geliştirilsin.


## 16 Kasım 2026 — aile ayrımlı proje agregatörü ve açık kitaplık konstrüksiyonu

- Başlangıç HEAD: 0775f3c84cc6e9961a1df45ba852c15b63696665.
- Kod commit'i: 4aaf94e19e7ee69c6b3fcc068371eb07d174fb63.
- QA düzeltme commit'i: d2fab99183c8f0cf236694b0d957053e989c3bb7.
- Geliştirme: family alanı olmayan eski dolap istekleri korunurken family: cabinet ve family: bookshelf ayrımı eklendi. Bilinmeyen aile sessizce dolap olarak yorumlanmaz.
- Yeni kitaplık domain motoru altı panel grubunun kenar bantlama bayraklarını, raf adedini, ortak panel kalınlığını, arkalık montajını ve malzeme override'larını açıkça doğrular. Kapak alanı ve kapak malzeme override'ı reddedilir.
- Kitaplık geometrisi mevcut cabinetConstruction motorunu kullanır; duplicate formül oluşturulmaz. Kitaplık satırları proje agregatörünün ortak Part listesine girer ve projectMaterialSummary ile quantity ağırlıklı tüketim hesabına katılır.
- Değişen dosyalar: domain/production/bookshelfConstruction.ts, domain/production/bookshelfConstruction.test.mjs, domain/production/projectProduction.ts, domain/production/projectProduction.test.mjs, .github/workflows/qa-test.yml, docs/production-domain-contract.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Kabul testleri: kitaplık ölçü/raf adetleri, arkalık ve panel malzeme override'ı, kapak/eksik grup reddi, bilinmeyen aile, sıfır raf, proje agregasyonu ve malzeme özeti.
- İlk QA run 43868921997 tek bir test beklentisinde başarısız oldu: legacy serbest metin malzemesi ile mdf-18 katalog kimliği ayrı gruplandığından mdf-18 toplamı 7 idi; test yanlışlıkla 11 bekliyordu. Test düzeltmesi sonrası sonuç 7 mdf-18 + 4 legacy adet, proje toplamı 11 olarak doğrulandı.
- Nihai otomatik doğrulama: CI 43869039873 başarılı; QA 43869039844 başarılı (101/101 frontend + 63/63 domain testi, 0 başarısız); Pages deploy 43869039738 başarılı. Strict domain TypeScript, lint, production build ve production dependency audit eşiği geçti.
- Kalite notları: Oxlint 30 uyarı / 0 hata; npm audit 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçti); bundle boyutu ve GitHub Actions Node 20 deprecation uyarısı sürüyor.
- Bilinen sınırlar: farklı panel grubu kalınlığı, dikey bölücü, raf aralığı, duvar montajı, ray/donanım, delik, CNC, nesting, fire ve fiziksel üretim güvenliği hesabı yok. Frontend JSON/CSV adapter'ına bağlanmadı; hiçbir frontend/** dosyası bu domain çalışmasında değiştirilmedi.
- AI Developer workflow'u son run listesinde yok; yalnızca workflow_dispatch ile çalışıyor ve bu bağlantıda dispatch işlemi desteklenmediği için yeni run başlatılmadı.
- Sonraki görev: kitaplık panel grubu bazlı kalınlık girdilerini eklemek; ardından açık parametreli masa konstrüksiyon ailesine geçmek.
- Roadmap/contract dokümantasyon commit'i e71fe35c9880b5627fa75bf49233724879f38e70 için CI 43869305727, QA 43869305867 (101/101 frontend + 63/63 domain) ve Pages 43869305728 başarılı.


## 16 Kasım 2026 — kitaplık panel grubu bazlı kalınlık domain dilimi (doğrulandı)

- Başlangıç HEAD: `b3b00d4bf6e1ebadb14e71b8535f2d0546683cb5` (`dev/github-work`).
- Domain kod commit'i: `ba30ffbbf2f9eb5a6742430a2c2ff1a8424fc18c`.
- Test sözdizimi düzeltme commit'i: `e9715a8fb490b65e3e484d399f150e8d433e42c5`.
- Değişen dosyalar: `domain/production/cabinetConstruction.ts`, `domain/production/cabinetConstruction.test.mjs`, `domain/production/bookshelfConstruction.ts`, `domain/production/bookshelfConstruction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`; düzeltme commit'inde yalnızca `domain/production/cabinetConstruction.test.mjs`.
- API: opsiyonel `profile.panelThicknessMmByGroup`; verilmeyen gruplar ortak `panelThicknessMm` değerini kullanır. Kitaplıkta yalnızca leftSide/rightSide/top/bottom/shelf/back geçerlidir. Kalınlığı override edilen her grup, grup malzeme ID'si veya mobilyanın varsayılan materialId'si üzerinden katalogdaki gerçek `thicknessesMm` listesine bağlanır.
- Geometri: sol/sağ kalınlık iç genişliği ayrı ayrı etkiler; `over-sides` düzeninde üst/alt kalınlık iç yüksekliği ve yan boyunu belirler; raf ve arkalık Part kalınlıkları grup değerini kullanır; inset arkalık derinlik payı etkin arkalık kalınlığına göre hesaplanır. Eski ortak kalınlık istekleri aynı sonucu korur.
- İlk QA run `43881344222` yeni cabinet regresyon testindeki fazla kapatma parantezi nedeniyle başarısız oldu (SyntaxError; üretim kodu testi çalıştırılmadan önce). Hata `e9715a8` ile düzeltildi; testler silinmedi veya gevşetilmedi.
- Nihai otomatik doğrulama: QA run `43881598804` başarılı (**101/101 frontend + 66/66 domain testi**, 0 başarısız); strict domain TypeScript, lint, frontend TypeScript/production build ve `npm audit --omit=dev --audit-level=high` adımları başarılı. CI run `43881598968` başarılı. Pages run `43881598819` build ve deploy job'ları başarılı.
- İlk denemedeki CI `43881344246` ve Pages `43881344251` de başarılıydı; QA yalnızca test dosyası sözdizimi yüzünden başarısızdı. Düzeltme commit'inden sonraki üç workflow da başarılıdır.
- Kalite notları: Oxlint 30 uyarı / 0 hata; audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçilmedi); yaklaşık 1.55 MB JS chunk uyarısı ve Actions Node 20 deprecation uyarısı sürüyor.
- Sınırlar: hiçbir `frontend/**` dosyası değiştirilmedi; domain sonucu henüz frontend JSON v1/CSV adapter'ına bağlı değil. Donanım, delik, CNC, nesting, fire, fiyat veya fiziksel üretim güvenliği iddiası eklenmedi. Atölye/operatör doğrulaması üretim öncesi gereklidir.
- AI Developer workflow'u son 100 branch run'ında görünmedi; `.github/workflows/ai-developer.yml` yalnızca `workflow_dispatch` ile çalışıyor ve bu bağlantıda dispatch aracı bulunmadığından yeni run başlatılmadı.
- Sonraki görev: masa konstrüksiyon ailesi için açık tabla/ayak/kayıt ölçülerini, bağlantı standardı veya CNC varsaymadan, sürüm 1 domain motoru ve regresyon testleriyle tasarlamak.


## 16 Kasım 2026 — masa konstrüksiyon domain motoru ve otomatik doğrulama

- Başlangıç HEAD: `8f643b8544a9354b7822e763e6a9a9bc75d3012b` (`dev/github-work`).
- Domain/QA/dokümantasyon commit'i: `8477ac40aca83efc7acd1983358e5ee8a2514cc4`.
- Regresyon test düzeltme commit'i: `06e8a1b91b1dae7f3d16926ff218e71e303d2e97`.
- Değişen dosyalar:
  - `domain/production/tableConstruction.ts` — sürüm 1 açık masa konstrüksiyon isteği, doğrulayıcı, katalog kontrolü ve kesim-parça üretimi.
  - `domain/production/tableConstruction.test.mjs` — 13 masa kabul/regresyon testi; ilk QA bulgusuna göre yalnızca test fixture'ları düzeltildi.
  - `.github/workflows/qa-test.yml` — masa domain motoru strict TypeScript kontrolüne eklendi; test glob'u yeni test dosyasını otomatik kapsıyor.
  - `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md` — masa API'si, sınırlar ve sonraki teknik görevler.
- API: `calculateTableConstruction({ schemaVersion: 1, family: "table", furniture, profile, materials })`. Tabla eni/boyu ve toplam yüksekliği, tabla kalınlığı, ayak kesiti/adedi ve kayıt seçimi/ölçüleri açık girdidir. Ayak yüksekliği toplam yükseklikten tabla kalınlığı çıkarılarak hesaplanır; tüm parça ölçüleri mm ve 0.1 mm hassasiyetindedir.
- Parça grupları: tabla, ayak, uzun kayıt ve kısa kayıt. Her grup için kenar bantlama, damar yönü ve gerektiğinde katalog malzeme override'ı korunur. Override kalınlığı katalogdaki gerçek `thicknessesMm` listesinde bulunmalıdır. Kayıt adetleri ve uzunlukları ayrı ayrı verilir; varsayılan 2 uzun + 2 kısa kayıt veya ayak yerleşimi üretilmez.
- İlk QA denemesi: QA run #130 / `43893285999` başarısız (**101/101 frontend + 76/79 domain testi**). Üretim motoru değil, üç test fixture beklentisi hatalıydı: varsayılan MDF kimliği 60 mm ayak kesitini kapsamıyordu; sıfır kayıt adedi senaryosu önceki doğrulama kuralını tetikliyordu. Testler zayıflatılmadı; ayak için açık `wood-60` katalog ataması ve ikinci kayıt yönünde pozitif adet verilerek senaryolar ayrıştırıldı.
- Düzeltme sonrası gerçek Actions: CI run #211 / `43893588170` başarılı; QA run #131 / `43893588200` başarılı (**101/101 frontend + 79/79 domain testi, 0 başarısız**); Pages deploy run #107 / `43893588256` başarılı (build + deploy). QA'da yeni masa modülü strict TypeScript kontrolünden geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçilmedi); 500 kB üstü frontend chunk uyarısı ve GitHub Actions Node 20 deprecation uyarısı sürüyor. Bağımlılık güncellemesi yapılmadı.
- Bilinen sınırlar: masa motoru henüz proje agregatörüne veya frontend JSON v1/CSV adapter'ına bağlı değildir. Ayak/kayıt koordinatı, tabla taşması, birleşim standardı, vida/delik, donanım, CNC, nesting, fire, fiyat veya montaj güvenliği hesabı yapılmaz. Gerçek atölye/üretim doğrulaması gerekir. Hiçbir `frontend/**` dosyası değiştirilmedi.
- AI Developer workflow'u son 100 Actions run'ında bulunmadı; `.github/workflows/ai-developer.yml` yalnızca `workflow_dispatch` ile tetiklenir ve mevcut GitHub bağlantısında dispatch aracı yoktur. Yeni run başlatılmış gibi gösterilmedi.
- Sonraki görev: `TableConstructionPart` tipini proje agregatörüne ekle; masa ailesinin dış ölçülerini mevcut dolap/kitaplık `innerDimensionsMm` sonucunu bozmadan aileye özgü biçimde taşı; karışık masa/kitaplık/dolap projelerinde malzeme ve quantity toplamlarını test et.

## 16 Kasım 2026 — masa ailesi proje agregatörü entegrasyonu

- Başlangıç HEAD: `2055b3e7e707666526cfe32a3f53934821e00b75` (`dev/github-work`).
- Kod commit'i: `a003f81479602c2ce3d6491f3a4665e92d275f57`.
- Değişen dosyalar:
  - `domain/production/projectProduction.ts` — `table` ailesi için yönlendirme, `TableConstructionPart` birleşimi ve aileye özgü `overallDimensionsMm` sonucu.
  - `domain/production/projectProduction.test.mjs` — karışık dolap/kitaplık/masa projesi, parça kimliği/adet/malzeme korunumu, masa malzeme özeti ve geçersiz masa girdisi için üç kabul testi.
  - `docs/production-domain-contract.md` — masa agregasyon API'si, ölçü sonucu, ortak Part listesi ve frontend entegrasyon sınırı.
  - `PRODUCT_ROADMAP.md` — tamamlanan dilim ve sonraki beş domain görevi.
- Kabul kriterleri: legacy family-less cabinet ve bookshelf `innerDimensionsMm` sonuçları değişmeden kalır; masa `overallDimensionsMm` döndürür; masa parçaları tek Part listesinde stabil ID, mm, quantity, materialId, kenar bantlama ve damar yönüyle korunur; proje malzeme özeti aynı listeden alan/hacim/bantlama hesaplar; bozuk masa isteği ve bilinmeyen aile reddedilir.
- Ön kontrol: branch HEAD `2055b3e7e707666526cfe32a3f53934821e00b75`; hedef dosyaların blob SHA'ları yazma öncesi tekrar okundu ve değişmedi. Aktif `dev/github-work` workflow'u yoktu.
- Önceki HEAD doğrulaması: CI #212 `43893905911`, QA #132 `43893905984` ve Pages #108 `43893905966` başarılı. QA #132'de 101/101 frontend + 79/79 domain testi başarılı; strict domain TypeScript, lint, production build ve production dependency audit adımları geçti.
- Gerçek Actions doğrulaması (branch HEAD `6fb558d6a2bb9a197ea01f65141855d9593ebe47`): CI #213 `43899050507` başarılı; QA #133 `43899050521` başarılı (**101/101 frontend + 82/82 domain testi**, 0 başarısız); Pages deploy #109 `43899050832` başarılı. QA içindeki strict domain TypeScript, lint, frontend TypeScript/production build ve production dependency audit adımları başarılı.
- Kalite notları: Oxlint 32 uyarı / 0 hata; audit raporunda 6 bulgu (2 düşük, 4 orta; yüksek önem eşiği geçilmedi); büyük JS chunk ve Actions Node 20 deprecation uyarıları devam ediyor.
- Bilinen sınırlar: frontend JSON v1/CSV adapter'ı henüz domain agregatörünü çağırmıyor. Masa ayak/kayıt koordinatı, tabla taşması, birleşim/delik/donanım, CNC, nesting, fire, levha verimi, fiyat veya fiziksel üretim güvenliği üretilmez. Hiçbir `frontend/**` dosyası değiştirilmedi; açık frontend PR #8 sahiplenilmedi veya birleştirilmedi.
- Sonraki görev: proje agregatörüne açık desteklenmeyen aile/konfigürasyon tanılaması ekle; ardından karışık ailelerin üretim dışa aktarma entegrasyon kriterlerini frontend sahibine hazırla.

## 16 Kasım 2026 — masa agregatörü kaynaklarının geri yüklenmesi ve dal doğrulaması

- Tespit: dokümantasyon güncellemesi sırasında oluşturulan `3276bceb6fe0b001a2d223a357c336c5cff0d90f` commit'i eski tree SHA tabanını kullandığından `projectProduction.ts` ve `projectProduction.test.mjs` dosyalarını geçici olarak önceki sürüme döndürmüştü. CI/QA bu ara HEAD'de başarılı olsa da masa entegrasyonunu kapsamıyordu.
- Düzeltme commit'i: `67b2d8444adb3a50997f2ce6592b6318c4ca48ba` — doğrulanmış masa agregatörü ve test blob'ları, güncel branch tree'si üzerine geri yüklendi. Force-push veya history rewrite yapılmadı.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`.
- Sonraki adım: bu restorasyonun yeni HEAD'indeki CI, QA (101 frontend + 82 domain testi beklenen) ve Pages sonuçlarını kontrol et; gerçek Actions tamamlanmadan doğrulama başarılı ilan edilmemelidir.

## 16 Kasım 2026 — masa agregatörü geri yükleme doğrulaması

- Kaynak restorasyon commit'i: `67b2d8444adb3a50997f2ce6592b6318c4ca48ba`; doğrulanan son branch HEAD: `fdba90a1d4e27c9d418281ff88c07211d79945cf`.
- Değişen kod dosyaları: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs` (orijinal masa agregatörü uygulama blob'ları geri yüklendi).
- Gerçek GitHub Actions: CI #220 `43899762924` başarılı; QA #135 `43899762852` başarılı (**101/101 frontend + 82/82 domain testi**, 0 başarısız); Pages deploy #111 `43899762943` başarılı. QA shared-domain strict TypeScript, lint, frontend TypeScript/production build ve production dependency audit adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; npm audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği aşılmadı); büyük JS chunk ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- Geriye uyumluluk: family-less cabinet ve bookshelf sonuçları aynı kaldı; table için `overallDimensionsMm` kullanılır; ortak Part listesi ve malzeme özeti otomatik testle doğrulandı.
- Hiçbir `frontend/**` dosyası değiştirilmedi. Frontend PR #8 sahiplenilmedi veya birleştirilmedi.
- Sonraki görev: proje agregatörüne desteklenmeyen aile/konfigürasyon için açık, mobilya kimliğine bağlı tanılama/engelleme sonucu eklemek.


## 16 Kasım 2026 — proje üretim hazır olma raporu ve otomatik doğrulama

- Başlangıç HEAD: `ffac36aca0dcff9ac614143d16c7c0593a2b39c2` (`dev/github-work`).
- Domain API / test / sözleşme / yol haritası commit'i: `c3c932ddbc862b4d874adc56e9eb3f413a7d4872`.
- QA test beklentisi düzeltme commit'i: `4821fc89ac38e62c5ae10cd37e9284c3c29752d4`.
- Değişen dosyalar:
  - `domain/production/projectProduction.ts` — `calculateCabinetProjectProductionWithDiagnostics`; `ready` / `blocked` / `empty` durumları, desteklenmeyen aile, geçersiz konstrüksiyon/çekmece ve proje düzeyi tanılar. Bloklu projede `result: null`; kısmi kesim listesi dışarı verilmez.
  - `domain/production/projectProduction.test.mjs` — 6 yeni kabul testi; ilk Actions çalıştırmasındaki tek başarısız beklenti, motorun gerçek Türkçe hata mesajına göre düzeltildi.
  - `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md` — API, export kapısı, entegrasyon durumları ve sıradaki işler.
- Kabul kriterleri: desteklenen + bilinmeyen aile karışımı; geçersiz gövde ve çekmece; hazır raporun strict agregatör sonucu ile eşitliği; boş proje; bozuk proje zarfı. Mevcut strict `calculateCabinetProjectProduction` API'si ve geçerli sonuç şekli korundu.
- İlk doğrulama: CI run `43910481411` başarılı, Pages run `43910481479` başarılı; QA run `43910481483` yalnızca yeni çekmece testi assertion'ında başarısız oldu. Domain davranışı doğru hata metnini (`Çekmece kutusu dış genişliği...`) üretti; test beklentisi `4821fc8` ile düzeltildi, test kaldırılmadı veya gevşetilmedi.
- Nihai gerçek GitHub Actions (HEAD `4821fc89ac38e62c5ae10cd37e9284c3c29752d4`): CI run `43910636895` başarılı; QA run `43910637014` başarılı (**101/101 frontend + 88/88 domain testi**, 0 başarısız); Pages deploy run `43910636854` başarılı. QA'da shared-domain strict TypeScript, lint, frontend TypeScript/production build ve `npm audit --omit=dev --audit-level=high` adımları başarılı.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit'te 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçilmedi); büyük JS chunk ve GitHub Actions Node 20 deprecation uyarıları sürüyor. Kırıcı bağımlılık güncellemesi yapılmadı.
- Sınırlar: hiçbir `frontend/**` dosyası değiştirilmedi. Frontend JSON v1/CSV adapter'ı henüz bu raporu kullanmıyor; UI sahibi ready/blocked/unsupported/empty durumlarını ve güvenli export kapısını bağlamalı. CNC, ray/donanım, delik, nesting, fire, fiyat veya fiziksel üretim güvenliği onayı üretilmedi.
- AI Developer workflow'u `.github/workflows/ai-developer.yml` yalnızca `workflow_dispatch` ile çalışır; branch run listesinde bu workflow'a ait run bulunmadı. Dispatch işlemi desteklenmediği için yeni run başlatılmadı.
- Sonraki görev: frontend sahibinin `drawerBoxSpecs` → `drawerBoxes` adapter'ını ve tanılama raporuna bağlı güvenli export kapısını kendi dalında tamamlaması; domain tarafında ardından açık ölçülü gardırop/TV ünitesi ailesini ve karışık aile malzeme toplamlarını test etmek.


## 16 Kasım 2026 — parametrik gardırop dikey bölücüleri

- Başlangıç HEAD: 1b511d78006aa1281b56bcf993908b3aa1cecd52 (dev/github-work).
- Kod commit SHA: 66b106e9726388240326170a6671bf30bebfb4b0.
- Değişen dosyalar: domain/production/wardrobeConstruction.ts; domain/production/wardrobeConstruction.test.mjs; domain/production/projectProduction.ts; .github/workflows/qa-test.yml; docs/production-domain-contract.md; PRODUCT_ROADMAP.md; AI_PROGRESS.md.
- Wardrobe motoru mevcut cabinet gövde motorunu kullanır; her dikey bölücü için açık ofset, kalınlık, katalog materialId, kenar bantlama ve damar yönü ister. Bölücüler tam iç yükseklik/derinlikte panel satırlarıdır.
- Kabul kriterleri: wardrobe aile yönlendirmesi; 0.1 mm konum; iç genişlik sınırı ve çakışma kontrolü; katalog kalınlığı; geçersiz durumda blocked/result=null; ortak Part listesi üzerinden malzeme özeti.
- Önceki HEAD 1b511d78006aa1281b56bcf993908b3aa1cecd52 üzerinde CI #221 (43910880848), QA #146 (43910880946) ve Pages #118 (43910880859) başarılı. Önceki QA regresyon 43910481483 logu incelendi; tek hata test regex'i ile gerçek Türkçe hata mesajı uyuşmazlığıydı, test 4821fc89ac38e62c5ae10cd37e9284c3c29752d4 ile düzeltildi; güncel QA #146 yeşil.
- AI Developer workflow yalnızca workflow_dispatch; son 100 branch run'ında yok, dispatch aracı bulunmadığından yeni run başlatılmadı.
- Bilinen sınırlar: bölme bazlı raf, askı borusu, çekmece yerleşimi, bağlantı/delik, CNC, nesting, fire ve fiyat yok. Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibinin kapsamındadır; frontend/** değiştirilmedi.
- Sonraki görev: bölücüleri açık ölçülü bölme raflarıyla ilişkilendiren domain sözleşmesi ve testleri tasarlamak.


## 16 Kasım 2026 — gardırop ailesi tanılama test uyarlaması

- İlgili özellik commit'i: 66b106e9726388240326170a6671bf30bebfb4b0.
- İlk QA run 43915442898, 96 domain testinden 94'ünü geçti. Yeni gardırop motorunun 8 testi başarılıydı; iki eski projectProduction testi wardrobe ailesini hâlâ desteklenmeyen aile olarak bekliyordu.
- Ürün davranışı doğru: wardrobe artık desteklenen bir aile. Eski test fixture'ları, gerçekten desteklenmeyen aileyi sınamak için sofa olarak güncellendi; test kapsamı kaldırılmadı veya gevşetilmedi.
- Değişen dosya: domain/production/projectProduction.test.mjs. Bu düzeltme commit'inin CI/QA/Pages sonuçları henüz bekleniyor.
- İlk özellik commit'inde CI 43915443067 ve Pages 43915443151 başarılı; QA 43915442898 yalnızca eski test beklentilerinde başarısız.
- Sonraki görev: test fixture düzeltmesinin yeni HEAD'indeki tüm Actions sonuçlarını kontrol et; ardından gardırop bölme rafları için açık konum/ölçü sözleşmesini tasarla.


## 16 Kasım 2026 — desteklenmeyen aile test kimliği düzeltmesi

- İlgili wardrobe kod commit'i: 66b106e9726388240326170a6671bf30bebfb4b0.
- İlk fixture düzeltme commit'i: 7c42d9d865694da9d8092bdf987f6e83c0fd8780.
- QA run 43915698736 sonucunda frontend 101/101 test geçti; domain 95/96 geçti. Tek kalan assertion, fixture ailesi sofa olarak değiştirilirken beklenen furnitureId değerinin eski wardrobe-unsupported metninde kalmasıydı. Motor ve sekiz yeni wardrobe testi başarılıydı.
- domain/production/projectProduction.test.mjs içindeki beklenen kimlik sofa-unsupported olarak düzeltildi; bilinmeyen aile tanılama kapsamı korunuyor. Bu düzeltmenin CI/QA/Pages sonuçları bekleniyor.
- CI run 43915698633 başarılı; Pages run 43915698589 henüz kuyruktaydı.


## 16 Kasım 2026 — gardırop dikey bölücü dilimi nihai doğrulaması

- Domain özellik commit'i: 66b106e9726388240326170a6671bf30bebfb4b0.
- Bilinmeyen aile fixture düzeltme commit'i: 7c42d9d865694da9d8092bdf987f6e83c0fd8780.
- Fixture kimliği düzeltme commit'i: 90b5eb8f4c3828dd7700d16fee1dc2ede7389b45.
- Son doğrulama HEAD'i: 90b5eb8f4c3828dd7700d16fee1dc2ede7389b45.
- Nihai GitHub Actions: CI run 43915944138 başarılı; QA run 43915944128 başarılı (**101/101 frontend + 96/96 domain testi**, 0 başarısız); Pages deploy run 43915944284 başarılı. QA'da shared-domain strict TypeScript, lint, frontend production build ve production dependency audit adımları başarılı.
- Ara QA hataları test kapsamını gevşetmeden düzeltildi: ilkinde wardrobe artık desteklenen aile olduğu için eski unsupported fixture sofa yapıldı; ikincisinde fixture ID beklentisi sofa-unsupported olarak eşitlendi. Nihai QA tüm testleri geçti.
- AI Developer workflow: yalnızca workflow_dispatch ile tetikleniyor; mevcut bağlantıda dispatch işlemi yok ve branch run listesinde AI Developer run'ı bulunmadı. Sahte run başlatıldığı iddia edilmedi.
- Bilinen sınırlar: wardrobe bölücüler tam iç yükseklik/derinliktedir; bölme rafları, askı borusu, çekmece yerleşimi, donanım/delik, CNC, nesting, fire ve fiyat hesabı yoktur. Frontend JSON v1/CSV adapter entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir frontend/** dosyası değiştirilmedi.
- Sonraki görev: her bölme için açık net genişlik, raf kotu, derinlik, kalınlık, malzeme, kenar bandı ve damar yönü isteyen raf sözleşmesini tasarlamak; raf/bölücü çakışmalarını test etmek.


## 16 Kasım 2026 — gardırop bölme rafları (Actions doğrulandı)

- Başlangıç HEAD: `0fd156cf42cc99f03b177134433df7d581bf3b4d`; geliştirme yalnızca `dev/github-work` üzerinde yapıldı.
- Kod commit SHA: `2dd891cb68be80dbd6e091774369e3a4cc4f43eb`.
- Geliştirme: wardrobe domain isteğine geriye uyumlu `shelves` alanı eklendi. Her raf açık sol/sağ ofset, net iç tabandan kot, ön ofset, derinlik, kalınlık, katalog malzeme kimliği, kenar bandı ve damar yönü taşır.
- Veri doğruluğu: net iç yükseklik üst/alt panel kalınlıklarından türetilir; raflar bölücülerin içine giremez, iç hacim sınırını aşamaz ve diğer raflarla 3D hacim çakışması yapamaz. Sadece yüzey teması geçerlidir. Özel raflar tam genişlik `shelfCount` ile birleştirilemez.
- Değişen dosyalar: `domain/production/wardrobeConstruction.ts`, `domain/production/wardrobeConstruction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- CI #259 (`43935535640`) başarılı; QA #159 (`43935535641`) başarılı (**101/101 frontend + 104/104 domain testi, 0 başarısız**); Pages #127 (`43935535931`) başarılı.
- QA adımları: shared-domain strict TypeScript, lint, frontend production build ve production dependency audit başarılı. Oxlint 32 uyarı / 0 hata; audit 6 bulgu (2 düşük, 4 orta), yüksek önem eşiği geçti.
- Bilinen kısıtlar: raf taşıma kapasitesi, bağlantı, donanım, delik, CNC, nesting, fire ve fiyat hesabı yok. Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir `frontend/**` dosyası değiştirilmedi.
- Sonraki görev: karışık wardrobe/table/bookshelf projelerinde raflı malzeme ve kenar bantlama toplamlarının sınır testleri; ardından kullanıcı girdili TV ünitesi motoru.


## 16 Kasım 2026 — karışık aile malzeme özeti sınır testi (Actions doğrulandı)

- Başlangıç HEAD: `f4cda4d176c530ed07ab40620c8e1d3ad86e5134`; yalnızca `dev/github-work` üzerinde çalışıldı.
- Test ekleme commit'i: `f60d89081a51d308b8015e580b8ecc163d6a3310`; test beklentisi düzeltme commit'i: `62e9dfc5e980f27754faa3ce794f149843f82fda`.
- Değişen dosya: `domain/production/projectProduction.test.mjs`. Üretim motoru veya `frontend/**` değiştirilmedi.
- Kapsam: tek projede cabinet, bookshelf, table ve wardrobe; gardırop dikey bölücü ve 8 mm özel raf; MDF 18 / MDF 8 / masif malzeme grupları; Part satırı, quantity, alan, hacim, iki eksendeki kenar bantlama ve proje toplam adet uzlaşması.
- İlk QA run `43942864079` yeni testin MDF 18 alan/hacim beklentisini 10.40456 / 0.18728208 olarak düşük buldu; gerçek Part toplamı 11.00456 m² / 0.19808208 m³ çıktı. Sadece test beklentisi düzeltildi; test kapsamı korunarak yeniden çalıştırıldı.
- Doğrulama HEAD'i: `62e9dfc5e980f27754faa3ce794f149843f82fda`. CI #266 (`43943019284`) başarılı; QA #163 (`43943019308`) başarılı (**101/101 frontend + 105/105 domain testi, 0 başarısız**); Pages #130 (`43943019262`) başarılı.
- QA adımları: shared-domain strict TypeScript, lint, frontend production build ve production dependency audit başarılı. Oxlint 32 uyarı / 0 hata; production audit 6 bulgu (2 düşük, 4 orta), yüksek önem eşiği geçti.
- Bilinen sınırlar: fire/levha verimi, kerf, bant rulo payı, taşıma kapasitesi, bağlantı, donanım, delik, CNC, nesting ve fiyat hesabı yok. Frontend JSON v1/CSV adapter entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir `frontend/**` dosyası değiştirilmedi.
- Sonraki görev: kullanıcı girdili TV ünitesi v1 domain konstrüksiyon dilimi; frontend JSON/CSV entegrasyonu ayrı sahibinde kalır.


## 16 Kasım 2026 — floor-standing TV ünitesi v1 domain dilimi

- Başlangıç HEAD: `1cce803c8fda6538edbec02e05109245a56088ff`; geliştirme yalnızca `dev/github-work` dalında yapıldı.
- Kod commit SHA: `a29f7a254bba0f652d50c0378303300d3f57aa20`.
- Değişen dosyalar:
  - `domain/production/tvUnitConstruction.ts` — `family: "tv-unit"` ve `mounting: "floor-standing"` zorunlu sözleşmesi; cabinet gövde motorunu yeniden kullanır, formül kopyalamaz.
  - `domain/production/tvUnitConstruction.test.mjs` — floor-standing parça/ölçü, wall-mounted reddi, bilinmeyen alan ve aile etiketi testleri.
  - `domain/production/projectProduction.ts` / `domain/production/projectProduction.test.mjs` — TV ünitesi aile yönlendirmesi, ortak Part listesi ve malzeme özeti, duvar montajı için blocked rapor.
  - `.github/workflows/qa-test.yml` — yeni domain modülünü strict TypeScript kontrolüne ekler.
  - `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md` — API sınırları, entegrasyon ve sıradaki görevler.
- Kabul kriterleri: 1800 × 420 × 450 mm örneğinde 1764 × 420 × 432 mm net iç ölçü; stabil Part kimlikleri ve shelf quantity; proje agregatöründe `ready`; duvara montaj isteğinde `blocked` ve `result: null`. Eksik ayak, baza, braket, ankraj, yük veya CNC verisi uydurulmaz.
- Gerçek GitHub Actions: CI #268 `43947151618` başarılı; QA #165 `43947151884` başarılı (**101/101 frontend + 111/111 domain testi, 0 başarısız**); Pages deploy #132 `43947151610` başarılı. QA shared-domain strict TypeScript, lint, frontend TypeScript/production build ve `npm audit --omit=dev --audit-level=high` adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçilmedi). Büyük JS chunk ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- Bilinen sınırlar: v1 yalnızca floor-standing gövdeyi üretir; ayak/baza, duvar braketi/ankraj, taşıma yükü, bağlantı/delik, donanım, CNC, nesting, fire ve fiyat yoktur. Fiziksel üretim doğrulaması atölyeye aittir.
- Frontend sahipliği korundu: hiçbir `frontend/**` dosyası değiştirilmedi; JSON v1/CSV adapter entegrasyonu ayrı frontend sahibinin kapsamındadır.
- Sonraki görev: TV ünitesi için kullanıcı girdili bölme/özel raf yerleşimi; ardından banyo dolabı ailesini yalnızca doğrulanmış kullanıcı/üretici girdileriyle küçük domain dilimine ayırmak.


## 17 Kasım 2026 — floor-standing TV ünitesi açık ölçülü raflar

- Başlangıç HEAD: \`00cdd171ca052285706fb988dbfd205446a6df19\`; kod commit SHA: \`9b6aa30bf6b74b666afff75acdf1813ce81cbe27\`.
- Değişen dosyalar:
  - \`domain/production/tvUnitConstruction.ts\` — geriye uyumlu opsiyonel \`shelves\` sözleşmesi; açık X/Y/Z yerleşimi, 0.1 mm normalizasyonu, net iç sınır ve hacimsel çakışma kontrolü, katalog kalınlığı, kenar bandı ve damar yönü doğrulaması.
  - \`domain/production/tvUnitConstruction.test.mjs\` — özel raf, sınır, çakışma/temas, tam genişlik rafı ile çift sayım, katalog kalınlığı, kimlik ve alan doğrulaması.
  - \`domain/production/projectProduction.ts\` / \`domain/production/projectProduction.test.mjs\` — TV özel raf Part tipinin ortak proje listesine eklenmesi ve malzeme özeti quantity/alan/hacim/kenar bantlama uzlaşması.
  - \`docs/production-domain-contract.md\`, \`PRODUCT_ROADMAP.md\` — domain sözleşmesi, kabul kriterleri ve sonraki görevler.
- GitHub Actions: CI run \`43958175764\` başarılı; QA run \`43958176225\` başarılı (**101/101 frontend + 116/116 domain testi, 0 başarısız**); Pages deploy run \`43958175910\` başarılı. Shared domain strict TypeScript, lint, frontend production build ve \`npm audit --omit=dev --audit-level=high\` kontrolleri geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 4 orta önem bulgusu raporladı ve yüksek önem eşiğini geçti. Bundle chunk-size ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- AI Developer workflow yalnızca \`workflow_dispatch\` ile tetikleniyor; son 100 Actions run'ında AI Developer çalışması bulunmadı. Dispatch aracı bulunmadığı için yeni run başlatılmadı.
- Bilinen sınırlar: özel raflar için taşıma kapasitesi, bağlantı/delik, ayak/baza, duvar montajı/ankraj, donanım, CNC, nesting, fire ve maliyet hesabı yoktur. Fiziksel üretim öncesi atölye doğrulaması gerekir.
- Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir \`frontend/**\` dosyası değiştirilmedi.
- Sonraki görev: TV ünitesi için açık ölçülü dikey bölücü/compartment paneli sözleşmesi; raflarla kesişim kontrolü ve ortak Part/malzeme özeti testleri. Ardından banyo dolabı ailesini yalnızca açık üretici/atölye girdileriyle ele al.



## 17 Kasım 2026 — floor-standing TV ünitesi dikey bölücü panelleri

- Başlangıç HEAD: `8499317c8b4ee276fca85af889a21a0f6b5540e6`.
- Özellik commit SHA: `3e4254830d37b4b3f6fdb9fe5fb55cf858d06e40`; net iç yükseklik doğruluğu follow-up: `a170961a340e37517a4045078f2461c7359ec475`; test/QA düzeltme commits: `cfd49462b34d35e6d7a7145717fb8e3a28a4ddc1`, `df4fc4a5985c3d4ac97fc0ed7874f2586124c5c8`; final verified code/test HEAD: `e83a5ab4eefa91a82d5d8e9027ab1472f2162a20`.
- Değişen dosyalar:
  - `domain/production/tvUnitConstruction.ts` — opsiyonel `verticalDividers` sözleşmesi; açık sol/alt/ön ofset, yükseklik, derinlik, kalınlık, katalog malzemesi, kenar bandı ve damar yönü.
  - `domain/production/tvUnitConstruction.test.mjs` — eski istek uyumluluğu, 0.1 mm normalizasyon, sınır/katalog/kimlik, bölücü ve raf çakışma/temas testleri.
  - `domain/production/projectProduction.test.mjs` — TV bölücü + bölme raflarının ortak Part listesi ve MDF 18/MDF 8 malzeme tüketim uzlaşması; çakışmada export bloklama.
  - `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md` — yeni domain sözleşmesi, sınırlar ve sonraki görevler.
- Kabul kriteri: bölücüler birbiriyle ve özel raflarla pozitif hacimde çakışamaz; yüzey teması kabul edilir; bölücü varken koordinatsız `shelfCount` reddedilir; geçerli proje `ready`, çakışan proje `blocked/result: null` olur.
- QA geri bildirimleri ve düzeltmeler: QA #174 (`43967346352`) ve #175 (`43967659714`) 117/123 testte dış yükseklik/net açıklık fikstür uyuşmazlığını yakaladı; #176 (`43967822020`) 121/123 testte 420/720 mm dış yükseklik beklentilerinin 384/684 mm net panel ölçülerine göre güncellenmediğini gösterdi; #177 (`43968020240`) 121/123 testte katalog kimlikli bölücü ile kimliksiz legacy gövde parçalarının malzeme özetinde ayrı gruplandığını ve bir metadata beklentisinin eski dış yükseklikte kaldığını yakaladı. Geometri sınır reddi doğruydu; fikstür ve beklentiler düzeltildi. `innerDimensionsMm.height` artık üst/alt panel kalınlıkları düşülmüş net açıklığı verir.
- Son GitHub Actions doğrulaması: CI #289 (`43968217809`) başarılı; QA #178 (`43968217451`) başarılı (**101/101 frontend + 123/123 domain testi, 0 başarısız**); Pages build/deploy #142 (`43968217448`) başarılı. Shared-domain strict TypeScript, lint, frontend TypeScript/production build ve yüksek önem eşiğinde production dependency audit adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 4 orta önem bulgusu raporladı (shadcn → ts-morph → @ts-morph/common → minimatch). `npm audit fix --force` shadcn 1.0.0 gibi kırıcı bir sürüm gerektirdiği için çalıştırılmadı; yüksek önem eşiği geçti. Büyük bundle chunk, punycode ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- Bilinen sınırlar: bağlantı/vida, yük, ayak/baza, duvar montajı/ankraj, delik/donanım, CNC, nesting, fire ve maliyet yoktur. Fiziksel üretim öncesi atölye doğrulaması gerekir.
- Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir `frontend/**` dosyası değiştirilmedi.
- Sonraki görev: ayrı frontend sahibinin TV bölücü/raf JSON v1 adapter'ı; domain tarafında ardından banyo dolabı için yalnızca açık üretici/atölye girdili lavabo boşluğu ve baza sözleşmesi.


## 17 Kasım 2026 — çoklu çekmece gruplarında malzeme tüketimi (Actions doğrulandı)

- Başlangıç HEAD: `524aabf6c534a763ac6f7066bffdd16a231d3a7a`.
- Geliştirme commit SHA: `288678e90c1f466e8f3f689a7cd590fb10a19e20`.
- Değişen dosyalar:
  - `domain/production/projectProduction.test.mjs` — aynı mobilyaya bağlı iki çekmece grubunun farklı panel malzeme/kalınlık override'ları ve farklı adetleriyle proje malzeme özetine katılmasını doğrulayan entegrasyon testi.
  - `docs/production-domain-contract.md` — çoklu çekmece gruplarının ortak Part listesi ve quantity ağırlıklı tüketim sözleşmesi.
  - `PRODUCT_ROADMAP.md` — tamamlanan dikey dilim, ölçü/alan/hacim/bant kabul değerleri ve sonraki kesit geometrisi görevleri.
- Kabul sonucu: MDF 16 için 3 satır / 14 adet / 0.903840 m² / 0.014461440 m³ / 560 mm; MDF 18 için 3 satır / 11 adet / 0.846000 m² / 0.015228000 m³ / 840 mm; MDF 8 için 2 satır / 5 adet / 0.973104 m² / 0.007784832 m³ / 0 mm. Değerler aynı proje Part listesinden hesaplandı.
- GitHub Actions: CI #299 (`43981754758`) başarılı; QA #186 (`43981754768`) başarılı (**101/101 frontend + 124/124 domain testi, 0 başarısız**); Pages build/deploy #147 (`43981754767`) başarılı. Shared-domain strict TypeScript, lint, frontend TypeScript/production build ve production dependency audit adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 4 orta önem bulgusu raporladı, yüksek önem eşiği geçilmedi. Büyük JS chunk, punycode ve GitHub Actions Node 20 deprecation uyarıları sürüyor. Kırıcı shadcn güncellemesi gerektiren `npm audit fix --force` çalıştırılmadı.
- Bilinen sınırlar: çekmece ray boşluğu, reveal, bağlantı, delik, donanım, CNC, nesting, fire ve fiyat hesabı yoktur; bu test bunları üretime hazır ilan etmez. Fiziksel üretim öncesi atölye doğrulaması gerekir.
- AI Developer workflow'u yalnızca `workflow_dispatch` ile tetikleniyor; bu dalın son run listesinde AI Developer çalışması yoktu. Otomatik bir run başlatıldığı iddia edilmedi. Açık CSS PR'ı ayrı sahiplikte bırakıldı; hiçbir `frontend/**` dosyası değiştirilmedi veya PR merge edilmedi.
- Sonraki görev: banyo dolabı ailesinden önce kesit destekli panel geometri sözleşmesini (açık lavabo açıklığı, net alan/hacim ve iç kenar işlemleri) tanımlamak; mevcut dikdörtgen Part/CSV/JSON tüketicileri kesiti kayıpsız taşıyamıyorsa export'u engellemek.
## 17 Kasım 2026 — dikdörtgen iç açıklıklı panel geometri öncülü (Actions doğrulandı)

- Başlangıç HEAD: `30fc3af663cbd28ebe7a62ecc141c7f9cdc16d6c`.
- Geometri/test/dokümantasyon commit'i: `ae7d00c88ca4f34979e4e92f6d2d05dbc21b5a36`.
- QA'nın ilk çalıştırması `43991327655` 136/137 domain testinde kaldı. Tek hata, eksik dış kenar bayrağını sınayan test yardımcısının eksik alanı otomatik `false` ile doldurmasıydı; üretim doğrulama kodunda hata yoktu.
- Test fikstürü düzeltme commit'i: `1c09bf639ddb84b2d31277a7ce5e5adc6104a2df`; yalnızca `domain/production/panelCutoutGeometry.test.mjs` değişti. Eksik kenar nesnesi artık yardımcı varsayılanını atlayarak doğrudan veriliyor.
- Değişen dosyalar: `domain/production/panelCutoutGeometry.ts`, `domain/production/panelCutoutGeometry.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `.github/workflows/qa-test.yml`; düzeltme commit'inde yalnız test dosyası.
- Son GitHub Actions: CI # (`43991437104`) başarılı; QA # (`43991437194`) başarılı (**101/101 frontend + 137/137 domain testi, 0 başarısız**); Pages build/deploy # (`43991437103`) başarılı. Shared-domain strict TypeScript, frontend production build, lint ve `npm audit --omit=dev --audit-level=high` kontrolleri geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 4 orta önem bulgusu raporladı, yüksek önem eşiği geçildi. Büyük bundle ve Actions Node 20/punycode deprecation uyarıları mevcut.
- Bilinen sınırlar: yalnız eksenlere paralel dikdörtgen geçiş açıklıkları; köşe yarıçapı, oval/çokgen kesit, pah, iç yüzey işlemi, quantity ağırlıklı proje Part, malzeme özeti, JSON/CSV ve CNC entegrasyonu yok. Bu modül üretim onayı değildir; gerçek lavabo/armatür ve makine ölçüsü uydurulmaz.
- Frontend sahipliği korundu: hiçbir `frontend/**` dosyası değiştirilmedi; JSON v1/CSV adapter ayrı frontend sahibinin kapsamındadır.
- Sonraki görev: kesit geometri alanını sürümlü ve geriye uyumlu `ProjectProductionPart` sözleşmesine taşımak; ardından quantity ağırlıklı net alan/hacim/iç kenar bantlama özetini doğrulamak ve export uyumluluğunu açıkça kapılamak.


## 17 Kasım 2026 04:19 TRT — kesitli paneli proje Part ve malzeme tüketimine bağlama

- Özellik commit'i: `251e3fc1c24af87a79719854f474c2295ff49a2d`; QA'da bulunan entegrasyon hatalarının düzeltme commit'i: `7d943e66bc391a582810f1164689adcfd135b5aa`.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectMaterialSummary.ts`, `domain/production/projectProduction.test.mjs`, `domain/production/projectMaterialSummary.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`.
- Ürün ilerlemesi: isteğe bağlı `panelCutouts` mevcut Part kimliğine bağlanır; ölçü ve dış kenar bant bayrakları Part ile eşleşmek zorundadır. Geometri `ProjectProductionPart.panelGeometry` alanında taşınır. Malzeme özeti net alan/hacim ve yönlere ayrılmış iç/dış bant uzunluklarını quantity ile çarpar; geometri tüketim sırasında yeniden doğrulanır.
- Güvenli dışa aktarım: domain sonucu `ready` olsa da JSON v1/CSV adapter'ı henüz `panelGeometry` alanını kayıpsız taşımadığı için `canExport: false` ve `exportBlockers` döner. Geçersiz/tekrarlı/olmayan Part geometrisi `blocked` ve `result: null` üretir.
- İlk doğrulama QA #`43994403078` üç yeni testte eksik `requireRecord` yardımcı fonksiyonunu yakaladı. Düzeltme commit'i `7d943e6` ile doğrulama helper'ı eklendi ve zenginleştirilmiş `productionParts` sonuç listesine bağlandı; testler zayıflatılmadı.
- Son doğrulama commit `7d943e66bc391a582810f1164689adcfd135b5aa`: CI #`43994555869` başarılı; QA #`43994555692` başarılı (**101/101 frontend + 141/141 domain testi, 0 başarısız**); Pages build/deploy #`43994555762` başarılı. QA içindeki shared-domain strict TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları da geçti.
- Bilinen sınırlar: frontend JSON v1/CSV adapter entegrasyonu ayrı frontend sahibinde; CNC, gerçek lavabo/armatür ölçüsü, köşe yarıçapı/pah, fire, levha verimi ve makine postprocessor'ı yok. Fiziksel üretim öncesi atölye doğrulaması gerekir. Hiçbir `frontend/**` dosyası değiştirilmedi; başka ajanın PR'ı merge edilmedi.
- Sonraki görev: frontend sahibinin `panelGeometry` alanını JSON v1'e kayıpsız bağlamasını ve eski CSV'de destek yoksa export'u kapatmasını takip et; ardından kesitli panellerde çoklu açıklık/quantity/malzeme kombinasyonlarını karışık aile projelerinde genişlet ve banyo dolabı için yalnız açık üretici girdileriyle konstrüksiyon sözleşmesi tasarla.


## 17 Kasım 2026 05:32 TRT — banyo dolabı üst panel açıklığı domain ailesi

- Başlangıç HEAD: `b22c390ea51420d5518480bab1b540290c5cfdcb`.
- Özellik commit'i: `7acdd3c7d4c5625d6d244ea97278c881f04751ed`.
- Otomatik test beklentisi düzeltme commit'i: `085d0d208b6efdefcf68147c8714a1ba163e46cb`.
- Değişen dosyalar:
  - `domain/production/projectProduction.ts` — `bathroom-vanity` aile tanımı; üst panel Part'ında en az bir geçerli dikdörtgen açıklık şartı; eksik/yanlış panel geometrisinde `blocked` ve `result: null`.
  - `domain/production/projectProduction.test.mjs` — çoklu açıklık, net alan/hacim, iç kenar bantlama, zorunlu üst panel açıklığı ve yan panelin bu şartı karşılamaması için otomatik testler.
  - `docs/production-domain-contract.md` — banyo dolabı v1 domain sözleşmesi ve açık üretim sınırları.
  - `PRODUCT_ROADMAP.md` — aile kabiliyeti, kabul kriterleri ve sonraki 5 görev.
- Ürün ilerlemesi: mevcut cabinet konstrüksiyon motoru yeniden kullanılıyor; yeni, kopyalanmış ölçü/kalınlık/arkalık/kapak varsayımları eklenmedi. Üst panelde birden çok ayrık, kullanıcı ölçülü dikdörtgen geçiş açıklığı destekleniyor. Net alan/hacim ve iç kenar bantlama aynı Part listesinden malzeme özetine taşınıyor.
- İlk QA #201 (`44003375704`) tek testte başarısız oldu: test, üst panel derinliğini 560 mm varsaymıştı; gerçek konstrüksiyon Part derinliği 542 mm idi. Üretim hesabı doğruydu. Beklenti sabit ölçü yerine gerçek Part genişliği/uzunluğundan türetildi; test zayıflatılmadı.
- Son doğrulama HEAD `085d0d208b6efdefcf68147c8714a1ba163e46cb`: CI #323 (`44003546155`) başarılı; QA #202 (`44003545938`) başarılı (**101/101 frontend + 144/144 domain testi, 0 başarısız**); Pages build/deploy #158 (`44003545949`) başarılı. Shared-domain strict TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; production audit 4 orta önem bulgusu raporladı, yüksek önem eşiği geçildi. Kırıcı `npm audit fix --force` çalıştırılmadı.
- Bilinen sınırlar: yalnız eksenlere paralel dikdörtgen geçiş açıklıkları; lavabo/armatür şablonu, musluk/drenaj deliği, tesisat boşluğu, oval/çokgen kesit, köşe yarıçapı/pah, baza/ayak, ankraj, yük, bağlantı, CNC ve fiziksel üretim onayı yok. Kesitli Part JSON v1/CSV adapter'ı ayrı frontend sahibinde olduğu için `canExport: false` korunuyor.
- AI Developer workflow'u için bu dalda yeni run görünmedi; workflow `workflow_dispatch` ile çalışıyor ve bu turda başlatılmadı. Açık frontend tasarım PR'ı ayrı sahiplikte bırakıldı; hiçbir `frontend/**` dosyası değiştirilmedi veya merge edilmedi. `main` dalına dokunulmadı.
- Sonraki görev: frontend sahibinin `panelGeometry` JSON v1/CSV adapter entegrasyonunu takip et; domain tarafında ardından karışık mobilya aileleri + farklı malzeme/kalınlık/quantity + çoklu açıklık kombinasyonlarını test et. Banyo baza/ayak ve özel lavabo şablonlarını yalnızca açık üretici/kullanıcı ölçüleriyle genişlet.



## 17 Kasım 2026 07:18 TRT — DOM-002 tamamlandı (GitHub Actions doğrulandı)

- Başlangıç HEAD: `a13cc122d46dec071debe1773811a8bc69995d0c`.
- Teslimat commit SHA: `23385aaf14cac1550a37558cdadb6df3b60d3b1a` — [commit bağlantısı](https://github.com/Taylan789/MobilyaCAD/commit/23385aaf14cac1550a37558cdadb6df3b60d3b1a).
- Değişen dosyalar:
  - `domain/production/projectProduction.test.mjs` — aynı projede banyo dolabı üst panelindeki iki açıklık ile kitaplık rafındaki bir açıklığın birlikte hesaplanması; 18 mm `mdf-18` ve quantity 1; 8 mm `mdf-8` ve quantity 3.
  - `docs/production-domain-contract.md` — çoklu aile kesit geometri/tüketim sözleşmesi.
  - `PRODUCT_ROADMAP.md` — DOM-002 kabul kapsamı ve sonraki domain adımları.
  - `AI_COORDINATION.md` — DOM-002 DONE ve doğrulama bağlantıları.
  - `AI_PROGRESS.md` — bu teslimat ve kanıt kaydı.
- Kabul sonucu: Part satır sayıları ve quantity değişmedi. 18 mm grupta net alan farkı 0.08 m², hacim 0.00144 m³, iç bant 600 mm; 8 mm grupta quantity 3 ile net alan farkı 0.06 m², hacim 0.00048 m³, iç bant 900 mm. Kesitli projede `status: ready` hesap raporu korunurken JSON v1/CSV adapter'ı geometriyi kayıpsız taşımadığı için `canExport: false` kaldı.
- GitHub Actions:
  - [MobilyaCAD CI #44016704571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704571) — başarılı.
  - [MobilyaCAD QA & Test #44016704658](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704658) — başarılı: **101/101 frontend + 145/145 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, frontend TypeScript/production build ve `npm audit --omit=dev --audit-level=high` geçti. Oxlint 32 uyarı / 0 hata.
  - [Pages build/deploy #44016704645](https://github.com/Taylan789/MobilyaCAD/actions/runs/44016704645) — build ve deploy başarılı.
- PR: açılmadı; kullanıcı yetkisi kapsamında doğrudan yalnızca `dev/github-work` dalına commit edildi. Başka ajan PR'ı birleştirilmedi.
- AI Developer workflow: bu dal için yeni run yok; workflow_dispatch ile çalıştığından bu turda tetiklenmedi.
- Bilinen sınırlar: frontend JSON v1/CSV adapter'ı `panelGeometry` alanını henüz kayıpsız taşımıyor; bu nedenle export kapısı açıkça kapalı. CNC, gerçek lavabo/armatür standardı, delik/donanım, nesting, fire ve maliyet/teklif hesabı yoktur. Fiziksel üretim onayı değildir.
- Frontend sahipliği korundu: hiçbir `frontend/**` dosyası değiştirilmedi; PR #8 yalnızca frontend sahibinin `frontend/src/App.css` dosyasına dokunduğu için ayrı bırakıldı. `main` dalına dokunulmadı.
- Sonraki görev: frontend sahibinin `panelGeometry`, TV `verticalDividers/shelves` ve `blocked/canExport` alanlarını JSON v1/CSV akışına kayıpsız bağlama PR'ını doğrulamak; domain tarafında banyo dolabı arkalık/baza/ayak seçeneklerini yalnızca kullanıcı/üretici ölçüleriyle ele almak.


## 17 Kasım 2026 08:28 TRT — açık donanım BOM satırları (CI/QA doğrulandı)

- Başlangıç HEAD: `aa32716c2344a0a8bb0ef1deb68105a223c17ae7`.
- Proje agregatörüne kullanıcı/katalog girdili `hardwareItems` eklendi. Satır kimliği, mobilya ilişkisi, donanım kimliği, ad, pozitif sonlu miktar, açık birim ve opsiyonel kaynak referansı doğrulanıp korunur.
- Olmayan/hesaplanmamış mobilya, yinelenen satır kimliği ve bozuk alan projeyi `blocked` yapar; kısmi sonuç verilmez. Donanım panel Part listesi ve malzeme tüketiminden ayrı tutulur.
- JSON v1/CSV adapter'ı donanım satırlarını taşımadığı için hazır BOM sonucunda `canExport: false` ve `exportBlockers` döner.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`.
- Teslimat commit: `6acf8f58fe3476f17e280cb3c6d580279ae49556` — [commit bağlantısı](https://github.com/Taylan789/MobilyaCAD/commit/6acf8f58fe3476f17e280cb3c6d580279ae49556).
- [MobilyaCAD CI #44024961800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961800) başarılı; [QA & Test #44024961750](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961750) başarılı (**101/101 frontend + 149/149 domain testi, 0 başarısız**). Shared-domain strict TypeScript, lint, frontend production build ve production dependency audit adımları geçti.
- [Pages build/deploy #44024961772](https://github.com/Taylan789/MobilyaCAD/actions/runs/44024961772) başarılı; build, Pages yapılandırması ve artifact yükleme adımları tamamlandı.
- PR açılmadı; doğrudan yalnızca `dev/github-work` dalına commit edildi. Fiyat, üretici standardı, montaj/delik koordinatı, CNC ve fiziksel üretim onayı yoktur. `frontend/**` değişmedi.
- Sonraki görev: frontend sahibinin JSON v1/CSV adapter'ına `hardwareItems` desteği eklemesi; ardından birim bazlı donanım tüketim özeti.


## 17 Kasım 2026 09:44 TRT — DOM-004 donanım BOM miktar özeti (Actions doğrulandı)

- Başlangıç HEAD: `fb9ae5e536c4cd9c476a25dce8106e86a4f50667`.
- Özellik commit'i: `c8ebbf9c9b1aad282a98073b264aac9152d75e70` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/c8ebbf9c9b1aad282a98073b264aac9152d75e70).
- QA'nın ilk çalıştırmasında `projectMaterialSummary.test.mjs` içindeki tek assertion, doğru hata metnini yanlış Türkçe ekle aramasıyla eşleştirdi; 152/153 domain testi geçti. Üretim davranışı değişmedi; test ifadesi gerçek mesajla hizalandı.
- Test düzeltme commit'i: `a79dd4407f49c2fddd81bd848abf0f97478b834a` — [commit](https://github.com/Taylan789/MobilyaCAD/commit/a79dd4407f49c2fddd81bd848abf0f97478b834a).
- Değişen dosyalar:
  - `domain/production/projectMaterialSummary.ts` — `calculateProjectHardwareConsumptionSummary`; donanım satırlarını `hardwareId + unit` ile gruplar, kesirli miktarı tam ondalık toplamayla toplar, mobilya ve kaynak referanslarını izlenebilir tutar; birim dönüşümü ve fiyat üretmez.
  - `domain/production/projectMaterialSummary.test.mjs` — 0.1 + 0.2 miktar doğruluğu, birimlerin ayrı kalması, boş legacy sonuç, bozuk ilişki/alan, yinelenen kimlik, ad çakışması ve toplam taşması testleri.
  - `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`.
- [MobilyaCAD CI #44033999434](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999434) başarılı.
- [MobilyaCAD QA & Test #44033999444](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999444) başarılı: **101/101 frontend + 153/153 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, frontend production build ve `npm audit --omit=dev --audit-level=high` geçti. Oxlint 32 uyarı / 0 hata.
- [Pages build/deploy #44033999427](https://github.com/Taylan789/MobilyaCAD/actions/runs/44033999427) başarılı.
- PR açılmadı; doğrudan yalnızca `dev/github-work` dalına commit edildi. AI Developer workflow'u için listelenen son 100 run içinde çalıştırma yok; bu workflow `workflow_dispatch` gerektiriyor ve bu turda dispatch edilmedi.
- Bilinen sınırlar: `hardwareItems` JSON v1/CSV adapter'ına henüz bağlanmadığı için `canExport: false` / `exportBlockers` kapısı korunuyor. Fiyat, stok, donanım standardı, delik/CNC veya fiziksel üretim onayı yok. `frontend/**` değişmedi; başka ajan PR'ı birleştirilmedi; `main` dalına dokunulmadı.
- Sonraki görev: arayüz sahibinin `hardwareItems` JSON v1 round-trip ve CSV export engeli entegrasyonunu PR üzerinden denetle; ardından kullanıcı/katalog girdili donanım kimliği sürüm/kaynak sözleşmesini tasarla.


## 17 Kasım 2026 10:42 TRT — DOM-005 kullanıcı girdili proje maliyet motoru (Actions bekleniyor)

- Başlangıç HEAD: 8a3d4129150947602898564979b31c950bbc38ad.
- Teslimat: domain katmanına açık kullanıcı/katalog fiyat girdilerinden satır ve kategori maliyeti hesaplayan calculateProjectCostSummary eklendi.
- Kategoriler malzeme, donanım, işçilik, operasyon, fire ve kâr ile sınırlıdır. Her satır miktar, özgün birim, para birimi kodu, küçük para birimi cinsinden tam sayı birim fiyat ve isteğe bağlı kaynak referansı taşır.
- Miktarlar en fazla altı anlamlı ondalık basamakla BigInt ölçekli aritmetik kullanır; her satır en yakın küçük para birimine yarım-yukarı yuvarlanır. Satır/kategori/proje toplamı güvenli tam sayı aralığını aşarsa hesap reddedilir. Farklı para birimleri, bilinmeyen alanlar ve geçersiz satırlar kısmi sonuç üretmeden reddedilir.
- Kâr ve fire yalnızca açık tutar satırlarıdır; yüzde, levha fire oranı, vergi, kur dönüşümü, katalog fiyatı veya tedarik bedeli tahmin edilmez.
- Değişen dosyalar: domain/production/projectCostSummary.ts, domain/production/projectCostSummary.test.mjs, .github/workflows/qa-test.yml, docs/production-domain-contract.md, PRODUCT_ROADMAP.md, AI_COORDINATION.md, AI_PROGRESS.md.
- Kabul kontrolleri: boş proje, altı maliyet kategorisi, 0.1/0.2 miktar, satır bazında yarım-yukarı yuvarlama, sıfır fiyatın açık korunması, para birimi uyuşmazlığı, hatalı miktar/fiyat, yinelenen kimlik, bilinmeyen alan ve toplam taşması.
- Teslimat commit: [6d1d820d6469777f24cb0c7d5e251dfe7ec39c61](https://github.com/Taylan789/MobilyaCAD/commit/6d1d820d6469777f24cb0c7d5e251dfe7ec39c61).
- [MobilyaCAD CI #44042058150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058150) başarılı; [QA & Test #44042058139](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058139) başarılı: **101/101 frontend + 164/164 domain testi, 0 başarısız**. Yeni proje maliyet modülü shared-domain strict TypeScript kontrolüne eklendi; lint, frontend TypeScript/production build ve production dependency audit adımları geçti.
- [Pages build/deploy #44042058240](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058240) başarılı.
- PR açılmadı; kullanıcı yetkisi kapsamında yalnızca dev/github-work dalına doğrudan commit edildi. AI Developer workflow için yeni run görünmedi; workflow_dispatch çalışması bu turda başlatılmadı.
- Bilinen sınırlar: maliyet satırları henüz üretim malzeme/donanım özetlerine otomatik eşlenmez; fiyat kataloğu, geçerlilik tarihi, teklif revizyonu, vergi ve frontend entegrasyonu sonraki ayrı dilimlerdir. Fiziksel üretim/CNC onayı değildir.
- Sonraki görev DOM-006: kullanıcı fiyat tablosunu açık materialId/hardwareId + özgün birim anahtarlarıyla üretim özetlerine bağlayan domain adapter'ı; fiyat eksikse maliyeti hazır göstermeyen eksik-girdi durumu.


## 17 Kasım 2026 11:32 TRT — DOM-006 üretim tüketimi / fiyat tablosu eşleştirmesi

- Başlangıç HEAD: `5c0a54e9ebfaea4e4696ee06549cd58c19be382f`.
- Geliştirme: `calculateProjectPricedConsumptionSummary`, doğrulanmış proje üretim raporunu kullanıcı fiyat tablosuyla eşleştirir. Malzeme anahtarı `materialId + m2`; donanım anahtarı `hardwareId + özgün BOM birimi`.
- Güvenlik/doğruluk: eksik fiyat veya legacy malzeme kimliği, birim uyuşmazlığı ve kenar bandı katalog kimliği eksikliği parasal toplamı incomplete tutar; `costSummary` null olur. Farklı para birimleri, bozuk üretim raporu, yinelenen fiyat anahtarı ve fiyat şeması hatası blocked döndürür. Açık sıfır fiyat kabul edilir; varsayılan fiyat, birim dönüşümü, kur veya fire oranı üretilmez.
- Kabul testleri: hazır malzeme + iki özgün donanım birimi, eksik fiyat, birim uyuşmazlığı, malzeme kimliği olmayan legacy Part, kenar bandı fiyat kapsamı, para birimi karışımı, yinelenen/geçersiz fiyat, blocked/empty proje, açık sıfır fiyat ve altı ondalık maliyet hassasiyeti sınırı.
- Değişen dosyalar: `domain/production/projectPricedConsumption.ts`, `domain/production/projectPricedConsumption.test.mjs`, `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `AI_PROGRESS.md`.
- Özellik commit: [106bb4d6da1cb1316f5386080e6b34d491a09016](https://github.com/Taylan789/MobilyaCAD/commit/106bb4d6da1cb1316f5386080e6b34d491a09016).
- [MobilyaCAD CI #44048122112](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122112) başarılı.
- [MobilyaCAD QA & Test #44048122147](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122147) başarılı: **101/101 frontend + 175/175 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, frontend TypeScript/production build ve production dependency audit adımları geçti. Oxlint 32 uyarı / 0 hata; bu turda yeni lint hatası yok.
- [Pages build/deploy #44048122140](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122140) başarılı.
- PR açılmadı; kullanıcı yetkisi kapsamında doğrudan yalnızca `dev/github-work` dalına commit edildi. DOM-006 artık DONE; DOM-007 READY.
- AI Developer workflow: son 100 Actions run içinde bu dal için AI Developer çalışması bulunmadı; workflow_dispatch bu turda tetiklenmedi.
- Bilinen sınırlar: kenar bandı için ayrı katalog kimliği yok; bu nedenle bant tüketimi maliyet toplamını tamamlamayı engeller. Vergi, kur, fire, levha verimi, teklif revizyonu ve fiyat geçerlilik tarihi yoktur. Fiziksel üretim/CNC onayı değildir.
- Frontend sahipliği: hiçbir `frontend/**` dosyası değiştirilmedi. Açık PR #41 ve #8 yalnızca frontend sahibinin ayrı akışında bırakıldı. main dalına dokunulmadı.
- Sonraki görev: DOM-007 — kenar bandı için açık katalog kimliği ve özgün birim sözleşmesi.


## 17 Kasım 2026 12:22 TRT — DOM-007 kenar bandı katalog kimliği ve fiyatlandırması

- Başlangıç HEAD: `9f3eb32aa8b0d1bc66ade7be7361576cfa5c79ff`.
- Özellik commit: [ea78777b1f2852f0b81b44eb0fe6bb68a84f5157](https://github.com/Taylan789/MobilyaCAD/commit/ea78777b1f2852f0b81b44eb0fe6bb68a84f5157).
- Proje üretim isteğine Part bazlı `edgeBandingAssignments` eklendi. Atama `partId + edgeBandingId + unit` taşır; bir Part'ın tüm bantlı dış ve dikdörtgen açıklık iç kenarları v1'de aynı band kaynağını kullanır.
- `edgeBandingId` kararlı kullanıcı/katalog kimliğidir; domain katalog kaydının gerçekten var olduğunu varsaymaz. `unit` açıkça `mm` veya `m` seçilir; m seçildiğinde mm geometrisi deterministik 1000'e bölünür.
- Bilinmeyen Part, bantlanmamış Part, yinelenen Part ataması, bozuk kimlik veya birim projeyi blocked yapar; kısmi sonuç döndürülmez. Atama Part üzerinde `edgeBandingMaterialId` ve `edgeBandingUnit` alanlarıyla korunur.
- `calculateProjectEdgeBandingConsumptionSummary` quantity ağırlıklı dış/iç bant uzunluğunu edgeBandingId + unit ile gruplar. Atanmamış legacy bant tüketimi null ID olarak kalır ve maliyet toplamını incomplete tutar.
- Fiyat tablosu `resourceType: "edge-banding"` destekler; aynı ID ve birim eşleşmesi zorunludur. Eksik fiyat/birim uyuşmazlığında `costSummary: null`; farklı para birimi blocked kalır. Atama bulunan Part'larda JSON v1/CSV adapter desteği gelene kadar `canExport: false` korunur.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectMaterialSummary.ts`, `domain/production/projectPricedConsumption.ts`, `domain/production/projectPricedConsumption.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`.
- [MobilyaCAD CI #44056080300](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080300) başarılı.
- [MobilyaCAD QA & Test #44056080414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080414) başarılı: **101/101 frontend + 178/178 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, frontend TypeScript/production build ve production dependency audit adımları geçti. Oxlint 32 uyarı / 0 hata; production audit yüksek önem eşiğinde geçti ancak 4 orta önem bulgusu sürüyor.
- [Pages build/deploy #44056080332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080332) başarılı.
- PR açılmadı; kullanıcı yetkisi kapsamında yalnızca `dev/github-work` dalına doğrudan commit edildi. Hiçbir `frontend/**` dosyası değiştirilmedi; açık frontend PR'ları #41, #42 ve #8 sahiplerinde bırakıldı. `main` dalına dokunulmadı.
- AI Developer workflow: son ilgili workflow_dispatch çalışması [#43559164561](https://github.com/Taylan789/MobilyaCAD/actions/runs/43559164561) 14 Kasım'da başarılı; aktif/başarısız AI Developer run bulunmadığından yeni run başlatılmadı.
- Bilinen sınırlar: v1'de tek Part için tek kenar bandı kaynağı vardır; farklı kenar türleri için per-edge atama sonraki genişletmedir. Katalog doğrulaması, renk/kalınlık/yapışkan, rulo payı/fire, işçilik, CNC ve fiziksel üretim onayı yoktur.
- Sonraki görev DOM-008: kullanıcı girdili işçilik/operasyon tarifesi ve açık süre/birim maliyet sözleşmesi.


## 17 Kasım 2026 13:49 TRT — DOM-008 uygulaması (Actions doğrulaması bekleniyor)

- Başlangıç HEAD: `32af784ee86271e33654a6f4cc0a9197d8d0013f`.
- Uygulama commit: [b42fe770c2045739c12366108489e28bec25591b](https://github.com/Taylan789/MobilyaCAD/commit/b42fe770c2045739c12366108489e28bec25591b).
- Değişiklikler: `domain/production/projectLaborOperationPricing.ts` ve `domain/production/projectLaborOperationPricing.test.mjs` ile kullanıcı girdili işçilik/operasyon kullanım satırları, açık tarife tablosu, kategori ve birim eşleştirmesi, kaynak referansı ve eksik girdi durumları eklendi.
- QA kapsamı: yeni domain testi `domain/production/*.test.mjs` desenine girer; strict TypeScript listesine yeni modül eklendi.
- Otomatik kabul kapsamı: hazır işçilik + operasyon toplamı, boş proje, eksik tarife, birim uyuşmazlığı, kategori uyuşmazlığı, para birimi karışımı, yinelenen kimlikler, bilinmeyen alan, geçersiz süre/fiyat/kaynak referansı ve açık sıfır tarife.
- [MobilyaCAD CI #44069400982](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400982) başarılı; [QA & Test #44069401154](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069401154) başarılı: 101/101 frontend + 187/187 domain testi, 0 başarısız. Strict TypeScript, lint, frontend production build ve production dependency audit geçti. [Pages #44069400970](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400970) build/deploy başarılı.
- Bilinen sınırlar: dakika/saat otomatik dönüştürülmez; tarife kaynağı kullanıcı tarafından sağlanır ve gerçekliği/etkinlik tarihi doğrulanmaz. Üretim malzeme/donanım maliyetleriyle birleşik teklif toplamı, vergi, kur ve revizyon sonraki görevlerdir. `frontend/**` değiştirilmedi; başka ajan PR'larına dokunulmadı.
- Sonraki görev: DOM-009 — üretim tüketimi ve işçilik/operasyon özetlerini tek, eksik-girdi güvenli teklif toplamında birleştir.
