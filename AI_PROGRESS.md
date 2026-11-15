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
- Sonraki görev: mobilya ve parça kayıtlarına opsiyonel `materialId` ekle; eski serbest metin kayıtlarını geriye uyumlu koru, referanslı malzemelerin silinmesini engelle ve üretim motorunda katalog kalınlığı eşlemesini doğrula.

