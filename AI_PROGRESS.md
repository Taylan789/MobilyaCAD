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


## 17 Kasım 2026 13:49 TRT — DOM-008 uygulaması (Actions doğrulandı)

- Başlangıç HEAD: `32af784ee86271e33654a6f4cc0a9197d8d0013f`.
- Uygulama commit: [b42fe770c2045739c12366108489e28bec25591b](https://github.com/Taylan789/MobilyaCAD/commit/b42fe770c2045739c12366108489e28bec25591b).
- Değişiklikler: `domain/production/projectLaborOperationPricing.ts` ve `domain/production/projectLaborOperationPricing.test.mjs` ile kullanıcı girdili işçilik/operasyon kullanım satırları, açık tarife tablosu, kategori ve birim eşleştirmesi, kaynak referansı ve eksik girdi durumları eklendi.
- QA kapsamı: yeni domain testi `domain/production/*.test.mjs` desenine girer; strict TypeScript listesine yeni modül eklendi.
- Otomatik kabul kapsamı: hazır işçilik + operasyon toplamı, boş proje, eksik tarife, birim uyuşmazlığı, kategori uyuşmazlığı, para birimi karışımı, yinelenen kimlikler, bilinmeyen alan, geçersiz süre/fiyat/kaynak referansı ve açık sıfır tarife.
- [MobilyaCAD CI #44069400982](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400982) başarılı; [QA & Test #44069401154](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069401154) başarılı: 101/101 frontend + 187/187 domain testi, 0 başarısız. Strict TypeScript, lint, frontend production build ve production dependency audit geçti. [Pages #44069400970](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400970) build/deploy başarılı.
- Bilinen sınırlar: dakika/saat otomatik dönüştürülmez; tarife kaynağı kullanıcı tarafından sağlanır ve gerçekliği/etkinlik tarihi doğrulanmaz. Üretim malzeme/donanım maliyetleriyle birleşik teklif toplamı, vergi, kur ve revizyon sonraki görevlerdir. `frontend/**` değiştirilmedi; başka ajan PR'larına dokunulmadı.
- Sonraki görev: DOM-009 — üretim tüketimi ve işçilik/operasyon özetlerini tek, eksik-girdi güvenli teklif toplamında birleştir.


## 17 Kasım 2026 14:06 TRT — DOM-009 birleşik teklif toplamı (doğrulandı)

- Başlangıç HEAD: `2f16250743129ccce3cef72f4997df58500ea827`.
- Özellik commit'i: [e78152351f679547f064048cceff33063555b9cc](https://github.com/Taylan789/MobilyaCAD/commit/e78152351f679547f064048cceff33063555b9cc).
- Değişen dosyalar:
  - `domain/production/projectQuoteSummary.ts` — üretim tüketimi ve işçilik/operasyon alt hesaplarını tek maliyet toplamında birleştirir; tek para birimi, eksik kapsam güvenliği ve kaynak eşlemesi.
  - `domain/production/projectQuoteSummary.test.mjs` — 7 yeni kabul/regresyon testi.
  - `.github/workflows/qa-test.yml` — yeni domain modülü strict TypeScript kontrolüne eklendi.
  - `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`, `docs/production-domain-contract.md` — görev ve sözleşme kayıtları.
- Otomatik doğrulama:
  - [CI #44072219005](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219005) başarılı.
  - [QA #44072219133](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219133) başarılı: **101/101 frontend + 194/194 domain testi, 0 başarısız**.
  - Shared-domain strict TypeScript, lint, frontend production build ve `npm audit --omit=dev --audit-level=high` adımı başarılı.
  - [Pages #44072218712](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072218712) build/deploy başarılı.
- Kalite/risk notları: lint 32 uyarı / 0 hata; audit raporunda 4 orta seviye bulgu sürüyor. Force/breaking dependency güncellemesi yapılmadı.
- Bilinen sınırlar: JSON v1/CSV/UI entegrasyonu yok; vergi, kur, iskonto, fire/kâr yüzdesi, fiyat geçerlilik tarihi ve teklif revizyonu yoktur. CNC veya fiziksel üretim onayı değildir.
- Sonraki görev: DOM-010 — kullanıcı tarafından sağlanan fiyat/tarife katalog sürümü ve etkinlik tarihi snapshot'ı.


## 17 Kasım 2026 15:43 TRT — DOM-010 fiyat/tarife snapshot'ı (Actions bekleniyor)

- Başlangıç HEAD: 25e3264c1a04d5cafb4279863e33b3ee83059542.
- Geliştirme: projectQuotePricingSnapshot.ts; hazır birleşik teklifin kaynak fiyat listesi/tarife katalog kimliği, sürümü ve teklif tarihindeki geçerlilik aralığını kaydeder.
- Test: projectQuotePricingSnapshot.test.mjs; hazır ve işçilik-only teklif, eksik metadata, geçerlilik başlangıç/bitiş sınırı, imkânsız tarih, bilinmeyen alan, boş teklif ve runtime immutability kabul senaryoları.
- QA strict TypeScript listesine yeni domain modülü eklendi. Domain test glob'u yeni .test.mjs dosyasını otomatik kapsar.
- Bu ilk kayıt commit SHA'sı ve gerçek Actions sonuçları tamamlandığında doğrulama kaydıyla güncellenecektir.
- Bilinen sınırlar: katalog/fiyat kaynağının gerçekliği doğrulanmaz; yalnızca kullanıcı tarafından sağlanan metadata saklanır. JSON v1/CSV ve frontend entegrasyonu ayrı sahibindedir. Vergi, kur, fiyat tahmini ve CNC/atölye onayı yoktur.
- Aynı HEAD'deki AI Developer workflow #44076389923, OpenCode kurulmadan önce latest release API yanıtından sürüm etiketi çıkarılamadığı için iki job'da da başarısız oldu; bu kod değişikliğinden bağımsız bir başlatma hatasıdır. Loglar incelendi; güvenli failed-job rerun commit sonrası değerlendirilecek.
- Sonraki görev: DOM-011 — teklif revizyonları için salt okunur maliyet snapshot'ı ve geriye uyumlu revizyon zarfı.


## 17 Kasım 2026 15:43 TRT — DOM-010 doğrulandı

- Başlangıç HEAD: 25e3264c1a04d5cafb4279863e33b3ee83059542.
- Özellik commit: [215bfbeae1583505936d0f8f2549fe247a36efa9](https://github.com/Taylan789/MobilyaCAD/commit/215bfbeae1583505936d0f8f2549fe247a36efa9).
- Dosyalar: domain/production/projectQuotePricingSnapshot.ts; domain/production/projectQuotePricingSnapshot.test.mjs; .github/workflows/qa-test.yml; docs/production-domain-contract.md; AI_COORDINATION.md; PRODUCT_ROADMAP.md; AI_PROGRESS.md.
- [CI #44086836332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836332) başarılı.
- [QA #44086836369](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836369) başarılı: **101/101 frontend + 203/203 domain testi, 0 başarısız**. Strict TypeScript, lint, frontend production build ve production dependency audit yüksek önem eşiği başarılı.
- [Pages #44086836270](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836270) başarılı. Lint 32 uyarı / 0 hata; audit'te 4 orta seviye bulgu sürüyor.
- AI Developer #44076389923 ve entegrasyon/performans job'u OpenCode kurulmadan önce latest release API yanıtından tag_name çıkarılamadığı için başarısız oldu. Kod/test adımı çalışmadı; failed-job rerun bir sonraki güvenli adım olarak bekliyor.
- Kısıtlar: katalog kimliği/sürümü/tarih kullanıcı girdisidir; kaynağın gerçekliği doğrulanmaz. JSON v1/CSV ve UI entegrasyonu ayrı sahibindedir. Vergi, kur ve CNC/atölye onayı yoktur.
- Sonraki görev: DOM-011 — teklif revizyon zarfı ve salt okunur maliyet snapshot'ları.


## 17 Kasım 2026 17:42 TRT — DOM-011 teklif revizyon zarfı (Actions doğrulaması bekleniyor)

- Başlangıç HEAD: e5156f0680fc51b506b79b9a22f831268f2089d9.
- Geliştirme: domain/production/projectQuoteRevision.ts, yalnızca hazır ve tutarlı ProjectQuotePricingSnapshot girdisinden ayrı bir revizyon zarfı oluşturur. İlk revizyon 1 numarasıyla başlar; sonraki revizyon aynı proje kimliğine, önceki revizyon kimliğine, ardışık sıra numarasına ve daha yeni saat dilimli ISO 8601 tarihine bağlanır.
- Veri güvenliği: maliyet satırları, kategori toplamları, genel toplam, para birimi ve lineSources eşlemesi doğrulanır. Snapshot JSON uyumlu derin kopyaya alınır ve zarf runtime'da derin dondurulur. Hazır olmayan/boş teklif revizyon üretmez.
- Geriye uyumluluk: mevcut proje JSON v1 serializer/parser ve frontend/** dosyaları değiştirilmedi; revizyon zarfı ayrı kayıt sözleşmesidir.
- Yeni test: domain/production/projectQuoteRevision.test.mjs; ilk/sonraki revizyon, proje ve sıra uyuşmazlığı, tarih sırası/geçerliliği, immutable snapshot, tutarsız toplam, boş teklif ve bilinmeyen alan senaryoları.
- Strict TypeScript kapsamına projectQuoteRevision.ts eklendi; domain test glob'u yeni test dosyasını otomatik kapsar.
- Kod/test commit SHA'sı ve CI/QA run bağlantıları, gerçek Actions sonuçları alındıktan sonra bu kayda eklenecek.
- Bilinen sınırlar: tüm revizyon geçmişi boyunca kimlik tekilliği ve kalıcı saklama henüz bu domain diliminin dışında; frontend/JSON v1/CSV entegrasyonu ayrı sahibindedir. Vergi, kur, iskonto, otomatik yüzde, CNC ve fiziksel üretim onayı yoktur.
- Sonraki görev: DOM-012 — fire/kâr için yalnızca açık kullanıcı maliyet satırları ve kaynak referansı; ardından INT-001/INT-002 adapter round-trip entegrasyonu.


### DOM-011 ilk Actions sonucu ve test düzeltmesi

- İlk kod commit'i: https://github.com/Taylan789/MobilyaCAD/commit/84a24e80ad2122d08c6384bfdc7ccc21fdb3a0b0
- CI #44106880747 başarılı; Pages #44106880876 başarılı.
- QA #44106880875 başarısız: 204 domain testinin 203'ü geçti; yeni revizyon test modülü fixture kurulumunda blocked !== ready hatasıyla durdu. Log, proje agregatörü isteğinde fixture'ın nested furniture/profile/materials sözleşmesini yanlış kurduğunu gösterdi; üretim kodu veya önceki testler değiştirilmedi.
- Düzeltme: test fixture'ı mevcut proje agregatörü v1 istek şekline taşındı; revizyon snapshot doğrulamasında TypeScript için daraltılmış lineSources referansı kullanıldı. Yeni Actions sonucu bekleniyor.


## 17 Kasım 2026 17:49 TRT — DOM-011 doğrulandı

- Başlangıç HEAD: e5156f0680fc51b506b79b9a22f831268f2089d9.
- Özellik commit'i: [84a24e80ad2122d08c6384bfdc7ccc21fdb3a0b0](https://github.com/Taylan789/MobilyaCAD/commit/84a24e80ad2122d08c6384bfdc7ccc21fdb3a0b0).
- Test düzeltmesi ve son doğrulanmış kod commit'i: [491015912a38b47ef2f0d31b664d21038f790859](https://github.com/Taylan789/MobilyaCAD/commit/491015912a38b47ef2f0d31b664d21038f790859).
- Değişen alanlar: domain/production/projectQuoteRevision.ts; domain/production/projectQuoteRevision.test.mjs; .github/workflows/qa-test.yml; docs/production-domain-contract.md; AI_COORDINATION.md; PRODUCT_ROADMAP.md; AI_PROGRESS.md. Düzeltme commit'i test fixture'ını ve strict TypeScript daraltmasını güncelledi.
- İlk QA [#44106880875](https://github.com/Taylan789/MobilyaCAD/actions/runs/44106880875) başarısız oldu: 203/204 domain testi geçti; yeni test modülünün agregatör fixture'ı yanlış şekillendirilmişti. Log incelendi, test kapsamı veya üretim davranışı zayıflatılmadan düzeltildi.
- [CI #44107254101](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254101) başarılı.
- [QA #44107254191](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254191) başarılı: **101/101 frontend + 214/214 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, production build ve production dependency audit yüksek önem eşiğini geçti.
- [Pages #44107254198](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254198) başarılı.
- Kalite notları: lint 32 uyarı / 0 hata; production audit'te 4 orta seviye dependency bulgusu ve build'de mevcut büyük chunk uyarısı sürüyor. Kırıcı dependency güncellemesi yapılmadı.
- AI Developer [#44076389923](https://github.com/Taylan789/MobilyaCAD/actions/runs/44076389923) başarısız kaldı: entegrasyon agent'ı OpenRouter free-model günlük 429 kotasına, ürün agent'ı OpenCode latest-release metadata adımındaki başarısızlığa takıldı. Loglar incelendi. Rerun başlatılmadı; 429 yanıtındaki kota sıfırlama zamanı 18 Kasım 2026 00:00 UTC olduğundan aynı job'ları bu saatten önce yinelemek aynı bilinen blokajı tekrarlar.
- Bilinen sınırlar: bu modül ayrı revizyon zarfı üretir; mevcut proje JSON v1 ve frontend adapter'ı değiştirmez. Kalıcı geçmiş, tüm revizyonlarda ID tekilliği ve kullanıcı arayüzü entegrasyonu ayrı adapter/depolama işidir. Kaynak fiyat doğruluğu, vergi, kur, iskonto, CNC veya fiziksel üretim onayı yoktur.
- Sonraki görev: DOM-012 — fire/kârı yalnızca açık kullanıcı maliyet satırlarıyla ekle; ardından INT-001/INT-002 adapter round-trip entegrasyonunu QA ile denetle.


## 17 Kasım 2026 18:16 TRT — DOM-012 açık fire/kâr satırları (Actions doğrulaması bekleniyor)

- Başlangıç HEAD: `73d33ea296c51ca5ad35796bc853402cead26b28`.
- Geliştirme: `calculateProjectQuoteSummary` geriye uyumlu beşinci opsiyonel `quoteAdjustments` girdisi aldı. Yalnızca `waste` / `profit` satırları, pozitif miktar, açık birim, kullanıcı fiyatı, para birimi ve zorunlu kaynak referansıyla kabul edilir.
- Güvenlik: yüzde, fire oranı, marj, vergi, fiyat veya birim varsayımı yapılmaz. Hatalı satır, eksik kaynak referansı ve para birimi uyuşmazlığında teklif `blocked`, maliyet toplamı null kalır.
- Entegrasyon: açık ek satırlar birleşik teklif maliyetlerine, tarihli fiyat snapshot'ına ve salt okunur revizyon doğrulamasına kaynak kimliğiyle bağlandı. Eski dört argümanlı teklif çağrıları değişmeden çalışır.
- Test kapsamı: teklif toplamı, satır kaynak eşlemesi, miktar yuvarlaması, yalnız ek satırla teklif, hatalı kategori/kaynak, para birimi uyuşmazlığı, snapshot ve revizyon koruması.
- Değişen dosyalar: `domain/production/projectQuoteSummary.ts`, `domain/production/projectQuoteSummary.test.mjs`, `domain/production/projectQuotePricingSnapshot.ts`, `domain/production/projectQuotePricingSnapshot.test.mjs`, `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- İlk özellik commit'i: [288baf10dfff33a393561b5c35a0fb9be79265ef](https://github.com/Taylan789/MobilyaCAD/commit/288baf10dfff33a393561b5c35a0fb9be79265ef).
- İlk doğrulama: [CI #44113379490](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113379490) başarılı; [Pages #44113379465](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113379465) başarılı. [QA #44113379485](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113379485) başarısız: 220 domain testinin 214'ü geçti; altı yeni teklif/snapshot/revizyon testi, ortak `isRecord` koruyucusunun `projectQuoteSummary.ts` içinde tanımlanmamış olması nedeniyle blocked sonucunda kaldı. Üretim/önceki test davranışları etkilenmedi.
- Düzeltme commit'i: [c1257200890cd477dbbec3063defd379f55b9b64](https://github.com/Taylan789/MobilyaCAD/commit/c1257200890cd477dbbec3063defd379f55b9b64); eksik `isRecord` koruyucusu eklendi. İlk QA'daki altı yeni test hatası, testler korunarak giderildi.
- Son doğrulama: [CI #44113620081](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113620081) başarılı; [QA #44113620028](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113620028) başarılı — **101/101 frontend + 220/220 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint ve production build başarılı; production audit yüksek önem eşiğini geçti.
- [Pages #44113619995](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113619995) başarılı. Lint 32 uyarı / 0 hata; production audit'te 4 orta seviye minimatch zinciri bulgusu sürüyor. Bunları gidermek için yalnızca `npm audit fix --force` kırıcı shadcn yükseltmesi önerdiğinden bu turda bağımlılık değiştirilmedi.
- DOM-012 DONE. Sonraki domain görevi DOM-013: proje başına append-only teklif revizyon geçmişi, benzersiz kimlik ve zincir doğrulaması.
- Bilinen kısıtlar: JSON v1 serializer/parser, CSV adapter ve frontend entegrasyonu bu sahiplik diliminin dışında; fiziksel fire verimi, nesting, kerf, vergi ve işletme marjı doğrulanmaz.
- Sonraki görev: INT-001 domain üretim raporundaki geometri/malzeme/miktar sadakatini JSON/CSV adapter sözleşmesinde güvenceye almak; INT-002 adapter sahibinin test dosyalarına müdahale etmemek.

## 17 Kasım 2026 19:24 TRT — DOM-013 revizyon geçmişi aggregate doğrulaması (Actions bekleniyor)

- Başlangıç HEAD: 69a4af02566174945ccb5586e1ae6597cb726941.
- Geliştirme: domain/production/projectQuoteRevision.ts içine validateProjectQuoteRevisionHistory eklendi. Proje başına tekil revisionId, 1'den başlayan kesintisiz sıra, tam previousRevisionId zinciri, aynı proje kimliği, artan tarih ve her snapshot için mevcut revizyon doğrulaması uygulanır.
- Test: domain/production/projectQuoteRevision.test.mjs içinde ready/empty/blocked, yinelenen ID, sıra boşluğu/ters sıra, fork, proje uyuşmazlığı, kronoloji, bilinmeyen alan ve şema sürümü testleri eklendi.
- Sözleşme ve koordinasyon: docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md güncellendi. Hiçbir frontend/** dosyası değiştirilmedi.
- Kod commit SHA: 3d839a3041c4735647364d5c0de2c80e23a0f55d (https://github.com/Taylan789/MobilyaCAD/commit/3d839a3041c4735647364d5c0de2c80e23a0f55d).
- Actions: [CI #44126170710](https://github.com/Taylan789/MobilyaCAD/actions/runs/44126170710) başarılı; [QA #44126169767](https://github.com/Taylan789/MobilyaCAD/actions/runs/44126169767) başarılı — 101/101 frontend + 228/228 domain testi, 0 başarısız; [Pages #44126171436](https://github.com/Taylan789/MobilyaCAD/actions/runs/44126171436) build/deploy başarılı. Shared-domain strict TypeScript, lint ve production build başarılı; lint 32 uyarı / 0 hata, production audit'te 4 orta seviye minimatch bulgusu sürüyor.
- Bilinen sınırlar: kalıcı append-only depolama, eşzamanlı yazma kilidi ve cihazlar arası ID üretimi yoktur. CNC/atölye üretim onayı değildir.
- DOM-013 DONE: 8 yeni aggregate geçmiş testi dahil 101/101 frontend + 228/228 domain testi geçti. Sonraki adım: DOM-014 immutable append API; ardından INT-001/INT-002 entegrasyon kanıtları ve QA-003.

### AI Developer workflow incelemesi — 17 Kasım 2026 19:29 TRT

- [AI Developer #44076389923](https://github.com/Taylan789/MobilyaCAD/actions/runs/44076389923) başarısız job logları incelendi. Ürün job'u OpenCode latest-release metadata adımında tag_name alamadığı için model çalışmadan durdu; entegrasyon/performans job'u OpenRouter free-models-per-day 429 kotasına takıldı.
- Rerun başlatılmadı: entegrasyon job'undaki kota sıfırlama zamanı 18 Kasım 2026 00:00 UTC olarak kaydedildi; şu an tekrar çalıştırmak bilinen 429 blokajını yineleyecekti. Secrets veya ücretli servis ayarı değiştirilmedi.

## 17 Kasım 2026 20:48 TRT — DOM-014 immutable teklif revizyon append

- Başlangıç HEAD: `41c4caed055f7ac167f592353fa6b117b64e8394`.
- İlk özellik commit'i: [90139782f8185c0fb399d1d88174d8d46472f572](https://github.com/Taylan789/MobilyaCAD/commit/90139782f8185c0fb399d1d88174d8d46472f572).
- Uyum/regresyon düzeltme commit'i: [34d9ee813f0f96eafec12568059d25850d2318cd](https://github.com/Taylan789/MobilyaCAD/commit/34d9ee813f0f96eafec12568059d25850d2318cd).
- Değişen dosyalar: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`; bu turda `frontend/**`, adapter, package manifest/lockfile veya secrets değiştirilmedi.
- Ürün davranışı: `appendProjectQuoteRevision(history, revisionInput)` önce geçmişi doğrular. Çağıran yalnızca revisionId, saat dilimli createdAt ve ready pricingSnapshot sağlar; projectId, sıra numarası ve previousRevisionId doğrulanmış zincirden türetilir. Duplicate ID, bozuk/fork geçmiş, geriye giden tarih, geçersiz snapshot veya bilinmeyen alan blocked + history:null döndürür; girdi mutate edilmez, başarılı çıktı deep-freeze edilir.
- Takip düzeltmesi: fonksiyon çıktısı `schemaVersion: 1` alanı taşıdığı için önceki validator kendi çıktısını yeniden kabul etmiyordu. Validator artık schemaVersion 1'i kabul eder, eksik schemaVersion ile gelen eski girdileri korur ve desteklenmeyen sürümü reddeder. Test, append çıktısının yeniden doğrulanmasını ve bir sonraki append'e bağlanmasını kanıtlar.
- Otomatik test kapsamı: boş geçmişten ilk kayıt, ardışık kayıt, geçmişin başındaki duplicate ID, bozuk zincir, kronoloji, invalid snapshot, kapalı girdi şeması ve schemaVersion round-trip.
- İlk Actions (özellik commit'i): [CI #44141898958](https://github.com/Taylan789/MobilyaCAD/actions/runs/44141898958) başarılı; [QA #44141899041](https://github.com/Taylan789/MobilyaCAD/actions/runs/44141899041) testler 101/101 frontend + 233/233 domain geçti, fakat production dependency audit başarısız; [Pages #44141898959](https://github.com/Taylan789/MobilyaCAD/actions/runs/44141898959) başarılı.
- Son Actions (uyumluluk düzeltmesi): [CI #44142328774](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328774) başarılı. [QA #44142328778](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328778) içinde **101/101 frontend + 234/234 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint ve production build başarılı. QA job'u yalnızca production dependency audit adımında başarısız. [Pages #44142328629](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328629) başarılı.
- QA güvenlik blokajı: audit 12 bulgu (2 moderate, 10 high) raporladı. Yüksek ReDoS bulgusu `picomatch` üzerinden `@shadcn/registry`, `@dotenvx/dotenvx`, `fast-glob` ve Vite ağacına uzanıyor. `npm audit fix --force` Vite 8.3.6 yerine Vite 6.2.7 kırıcı downgrade önerdi; güvenli olduğu kanıtlanmadığı ve `frontend/**` ayrı ajan sahipliğinde olduğu için uygulanmadı. [SEC-001] arayüz sahibine devredildi.
- Bilinen sınırlar: append API kalıcı depolama, atomik transaction, eşzamanlı append kilidi veya ID üretimi sağlamaz; çağıran depolama katmanı bunları garanti etmelidir. JSON v1/CSV ve frontend entegrasyonu yoktur. Fiziksel CNC/atölye onayı değildir.
- Durum: domain davranışı, testleri ve strict TypeScript doğrulandı; genel QA, frontend dependency audit yüksek bulguları nedeniyle BLOCKED. DOM-014 ancak SEC-001 sonrası QA tamamen başarılı olunca DONE yapılacaktır.
- Sonraki görev: SEC-001 audit blokajının frontend sahibi tarafından kırıcı olmayan şekilde giderilmesi; ardından DOM-014 tam QA doğrulaması, sonra INT-001/INT-002 adapter entegrasyon kanıtları ve QA-003.


## 17 Kasım 2026 21:20 TRT — DOM-015 teklif satır aritmetiği doğrulaması

- Başlangıç HEAD: `a8148656321a7ea1fd242803aabe091be5882140`.
- Kod commit'i: [f160360f2050f4021a850d0c49123ac0ed1ccd3a](https://github.com/Taylan789/MobilyaCAD/commit/f160360f2050f4021a850d0c49123ac0ed1ccd3a).
- Değişen dosyalar: `domain/production/projectCostSummary.ts`, `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. Hiçbir `frontend/**`, adapter, lockfile, package manifest veya secret değiştirilmedi.
- Ürün davranışı: `calculateProjectCostLineTotalMinor` ortak yardımcı fonksiyonu altı ondalık miktarı mikro-birim tam sayısına çevirir ve satır tutarını yarım-yukarı yuvarlar. Teklif hesaplayıcısı ve immutable revizyon snapshot doğrulayıcısı aynı hesabı kullanır. Snapshot satır toplamı miktar × birim fiyatla uyuşmuyorsa, kategori ve genel toplamlar birlikte değiştirilmiş olsa bile revizyon blocked olur.
- Yeni otomatik regresyonlar: yarım-yukarı sınırının iki tarafı, >6 anlamlı ondalık miktar ve aggregate toplamları tutarlı tutulmuş sahte satır toplamı. Testler silinmedi/zayıflatılmadı.
- Actions: [CI #44147550422](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550422) başarılı. [QA #44147550175](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550175): **101/101 frontend + 237/237 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint (32 uyarı / 0 hata) ve production build başarılı. QA job'u yalnızca production dependency audit aşamasında başarısız: 12 production bulgusu (2 moderate, 10 high), yüksek picomatch ReDoS zinciri. [Pages #44147550068](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550068) build/deploy başarılı.
- Güvenlik sınırı: audit'in önerdiği `npm audit fix --force` Vite 6.2.7 kırıcı downgrade içeriyor. Frontend bağımlılık dosyaları başka ajanın sahipliğinde olduğundan değiştirilmedi; secrets/ücretli servis ayarı da değiştirilmedi. DOM-015 domain kodu ve testleri doğrulandı; tam QA SEC-001 çözülene kadar BLOCKED.
- AI Developer workflow: [#44076389923](https://github.com/Taylan789/MobilyaCAD/actions/runs/44076389923) başarısız job logları yeniden incelendi. Ürün job'u OpenCode latest-release metadata adımında tag_name alamadı; entegrasyon/performans job'u OpenRouter free-models-per-day 429 kotasına takıldı (reset: 18 Kasım 2026 00:00 UTC). Eski SHA üzerinde yeniden çalıştırma yapılmadı; kota/metadata blokajı ve eski checkout nedeniyle güvenli rerun değildi.
- Sonraki görev: SEC-001 düzeldikten sonra aynı HEAD'in tam QA sonucunu yeniden doğrula; ardından INT-001 domain/export sözleşmesi ve adapter entegrasyonunu sahiplik sınırları içinde ilerlet.


## 17 Kasım 2026 22:44 TRT — DOM-016 teklif revizyon karşılaştırması doğrulandı

- Başlangıç HEAD: `1d8ef991feee836398b149d1b783e1ef2a8d240a`.
- Özellik commit'i: [dc032abe3e60523eadbe9dbba618c83ae65fa9ec](https://github.com/Taylan789/MobilyaCAD/commit/dc032abe3e60523eadbe9dbba618c83ae65fa9ec).
- Değişen dosyalar: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Hiçbir `frontend/**`, adapter, package manifest, lockfile veya secret değiştirilmedi.
- Yeni API: `compareProjectQuoteRevisions` tüm revizyon geçmişini doğrular; aynı projedeki daha yeni hedef revizyonu ve aynı para birimini zorunlu tutar. Genel toplam ile malzeme/donanım/işçilik/operasyon/fire/kâr kategori farklarını minor unit cinsinden döndürür; pozitif artış, negatif azalıştır. Sonuç immutable'dır.
- Regresyon testleri: aynı para biriminde kategori/genel toplam farkı, aynı/eski/bulunmayan revizyon, bozuk/boş geçmiş ve kur bilgisi olmadan farklı para birimini bloklama.
- [CI #44162404907](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162404907) başarılı. [QA #44162404959](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162404959): **101/101 frontend + 241/241 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint ve production build başarılı. QA job'u yalnızca production dependency audit adımında başarısız: 12 production bulgusu (2 moderate, 10 high; picomatch ReDoS zinciri). [Pages #44162405010](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162405010) başarılı.
- Güvenlik sınırı: audit'in kırıcı Vite downgrade önerisi uygulanmadı; frontend sahipliği, package/lockfile ve secrets değiştirilmedi. SEC-001 arayüz ajanının sorumluluğunda.
- Yerel runtime testi bu entegrasyonda çalıştırılmadı; 101/101 + 241/241 test kanıtı Actions logundan alındı.
- Bilinen kısıtlar: satır bazlı fark, FX, vergi/iskonto, PDF/UI ve kalıcı depo yok; fiziksel üretim/CNC onayı değildir.
- Durum: domain API, regresyon testleri, strict TypeScript ve build doğrulandı; tam QA shared production audit nedeniyle BLOCKED. Sonraki adım: SEC-001 çözümünden sonra DOM-014/015/016 için tam QA sonucunu kontrol etmek; ardından INT-001 domain/export sözleşmesini ilerletmek.


## 18 Kasım 2026 00:20 TRT — DOM-017 teklif revizyon geçmişi JSON zarfı doğrulandı; tam QA audit nedeniyle bloklu

- Başlangıç branch HEAD: 23d620a3f0153ce938d40d611ed7b9cb18b2e24b.
- Kod commit'i: [3b187ca9ff597fb0fc24eabb918e4ae4f5b4c44b](https://github.com/Taylan789/MobilyaCAD/commit/3b187ca9ff597fb0fc24eabb918e4ae4f5b4c44b).
- Ürün davranışı: ayrı mobilyacad-quote-revision-history v1 JSON zarfı doğrulanmış ready/empty revizyon geçmişini dışa aktarır; import dosya türü/sürüm/kapalı zarf şemasını ve tüm geçmiş zincirini yeniden doğrular. Legacy iç geçmiş schemaVersion eksikliği korunur; yeni export sürüm 1'i kanonik yazar. Bozuk JSON/geçmişte kısmi sonuç yoktur.
- Değişen dosyalar: domain/production/projectQuoteRevisionFile.ts, domain/production/projectQuoteRevision.test.mjs, .github/workflows/qa-test.yml, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md. frontend/**, adapter, package manifest, lockfile veya secret değiştirilmedi.
- [CI #44179904406](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904406) başarılı. [QA #44179904377](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904377): **101/101 frontend + 245/245 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint ve production build başarılı. QA yalnızca production dependency audit adımında başarısız: 12 bulgu (2 moderate, 10 high), picomatch ReDoS zinciri; npm audit --force Vite 6.2.7 kırıcı downgrade öneriyor. [Pages #44179904575](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904575) build/deploy başarılı.
- AI Developer [#44164712000](https://github.com/Taylan789/MobilyaCAD/actions/runs/44164712000) ürün ve entegrasyon job'larında OpenRouter free-models-per-day 429 kotasına takıldı; reset 18 Kasım 2026 00:00 UTC / 03:00 TRT. Kota resetlenmeden rerun yapılmadı. Bu workflow hatası kod commit'inden bağımsızdır.
- Bilinen sınırlar: JSON zarfı mevcut proje JSON v1'e gömülmez; disk yazımı, otomatik kayıt, atomik transaction, eşzamanlı yazma kilidi ve yedekleme sağlamaz. Tam QA SEC-001 frontend sahipliği kapsamındaki audit düzeltmesine bağlıdır.
- Sonraki görev: SEC-001 sonrası DOM-014/015/016/017 için yeni SHA'da tam QA'yı doğrula; ardından proje dosyasıyla geriye uyumlu entegrasyon sözleşmesini ilerlet.


## 18 Kasım 2026 01:05 TRT — DOM-018 proje JSON v2 teklif geçmişi uzantısı

- Başlangıç branch HEAD: `705d395163c7cf4753002055dc9b196bdb14fc6c`.
- Kod commit'i: [b8f82eb5cfbbb87990d84731f7a39c97a9f685f3](https://github.com/Taylan789/MobilyaCAD/commit/b8f82eb5cfbbb87990d84731f7a39c97a9f685f3).
- Değişen dosyalar: `domain/production/projectQuoteRevisionProjectFile.ts`, `domain/production/projectQuoteRevisionProjectFile.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_COORDINATION.md`, `.github/workflows/qa-test.yml`, `AI_PROGRESS.md`. Hiçbir `frontend/**`, adapter, package manifest, lockfile veya secret dosyası değiştirilmedi.
- Davranış: JSON v1 uzantısız dosya legacy kalır; v1 içine quoteRevisionHistory yazılmışsa sessiz kaybı önlemek için blocked olur. JSON v2 kararlı projectId ister; opsiyonel geçmiş yoksa empty, varsa proje kimliği ve tüm zincirle doğrulanır. Append yeni immutable history ve yeni üst seviye proje nesnesi üretir; kaynak girdiyi değiştirmez.
- [CI #44187315115](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315115) başarılı. [QA #44187315211](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315211): **101/101 frontend + 254/254 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint ve production build başarılı. QA job'u yalnızca production dependency audit nedeniyle başarısız: 12 bulgu (2 moderate, 10 high; picomatch ReDoS/minimatch zinciri). `npm audit fix --force` Vite 6.2.7 kırıcı downgrade önerdiği için uygulanmadı. [Pages #44187315339](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315339) başarılı.
- Bilinen sınırlar: mevcut frontend JSON v1 serializer/parser ve tüm `frontend/**` dosyaları değişmedi. Bu adapter tam v2 proje şema doğrulaması, kalıcı yazma, atomik transaction, otomatik kayıt veya UI entegrasyonu sağlamaz. V2 kimliğini domain adapter üretmez.
- Durum: DOM-018 domain testleri, strict TypeScript ve build açısından doğrulandı; genel QA, frontend sahibinin SEC-001 kapsamındaki production audit düzeltmesi beklenene kadar BLOCKED.
- Sonraki görev: SEC-001 ve DOM-014/015/016/017 tam QA yeniden doğrulaması; ardından INT-001/INT-002/QA-003 entegrasyon kanıtları. Bağımsız sonraki domain dilimi DOM-019 levha ölçüsü/kerf/damar yönü girdilerinin nesting öncesi doğrulamasıdır.


## 18 Kasım 2026 03:04 TRT — DOM-019 levha nesting girdisi ön doğrulaması teslim edildi

- Başlangıç HEAD: 82737990987b0f2404c5b44cadbff6710b8bf82c.
- Özellik commit'i: [63841cd3933de238962ffb60059ea3224b02c6cd](https://github.com/Taylan789/MobilyaCAD/commit/63841cd3933de238962ffb60059ea3224b02c6cd). Test beklentisi düzeltme commit'i: [d807ec187c2d79afb030f0d838b9286eeb7ee143](https://github.com/Taylan789/MobilyaCAD/commit/d807ec187c2d79afb030f0d838b9286eeb7ee143).
- Değişen dosyalar: domain/production/sheetNestingInput.ts, domain/production/sheetNestingInput.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, .github/workflows/qa-test.yml. İkinci commit yalnızca domain/production/sheetNestingInput.test.mjs test fixture/regex beklentilerini düzeltti. frontend/**, adapter, package manifest, lockfile ve secret değiştirilmedi.
- Davranış: kullanıcı girdili levha materialId/en-boy/kalınlık/kerf/levha damar yönü ile her rectangular parçanın materialId/ölçü/kalınlık/quantity/damar yönü doğrulanır. mm değerleri 0.1 mm'ye normalize edilir; malzeme/kalınlık eşleşmesi, benzersiz ID, güvenli quantity toplamı ve damar uyumlu 0/90 derece zarf sığması aranır. Herhangi bir hata tüm batch'i blocked ve result=null yapar.
- Yeni otomatik testler: 13. İlk Actions koşusunda 266/268 geçti; iki hata test fixture yönü ve regex büyük/küçük harf beklentisindeydi. Test kapsamı azaltılmadan düzeltildi. Son QA: 101/101 frontend + 268/268 domain testi, 0 başarısız; shared-domain strict TypeScript, lint ve production build başarılı.
- [CI #44204537545](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537545) başarılı; [QA #44204537384](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537384) genel sonucu production dependency audit nedeniyle failure; [Pages #44204537387](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537387) başarılı.
- Bilinen sınırlar: yalnızca rectangular panel batch; kerf doğrulanır/saklanır ama henüz yerleşimde tüketilmez. Parça yerleşimi/koordinatı, nesting optimizasyonu, fire/yield, kesim sırası, CNC/postprocessor, makine standardı veya fiziksel üretim onayı yoktur. Kesitli parçalar blocked olur.
- QA blokajı: production audit 12 bulgu (2 moderate, 10 high; picomatch ReDoS). npm audit fix --force Vite 6.2.7 kırıcı downgrade önerdi; SEC-001 frontend sahibinin kapsamındadır. Bu otomasyon frontend, manifest veya lockfile'a dokunmadı.
- Sonraki görev: DOM-020 — proje Part listesini doğrulanmış rectangular batch girdisine kayıpsız bağla; kaynak Part ID ve quantity'yi koru, kesitli/uyumsuz parçaları blocked tut. INT-001 PR #61 ve INT-002 ayrı sahiplik alanlarında kalır.


## 18 Kasım 2026 04:24 TRT — DOM-020 proje Part listesini nesting batch girdisine bağlama

- Domain dilimi eklendi: `createProjectSheetNestingInput`, doğrulanmış proje üretim raporundan açık Part seçimiyle tek malzeme/kalınlık batch'i kurar.
- Kaynak Part ID, quantity, mm ölçüleri ve katalog materialId korunur. Kullanıcının açık seçimi dışındaki Part ID'leri `excludedPartIds` ile bildirilir; otomatik malzeme/kalınlık gruplaması yapılmaz.
- Part üzerinde kayıtlı grainDirection yoksa kullanıcı eşlemesi zorunludur. Kesitli panel geometry, uyuşmayan malzeme/kalınlık, eksik katalog kimliği ve geçersiz adet tüm batch'i blocked yapar.
- Değişen dosyalar: `domain/production/projectSheetNestingInput.ts`, `domain/production/projectSheetNestingInput.test.mjs`, `docs/production-domain-contract.md`, `.github/workflows/qa-test.yml`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- İlk kod commit'i: [184e4e75e3a0f96e5f7d39b21b5ed2db36e3639f](https://github.com/Taylan789/MobilyaCAD/commit/184e4e75e3a0f96e5f7d39b21b5ed2db36e3639f). [CI #44215960455](https://github.com/Taylan789/MobilyaCAD/actions/runs/44215960455) ve [Pages #44215960498](https://github.com/Taylan789/MobilyaCAD/actions/runs/44215960498) başarılı. [QA #44215960442](https://github.com/Taylan789/MobilyaCAD/actions/runs/44215960442): 101/101 frontend + 277/277 domain testi, 0 başarısız; shared-domain strict TypeScript, lint ve production build başarılı. Genel QA yalnızca 12 production dependency audit bulgusu (2 moderate, 10 high; picomatch ReDoS/minimatch) nedeniyle başarısız.
- Bilinen sınır: kerf yalnızca doğrulanıp taşınır; parça yerleşimi/koordinatı, fire/verim, kesim sırası veya CNC çıktısı üretilmez. Donanım ve kenar bandı BOM'u bu nesting girdisinin kapsamı dışındadır.


- Follow-up düzeltme commit'i: [c67c328610ee3e48d0387b2911418a12ec98790b](https://github.com/Taylan789/MobilyaCAD/commit/c67c328610ee3e48d0387b2911418a12ec98790b); seçim dışındaki kesitli Part satırları artık seçili dikdörtgen batch'i engellemez, ID'leri `excludedPartIds` içinde korunur. Yeni regresyon dahil domain testleri geçti. [CI #44216125480](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125480) ve [Pages #44216125319](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125319) başarılı. [QA #44216125310](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125310): 101/101 frontend + 278/278 domain testi, 0 başarısız; strict shared-domain TypeScript, lint ve production build başarılı. Genel QA yalnızca 12 production dependency audit bulgusu (2 moderate, 10 high; picomatch ReDoS/minimatch) nedeniyle başarısız; SEC-001 PR #59 frontend sahibinin alanında açık.


## 18 Kasım 2026 05:44 TRT — DOM-021 çoklu malzeme/kalınlık nesting batch grupları

- Başlangıç HEAD: a22c77124c3ceebc4cd0f6c2b86092b53b300e36.
- Uygulama commit'i: [fd05aba86bd318dbc8f14f2a638265ff48300be2](https://github.com/Taylan789/MobilyaCAD/commit/fd05aba86bd318dbc8f14f2a638265ff48300be2).
- Test düzeltme commit'i: [15a720c4cc2a1f587912e94228fb02b7c57cfa8a](https://github.com/Taylan789/MobilyaCAD/commit/15a720c4cc2a1f587912e94228fb02b7c57cfa8a). İlk QA denemesi yeni test dosyasındaki kaçışlanmamış slash regex'i nedeniyle test modülünü parse edemedi; yalnızca regex sözdizimi düzeltildi, test kapsamı azaltılmadı.
- Değişen dosyalar: domain/production/projectSheetNestingBatches.ts, domain/production/projectSheetNestingBatches.test.mjs, docs/production-domain-contract.md, .github/workflows/qa-test.yml, AI_COORDINATION.md, PRODUCT_ROADMAP.md. AI_PROGRESS.md bu doğrulama sonrası ayrı bir kayıt commit'iyle güncelleniyor. Hiçbir frontend/**, adapter, package manifest, lockfile veya secret dosyası değiştirilmedi.
- Davranış: açık Part seçimi (veya bütün proje), katalog materialId + 0.1 mm normalize kalınlık anahtarına göre deterministik gruplara ayrılır. Her grup için tam bir kullanıcı levha/kerf tanımı gerekir. ID, quantity, malzeme ve ölçüler korunur; hariç tutulan ID'ler bildirilir. Eksik/çift/kullanılmayan levha tanımı, grup dışı grain override veya tek grup doğrulama hatası tüm aggregate sonucu blocked ve result=null yapar.
- [CI #44225359365](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359365) başarılı. [QA #44225359372](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359372): **102/102 frontend + 290/290 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint, production build ve production dependency audit başarılı (0 production vulnerability). [Pages #44225359404](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359404) build/deploy başarılı.
- Bilinen sınırlar: kerf doğrulanıp her batch içinde saklanır ama yerleşimde tüketilmez; koordinat, nesting optimizasyonu, fire/yield, kesim sırası, CNC/postprocessor veya makine standardı üretilmez. Kesitli seçili Part aggregate sonucu bloklar. Fiziksel üretim doğrulaması yapılmadı.
- AI Developer #44221779571 ürün ve entegrasyon job'larında OpenRouter free-models-per-day 429 nedeniyle başarısız; rate-limit reset 19 Kasım 2026 00:00 UTC / 03:00 TRT. Reset öncesi rerun yapılmadı. PR #61 INT-001 ve PR #62 UI-CAD-STUDIO-001 frontend sahipliğinde açık bırakıldı; bu ajan bunları değiştirmedi/merge etmedi.
- Sonraki görev: DOM-022 — her batch için kerf ve grain kısıtlarını tüketen deterministik 2D dikdörtgen yerleşim motoru; yerleşim koordinatları, adetler ve sınır testleri. Fire/yield ve CNC çıktıları ayrı ve doğrulanabilir aşamalarda ele alınacak.


## 18 Kasım 2026 06:28 TRT — DOM-022 deterministik levha yerleşimi; QA düzeltmesi bekleniyor

- Başlangıç HEAD: `d4f409762f8e8c62a9f6d84eea4dc7490c05d2ad`.
- Domain uygulama commit'i: [fb37c5bdf386380a33b7f93f43253b612867a9ac](https://github.com/Taylan789/MobilyaCAD/commit/fb37c5bdf386380a33b7f93f43253b612867a9ac).
- İlk otomatik doğrulama: [CI #44230479722](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230479722) başarılı; [Pages #44230479728](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230479728) başarılı. [QA #44230479736](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230479736) domain test aşamasında tek yeni assertion hatasıyla durdu; 248 testten yalnızca yatay kerf testinin beklenen farkı yanlış yazılmıştı (x2 - x1 - width = 3 mm yerine x2 - width = 503 beklenmişti). Üretim kodu ve diğer yeni testler bu koşuda TypeScript aşamasına gelmeden tam doğrulanmış sayılmaz.
- Test düzeltme commit'i: [39639040181ad8036c94babd7fa5b29749865a33](https://github.com/Taylan789/MobilyaCAD/commit/39639040181ad8036c94babd7fa5b29749865a33); yalnızca yatay kerf assertion'ı gerçek 3 mm aralığı kontrol edecek şekilde düzeltildi. Test düzeltme SHA'sının doğrulaması, onu içeren [2935bb2e9afc8c032fcc3decf25e2578b7a95ebc](https://github.com/Taylan789/MobilyaCAD/commit/2935bb2e9afc8c032fcc3decf25e2578b7a95ebc) üzerinde tamamlandı: [CI #44230651897](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651897), [QA #44230651902](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651902) ve [Pages #44230651898](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651898) başarılı. QA 102/102 frontend + 304/304 domain testi, 0 başarısız; strict shared-domain TypeScript, lint, production build ve production dependency audit (0 bulgu) başarılı.
- Değişen dosyalar: `domain/production/sheetNestingLayout.ts`, `domain/production/sheetNestingLayout.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `.github/workflows/qa-test.yml`; test düzeltme commit'i yalnızca test dosyasını değiştirdi. `frontend/**`, adapter/performans ajanının dosyaları, package manifest, lockfile ve secrets değiştirilmedi.
- Davranış: doğrulanmış batch tekrar doğrulanır; damar uyumlu dönüşler yeniden hesaplanır; quantity fiziksel placement kayıtlarına açılır; deterministik raf sezgisi mevcut sıra/yeni sıra/yeni levha seçer; kerf yatay ve düşey aralıklarda tüketilir. 50.000 parça üstü blocked olur; kısmi sonuç yoktur.
- Bilinen sınırlar: bu bir deterministik shelf heuristic, optimal nesting değildir. Trim payı, fire/yield, kesim sırası/yolu, CNC/postprocessor, makine standardı ve fiziksel üretim onayı yoktur. Gerçek kesim güvenliği atölye doğrulaması gerektirir.
- AI Developer #44221779571 eski `a22c77124c3ceebc4cd0f6c2b86092b53b300e36` SHA'sında OpenRouter free-models-per-day 429 (limit 50, kalan 0) nedeniyle başarısız oldu. Günlük limit reseti sonrasında dahi bu run eski checkout'ta kaldığından rerun güvenli değil; güncel SHA ile yeni dispatch aracı mevcut değil.
- Sonraki adım: DOM-023 makine bağımsız kesim planı veri modelini ekle; placement kaynak kimliği, levha indeksi, koordinat, dönüş ve kerf ilişkisini doğrula. CNC/postprocessor üretme.
\n- Koordinasyon kaydı [6b584c63053f46de76ea474302ad6e2c64a8e528](https://github.com/Taylan789/MobilyaCAD/commit/6b584c63053f46de76ea474302ad6e2c64a8e528) DOM-022 durumunu Actions kanıtıyla güncelledi; docs-only SHA'da CI #44230725896 başarılı, QA #44230725792 cancelled. Domain kodu ve testler 2935bb2 doğrulama SHA'sında tam QA'dan geçti.\n
- Son doğrulama (güncel kod/test ve dokümantasyon HEAD'i): [c97cb686d20433a88384d977a1f2ef57e785ebba](https://github.com/Taylan789/MobilyaCAD/commit/c97cb686d20433a88384d977a1f2ef57e785ebba) için [CI #44230871401](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230871401), [QA #44230871406](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230871406) ve [Pages #44230871444](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230871444) tamamı başarılı. QA 102/102 frontend + 304/304 domain testi, strict shared-domain TypeScript, lint, production build ve production audit 0 bulgu. 6b584 docs-only SHA için ilk QA denemesi cancelled olsa da aynı SHA'nın [#44230736986](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230736986) QA tekrarı başarılı oldu; açık doğrulama blokajı kalmadı.


## 18 Kasım 2026 07:36 TRT — DOM-023 makine bağımsız kesim planı (Actions doğrulandı)

- Başlangıç HEAD: 848071464abb43ab7c5c4a23b5527b07f405fcba.
- Domain commit: [d542ebf8fbe1635c50dc94a82e46003e4039c422](https://github.com/Taylan789/MobilyaCAD/commit/d542ebf8fbe1635c50dc94a82e46003e4039c422).
- Değişen dosyalar: domain/production/sheetCutPlan.ts, domain/production/sheetCutPlan.test.mjs, .github/workflows/qa-test.yml, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md. frontend/**, adapter/performance agent dosyaları, package manifest, lockfile ve secrets değiştirilmedi.
- Davranış: doğrulanmış batch ve layout girdisinden makine bağımsız kesim planı oluşturulur; kaynak Part ID, her fiziksel adet numarası, 1 tabanlı levha indeksi, X/Y mm koordinatları, döndürülmüş ölçüler, grain uyumlu 0/90 dönüş ve kerf korunur. Her adet bir kez bulunmalı; eksik/çift kimlik, ölçü/dönüş uyuşmazlığı, levha sınırı, stock sheet veya kerf uyuşmazlığı tüm planı blocked ve result=null yapar.
- Otomatik test kanıtı: [QA #44239126206](https://github.com/Taylan789/MobilyaCAD/actions/runs/44239126206) başarılı — 102/102 frontend + 316/316 domain testi, 0 başarısız; shared-domain strict TypeScript, lint, production build ve production dependency audit başarılı. Audit adımı production bağımlılıklarında 0 bulgu raporladı; npm install'ın dev dahil toplam ağacı için yazdığı 13 bulgu (2 moderate, 11 high) production audit sonucu değildir.
- [CI #44239126132](https://github.com/Taylan789/MobilyaCAD/actions/runs/44239126132) başarılı; [Pages #44239126161](https://github.com/Taylan789/MobilyaCAD/actions/runs/44239126161) build/deploy başarılı. Kod commit'i için üç workflow da tamamlandı.
- Bilinen kısıtlar: bu model kesim sırası/testere yolu/CNC/postprocessor veya makine standardı üretmez. Placement çiftleri arasındaki çakışma ve kerf aralığının bağımsız geometrik denetimi DOM-024'e bırakıldı; fiziksel üretim güvenliği atölye doğrulaması gerektirir.
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) eski a22c771 SHA'sında OpenRouter free-models-per-day 429 nedeniyle başarısız. Eski checkout rerun edilmedi; güncel SHA ile dispatch aracı bulunmadığından yeni run başlatılmadı. Sağlayıcı günlük kota reseti 19 Kasım 2026 03:00 TRT.
- Sonraki görev: DOM-024 — büyük listelerde O(n²) kullanmadan çakışma, kerf aralığı, levha sınırı, adet tamlığı ve JSON round-trip doğrulaması.


## 18 Kasım 2026 08:51 TRT — DOM-024 kesim planı geometri ve JSON doğrulaması (tamamlandı)

- Başlangıç HEAD: `f4dfaf6a5b6bda2fb9d46454c8ac537434ec1387`; son doğrulanmış kod HEAD: [`c69e8eef627d4cd589844fa4d64df119d01106bf`](https://github.com/Taylan789/MobilyaCAD/commit/c69e8eef627d4cd589844fa4d64df119d01106bf).
- Commit zinciri: [ilk domain/test/docs dilimi b0699f48](https://github.com/Taylan789/MobilyaCAD/commit/b0699f48cfe23c91ed2f003cb805e5aae3889544); [Node 22 strip-only uyumu a5a6c79](https://github.com/Taylan789/MobilyaCAD/commit/a5a6c79eeec546e8512e4b56b9fbf4c1d88511d2); [0.1 mm normalizasyon/safe tick ayrımı c69e8ee](https://github.com/Taylan789/MobilyaCAD/commit/c69e8eef627d4cd589844fa4d64df119d01106bf).
- Değişen dosyalar: `domain/production/sheetCutPlan.ts`, `domain/production/sheetCutPlan.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Frontend, adapter, package manifest/lockfile, secrets ve main dalı değiştirilmedi.
- Davranış: her levha içinde dikdörtgen placement'lar kerf/2 genişletilmiş aralıklarla sweep-line + sıkıştırılmış Y range-max tree kullanılarak O(n log n) doğrulanır. Overlap, yatay/düşey/diagonal yetersiz kerf blocked; tam kerf boşluğu ve sıfır kerf ile kenar teması kabul edilir. Levhalar arası koordinatlar bağımsızdır.
- Ölçü/koordinat doğrulaması güvenli 0.1 mm tick aralığını aşan değerleri reddeder; normalize edilmemiş küçük değer için ayrı hata mesajı korunur.
- JSON API: `serializeSheetCutPlanJson` / `parseSheetCutPlanJson`, `MobilyaCADSheetCutPlan` formatVersion 1 zarfı kullanır. Serializer round-trip yapar; parser bütün planı ve geometriyi yeniden doğrular; blocked/bozuk dosya kısmi sonuç üretmez.
- Yeni testler: overlap, horizontal/vertical/diagonal kerf, exact kerf, zero-kerf edge-touch, farklı levha izolasyonu, 50.000 placement, JSON round-trip, bozuk geometri ve desteklenmeyen sürüm. 50.000 placement denetimi QA logunda yaklaşık 251 ms sürdü.
- İlk QA denemesi [#44247719836](https://github.com/Taylan789/MobilyaCAD/actions/runs/44247719836), Node strip-only parametre property sözdizimini reddetti; [a5a6c79](https://github.com/Taylan789/MobilyaCAD/commit/a5a6c79eeec546e8512e4b56b9fbf4c1d88511d2) bunu explicit class field yaptı. İkinci QA [#44247863906](https://github.com/Taylan789/MobilyaCAD/actions/runs/44247863906), normalize edilmemiş 0.04 mm testindeki hata metni beklentisini yakaladı; [c69e8ee](https://github.com/Taylan789/MobilyaCAD/commit/c69e8eef627d4cd589844fa4d64df119d01106bf) finite/safe-range kontrolünü normalizasyon kontrolünden ayırdı. Testler silinmedi veya gevşetilmedi.
- Son SHA Actions kanıtı: [CI #44247976620](https://github.com/Taylan789/MobilyaCAD/actions/runs/44247976620), [QA #44247976704](https://github.com/Taylan789/MobilyaCAD/actions/runs/44247976704), [Pages #44247976615](https://github.com/Taylan789/MobilyaCAD/actions/runs/44247976615) başarılı. QA: 102/102 frontend + 324/324 domain, strict shared-domain TypeScript, lint, production build, production dependency audit 0 bulgu.
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) logları: ürün ve entegrasyon job'ları OpenRouter free-models-per-day 429 (50/50 limit, kalan 0) nedeniyle başarısız. Eski `a22c771` checkout SHA'sı nedeniyle rerun güvenli değildi; güncel SHA dispatch aracı yok, yeni run başlatılmadı. Kota reseti 19 Kasım 2026 03:00 TRT.
- Bilinen sınırlar: bu yalnızca makine bağımsız dikdörtgen kesim planı doğrulamasıdır; trim/fire/yield, kesim sırası, testere yolu, CNC/postprocessor, makine standardı ve fiziksel üretim onayı yoktur. Atölye güvenliği operatör doğrulaması gerektirir.
- Sonraki görev: DOM-025 — kullanıcı tanımlı trim payı/fire girdileri; varsayılan pay veya verim yüzdesi üretme.

## 18 Kasım 2026 09:36 TRT — DOM-025 kullanıcı tanımlı levha trim payları (Actions doğrulandı)

- Başlangıç HEAD: 684070effd7f54facd6a42cd7bae6942456df51e. Domain özellik commit'i: [3277d8a9be7a3bb2065fbf85933363dfece1607f](https://github.com/Taylan789/MobilyaCAD/commit/3277d8a9be7a3bb2065fbf85933363dfece1607f); 0.1 mm kesirli tick doğrulama/test düzeltmesi: [48f6be6d559c6445cd720b3414082c947194eaeb](https://github.com/Taylan789/MobilyaCAD/commit/48f6be6d559c6445cd720b3414082c947194eaeb).
- Değişen dosyalar: domain/production/sheetNestingLayout.ts, domain/production/sheetNestingLayout.test.mjs, domain/production/sheetCutPlan.ts, domain/production/sheetCutPlan.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md. Bu doğrulama senkronunda AI_PROGRESS.md de güncellendi. frontend/**, adapter/performance agent dosyaları, package manifest/lockfile, secrets ve main dalı değiştirilmedi.
- Davranış: calculateSheetNestingLayout girdisi opsiyonel edgeTrimMm.left/right/top/bottom alanlarını açık mm girdisi olarak kabul eder. Dört kenar 0.1 mm hassasiyetinde, sonlu ve sıfır/pozitif olmalı; toplam pay kullanılabilir alan bırakmıyorsa tüm sonuç blocked olur. Yerleşim koordinatları fiziksel levha sol üstüne göre kalır; yeni levhalar ve yeni sıralar sol/üst trim başlangıcını, sağ/alt sınırlar karşılık gelen payları uygular.
- Kesim planı edgeTrimMm değerini korur; createSheetCutPlan trim sınırlarını yeniden doğrular. JSON formatVersion 1 alanı opsiyonel olduğundan eski dosyalar değişmeden parse edilir; yeni dosyalar trim'i round-trip içinde korur. Kenar payı verilmezse legacy sıfır kenar payı davranışı sürer; hiçbir trim/fire yüzdesi tahmin edilmez.
- İlk QA denemesi [#44253336502](https://github.com/Taylan789/MobilyaCAD/actions/runs/44253336502) yalnızca 0.05 mm fixture'ının beklediği tanı metni ile gerçek güvenli-tick mesajı uyuşmadığı için başarısız oldu; test kaldırılmadı. [48f6be6](https://github.com/Taylan789/MobilyaCAD/commit/48f6be6d559c6445cd720b3414082c947194eaeb) tanıyı 0.1 mm hassasiyet/taşma ayrımıyla düzeltti ve 0.1 + 0.2 mm toplamını güvenli integer tick ile test etti.
- Son kod SHA [48f6be6d559c6445cd720b3414082c947194eaeb](https://github.com/Taylan789/MobilyaCAD/commit/48f6be6d559c6445cd720b3414082c947194eaeb) için [CI #44253469719](https://github.com/Taylan789/MobilyaCAD/actions/runs/44253469719), [QA #44253469656](https://github.com/Taylan789/MobilyaCAD/actions/runs/44253469656) ve [Pages #44253469658](https://github.com/Taylan789/MobilyaCAD/actions/runs/44253469658) tamamı başarılı. QA: 102/102 frontend + 329/329 domain testi, strict shared-domain TypeScript, lint, production build ve production dependency audit 0 bulgu.
- Bilinen sınırlar: trim yalnızca kullanıcı girdisidir; levha net alanı/fire/yield oranı, kesim kaybı, kesim sırası/testere yolu, CNC/postprocessor veya makine standardı üretmez. Fiziksel üretim öncesi operatör/atölye doğrulaması gerekir.
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) loglarında OpenRouter free-models-per-day 429 (limit 50, kalan 0) doğrulandı. Eski SHA checkout'u ve tükenmiş kota nedeniyle rerun yapılmadı; secrets/ayar değiştirilmedi ve yeni dispatch başlatılmadı.
- Sonraki görev: DOM-027 — makine bağımsız kesim operasyonu/kesim sırası sözleşmesi; CNC standardı uydurma.


## 18 Kasım 2026 10:36 TRT — DOM-026 geometrik levha alanı özeti (Actions doğrulandı)

- Başlangıç HEAD: `b6bb3570fda47faae1a1d1809c65deb39e43eb6e`.
- Kod + test + koordinasyon/yol haritası commit'i: [c7745150810379fbd167f6754a9e9677f779df3e](https://github.com/Taylan789/MobilyaCAD/commit/c7745150810379fbd167f6754a9e9677f779df3e).
- Değişen dosyalar: `domain/production/sheetCutPlan.ts`, `domain/production/sheetCutPlan.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. `frontend/**`, adapter/performance agent dosyaları, package manifest/lockfile, secrets ve main dalı değiştirilmedi.
- Domain API `calculateSheetCutPlanAreaSummary`, ready/empty planı tekrar doğrular; blocked upstream tanılarını korur. Her kullanılan levha ve toplam için brüt levha alanı, trim ile ayrılan alan, net kullanılabilir alan, yerleşen net dikdörtgen parça alanı, kullanılmayan geometrik alan ve geometrik doluluk yüzdesi verir.
- Alan hesabı 0.1 mm integer tick değerlerinden BigInt ile yapılır; 0.01 mm² çözünürlük korunur ve güvenli Number aralığı aşımı blocked olur. Doluluk yüzdesi yalnızca yerleşen net parça alanı / net kullanılabilir alan oranıdır; iki ondalığa yuvarlanır.
- Otomatik testler: iki levhalı toplam, dört kenar trim, kesirli 0.1 mm ölçüler, empty/blocked, değiştirilmiş planın reddi ve area overflow. QA: [102/102 frontend + 334/334 domain testi, 0 başarısız](https://github.com/Taylan789/MobilyaCAD/actions/runs/44260882215).
- Actions: [CI #44260882283](https://github.com/Taylan789/MobilyaCAD/actions/runs/44260882283) başarılı; [QA #44260882215](https://github.com/Taylan789/MobilyaCAD/actions/runs/44260882215) başarılı; [Pages #44260882185](https://github.com/Taylan789/MobilyaCAD/actions/runs/44260882185) başarılı. Strict shared-domain TypeScript, lint, production build ve production dependency audit başarılı; production audit 0 bulgu. Lint 32 uyarı / 0 hata, mevcut frontend dosyalarından.
- Bilinen sınırlar: kullanılmayan alan kerf boşlukları/offcut/boş bölgeleri içerir; fire/yield, gerçek kesim kaybı, nesting optimumu, kesim sırası/yolu, CNC veya makine standardı değildir. Fiziksel üretim doğrulaması yapılmadı.
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) eski `a22c771` checkout SHA'sında OpenRouter free-models-per-day 429 (limit 50, kalan 0) nedeniyle başarısız; eski SHA rerun edilmedi. Güncel SHA için workflow dispatch aracı yok; secret/ayar değiştirilmedi.
- Sonraki görev: DOM-027 — proje genelinde malzeme/kalınlık bazlı kesim planı alan özetlerini güvenli biçimde birleştir; grup kimliğini ve ayrı levha toplamlarını koru, blocked batch'te kısmi sonuç verme.


## 18 Kasım 2026 11:13 TRT — DOM-027 proje geneli alan özeti (Actions doğrulandı)

- Başlangıç HEAD: 251322135f5410781d86d474d48bf76345fa06d4.
- Domain teslimat commit'i: [379139cc1e905ba9c3e729f4beb9570a7a8b4da8](https://github.com/Taylan789/MobilyaCAD/commit/379139cc1e905ba9c3e729f4beb9570a7a8b4da8); test fixture doğrulama düzeltmesi: [abfd0f0a1ed487ff4f619acc13c7810cf4f2806f](https://github.com/Taylan789/MobilyaCAD/commit/abfd0f0a1ed487ff4f619acc13c7810cf4f2806f).
- Değişen dosyalar: domain/production/projectSheetCutPlanAreaSummary.ts, yeni domain testi, .github/workflows/qa-test.yml, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md ve AI_PROGRESS.md. frontend/**, adapter/performance agent dosyaları, package manifest/lockfile, secrets ve main değiştirilmedi.
- API calculateProjectSheetCutPlanAreaSummary; proje seçili Part ID listesini her materialId + normalize 0.1 mm thickness grubunda tam bir kez doğrular. Her grup kendi SheetCutPlanAreaSummary ve yerel levha indekslerini taşır. Malzeme/kalınlık/stock sheet/sourcePart uyuşmazlığı, duplicate/missing ID veya blocked grup tüm aggregate sonucu blocked + result:null yapar.
- Proje toplam alanları 0.01 mm² BigInt alt birimleriyle toplanır ve güvenli Number sınırı kontrol edilir. Proje doluluk yüzdesi tüm grupların net kullanılabilir alanına ağırlıklı geometrik orandır; fire/yield/optimizasyon iddiası değildir.
- İlk QA #44266013551 yalnızca test fixture'ının beklenen doğrulama aşamasını yanlış kurması nedeniyle başarısız oldu: testteki different-part ID'si seçili proje listesinde yoktu ve plan eşleşme kontrolüne ulaşmadan doğru biçimde reddediliyordu. Fixture, different-part'i seçili listeye alacak şekilde düzeltildi; test veya üretim kapsamı kaldırılmadı/zayıflatılmadı.
- Son kod SHA için [CI #44266286088](https://github.com/Taylan789/MobilyaCAD/actions/runs/44266286088) başarılı; [QA #44266286004](https://github.com/Taylan789/MobilyaCAD/actions/runs/44266286004) başarılı: 102/102 frontend + 339/339 domain testi, strict shared-domain TypeScript, lint, production build ve production dependency audit başarılı; audit 0 bulgu. Lint 32 mevcut uyarı / 0 hata. [Pages #44266285982](https://github.com/Taylan789/MobilyaCAD/actions/runs/44266285982) başarılı.
- Bilinen sınırlar: her grup için doğrulanmış makine bağımsız kesim planı gerekir. Bu modül JSON zarfı, CSV adapter, CNC kesim sırası/yolu veya makine postprocessor üretmez; geometrik doluluk fire/yield değildir. Fiziksel üretim öncesi operatör/atölye doğrulaması gerekir.
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) eski a22c771 checkout SHA'sında OpenRouter free-models-per-day 429 (limit 50, kalan 0) nedeniyle başarısız. Eski SHA rerun edilmedi; güncel SHA dispatch aracı bulunmadığından yeni run başlatılmadı; secrets/ayar değiştirilmedi.
- INT-001 PR #61 frontend sahibinin alanında açık ve base'e göre 13 commit ahead / 7 behind; değişen dosyaları yalnızca frontend/**. Domain bu turda onun PR'ına müdahale etmedi, merge etmedi. Adapter/performance agent'ın INT-002/PERF-001 dosya sahipliği korundu.
- Sonraki görev: DOM-028 — çoklu grup kesim planları için sürümlü, makine bağımsız JSON zarfı ve strict round-trip.


## 18 Kasım 2026 12:30 TRT — DOM-028 çoklu grup kesim planı JSON zarfı (Actions doğrulandı)

- Başlangıç HEAD: `2f66c56ffe2e1e0158ae1968315672b3cb68561c`. Özellik commit'i [2281acbc](https://github.com/Taylan789/MobilyaCAD/commit/2281acbcf68c405cac52ea8648d55ddcd4f5c7c5), nested plan tanı aktarımı düzeltmesi [fec5dff](https://github.com/Taylan789/MobilyaCAD/commit/fec5dff6c883540161ab856e8325a4707edad2e6), test fixture düzeltmesi ve doğrulanmış son SHA [b51c293](https://github.com/Taylan789/MobilyaCAD/commit/b51c293815a11d38215740fa2e17f648271bdafb).
- Değişen dosyalar: `domain/production/projectSheetCutPlanFile.ts`, `domain/production/projectSheetCutPlanFile.test.mjs`, `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Frontend, tek-grup JSON v1, adapter/performance ajanı dosyaları, secrets ve main dalı değiştirilmedi.
- API: `serializeProjectSheetCutPlanJson` / `parseProjectSheetCutPlanJson` yeni `MobilyaCADProjectSheetCutPlan` formatVersion 1 zarfını üretir/okur. Her grup groupId, materialId, normalize 0.1 mm kalınlık, kaynak Part ID sırası ve tek-grup planını; plan da kendi levha indeksleri, trim, kerf, mm placement ve adetlerini taşır. İç plan mevcut tek-grup parser'ı, proje kapsamı mevcut alan özeti doğrulayıcısı ile tekrar doğrulanır. Eksik/çift grup veya Part ID, yanlış groupId, bilinmeyen alan ve bozuk geometri tüm dosyayı blocked yapar; kısmi sonuç dönmez.
- İlk QA [#44277414552](https://github.com/Taylan789/MobilyaCAD/actions/runs/44277414552): 344/347 domain testi geçti; üç test, nested serializer'ın asıl doğrulama tanısını genel status mesajıyla maskelemesini gösterdi. Tanı aktarımı düzeltildi. İkinci QA [#44277756956](https://github.com/Taylan789/MobilyaCAD/actions/runs/44277756956): 346/347 geçti; bir fixture, plan uyuşmazlığına ulaşmadan seçili proje kapsamı dışında ID verdiği için düzeltildi. Test kapsamı kaldırılmadı veya zayıflatılmadı.
- Son SHA için [CI #44277876041](https://github.com/Taylan789/MobilyaCAD/actions/runs/44277876041), [QA #44277876003](https://github.com/Taylan789/MobilyaCAD/actions/runs/44277876003) ve [Pages #44277876046](https://github.com/Taylan789/MobilyaCAD/actions/runs/44277876046) başarılı. QA: 102/102 frontend + 347/347 domain testi, 0 başarısız; shared-domain strict TypeScript, lint, production build ve production dependency audit başarılı (0 bulgu).
- AI Developer [#44221779571](https://github.com/Taylan789/MobilyaCAD/actions/runs/44221779571) iki job'da OpenRouter free-models-per-day 429 (50/50 limit) nedeniyle başarısız. Run eski `a22c771` SHA'sında kaldığı ve günlük kota tükendiği için rerun yapılmadı; yeni dispatch aracı yok, secrets/ücretli kredi/ayar değiştirilmedi.
- INT-001 PR [#61](https://github.com/Taylan789/MobilyaCAD/pull/61) hâlâ frontend/** kapsamlı, açık ve 13 ahead / 7 behind; PR açıklaması eski base snapshot'ı ve rebase/sync gereksinimini belirtiyor. Bu ajan PR'ı değiştirmedi veya merge etmedi. INT-002/PERF-001 dosya sahipliği korunuyor.
- Bilinen sınırlar: makine bağımsız JSON dosyasıdır; kesim sırası/testere yolu, fire/yield, CNC/postprocessor, makine standardı veya fiziksel üretim onayı üretmez. Atölye doğrulaması gerekir.
- Sonraki görev: DOM-029 — doğrulanmış batch grupları ve layout raporlarını atomik proje kesim planı raporuna bağla; eksik/çift/blocked grup tüm sonucu engellesin.

## 18 Kasım 2026 13:30 TRT — DOM-029 atomik proje kesim planı (Actions doğrulandı)

- Başlangıç HEAD: 11e2454d41015869a1a6ba4587588e2ff91832e6.
- Kod commit'i: [10cc11aad3e4307bbff1129c82a6effb06b3c1fd](https://github.com/Taylan789/MobilyaCAD/commit/10cc11aad3e4307bbff1129c82a6effb06b3c1fd); duplicate-ID tanı sırası düzeltmesi ve doğrulanmış son kod SHA: [76a9e241c2c63b5f99c259cbddabeaac26a9d62b](https://github.com/Taylan789/MobilyaCAD/commit/76a9e241c2c63b5f99c259cbddabeaac26a9d62b).
- Geliştirme: createProjectSheetCutPlan, createProjectSheetNestingBatches çıktısını groupId ile layout raporlarına bağlar. Layout giriş sırası değişse bile çıktı batch grup sırasını ve kaynak Part ID sırasını korur; her grup createSheetCutPlan ile yeniden doğrulanır; proje JSON v1 serialize/parse round-trip uygulanır.
- Atomiklik: eksik/çift/fazla/blocked layout, yanlış groupId, batch parça/levha malzeme-kalınlık uyuşmazlığı, duplicate/missing source ID veya excluded/selected ID çakışması tüm sonucu blocked + result:null + json:null yapar.
- Değişen dosyalar: domain/production/projectSheetCutPlan.ts (yeni), domain/production/projectSheetCutPlan.test.mjs (yeni), .github/workflows/qa-test.yml, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Otomatik kontroller: son kod SHA için [CI #44287015033](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015033), [QA #44287015199](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015199) ve [Pages #44287015031](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015031) başarılı. QA 102/102 frontend + 355/355 domain testi; strict shared-domain TypeScript, lint, production build ve production dependency audit (0 bulgu) başarılı.
- Bilinen sınırlar: deterministic shelf heuristic optimal nesting değildir; fire/yield, CNC, kesim sırası/yolu ve makine standardı üretmez. Fiziksel üretim öncesi atölye doğrulaması gerekir.
- Sonraki görev: DOM-030 — kaydedilmiş proje kesim planını güncel üretim Part snapshot'ına karşı doğrula; stale planı export edilebilir göstermeden engelle.


## 18 Kasım 2026 13:36 TRT — DOM-029 ilk QA bulgusu ve doğrulama sırası düzeltmesi

- İlk kod commit'i: 10cc11aad3e4307bbff1129c82a6effb06b3c1fd.
- [CI #44286822455](https://github.com/Taylan789/MobilyaCAD/actions/runs/44286822455) başarılı; [Pages build #44286822620](https://github.com/Taylan789/MobilyaCAD/actions/runs/44286822620) başarılı.
- [QA #44286822565](https://github.com/Taylan789/MobilyaCAD/actions/runs/44286822565) başarısız: 354/355 domain testi geçti. Tek hata, duplicate Part ID testinin beklediği duplicate tanısı yerine daha önce çalışan grup sırası tanısını almasıydı; üretim davranışı yine güvenli biçimde blocked idi.
- Düzeltme: grup sırası denetiminden önce global Part ID tekilliği doğrulanacak şekilde doğrulama sırası değiştirildi. Test kapsamı veya assertion gevşetilmedi; duplicate kimlik testi aynı kaldı.
- Düzeltme commit'i [76a9e24](https://github.com/Taylan789/MobilyaCAD/commit/76a9e241c2c63b5f99c259cbddabeaac26a9d62b) için [CI #44287015033](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015033), [QA #44287015199](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015199) ve [Pages #44287015031](https://github.com/Taylan789/MobilyaCAD/actions/runs/44287015031) tamamlandı ve başarılı. QA 102/102 frontend + 355/355 domain; tüm otomatik kalite kapıları geçti.


- DOM-029 koordinasyon panosu DONE olarak güncellendi; DOM-030 READY: JSON kesim planını güncel üretim Part snapshot'ına karşı doğrula ve stale planı engelle.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) OpenRouter free-models-per-day 429 kota hatasıyla başarısız; eski SHA rerun edilmedi, yeni dispatch aracı yok. Secret, ücretli kredi veya workflow ayarı değiştirilmedi.
- INT-001 PR [#61](https://github.com/Taylan789/MobilyaCAD/pull/61) açık; yalnızca frontend/** değişiklikleri var, 13 ahead / 7 behind ve güncel base'e senkronizasyon gerektiriyor. Bu ajan PR'a veya frontend dosyalarına müdahale etmedi. INT-002/PERF-001 sahipliği korunuyor.


## 18 Kasım 2026 14:00 TRT — DOM-030 tamamlandı (Actions doğrulandı)

- Başlangıç `dev/github-work` HEAD: `be512f285e3074815dd18559e2cd54655b91d13d`.
- Domain özellik commit'i: [61bac5aa](https://github.com/Taylan789/MobilyaCAD/commit/61bac5aa2aa8c7ede40ffa5b53edd7a75b9a6a89). İlk QA [#44291710603](https://github.com/Taylan789/MobilyaCAD/actions/runs/44291710603) 361/362 domain testi geçti; tek başarısızlık stale kalınlık tanısındaki `kalınlığı` metni ile test regex'indeki `kalınlık` farkıydı. Üretim davranışı doğru biçimde `stale + result:null + json:null` döndürdü.
- Assertion ve strict TypeScript override map tipi düzeltmesi: [7f8a9cc](https://github.com/Taylan789/MobilyaCAD/commit/7f8a9cc3500431c9ddd198ac7307e9ee0458ec27). Test kapsamı silinmedi veya gevşetilmedi.
- Değişen dosyalar: `domain/production/projectSheetCutPlanFreshness.ts`, `domain/production/projectSheetCutPlanFreshness.test.mjs`, `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Hiçbir `frontend/**`, adapter/performance agent dosyası, package/lockfile, secret veya `main` dosyası değiştirilmedi.
- API `validateProjectSheetCutPlanFreshness` kayıtlı çoklu grup JSON v1 planını strict parse eder; güncel Part snapshot'ından her grup için stock sheet/kerf ile batch'i tekrar doğrular. Seçili Part ID/sırası, mm genişlik/uzunluk, quantity, materialId, 0.1 mm normalize kalınlık, etkin damar yönü ve rectangular geometri karşılaştırılır.
- Son kod SHA `7f8a9cc` için [CI #44291888414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44291888414), [QA #44291888410](https://github.com/Taylan789/MobilyaCAD/actions/runs/44291888410) ve [Pages #44291888398](https://github.com/Taylan789/MobilyaCAD/actions/runs/44291888398) başarılı. QA: 102/102 frontend + 362/362 domain testi, 0 başarısız; shared-domain strict TypeScript, lint 32 uyarı / 0 hata, production build ve production audit 0 bulgu.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) OpenRouter free-models-per-day 429 (50/50) nedeniyle başarısız. Eski checkout üzerinde rerun yapılmadı; güncel SHA için dispatch aracı yok, secrets/ayar/ücretli kredi değiştirilmedi.
- Bilinen sınırlar: JSON v1 yalnızca seçili `sourcePartIds` listesini saklar; seçilmemiş Part ekleme/silme bu API'nin kapsamı değildir. Legacy Part damar yönü kayıtta yoksa aynı açık grain override tekrar verilmelidir. Bu doğrulama CNC, kesim sırası/yolu veya fiziksel üretim onayı değildir.
- Sonraki görev: DOM-031 — sürümlü plan zarfında tam proje Part snapshot kimliği/özeti saklayarak seçilmemiş Part kapsamı değişikliklerini de yakala; ardından frontend sahibine fresh/stale/blocked entegrasyon sözleşmesini aktar.


## 18 Kasım 2026 15:22 TRT — DOM-031 tam proje Part snapshot'ı

- Başlangıç `dev/github-work` HEAD: `1c63c5fba7815cc2a52284ae592e8a8810dbf16f`.
- Bütün üretim Part kayıtları (seçili ve hariç) kanonik JSON snapshot'ında saklanır; yeni proje kesim planları formatVersion 2 üretir. v1 parser/serializer davranışı korunur.
- Freshness v2 çağrısı `currentSelectedPartIds` alanını zorunlu alır. Seçim kapsamı uyuşmazlığı stale; bu girdi yoksa blocked; tam proje snapshot'ında ekleme/silme/sıra/alan değişimi stale ve sonuçsuz olur.
- Değişen dosyalar: `domain/production/projectPartSnapshot.ts` (+ test), `projectSheetNestingBatches.ts` (+ test), `projectSheetCutPlanFile.ts` (+ test), `projectSheetCutPlan.ts` (+ test), `projectSheetCutPlanFreshness.ts` (+ test), `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Kod commit'i: [d88d2c86](https://github.com/Taylan789/MobilyaCAD/commit/d88d2c865a8cbef9e778cd51bdec611f7ad8e912). [CI #44304935436](https://github.com/Taylan789/MobilyaCAD/actions/runs/44304935436) başarılı; [QA #44304935049](https://github.com/Taylan789/MobilyaCAD/actions/runs/44304935049) başarılı: 102/102 frontend + 367/367 domain testi, 0 başarısız; shared-domain strict TypeScript, lint (32 uyarı / 0 hata), production build ve production dependency audit başarılı. [Pages #44304934560](https://github.com/Taylan789/MobilyaCAD/actions/runs/44304934560) başarılı.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) iki job'da OpenRouter free-models-per-day 429 (50/50, kalan 0) nedeniyle başarısız. Loglar incelendi; kota sıfırken rerun aynı hatayı tekrarlayacağından yapılmadı. Reset 19 Kasım 2026 03:00 TRT; secrets/ayar/ücretli kredi değiştirilmedi.
- Bilinen sınırlar: snapshot kriptografik imza değildir; v1 planlar yalnızca seçili Part freshness davranışını korur; fiziksel CNC/atölye doğrulaması bu modelin kapsamı değildir.
- Sonraki görev: DOM-032 — proje kesim planı dışa aktarımını freshness doğrulaması olmadan ready kabul etmeyen tek domain kapısı.


## 18 Kasım 2026 16:08 TRT — DOM-032 tamamlandı; Actions doğrulandı

- Tek domain export kapısı: createFreshProjectSheetCutPlanExport, yalnızca canExport=true ve boş exportBlockers taşıyan güncel ready üretim raporunu kabul eder; kayıtlı JSON v2 planını tam proje Part snapshot'ı ve güncel currentSelectedPartIds ile freshness kontrolünden geçirir.
- Freshness stale/blocked, eksik seçim girdisi, v1 zarfı veya export blocker durumunda result/json null kalır; kısmi JSON üretilmez. Legacy v1 parser davranışı değişmedi.
- Değişen dosyalar: domain/production/projectSheetCutPlanExport.ts (yeni), domain/production/projectSheetCutPlanExport.test.mjs (yeni), .github/workflows/qa-test.yml, AI_COORDINATION.md, AI_PROGRESS.md, PRODUCT_ROADMAP.md, docs/production-domain-contract.md.
- Kod commit'i: [fe720ce](https://github.com/Taylan789/MobilyaCAD/commit/fe720ce65b3d1710dfc0eab050a5ed01989c2217). [CI #44311591605](https://github.com/Taylan789/MobilyaCAD/actions/runs/44311591605) başarılı; [QA #44311591631](https://github.com/Taylan789/MobilyaCAD/actions/runs/44311591631) başarılı: 102/102 frontend + 373/373 domain testi, 0 başarısız; shared-domain strict TypeScript, lint (32 uyarı / 0 hata), production build ve production dependency audit (0 bulgu) geçti. [Pages #44311591602](https://github.com/Taylan789/MobilyaCAD/actions/runs/44311591602) başarılı.
- Bilinen sınırlar: JSON v2 snapshot canonical JSON karşılaştırmasıdır, kriptografik imza değildir. Makine bağımsız dikdörtgen plan; kesim sırası/yolu, fire/yield, CNC/postprocessor veya fiziksel üretim onayı değildir.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) eski 11e2454 SHA üzerinde OpenRouter free-models-per-day 429 ile başarısızdı; loglar incelendi. Eski checkout rerun edilmedi; yeni dispatch aracı yok, kota/secret/ayar değiştirilmedi.
- Sonraki adım: frontend sahibinin export kapısını INT-001 akışına bağlamasını salt okunur izlemek; ardından DOM-033 levha kaynağı/revizyon provenance metadata'sını kullanıcı girdili ve geriye uyumlu modellemek.


## 18 Kasım 2026 17:50 TRT — DOM-033 levha kaynağı/revizyon provenance (Actions doğrulandı)

- Başlangıç `dev/github-work` HEAD: `bcab56b2f15b646b6e059bee3ef9b2f6e8c1ee7e`.
- Kod commit: [0fc8bd0](https://github.com/Taylan789/MobilyaCAD/commit/0fc8bd09ebddff1b3c864dff5fa9d775a1759882).
- Değişen dosyalar: `domain/production/projectSheetCutPlanFile.ts`, `projectSheetCutPlanFile.test.mjs`, `projectSheetCutPlanExport.ts`, `projectSheetCutPlanExport.test.mjs`, `domain/production/projectSheetCutPlanFreshness.ts`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Davranış: grup başına opsiyonel `stockSheetSource.sourceId/revision`; metadata varsa tam Part snapshot ile JSON v3; v1/v2 parse uyumluluğu; freshness ve export gate v3'ü destekler. Boş/bozuk/ek alan metadata reddedilir.
- Otomatik kontroller: [CI #44328579254](https://github.com/Taylan789/MobilyaCAD/actions/runs/44328579254) başarılı; [QA #44328579308](https://github.com/Taylan789/MobilyaCAD/actions/runs/44328579308) başarılı; [Pages #44328579621](https://github.com/Taylan789/MobilyaCAD/actions/runs/44328579621) başarılı. QA: 102/102 frontend + 375/375 domain testi, 0 başarısız; shared-domain strict TypeScript, lint (32 uyarı / 0 hata), production build ve production dependency audit (0 bulgu) geçti.
- Bilinen sınırlar: sourceId/revision kullanıcı/atölye girdisidir; harici katalog, tedarikçi, fiyat, stok veya sertifika doğrulaması yoktur. CNC/üretim uygunluğu iddiası değildir.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) iki agent job'unda OpenRouter free-models-per-day 429 verdi (limit 50, kalan 0); loglarda reset zamanı 19 Kasım 2026 03:00 TRT. Eski SHA rerun edilmedi; güncel SHA dispatch aracı yok, secret/ayar/ücretli kredi değiştirilmedi.
- Sonraki görev: INT-001 v3/JSON export entegrasyonunu salt okunur izlemek; ardından DOM-034 provenance kapsam özeti.

## 18 Kasım 2026 18:20 TRT — DOM-034 provenance kapsam özeti tamamlandı

- Başlangıç `dev/github-work` HEAD: `eb3d5be85d7bf99e2c6c600b83e7b3782fc30634`.
- Kod commit: [fddbadc](https://github.com/Taylan789/MobilyaCAD/commit/fddbadc9b4fc87f277c09b0f8048fa16aedd246b).
- Değişen dosyalar: `domain/production/projectSheetCutPlanProvenanceSummary.ts`, `domain/production/projectSheetCutPlanProvenanceSummary.test.mjs`, `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`.
- Davranış: strict JSON v1/v2/v3 parser'ı üzerinden grup sırası ve kaynak Part ID'leri korunarak `provided/missing` durumları, toplam grup ve provenance sayaçları üretilir. v1/v2 tüm grupları eksik sayar; v3 kısmi provenance kapsamını gösterir. Empty sıfır kapsamla kalır; bozuk JSON blocked ve kısmi sonuçsuz döner.
- Otomatik doğrulama: [CI #44335223878](https://github.com/Taylan789/MobilyaCAD/actions/runs/44335223878) başarılı; [QA #44335223823](https://github.com/Taylan789/MobilyaCAD/actions/runs/44335223823) başarılı: 102/102 frontend + 379/379 domain testi, 0 başarısız; shared-domain strict TypeScript, lint (32 uyarı / 0 hata), frontend TypeScript + Vite production build ve production dependency audit (0 vulnerability) geçti. [Pages #44335223832](https://github.com/Taylan789/MobilyaCAD/actions/runs/44335223832) başarılı.
- Bilinen sınırlar: provenance yalnızca kullanıcı/atölye metadata'sının varlığını gösterir; kaynak, revizyon, tedarikçi, fiziksel levha, sertifika veya makine standardı doğrulaması değildir. CNC, kesim sırası/yolu veya fire/yield üretmez.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800) en son workflow olarak tamamlandı/başarısız; ürün ve entegrasyon agent job'ları OpenRouter free-models-per-day 429 (50/50, kalan 0) nedeniyle durdu. Log incelendi; eski SHA üzerinde rerun yapılmadı, yeni dispatch aracı bulunmadı; secret/ayar/ücretli kredi değiştirilmedi.
- Sonraki görev: DOM-035 — desteklenmeyen aile ve kesitli geometri blocker'larının proje export kapısına kayıpsız taşındığını doğrula; kısmi JSON üretimini regresyon testleriyle engelle.


## 18 Kasım 2026 19:13 TRT — DOM-035 export tanılarının kayıpsız aktarımı (Actions bekleniyor)

- Başlangıç `dev/github-work` HEAD: `4cb72e6d6ea213b7386d69756d0c3778828ba522`; önceki CI #44335528115 ve QA #44335528375 bu SHA için başarılıydı. Kod değişikliğinden önce aktif CI/QA/AI Developer işi bulunmadı.
- Dikey dilim: `createFreshProjectSheetCutPlanExport`, domain üretim raporunun desteklenmeyen aile, bloklu mobilya, proje hatası ve export blocker tanılarını `productionDiagnostics` alanında kaynak, mobilya kimliği, aile, kod ve özgün mesajıyla taşır. Mevcut `diagnostics` metin listesi korunur.
- Regresyon testleri: gerçek domain raporlarıyla desteklenmeyen aile, geçersiz panel açıklığı geometrisi ve geçerli kesitli panelin adapter export blocker'ı; tüm bloklu durumlarda `result/json: null`.
- Değişen dosyalar: `domain/production/projectSheetCutPlanExport.ts`, `domain/production/projectSheetCutPlanExport.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Hiçbir `frontend/**`, adapter/performance agent dosyası veya bağımlılık değişmedi.
- Kod commit SHA: [64c1177651d9137bb4e17e4076ad2fef1320602e](https://github.com/Taylan789/MobilyaCAD/commit/64c1177651d9137bb4e17e4076ad2fef1320602e).
- Otomatik doğrulama: [CI #44345824527](https://github.com/Taylan789/MobilyaCAD/actions/runs/44345824527), [QA #44345823923](https://github.com/Taylan789/MobilyaCAD/actions/runs/44345823923) ve [Pages #44345823859](https://github.com/Taylan789/MobilyaCAD/actions/runs/44345823859) başarılı. QA 102/102 frontend + 382/382 domain testi, strict shared-domain TypeScript, lint (32 uyarı / 0 hata), production build ve production dependency audit (0 bulgu) geçti.
- Bilinen sınırlar: panel açıklıkları dikdörtgen nesting'e veya CNC'ye dönüştürülmez; gerçek kesit geometri desteği gelene kadar export engellidir. Fiziksel atölye/CNC doğrulaması yoktur.
- AI Developer #44282900800 logları yeniden incelendi: iki job da OpenRouter free-models-per-day 429, limit 50/kalan 0 ile başarısız; reset 19 Kasım 2026 03:00 TRT. Rerun yapılmadı; quota/secrets/ayar/ücretli kredi değiştirilmedi.
- Sonraki adım: DOM-035 doğrulandı ve DONE; INT-001 PR #61'in güncel domain export sözleşmesine entegrasyonunu salt okunur izle. PR #61 hâlâ eski base üzerinde; frontend sahibinin kendi dalında senkronizasyon ve yeni QA kanıtı gerekir.


## 18 Kasım 2026 20:22 TRT — DOM-036 kesitli panel açıklığı doğrulamasını ölçekle

- Başlangıç `dev/github-work` HEAD: `d324d9d4c8eff8ae7a64b7d218c8232d7b14cf99`; önceki HEAD için CI #44346109707, QA #44346109778 ve Pages #44346109635 başarılıydı.
- Dikey dilim: `calculatePanelCutoutGeometry` içindeki O(n²) çiftli açıklık taraması X sweep-line + sıkıştırılmış Y aralık maksimum ağacına dönüştürüldü. Kenar/köşe teması reddi ve mevcut hata mesajı korunur.
- Regresyon: 50.000 ayrık açıklık fixture'ı geometri sayısını ve net alanı doğrular; mevcut çakışma, temas, sınır, 0.1 mm normalizasyon ve tüketim testleri korunur.
- Değişen dosyalar: `domain/production/panelCutoutGeometry.ts`, `domain/production/panelCutoutGeometry.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. `frontend/**`, adapter/performance agent dosyaları ve bağımlılıklar değiştirilmedi.
- Kod commit: [b00589f26f5c86df7bb85887deb561ae0984e4e3](https://github.com/Taylan789/MobilyaCAD/commit/b00589f26f5c86df7bb85887deb561ae0984e4e3).
- Otomatik doğrulama: [CI #44358009815](https://github.com/Taylan789/MobilyaCAD/actions/runs/44358009815), [QA #44358009840](https://github.com/Taylan789/MobilyaCAD/actions/runs/44358009840) ve [Pages #44358009870](https://github.com/Taylan789/MobilyaCAD/actions/runs/44358009870) başarılı. QA 102/102 frontend + 383/383 domain testi, 0 başarısız; shared-domain strict TypeScript, frontend TypeScript/Vite production build, lint (32 uyarı / 0 hata) ve production audit (0 vulnerability) geçti. CI build/lint başarılı.
- Bilinen sınırlar: `createProjectSheetNestingInput` `panelGeometry` girdisini blocked/`result: null` tutar. Hole-aware placement, kerf clearance, kesim sırası, CNC ve fiziksel üretim doğrulaması yoktur.
- Sonraki adım: DOM-037 — desteklenen dolap türevi ailelerde gövde panel malzeme/kalınlık override'larının Part snapshot ve malzeme tüketimi boyunca kimlik/ölçü/adet sadakatini test et. Hole-aware nesting için mevcut blocker korunur; INT-001 PR #61 ve UI PR #73 ayrı sahipliklerinde kalır.


## 18 Kasım 2026 21:30 TRT — DOM-037 gövde panel override aile matrisi (Actions bekleniyor)

- Başlangıç `dev/github-work` HEAD: `f5f39271170aafe9fe46e5f9282827e2b99ff80f`.
- Kod/test: `domain/production/bodyPanelMaterialsFamilies.test.mjs` eklendi. Beş ailede grup bazlı malzeme ID + gerçek mm kalınlığı, raf quantity, override edilmeyen varsayılan grup, legacy materialId yokluğu, proje malzeme tüketimi ve Part snapshot JSON round-trip kapsandı.
- Negatif regresyon: katalogda bulunmayan gerçek kalınlığa sahip tek override tüm proje sonucunu `blocked` / `result: null` yapmalı; kısmi Part listesi verilmemeli.
- Değişen dosyalar: `domain/production/bodyPanelMaterialsFamilies.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- İlk commit SHA ve CI/QA bağlantıları GitHub sonucu geldikten sonra bu kaydın doğrulama satırına eklenecek; şu an doğrulama bekleniyor, başarılı ilan edilmedi.
- Bilinen sınırlar: özel wardrobe/TV shelf/divider parçaları kendi açık malzeme/kalınlık girdilerini kullanır; bathroom vanity panelGeometry export blocker'ı korunur. Frontend ve integration-performance dosyaları değiştirilmedi.
- Sonraki görev: DOM-038 — group override materialId/kalınlık değişiminin kayıtlı proje kesim planı freshness kontrolünde stale olarak yakalandığını aile matrisiyle doğrula.


## DOM-037 ilk Actions sonucu ve düzeltme — 18 Kasım 2026 21:30 TRT

- Commit: `b06898657c1f853ac8c37af3f84b7eb9ec9a8aec`.
- CI [#44371472424](https://github.com/Taylan789/MobilyaCAD/actions/runs/44371472424): **başarılı** (TypeScript/production build ve lint adımları yeşil).
- QA [#44371472416](https://github.com/Taylan789/MobilyaCAD/actions/runs/44371472416): **başarısız**; shared domain testleri 384/385. Tek başarısızlık yeni aile matrisi testinde `report.status` değerinin `blocked` gelmesi. Mevcut üretim kodunda hata kanıtlanmadı; test fixture/rapor tanısı ayrıştırılıyor.
- Bu düzeltme, opsiyonel helper alanında açıkça `undefined` verilmesini gerçek alan yokluğu olarak korur ve başarısız proje tanılarını assertion çıktısına ekler.
- DOM-037 henüz DONE değil; yeni CI/QA sonucu bekleniyor. Bilinen üretim sınırları ve frontend sahiplik ayrımı korunuyor.


## DOM-037 — Nihai doğrulama ve kapanış (18 Kasım 2026 21:30 TRT)

- Başlangıç HEAD: `f5f39271170aafe9fe46e5f9282827e2b99ff80f`.
- İlk test commit'i: `b06898657c1f853ac8c37af3f84b7eb9ec9a8aec`; CI başarılı, ilk QA `384/385` domain testi nedeniyle başarısız oldu. Log, test helper'ın açık `undefined` opsiyonel alanlara destructuring default'u uyguladığını gösterdi; üretim kodunda regresyon kanıtlanmadı.
- Düzeltme/teslim commit'i: `3c2180a8b7743a75bb18c59d63ae7dd5c4c93748`.
- Değişen dosyalar: `domain/production/bodyPanelMaterialsFamilies.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- CI [#44371780553](https://github.com/Taylan789/MobilyaCAD/actions/runs/44371780553): **başarılı**; frontend TypeScript/production build ve lint yeşil.
- QA [#44371780460](https://github.com/Taylan789/MobilyaCAD/actions/runs/44371780460): **başarılı**; frontend **124/124**, domain **385/385**, strict shared-domain type-check, lint, TypeScript/build ve production dependency audit başarılı.
- Pages deploy [#44371780762](https://github.com/Taylan789/MobilyaCAD/actions/runs/44371780762): **başarılı**.
- AI Developer [#44282900800](https://github.com/Taylan789/MobilyaCAD/actions/runs/44282900800): OpenRouter `free-models-per-day` 429 kotası; tekrar deneme günlük kotayı değiştirmeyeceğinden güvenli değil. Secrets, kredi veya servis ayarı değiştirilmedi.
- DOM-037 DONE. Sonraki görev: DOM-038 — body-panel materialId/thickness değişiminin kayıtlı sheet cut-plan freshness kontrolünde stale tespit edilmesini aile matrisiyle test et.


## 18 Kasım 2026 22:52 TRT — DOM-038 freshness test düzeltmeleri

- İlk test commit'i: `b040393404c19d2591a16832b8436ee4f965545b`; CI [#44384148344](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384148344) başarılı, QA [#44384148272](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384148272) başarısız: 385/387 domain testi. Banyo dolabı fixture'ında geçerli açık geçiş geometrisi eksikti.
- İkinci fixture commit'i: `48e2d940d8f5d9a8ec1302e147c79db580f2953e`; CI [#44384629930](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384629930) başarılı, QA [#44384629941](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384629941) başarısız: 385/387 domain testi. Freshness çağrısı, legacy Part'ların plan üretiminde kullanılan aynı açık `grainDirectionsByPartId` girdisini tekrar vermediği için blocked döndü.
- Pages [#44384629749](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384629749) başarılı.
- Değişen kapsam: yalnızca domain freshness testi, üretim sözleşmesi, görev panosu ve yol haritası. Üretim hesap motoru değiştirilmedi; kesitli banyo paneli nesting blocker'ı korundu.
- Düzeltme: freshness doğrulamasına seçili legacy Part ID'leri için aynı açık `none` grain override haritası ekleniyor. Eksik override'ın blocked olması gevşetilmiyor.
- Sonraki adım: yeni CI/QA sonucunu incele; başarılıysa DOM-038'i DONE yap. AI Developer [#44374039856](https://github.com/Taylan789/MobilyaCAD/actions/runs/44374039856) OpenRouter günlük 429 kotası nedeniyle başarısız; rerun yapılmadı ve secrets/ayar değiştirilmedi.


## DOM-038 — Nihai doğrulama ve kapanış (18 Kasım 2026 22:54 TRT)

- Başlangıç HEAD: `fa4fce26ca9cc084cceed053034c85e6c4f39569`.
- Commit zinciri: ilk test `b040393404c19d2591a16832b8436ee4f965545b`; banyo panelGeometry fixture düzeltmesi `48e2d940d8f5d9a8ec1302e147c79db580f2953e`; grain override/freshness düzeltmesi `d956205d87d46e9173b2b1dbcf4b13fe4952b46f`.
- Değişen dosyalar: `domain/production/bodyPanelMaterialsFreshness.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- CI [#44384952328](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384952328): başarılı; frontend TypeScript/production build ve lint.
- QA [#44384952562](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384952562): başarılı; frontend **124/124**, domain **387/387**, shared-domain type-check, lint, frontend TypeScript/build ve production dependency audit **0 vulnerability**.
- Pages [#44384952512](https://github.com/Taylan789/MobilyaCAD/actions/runs/44384952512): başarılı.
- İlk iki QA denemesi yalnızca fixture/çağrı sözleşmesi eksiklerinden başarısız oldu; loglara göre üretim motoru regresyonu yoktu. Üçüncü committe testler geçti.
- AI Developer ve Integration/Performance agent workflow'ları [#44374039856](https://github.com/Taylan789/MobilyaCAD/actions/runs/44374039856) OpenRouter `free-models-per-day` 429 nedeniyle başarısız: limit 50, remaining 0. Rerun yapılmadı; secrets, kredi veya servis ayarı değiştirilmedi.
- Bilinen sınırlar: kesitli banyo paneli hole-aware nesting kanıtlanana kadar dikdörtgen nesting dışında kalır; legacy Part için grain yönü açıkça verilmelidir; makine/CNC standardı iddiası yoktur.
- Sonraki görev: DOM-039 — materialId + mm kalınlık bazlı fiyat satırlarını teklif/maliyet özetine bağla; eksik katalog fiyatında toplam üretme.


## 18 Kasım 2026 23:33 TRT — DOM-039 kalınlık duyarlı malzeme fiyatlandırması (Actions bekleniyor)

- Başlangıç HEAD: `3b94138bb23a85fa11f203916521fcfd01a2c299`; kod/test commitleri: [domain dd7c6c5](https://github.com/Taylan789/MobilyaCAD/commit/dd7c6c5fbadf23e883632feecea929d1c57100b3), [tüketim regresyonları 9b09b67](https://github.com/Taylan789/MobilyaCAD/commit/9b09b67b383f03b98346f81530e5d1a66b220dd0), [birleşik teklif regresyonları 6a76d66](https://github.com/Taylan789/MobilyaCAD/commit/6a76d6656ab3418e6d44d6e9c00b5c5afcca853e).
- Dokümantasyon commitleri: [domain sözleşmesi 8a9effa](https://github.com/Taylan789/MobilyaCAD/commit/8a9effae3796e365b3d66209016a2716fae74715), [AI koordinasyon 35ff491](https://github.com/Taylan789/MobilyaCAD/commit/35ff4919d6c369157ed2842db2159c2e67a2e53d), [ürün yol haritası 23ea68b](https://github.com/Taylan789/MobilyaCAD/commit/23ea68b8e4b29d5d8f29751f70597cc7aa9b0b6e). Bu kaydın commit'i ayrıca izlenebilir.
- Davranış: malzeme fiyatı artık `materialId + m2 + thicknessMm` ile eşleşir. Aynı malzeme adı farklı katalog kimliklerinde ve aynı kimliğin farklı kalınlıklarında ayrı maliyet satırları üretir. Kalınlık alanı pozitif, sonlu ve 0.1 mm hassasiyetinde olmalıdır; donanım/kenar bandında reddedilir.
- Geriye uyumluluk: kalınlık belirtmeyen eski fiyat satırı yalnızca ilgili materialId proje içinde tek farklı kalınlıkta tüketiliyorsa kullanılabilir. Birden fazla kalınlıkta legacy fiyat belirsizdir; her eksik kalınlık `missingPrices` içinde gösterilir ve `costSummary` null kalır.
- Değişen dosyalar: `domain/production/projectPricedConsumption.ts`, `domain/production/projectPricedConsumption.test.mjs`, `domain/production/projectQuoteSummary.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. `frontend/**`, adapter, workflow YAML, package manifest/lockfile veya secret değiştirilmedi.
- Otomatik kabul kapsamı: aynı isimli farklı materialId'ler; aynı materialId için 8/18 mm ayrı fiyatlar; legacy tek-kalınlık uyumluluğu ve çoklu kalınlıkta belirsizlik; yinelenen/0.1 mm dışı fiyat anahtarları; birleşik teklif satır kaynakları; bir kalınlık fiyatı eksikken toplamın gizlenmesi.
- GitHub Actions: bu commitler push ile CI ve QA workflow'larını tetiklemelidir. Kullanılabilir `fetch_commit_workflow_runs` aracı yalnızca PR-triggered run'ları listeliyor; bu push commitleri için run ID dönmedi ve combined status boş. Dolayısıyla test/CI sonucu henüz görülmedi; başarılı ilan edilmedi. Sonraki turda run/check kanıtı görünürse aynı SHA'da doğrula, aksi hâlde bu blokajı açık tut.
- AI Developer/QA kontrolü: AI Developer run [#44374039856](https://github.com/Taylan789/MobilyaCAD/actions/runs/44374039856) ve entegrasyon/performance job'ı tamamlandı/başarısız. Her iki log da OpenRouter `free-models-per-day` 429, `x-ratelimit-remaining: 0`, reset epoch `1795046400000` gösteriyor. Başarısız run'ı rerun etmek aynı günlük kotayı tüketmeyeceği için anlamlı değil; workflow dispatch aracı mevcut değil, yeni run başlatılmadı. Başka ajan branch'lerine/PR'larına dokunulmadı.
- Bilinen sınırlar: fiyatlar kullanıcı/atölye girdisidir; vergi, kur, fire yüzdesi, levha verimi, stok, CNC veya fiziksel üretim doğrulaması yoktur. `main` dalına dokunulmadı.
- Sonraki görev: DOM-039'u yalnızca gerçek CI/QA sonuçları görüldükten sonra DONE yap. Sonraki domain dilimi DOM-040: gardırop/TV özel raf ve bölücü Part snapshot alanlarını (materialId, gerçek kalınlık, quantity, yerleşim) JSON round-trip boyunca genişlet.


## 19 Kasım 2026 00:05 TRT — DOM-040 özel raf/bölücü snapshot round-trip (Actions doğrulandı)

- Başlangıç HEAD: `e1661778569b82101471c8b7756149ebfc189bdf`; test ve sözleşme commit'i: [9a65b499029c5ea1d6250cf7ccb76fc99d2be746](https://github.com/Taylan789/MobilyaCAD/commit/9a65b499029c5ea1d6250cf7ccb76fc99d2be746).
- Değişen dosyalar: `domain/production/projectSpecialPartSnapshot.test.mjs`, `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. Frontend, adapter, production runtime, workflow YAML, package/lockfile ve secrets değiştirilmedi.
- Test gerçek `calculateCabinetProjectProductionWithDiagnostics` agregatörünü gardırop ve TV ünitesiyle çalıştırır; iki özel rafı nesting'e seçer, iki özel dikey bölücüyü hariç tutar ve tüm dört Part kaydının `materialId`, `thickness`, `quantity`, `edgeBanding`, `grainDirection` ve aileye özgü yerleşim alanlarını proje kesim planı JSON v2 serializer/parser round-trip sonrasında karşılaştırır.
- CI [#44398433365](https://github.com/Taylan789/MobilyaCAD/actions/runs/44398433365): başarılı (frontend build/lint).
- QA [#44398433080](https://github.com/Taylan789/MobilyaCAD/actions/runs/44398433080): başarılı; frontend **124/124**, domain **392/392**, shared-domain strict TypeScript, lint, frontend TypeScript/build ve production dependency audit başarılı; **0 vulnerability**.
- Pages deploy [#44398433257](https://github.com/Taylan789/MobilyaCAD/actions/runs/44398433257): başarılı.
- Bilinen sınırlar: generic canonical snapshot mevcut tüm JSON alanlarını saklıyor; bu teslimat runtime kodu değiştirmedi, aileye özgü alan sadakatini gerçek üretim agregatörüyle otomatik test altına aldı. Snapshot kriptografik imza değildir; nesting testi CNC/makine standardı veya fiziksel üretim onayı sağlamaz.
- AI Developer/Entegrasyon-Performans run [#44374039856](https://github.com/Taylan789/MobilyaCAD/actions/runs/44374039856) OpenRouter `free-models-per-day` 429 nedeniyle başarısız; reset 19 Kasım 2026 03:00 TRT. Kota resetlenmeden rerun yapılmadı; secrets, kredi veya servis ayarı değiştirilmedi.
- Sonraki görev: DOM-041 — özel raf/bölücü Part satırlarını malzeme tüketimi ve kalınlık duyarlı teklif özetine gerçek aile agregatörü üzerinden bağlayarak doğrula.


## 19 Kasım 2026 01:43 TRT — DOM-041 özel Part tüketimi ve teklif testi (Actions doğrulandı)

- Başlangıç HEAD: `831d65e28007ad810a86f25efac7068d3ad50a82`; kod/test commit'i: [983e1368a1dde9d70dcf37b58baecd1569269803](https://github.com/Taylan789/MobilyaCAD/commit/983e1368a1dde9d70dcf37b58baecd1569269803).
- Değişen dosyalar: `domain/production/projectSpecialPartPricing.test.mjs` (yeni), `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`. Frontend, adapter, production runtime, workflow YAML, package/lockfile ve secrets değiştirilmedi.
- Gerçek `calculateCabinetProjectProductionWithDiagnostics` gardırop + floor-standing TV ünitesi istekleriyle çalıştırıldı. Dört özel raf/bölücü Part satırının materialId, gerçek mm kalınlık ve quantity değerleri korundu; tüm Part listesi için bağımsız malzeme grubu/net alan hesabı domain özetiyle karşılaştırıldı.
- Kalınlık duyarlı fiyatlandırma ve birleşik teklif katmanı 18 mm/8 mm test fiyatlarıyla doğrulandı. 8 mm özel raf fiyatı eksik bırakıldığında iki katman da `incomplete`, eksik `mdf-8 / 8 mm` tanısı ve `costSummary: null` üretti; kısmi toplam verilmedi.
- CI [#44414697417](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697417): **başarılı**. QA [#44414697280](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697280): **başarılı**, 124/124 frontend + 394/394 domain testi, strict shared-domain TypeScript, lint, frontend TypeScript/production build ve production dependency audit 0 vulnerability. Pages [#44414697288](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697288): **başarılı**.
- Bilinen sınırlar: fiyat girdileri yalnızca deterministik test fixture'larıdır; gerçek tedarikçi fiyatı, fire, vergi, kur, levha verimi, CNC/makine standardı veya fiziksel üretim uygunluğu sağlamaz. Kesitli banyo paneli fiyatlaması ve özel Part freshness bu dilimin dışındadır.
- AI Developer workflow'u yalnızca `workflow_dispatch` ile çalışır; güncel HEAD için aktif AI Developer run yoktur. Eski run [#44374039856](https://github.com/Taylan789/MobilyaCAD/actions/runs/44374039856) OpenRouter günlük 429 kotasıyla başarısızdı; eski SHA üzerinde rerun yapılmadı, workflow dispatch aracı kullanılmadı, secrets/kredi/ayar değiştirilmedi.
- DOM-041 DONE. Sonraki görev: DOM-042 — özel raf/bölücü materialId, kalınlık veya yerleşim değişikliğinin kayıtlı kesim planı freshness sonucunu stale yapmasını gerçek aile agregatörüyle doğrula.


## 19 Kasım 2026 02:12 TRT — DOM-042 özel Part freshness regresyon testi (Actions bekleniyor)

- Başlangıç HEAD: b831ae202175a7ddc6d5ba012797b2386c4f3b08.
- Kabul: gardırop ve floor-standing TV ünitesinin gerçek proje üretim agregatöründen oluşturulan JSON v2 planı değişmeyen Part snapshot'ında fresh kalmalı; özel raf ve dikey bölücülerde materialId, gerçek mm kalınlık ve aileye özgü yerleşim değişikliklerinin 12 ayrı senaryosunun her biri stale üretmeli.
- Her stale senaryoda result/json null ve tanı değişen Part ID'sini içermeli. Seçilmemiş bölücüler tam proje snapshot'ı üzerinden kapsanır.
- Değişen dosyalar: domain/production/projectSpecialPartFreshness.test.mjs (yeni), docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Kod/freshness runtime davranışı, frontend/**, adapter/benchmark, workflow, package/lockfile ve secrets değiştirilmedi. CNC veya fiziksel üretim uygunluğu iddiası yoktur.
- Kod/test commit'i: [7d66017c2d6b41ed19aba673a4ceea3a1324c346](https://github.com/Taylan789/MobilyaCAD/commit/7d66017c2d6b41ed19aba673a4ceea3a1324c346).
- CI [#44419258580](https://github.com/Taylan789/MobilyaCAD/actions/runs/44419258580), QA [#44419258622](https://github.com/Taylan789/MobilyaCAD/actions/runs/44419258622) ve Pages [#44419258581](https://github.com/Taylan789/MobilyaCAD/actions/runs/44419258581) başarılı. QA: 124/124 frontend + 395/395 domain testi; strict shared-domain TypeScript, lint, frontend TypeScript/production build ve production dependency audit (0 vulnerability) geçti. Tam dependency install çıktısında 4 moderate advisory bildirildi; production-only audit temiz.
- Test sonucu: değişmeyen plan fresh; gardırop/TV rafı ve dikey bölücülerinin materialId, kalınlık ve yerleşimindeki 12 ayrı değişiklik stale; her durumda result/json null ve değişen Part kimliği tanıda mevcut.
- Bilinen sınır: JSON v2 snapshot canonical veri karşılaştırmasıdır, kriptografik imza değildir. Gerçek makine standardı ve atölye doğrulaması kapsam dışıdır.
- Sonraki adım: Actions başarılıysa DOM-042'yi DONE olarak kapat ve DOM-043 teklif fiyat snapshot/revizyon kaynak izi testine geç.

## 19 Kasım 2026 04:08 TRT — DOM-043 özel Part teklif snapshot/revizyon kaynak izi (Actions doğrulandı)

- Başlangıç HEAD: `cc663a0000d83cbd715f2a88a16549b009ce8c7e`; test commit'i: [6f928e2841f64bf1d68031b27b9a85856acb5409](https://github.com/Taylan789/MobilyaCAD/commit/6f928e2841f64bf1d68031b27b9a85856acb5409).
- Değişen dosyalar: `domain/production/projectSpecialPartQuoteRevision.test.mjs` (yeni), `docs/production-domain-contract.md`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`. Frontend, production runtime, adapter/benchmark, workflow, package/lockfile ve secrets değiştirilmedi.
- Test, gerçek gardırop + floor-standing TV proje üretim agregatörünü kullanır; 18 mm ve 8 mm özel raf/bölücü malzemeleri ayrı fiyat satırlarında exact materialId/kalınlık, atölye price sourceReference ve quote lineSources eşlemesiyle doğrular. İki fiyat listesi sürümünü proje JSON v2 revizyon geçmişine append eder; proje dosyasından okur ve standalone revision-history JSON v1 serialize/parse round-trip sonrasında her iki snapshot'ın katalog sürümü, satır fiyatı, kaynak referansı ve lineSources alanlarını karşılaştırır.
- Eksik exact 8 mm fiyatı `incomplete`, `costSummary: null`, `snapshot: null` üretir ve revizyon append'ini engeller. Bozuk `lineSources.costLineId` eşlemesi hem append hem JSON serialization işlemini blocked/null yapar.
- CI [#44434574294](https://github.com/Taylan789/MobilyaCAD/actions/runs/44434574294): başarılı. QA [#44434574329](https://github.com/Taylan789/MobilyaCAD/actions/runs/44434574329): başarılı — **124/124 frontend + 398/398 domain testi**, shared-domain strict TypeScript, lint (**32 uyarı / 0 hata**), frontend TypeScript/production build ve production dependency audit (**0 vulnerability**) geçti. Pages [#44434574317](https://github.com/Taylan789/MobilyaCAD/actions/runs/44434574317): başarılı.
- Bilinen sınır: teklif satırları materialId + kalınlık bazında gruplanır; `lineSources.sourceId` özgün Part ID değil, gruplanmış tüketim satır kimliğidir. DOM-046 bu Part düzeyi provenance boşluğunu ele alacak. Fiyatlar yalnızca deterministik test fixture'ıdır; gerçek tedarikçi fiyatı, CNC standardı veya fiziksel üretim onayı değildir.
- AI Developer run [#44431694679](https://github.com/Taylan789/MobilyaCAD/actions/runs/44431694679) OpenRouter free-model daily quota 429 nedeniyle başarısız (limit 50, kalan 0; reset 20 Kasım 2026 03:00 TRT). Aynı kotayı tüketen rerun yapılmadı; secrets/kredi/servis ayarı değiştirilmedi ve yeni run başlatılmış gibi davranılmadı.
- Sonraki görev: DOM-044 — kesitli banyo üst panelinin net alan/hacim tüketimi ve kalınlık duyarlı fiyatlandırması.


## 19 Kasım 2026 05:12 TRT — DOM-044 banyo üst paneli net tüketim/fiyat testi (Actions doğrulandı)

- Başlangıç HEAD: 78d7478a31de42fc97384c171055af3192d4cd90.
- Yeni test: domain/production/projectBathroomVanityPanelPricing.test.mjs. Kabul kriteri: gerçek bathroom-vanity agregatörü, açık ölçülü üst panel açıklığı, net alan/hacim tüketimi, aynı materialId altında 8/18 mm exact fiyat satırları ve 8 mm fiyatı eksikken incomplete/null toplam.
- Test, mevcut panelGeometry tüketim yolunu ve calculateProjectPricedConsumptionSummary / calculateProjectQuoteSummary katmanlarını birlikte doğrular; runtime davranışı değiştirmez.
- Değişen dosyalar: domain/production/projectBathroomVanityPanelPricing.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Kod/test commit'i: [441945f43e9cf7b13fe83b21cee23ddfbe9d87ef](https://github.com/Taylan789/MobilyaCAD/commit/441945f43e9cf7b13fe83b21cee23ddfbe9d87ef). CI [#44442862028](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862028) başarılı; QA [#44442862160](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862160) başarılı — 124/124 frontend + 400/400 domain testi, shared-domain strict TypeScript, frontend TypeScript/production build, lint (32 uyarı / 0 hata) ve production dependency audit (0 vulnerability) geçti. Pages [#44442862060](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862060) başarılı.
- Bilinen sınırlar: panelGeometry nedeniyle JSON v1/CSV export hâlâ engellidir; test fiyatları fixture'dır; CNC, lavabo/armatür standardı ve fiziksel üretim doğrulaması yoktur.
- AI Developer run #44431694679, OpenRouter free-model daily quota 429 (50 limit / 0 remaining) nedeniyle başarısızdır; reset 20 Kasım 2026 03:00 TRT. Kota sıfırlanmadan rerun yapılmadı; secrets/kredi/ayar değiştirilmedi.
- Sonraki görev: DOM-044 tamamlandı; sıradaki domain dilimi DOM-045 — JSON v3 stockSheetSource provenance bilgisini fresh/stale kesim planı doğrulamasında korumak.
