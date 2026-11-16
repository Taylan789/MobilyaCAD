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
