# MobilyaCAD Ürün Yol Haritası

> Kapsam: yalnızca `Taylan789/MobilyaCAD` deposunun `dev/github-work` dalı. Bu belge ürün hedefini ve doğrulanabilir geliştirme sırasını tanımlar; tamamlanmamış veya üretim onayı almamış özellikleri tamamlanmış gibi göstermez.

## Ürün hedefi

MobilyaCAD'i tarayıcıda çalışan bir 3D mobilya yerleşim aracından; parametrik mobilya tasarımı, ölçü ve parça mühendisliği, malzeme/aksesuar yönetimi, teklif hazırlığı ve makineye özel üretim verisi hazırlığını kapsayan modüler bir CAD/CAM platformuna dönüştürmek.

Temel ilke: ekrandaki model, hesaplama motoru, kesim listesi ve dışa aktarılan veriler aynı kaynak parametreleri kullanmalı. Fiziksel üretime giden ölçüler, bağlantılar ve CNC işlemleri ancak gerçek üretici/atölye standardı doğrulandığında onaylı kabul edilebilir.

## Doğrulanmış mevcut temel — 22 Kasım 2026

| Alan | Mevcut durum | Sınır |
|---|---|---|
| Teknoloji | React 19, TypeScript, Vite, Three.js / React Three Fiber | Tarayıcı istemcisi; ayrı backend yok |
| Oda ve 3D sahne | Ölçülü oda ve perspektif sahne | Tam 2D teknik çizim, kesit ve görünüş araçları yok |
| Yerleşim | Katalogdan ekleme, seçme, taşıma, döndürme ve boyutlandırma; SAT tabanlı yatay ayak izi çakışma ve oda sınırı uyarıları 3D sahnede gösterilir | Gelişmiş snap, çoklu seçim, duvar montajı/kapak açılımı boşlukları ve tam undo/redo akışı doğrulanmış değil |
| Katalog | Mutfak, gardırop, banyo, masa, kitaplık ve diğer ailelerden 100 varyasyon | Şablonlar tam parametrik konstrüksiyon aileleri değil |
| Parçalar | Görsel kapak/çekmece/raf parçaları; domain gövde, çekmece kutusu, kitaplık, masa, gardırop ve TV ünitesi Part listesi; dikdörtgen iç açıklıklar opsiyonel `ProjectProductionPart.panelGeometry` alanıyla taşınır; banyo dolabı v1 üst panelinde açık ölçülü çoklu dikdörtgen açıklıklar zorunludur | Kesitli Part JSON v1/CSV adapter entegrasyonu henüz ayrı frontend sahibince yapılmadı; diğer aileler, donanım ve CNC operasyonları eksik |
| Hesap motoru | `cabinetConstruction`, `drawerBoxConstruction`, `bookshelfConstruction`, `tableConstruction`, `wardrobeConstruction`, `tvUnitConstruction` (floor-standing gövde, açık ölçülü raf ve dikey bölücü) ve `bathroom-vanity` (cabinet gövdesi + zorunlu açık ölçülü üst panel açıklığı) aile ayrımlı sürüm 1 proje agregatörü; ortak Part listesi quantity, malzeme, damar yönü ve kenar bantlamayı korur | Frontend adapter henüz domain agregatörünü çağırmıyor; duvar montajlı TV ünitesi/ayak-baza modelleri ve diğer aileler, üreticiye özel konstrüksiyonlar eksik |
| Kesim listesi | Projedeki desteklenen düz mutfak gövdeleri ve tam tanımlı çekmece parçaları için tek Türkçe Excel uyumlu CSV; her satır kaynak mobilya adı/ID'si ve varsa katalog Malzeme ID değeriyle izlenir | Köşe/cihaz/evye konstrüksiyonları ve diğer aileler eksik |
| Levha yerleşimi / kesim planı | Deterministik shelf yerleşimi, tek ve çoklu grup makine bağımsız kesim planı, batch→layout→atomik proje planı, kerf/çakışma doğrulaması, opsiyonel trim, JSON v1/v2/v3 round-trip, tam Part snapshot freshness, DOM-032 freshness-gated v2/v3 export API'si, kullanıcı girdili levha kaynak/revizyon provenance, DOM-034 grup bazlı provenance özeti ve DOM-035 kaynak bağlamını koruyan export tanıları | Fire/yield yüzdesi, kesim sırası/yolu ve CNC çıktısı yok |
| Kenar bantlama / malzeme tüketimi | Domain summary shared Part list calculates quantity-weighted net area/volume, directional edge-banding and catalog/Part/furniture provenance; DOM-067 JSON v1, DOM-076 strict CSV v1, DOM-071 explicit roll-input JSON v2 persistence and DOM-160 descriptor-safe, deep-immutable v2 envelope writes | JSON/CSV round-trip automatically verified; frontend download adapter, waste/yield, kerf, edge-band thickness and CNC output remain missing |
| Malzeme kataloğu | UI CRUD; mobilya varsayılan materialId ve çekmece grubunda varsayılan + dört panel grubu override; domain gövde/kitaplık motorları altı gövde panel grubu için malzeme override'ını doğrular | Gövde panel override'ları henüz frontend JSON v1/CSV ve UI akışına bağlanmadı; fiyat, tedarikçi ve fire henüz yok |
| Proje dosyası | Yerel JSON v1 indirme/yükleme; saf serializer/parser; round-trip ve eski v1 uyumluluk; mm, mobilya ve çekmece grubu katalog referansları ile dört çekmece panel kalınlığının doğrulanması | Şema migrasyonu, otomatik kayıt ve kurtarma yok |
| Teklif/maliyet | Kullanıcı fiyat tablosu malzeme tüketimini materialId + m2, donanımı hardwareId + özgün BOM birimi, kenar bandını edgeBandingId + açık mm/m birimi ile fiyatlandırır; kullanıcı girdili işçilik/operasyon tarifesi, tek para birimli birleşik teklif ve tarihli fiyat/tarife katalog snapshot'ı, DOM-014 doğrulanmış immutable append ve DOM-015 ortak satır aritmetiği doğrulaması vardır | Frontend/UI ve JSON v1/CSV kalıcı revizyon geçmişi entegrasyonu ayrı sahibindedir; tüm geçmişte ID tekilliği depolama katmanında doğrulanmalıdır; vergi, kur, iskonto, otomatik fire/kâr yüzdesi ve üretim onayı yok |
| Test/CI | Verified test SHA [24b5bdc](https://github.com/Taylan789/MobilyaCAD/commit/24b5bdc358d6b8e5fa8404a063dde0f024fd3068): [CI #44968313006](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968313006), [QA #44968312997](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312997), [Pages #44968312947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312947) all succeeded | QA 142/142 frontend + 624/624 domain tests, strict domain TS, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities |

### Bilinen mimari ve veri boşlukları

- `frontend/src/engine/furnitureCalculator.ts` ölçü kontrolünden sonra boş liste döndüren bir altyapı stub'ıdır; üretim hesaplayıcısı olarak kullanılmamalıdır.
- Konstrüksiyon kurallarının bir kısmı `App.tsx` içinde sabit başlangıç değerleriyle tutuluyor; proje ve mobilya bazında yapılandırılabilir hale getirilmeli.
- Çekmece görsel sayısı ile gerçek çekmece kutusu/önü parça ağacı aynı şey değildir; kullanıcı ölçü, malzeme, kenar bantlama ve damar yönünü açıkça tanımlar. Domain agregatörü legacy dolap isteklerini, açık kitaplık ailesini ve mevcut gövde mobilyasına bağlı `drawerBoxes` isteklerini aynı Part listesinde birleştirir; frontend JSON/CSV adapter'ı henüz bu domain yolunu kullanmaz. Ray boşluğu, donanım ve CNC işlemleri hesaplanmaz.
- Panel malzeme kataloğunun domain sözleşmesi, UI CRUD akışı, mobilya materialId bağlantısı ve çekmece grubu materialId bağlantısı tamamlandı. Çekmece gruplarında varsayılan malzemeye ek olarak yan, ön/arka, taban ve görünür ön panel için bağımsız katalog override desteklenir; her grubun kendi mm kalınlığı doğrulanır. Domain gövde motoru opsiyonel `panelThicknessMmByGroup` ile panel grubuna göre geometri/kalınlık hesaplar; açık kitaplık isteği bu alanı altı gerçek grupla sınırlar ve her override için katalog kimliği ile gerçek kalınlığı zorunlu tutar. Bu atamalar henüz frontend JSON v1/CSV ve UI'ya bağlanmamıştır. Donanım tüketimi, nesting ve CNC postprocessor katmanları tamamlanmış değildir.
- Kenar bantlama ve malzeme tüketimi domain seviyesinde gövde + çekmece + kitaplık + masa + gardırop + TV ünitesi + opsiyonel kesitli panel Part listesinden hesaplanabilir; kesitli paneller net alan/hacim ve yönlere ayrılmış iç/dış bant uzunluğu taşır. Katalog referansları ve kalınlıklar ayrı gruplandırılır. Özel köşe/cihaz geometrileri, askı/çekmece yerleşimi ve diğer mobilya aileleri kapsam dışıdır. Fire ve rulo payı hesaplanmaz.
- Domain/frontend entegrasyon sınırı `docs/production-domain-contract.md` içinde belgelenmiştir: aile ayrımlı sürüm 1 konstrüksiyon isteği, kitaplık motoru, proje agregatörü, malzeme özeti, mevcut JSON v1/çekmece girdisi ve frontend durum/kabul kriterleri. Bu bir entegrasyon sözleşmesidir; domain motorlarının frontend'e bağlandığı anlamına gelmez.
- Yerleşim doğrulaması XZ düzlemindeki yatay dikdörtgen ayak izlerini ve oda sınırlarını denetler; dikey çakışma, kapak/çekmece açılımı, duvar sabitlemesi ve montaj toleranslarını hesaplamaz.

## Geliştirme aşamaları

### Aşama 0 — Veri doğruluğu ve otomatik kalite kapısı **Durum: sürekli**

**Hedef:** UI, domain modeli, hesap motoru ve export arasında tekil ve test edilebilir kurallar.

- Kabul kriterleri: mm birimi açık; adetler ve sıfır değerleri korunur; geçersiz ölçüler reddedilir; hesaplar için regresyon testleri vardır; her commit CI/QA'dan geçer.
- Bağımlılıklar: mevcut TypeScript domain modelleri ve Node test altyapısı.
- Risk: gerçek konstrüksiyon varsayımlarını kodda sessizce sabitlemek.

### Aşama 1 — Parametrik gövde ve parça mühendisliği

**Hedef:** mutfak, gardırop, banyo, kitaplık ve sonraki mobilya ailelerinde kuralları açık olan gövde/raf/kapak/çekmece/arkalık parçaları. Düz gövde, çekmece kutusu, açık kitaplık, masa ve bölücü/özel raf destekli gardırop için frontend dışı domain motorları ile ortak proje agregatörü mevcut.

- Kabul kriterleri: her aile için ölçü tablosu ve parça adedi testleri; panel kalınlığı, arkalık montajı, kapak boşluğu ve kenar bantlama açık parametreler; desteklenmeyen konfigürasyon hata/uyarı verir.
- Bağımlılıklar: sürümlenebilir konstrüksiyon kuralı modeli.
- Risk: üreticiye göre değişen birleşim ve donanım detaylarını evrenselmiş gibi varsaymak.

### Aşama 2 — Kesim listesi ve üretim hazırlığı

**Hedef:** birden fazla mobilya örneğinin parça ağacını birleştiren kesim listesi, malzeme/kenar bantlama özeti ve doğrulanmış dışa aktarma.
- Kabul kriterleri: quantity çarpanları doğru; ölçüler mm; CSV/JSON alanları kararlı; desteklenmeyen özellikler dışa aktarımı engeller; örnek projelerde toplamlar test edilir.
- Bağımlılıklar: Aşama 1 parça ağacı ve malzeme kimlikleri.
- Risk: nesting, fire ve CNC sonuçlarının makine/levha standardı olmadan kesin gösterilmesi.

### Aşama 3 — CAD düzenleme araçları

**Hedef:** 2D plan, snap/grid, ölçülendirme, hizalama, çoklu seçim, gruplama, kopyalama ve güvenilir undo/redo.
- Kabul kriterleri: klavye/fare ve mobil akışlar; oda sınırı ve çakışma testleri; undo/redo tüm ilgili domain değişikliklerini geri alır.
- Bağımlılıklar: tutarlı proje durumu ve komut/işlem modeli.
- Risk: görsel transform ile gerçek mm ölçülerinin ayrışması.

### Aşama 4 — Malzeme, donanım ve CNC mimarisi

**Hedef:** malzeme/dekor kataloğu, donanım reçetesi, delik/işlem modeli ve makineye özel postprocessor arayüzleri.
- Kabul kriterleri: üretici verisi kaynağı ve birimi kayıtlı; CNC çıktısı makine profili seçilmeden üretilmez; postprocessor fixture dosyalarıyla test edilir.
- Bağımlılıklar: Aşama 1 parça ağacı ve yapılandırılabilir donanım kuralları.
- Risk: gerçek makine koordinatları, takım çapları ve güvenlik mesafeleri tahmin edilemez.

### Aşama 5 — Proje yönetimi, teklif ve maliyet

**Hedef:** sürümlü proje dosyaları, otomatik kayıt/kurtarma, şablonlar, malzeme/işçilik/donanım/operasyon maliyeti ve teklif revizyonları.
- Kabul kriterleri: JSON şema migrasyonu ve round-trip testleri; fiyatlar yalnızca kullanıcı kataloğundan; teklif kalemleri izlenebilir.
- Bağımlılıklar: güvenilir parça/malzeme miktarları.
- Risk: bulut/hesap/ekip altyapısı gereksinimi ve kullanıcı verisi güvenliği.

## Öncelik sırası

1. **P0:** UI-hesap-export tutarlılığı, ölçü/adet doğruluğu ve eksik üretim verisinin dışa aktarılmasını engelleme.
2. **P1:** parametrik konstrüksiyon kuralları ve gerçek parça ağacı (özellikle çekmeceler).
3. **P1:** kesim listesi, malzeme ve kenar bantlama toplamlarının doğruluğu.
4. **P2:** CAD düzenleme araçları ve proje durumu/undo-redo.
5. **P3:** CNC postprocessor, nesting ve maliyet/teklif; yalnızca kaynak verisi ve standartlar doğrulandığında.

### Son tamamlanan dikey dilim — kenar bantlama uzunluk özeti

- calculateEdgeBandingSummary mevcut parça kenar bayraklarından genişlik ve uzunluk yönündeki bantlı kenarları ayrı, toplam uzunluğu birlikte hesaplar.
- Parça adet değeri her kenar uzunluğuna uygulanır; boş liste sıfır döndürür, geçersiz ölçü/adet reddedilir.
- Üretim paneli toplamı ve iki yönlü alt toplamı mm cinsinden gösterir.
- Hesap yalnızca tanımlı kenar bayraklarını toplar; bant kalınlığı, fire, rulo payı veya fiziksel üretim standardı tahmin etmez.
- Kod commit'i `bc36978a9ab34da0413f743710e944938050f2cb` için QA #13 ve #14, CI #38 ve #39 başarılı; son QA 26/26 test.

### Son tamamlanan dikey dilim — çekmece kutusu hesaplama motoru (domain temeli)

- `calculateDrawerBoxParts` dört parça grubunu üretir: iki yan panel, ön/arka kutu panelleri, taban ve görünür ön panel.
- Kutu dış ölçüleri, panel kalınlıkları, görünür ön panel ölçüleri, adet, malzeme, kenar bantlama ve damar yönü açıkça sağlanır; görünür ön panel boşluğu veya ray payı tahmin edilmez.
- Desteklenen tek taban kurgusu açıkça `between-sides-and-front-back` olarak belirtilir; başka konstrüksiyon seçimi reddedilir.
- Quantity çarpanı yan ve ön/arka panellerde iki kat uygulanır; taban ve görünür ön panelde çekmece adedi kullanılır.
- Ray, bağlantı elemanı, CNC operasyonu ve makine koordinatı üretilmez.
- Bu dilim yalnızca domain motoru ve otomatik test altyapısıdır; henüz App arayüzü, proje JSON kaydı veya CSV dışa aktarımıyla bağlı değildir. Çekmeceli CSV engeli aynen korunur.
- Kod commit'i: `e8d8d2de37b981675075bdb84d57c909cab46014`.
- Otomatik doğrulama: QA Run #15 başarılı, 35/35 test; CI Run #40 başarılı; TypeScript ve production build başarılı; lint 15 uyarı / 0 hata; Pages deploy Run #21 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; raporda 6 bulgu (2 düşük, 4 orta) sürüyor. `deepmerge` / `shadcn` ve `minimatch` / `ts-morph` zincirleri incelenmeli; kırıcı `--force` güncellemesi yapılmadı.

## Son tamamlanan dikey dilim — çekmece yapılandırmasının proje v1 sözleşmesi

- `PlacedFurniture.drawerBoxSpecs` opsiyonel alanı eklendi; eski v1 dosyalarında alanın bulunmaması geçerliliğini korur.
- Proje yükleyicisi sağlanan yapılandırmaları ölçü, adet, malzeme, taban konstrüksiyonu, dört kenar bayrağı ve damar yönü bakımından doğrular. Bozuk alan sessizce atılmaz; proje reddedilir.
- JSON kaydetme mobilya nesnelerini doğrudan serileştirdiği için yeni opsiyonel alan aynı format sürümünde korunur.
- Bu dilim henüz UI formu veya kesim listesi entegrasyonu sağlamaz; çekmeceli CSV engeli korunur.
- Kabul kriterleri: eski v1 dosyaları yüklenebilir; geçerli yeni alan korunur; geçersiz alan yüklemeyi engeller.

## 15 Kasım 2026 — çekmece yapılandırma editörü (tamamlandı)

- Üretim panelinde çekmeceli mutfak modülleri için birden fazla ölçü grubu ekleme, düzenleme ve silme akışı eklendi.
- Kullanıcı dokuz konstrüksiyon ölçüsünü, çekmece adedini, malzemeyi, dört panel grubunun dört kenar bantlama durumunu ve her grubun damar yönünü açıkça seçer. Varsayılan üretim ölçüsü veya gizli bant/ damar varsayımı yapılmaz.
- Grup adedi mobilyanın katalogdan gelen çekmece adedini aşamaz; kaydetmeden önce hesaplayıcıyla türetilen iç genişlik ve taban uzunluğu doğrulanır. Grup kimlikleri benzersizdir.
- `drawerBoxSpecs` mevcut proje JSON v1 içinde saklanır; eski v1 dosyalarında opsiyonel alanın olmaması geriye uyumlu kalır.
- Kod commit'leri: `d714ee00a86c3ed00499394c1a263deee92d6873`, doğrulama düzeltmesi `a5d73cf64663a0e05d7381b00ed4a68a876c09fd`.
- Otomatik doğrulama: CI #46, QA #21 (44/44 test), Pages deploy #27 başarılı; lint 15 uyarı / 0 hata; TypeScript ve production build başarılı.
- Sınır: çekmece parçaları henüz üretim önizlemesi/CSV'ye bağlı değildir; çekmeceli CSV engeli korunur. Ray, bağlantı elemanı, donanım ve CNC standardı tahmin edilmez.

## Son tamamlanan dikey dilim — çekmece parçalarının üretim önizlemesi ve CSV kapısı

- Kaydedilmiş çekmece grupları `calculateDrawerBoxParts` ile mevcut mutfak gövde parçalarına eklenir; parça önizlemesi, adet ve kenar bantlama toplamı aynı birleşik listeden beslenir.
- Çekmece gruplarının adet toplamı katalogdaki çekmece adedine eşit değilse CSV kilitli kalır. Eksik, yinelenen kimlikli, bozuk veya türetilmiş ölçüleri geçersiz konfigürasyonlar da dışa aktarılamaz.
- Bütün çekmeceler açık ölçü/malzeme/kenar/damar girdileriyle tanımlandığında çekmece parçaları mevcut CSV şemasına dahil edilir; ray ve CNC operasyonu uydurulmaz.
- Kabul kriterleri: çekmecesiz modüllerin mevcut akışı değişmez; kısmi tanım CSV'yi engeller; tam tanım dört çekmece parça grubunu üretim listesi ve CSV'ye ekler.

## Son tamamlanan dikey dilim — CSV serileştirme sözleşmesi ve regresyon testleri

- CSV üretimi `App.tsx` içindeki DOM indirme akışından ayrılarak saf `createCutListCsv` motor fonksiyonuna taşındı; indirme davranışı aynı kaldı.
- Mevcut Türkçe başlıklar, noktalı virgül ayırıcı, UTF-8 BOM ve CRLF satır sonları korunur; tırnak, ayırıcı ve satır sonu içeren alanlar kaçırılır.
- Dışa aktarma sınırında boş mobilya/parça listesi, geçersiz ölçü, pozitif tam sayı olmayan adet ve eksik malzeme/kenar bilgisi reddedilir. Ölçüler mm olarak, sayısal değerler yerelleştirilmeden yazılır.
- Birleşik gövde + dört çekmece parça grubunun CSV satırları ve adet toplamı otomatik testle doğrulanır; mevcut CSV kolon şeması değiştirilmez.
- Kod commit'i: `c803c869b5462579b322329271f90c5574a7cc4b`.
- Otomatik doğrulama: CI #49 başarılı; güncel branch'te CI #50, QA #25 (56/56) ve Pages deploy #31 başarılı.
- Fiziksel üretim, ray/donanım ve CNC doğrulaması bu kapsamda değildir.

## Son tamamlanan dikey dilim — malzeme ve kalınlık bazında tüketim özeti

- `calculateMaterialConsumptionSummary`, hesaplanmış gövde + çekmece parçalarını malzeme adı (baş/son boşlukları normalize edilir) ve panel kalınlığına göre gruplar; farklı kalınlıklar aynı malzeme adı altında birleştirilmez.
- Her grup için parça satırı çeşidi, quantity çarpanlı toplam adet, net panel yüzey alanı (m²), net panel hacmi (m³), bantlı kenar adedi ve bant uzunluğu (mm) hesaplanır.
- Üretim paneli özeti mevcut `productionParts` listesini kullanır; CSV ile aynı hesaplanmış parça kaynağını paylaşır. Malzeme/kalınlık grupları ayrı kartlarda gösterilir.
- Malzeme adı, ölçü, güvenli tam sayı adet ve dört kenar bantlama bayrağı doğrulanır; taşan toplamlar reddedilir. Boş parça listesi boş özet döndürür.
- Alan/hacim net geometrik toplamdır; fire, kesim payı, levha verimi, kerf, bant kalınlığı veya rulo payı eklenmez.
- Değişen dosyalar: `frontend/src/engine/materialConsumption.ts`, `frontend/tests/materialConsumption.test.mjs`, `frontend/src/App.tsx`.
- Kod commit'i: `71cff95aa4f06f790f74c8fcc8ee85c813ac6005`.
- Otomatik doğrulama: CI Run #53 başarılı; QA Run #28 başarılı, 61/61 test; Pages deploy Run #34 başarılı. Oxlint 15 uyarı / 0 hata; TypeScript ve production build başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; raporda 6 bulgu (2 düşük, 4 orta) sürüyor. Kırıcı/force bağımlılık güncellemesi yapılmadı.
- Sınırlar: yalnızca seçili mutfak modülünün mevcut hesaplanmış parçaları raporlanır; birden fazla mobilya, levha optimizasyonu ve fiziksel üretim onayı bu dilimin dışındadır.

## Son tamamlanan dikey dilim — proje JSON v1 parser/serializer ve round-trip

- Kaydetme ve yükleme sözleşmesi `frontend/src/engine/projectFile.ts` içinde saf, otomatik test edilebilir fonksiyonlara ayrıldı; `App.tsx` yalnızca dosya indirme/seçme ve UI state güncellemesini yürütür.
- Serializer mevcut `MobilyaCAD` format adı, sürüm 1, ISO `savedAt`, oda ölçüleri (`unit: "mm"`) ve tüm mobilya/çekmece alanlarını korur.
- Parser format/sürüm, oda ölçüleri, mm birimi, mobilya geometri ve parça verisini doğrular. Geçersiz JSON, desteklenmeyen sürüm/birim ve bozuk opsiyonel çekmece konfigürasyonu reddedilir.
- Geriye uyumluluk: eski v1 dosyalarında `drawerBoxSpecs` ve `room.unit` alanlarının bulunmaması kabul edilir; eski ölçüler önceki uygulama davranışıyla mm olarak yorumlanır. Açıkça mm dışı birim reddedilir.
- Otomatik testler round-trip, eski v1 dosyası, bozuk JSON/sürüm/birim, bozuk mobilya/parça geometrisi ve bozuk çekmece yapılandırmasını kapsar.
- Değişen dosyalar: `frontend/src/engine/projectFile.ts`, `frontend/tests/projectFile.test.mjs`, `frontend/src/App.tsx`.
- Kod commit'i: `6e2d617946349ae20a0cbc95260c916dc73868bc`.
- Otomatik doğrulama: CI Run #55 başarılı; QA Run #30 başarılı (66/66 test, 0 başarısız); Pages deploy Run #36 başarılı. TypeScript ve production build başarılı; Oxlint 15 uyarı / 0 hata.
- Production audit adımı `--audit-level=high` eşiğini geçti; npm audit toplam 6 bulgu (2 düşük, 4 orta) raporladı. Kırıcı/force bağımlılık güncellemesi yapılmadı.
- Bu dilim yerel JSON v1 dosyalarını kapsar; otomatik kayıt, kurtarma, migration ve yeni proje format sürümü henüz yoktur.

### Son tamamlanan dikey dilim — proje genelinde kesim listesi ve tüketim toplamı

- Üretim hesabı seçili tek mobilyadan proje geneline taşındı; her desteklenen yerleştirilmiş modül kendi kimliğiyle hesaplanır ve parçalar tek listede birleştirilir.
- İlk desteklenen profil düz mutfak gövdeleridir: temel/üst dolap, çekmeceli alt dolap ve kiler. Köşe, fırın, ankastre buzdolabı ve evye varyasyonları özel geometri olmadan kesim listesine alınmaz; diğer mobilya aileleri açıkça kapsam dışı gösterilir.
- Çekmeceli modülün tüm kutu ölçüleri/adetleri tanımlı değilse proje CSV'si kilitlenir. Sıfır çekmece adedinde kalmış çekmece konfigürasyonu da reddedilir.
- Proje CSV'si her satırda mobilya adı ve `Mobilya ID` kolonunu birlikte taşır; aynı katalog adından birden fazla yerleştirme ayırt edilir. Eksik eşleme ve yinelenen mobilya/parça kimliği dışa aktarımı engeller.
- Proje genelindeki malzeme/kalınlık alan-hacim ve kenar bantlama özetleri aynı birleştirilmiş `Part[]` kaynağından beslenir.
- Özel köşe/cihaz/evye boşlukları, gardırop/kitaplık konstrüksiyonları, fire, levha verimi, nesting, CNC ve fiziksel üretim onayı bu dilimin dışındadır.
- Kod commit'i: `dba2d26b7fab5f71f1886fb7591bc173eb5f5642`; kalınlık gruplama test düzeltmesi: `1f212721750960bf0731918cc5a37ca020a33c6f`; proje CSV mobilya kimliği kolonu: `73df9f354731b2a98b1b07fee49d33b609f36cf3`.
- Otomatik doğrulama: CI #59 başarılı; QA #34 başarılı (71/71 test); TypeScript, production build, lint ve production audit eşiği başarılı. Pages deploy #40 ve dokümantasyon HEAD'i için #41 başarılı.
- QA #32'deki tek başarısızlık test beklentisinin malzeme adını kalınlıktan bağımsız tek grup saymasından kaynaklandı. Mevcut tüketim motoru malzeme + kalınlığı ayrı tuttuğu için test beklentisi düzeltildi; hesaplama davranışı gevşetilmedi.
- Kalite notları: Oxlint 15 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta); `--audit-level=high` eşiği geçti. Bundle boyutu uyarısı mevcut.
- Dokümantasyon commit'i: `8064d84e42a3eb505949d70c6bf0cb0739865a8d`; bu HEAD üzerinde CI #60, QA #35 (71/71) ve Pages deploy #41 başarılı.

## Son tamamlanan dikey dilim — kullanıcı tanımlı panel malzeme kataloğu veri sözleşmesi

- `frontend/src/engine/materialCatalog.ts` kullanıcı tanımlı panel malzemeleri için kararlı kimlik, ad, opsiyonel dekor etiketi, kategori ve kalınlık listesi modelini doğrular.
- Malzeme kimlikleri boşluksuz küçük harfli ASCII kimlikleridir ve katalog içinde benzersiz olmalıdır. Kalınlıklar pozitif, sonlu ve benzersiz mm değerleridir; normalize edilmiş listede artan sıraya alınır. Birim yalnızca `mm` kabul edilir.
- `resolveMaterialThickness` seçilen malzeme için yalnızca katalogda açıkça bulunan kalınlığı kabul eder; varsayılan kalınlık, fiyat, tedarikçi, renk kodu, fire veya üretim standardı üretmez.
- Proje JSON v1'e opsiyonel `materials` alanı eklendi. Eski v1 dosyalarında alanın bulunmaması geçerlidir; yeni alan varsa kaydetme ve yüklemede doğrulanır ve round-trip sırasında korunur.
- Değişen dosyalar: `frontend/src/engine/materialCatalog.ts`, `frontend/tests/materialCatalog.test.mjs`, `frontend/src/engine/projectFile.ts`, `frontend/tests/projectFile.test.mjs`.
- Kod commit'i: `c00d668202596e4816d805dde31d0d5e2465d6a8`.
- Otomatik doğrulama: CI Run #62 başarılı; QA Run #37 başarılı, 77/77 test; Pages deploy Run #43 başarılı. TypeScript ve production build başarılı; Oxlint 15 uyarı / 0 hata; production audit eşiği başarılı.
- Güvenlik notu: `npm audit` toplam 6 bulgu (2 düşük, 4 orta) raporladı; `--audit-level=high` adımı başarılı. Kırıcı veya force bağımlılık güncellemesi yapılmadı.
- Önceki QA Run #32 (GitHub run `43752863285`) logları incelendi: tek hata, malzeme özetinin aynı adı farklı kalınlıklarda ayrı gruplamasını testin tekil malzeme adı varsayımıyla karşılaştırmasıydı. Sonraki test beklentisi düzeltildi; hesaplama davranışı gevşetilmedi ve QA #33/#34 ile güncel QA #37 başarılı.
- AI Developer Run #3 (`43559164561`) başarılı; bu geliştirme öncesinde `dev/github-work` dalında aktif CI/QA/Pages işi yoktu. Başarılı AI Developer işi yeniden başlatılmadı.
- Bilinen sınırlar: bu dilim veri sözleşmesi ve dosya kalıcılığıdır; henüz kullanıcı arayüzünde katalog ekleme/düzenleme/silme yoktur. Mobilya ve parça kayıtları henüz `materialId` ile katalog girdisine bağlanmaz; mevcut serbest metin malzeme alanları korunur. Kenar bandı ayrı kataloğu, damar yönü, fiyat, tedarikçi, fire ve levha verimi kapsam dışıdır.
- Sonraki görev: kullanıcı arayüzünde panel malzeme kataloğu yönetimini eklemek; katalog kimliklerini mobilya/parça verisine geriye uyumlu biçimde bağlamak ve seçili kalınlığın katalogda bulunduğunu üretim hesabında doğrulamak.

## Son tamamlanan dikey dilim — proje malzeme/dekor kataloğu yönetim arayüzü

- Özellik commit'i: `3b33ed248b879df87816aade82e21d807e5d099f`; otomatik test import düzeltmesi: `8e53d940b38292dcd7daa64e975c7de70c5ebb81`.
- Değişen dosyalar: `frontend/src/App.tsx`, `frontend/src/components/production/MaterialCatalogManager.tsx` (yeni), `frontend/src/engine/materialCatalog.ts`, `frontend/tests/materialCatalog.test.mjs`.
- Özellikler paneline Malzeme sekmesi eklendi. Kullanıcı proje içinde panel malzemesi ekleyebilir, düzenleyebilir ve onayla silebilir; ad, opsiyonel dekor etiketi, kararlı ID ve birden çok mm kalınlığı tanımlanır.
- Düzenleme sırasında ID kilitlidir; yeni kayıtta yinelenen ID mevcut malzemenin üzerine yazılmaz. Kalınlıklar noktalı virgülle ayrılır ve pozitif/sonlu mm değerleri domain doğrulamasından geçer.
- `addMaterialCatalogEntry`, `updateMaterialCatalogEntry` ve `removeMaterialCatalogEntry` saf domain işlemleri olarak eklendi; silme/güncelleme bilinmeyen ID'leri reddeder.
- App state'i proje JSON v1 kaydet/yükle akışına bağlandı. Kaydetme katalog listesini dosyaya ekler; yükleme katalog yoksa boş listeyle eski v1 uyumluluğunu korur.
- Testler: 3 yeni CRUD domain testi; toplam QA 80/80 başarılı. Testler duplicate ID'nin overwrite yapmamasını, update sırasında ID'nin değişmemesini ve silme işleminin var olan kimlikle sınırlı olmasını kapsar.
- İlk doğrulama: CI #64 başarılı; QA #39 üç testte başarısız oldu çünkü yeni CRUD yardımcıları test dosyasına import edilmemişti; Pages #45 başarılı. QA logu incelendi ve yalnızca eksik import düzeltildi.
- Düzeltme sonrası doğrulama: CI #65 (run `43763870649`) başarılı; QA #40 (run `43763870706`) başarılı, 80/80 test; Pages deploy #46 (run `43763870755`) başarılı. TypeScript, production build, lint ve production audit eşiği başarılı.
- Güvenlik/kalite: npm audit 6 bulgu (2 düşük, 4 orta) raporlamaya devam ediyor; `deepmerge` ve `minimatch` zincirleri mevcut. Kırıcı `--force` güncellemesi yapılmadı. Lint'te 15 mevcut uyarı sürüyor.
- Bilinen sınırlar: mobilya ve parça kayıtları henüz `materialId` ile kataloğa bağlanmadı; üretim raporu eski serbest metin malzeme alanlarını kullanmaya devam ediyor. Katalog silme işlemi henüz referans denetimi yapmıyor; çünkü malzeme referans alanları sonraki dilimde eklenecek. Fiyat, tedarikçi, fire, damar yönü veya kenar bandı standardı uydurulmaz.
- Sonraki görev: `materialId` alanını mobilya/parça verisine opsiyonel ve geriye uyumlu biçimde ekle; legacy serbest metin malzemeyi koru, referanslı malzemenin silinmesini engelle ve üretim kalınlığını katalogla doğrula.

## Son tamamlanan dikey dilim — mobilya malzeme kimliği ve üretim izlenebilirliği

- Mobilya özellik panelinde kullanıcı katalog malzemesini seçebilir veya mevcut serbest metin malzeme alanını koruyabilir. Katalog kaydı yeniden adlandırıldığında atanmış mobilyanın görünen malzeme adı senkronize edilir.
- PlacedFurniture.materialId opsiyoneldir; eski JSON v1 dosyaları ve eski serbest metin kayıtları değişmeden geçerlidir. Serializer/parser, atanmış kimliğin proje materials kataloğunda bulunmasını zorunlu kılar.
- Kullanılan malzeme katalog ekranında silinemez; önce mobilyadaki atama kaldırılmalıdır.
- Desteklenen düz mutfak gövdelerinde materialId, hesaplanan Part satırlarına aktarılır. Gövde paneli ve arkalık için gereken kalınlık katalogda yoksa üretim hesabı hata verir ve CSV export engellenir.
- Malzeme tüketimi aynı görünen ada sahip farklı katalog kimliklerini ayrı gruplar; proje CSV'sine Malzeme ID kolonu eklendi. Legacy serbest metin satırlarında bu kolon boş kalır.
- Çekmece kutusu konfigürasyonları kendi malzeme metnini korur; bu dilim drawer-box materialId, parça bazlı override ve farklı gövde/arkalık malzemesi atamasını kapsamaz.
- Kod commit'i: f4f97533280df98980dd1da377e71e917a7e5790.
- Değişen dosyalar: frontend/src/types/placedFurniture.ts, frontend/src/types/furniture.ts, frontend/src/types/part.ts, frontend/src/engine/cabinetParts.ts, frontend/src/engine/materialCatalog.ts, frontend/src/engine/projectFile.ts, frontend/src/engine/projectProduction.ts, frontend/src/engine/materialConsumption.ts, frontend/src/engine/cutListCsv.ts, frontend/src/components/production/MaterialCatalogManager.tsx, frontend/src/App.tsx, frontend/tests/projectFile.test.mjs, frontend/tests/projectProduction.test.mjs, frontend/tests/cutListCsv.test.mjs.
- Otomatik testler: 6 yeni test; QA Run #51 (43768495335) 92/92 başarılı. CI Run #79 (43768495400) TypeScript, production build ve lint adımlarında başarılı. Pages deploy Run #52 (43768495324) başarılı.
- Kalite notları: Oxlint 16 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta), audit-level=high eşiği başarılı. Bundle boyutu uyarısı sürüyor.
- Bilinen sınırlar: üretim materialId bağlantısı yalnızca mevcut desteklenen düz mutfak gövde profillerinde aktiftir. Çekmece kutusu grupları, gardırop/kitaplık ve diğer mobilya aileleri henüz katalog kimliğine bağlı üretim hesaplaması yapmaz. Fiziksel panel/CNC doğrulaması operatör gerektirir.

## Son tamamlanan dikey dilim — çekmece gruplarında katalog malzemesi

- Kod commit'i: `59abb77149e7a6a54b3900ccd43805b33c61ccd9`.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `drawerBoxProject.ts`, `projectFile.ts`, `projectProduction.ts`, `frontend/src/components/production/DrawerBoxConfigurator.tsx`, `frontend/src/App.tsx` ve dört ilgili test dosyası.
- Çekmece grubu editörüne isteğe bağlı katalog malzemesi seçimi eklendi. Seçilen malzeme dört panel grubunun tamamına uygulanır; serbest metin malzeme yolu ve eski JSON v1 kayıtları korunur.
- `DrawerBoxConstructionSpec.materialId` opsiyoneldir. Hesaplanan dört parça grubu materialId değerini taşır; üretim hesabı katalog adını ve kimliğini parçalara yazar.
- Proje kaydetme/yükleme, çekmece grubu materialId referansını doğrular ve yan, ön/arka, taban ve görünür ön panel kalınlıklarının tamamının katalogda bulunmasını ister. Geçersiz kimlik/kalınlık kaydetme ve dışa aktarmayı engeller.
- Malzeme silme koruması artık çekmece grubu referanslarını da sayar. Katalog adı değiştiğinde çekmece yapılandırmasının görünen malzeme adı senkronize edilir.
- Testler: 6 yeni otomatik test; QA Run #58 (`43775089671`) 98/98 başarılı. CI Run #92 (`43775089453`) TypeScript, production build ve lint başarılı. Pages deploy Run #57 (`43775089465`) başarılı.
- Kalite: Oxlint 16 uyarı / 0 hata; npm audit 6 bulgu (2 düşük, 4 orta), `audit-level=high` eşiği geçti; bundle boyutu uyarısı sürüyor. Güvenlik güncellemesi için kırıcı `--force` kullanılmadı.
- Sınırlar: tek materialId tüm çekmece panel gruplarına uygulanır; yan/ön-arka/taban/görünür ön için ayrı malzeme override sonraki iştir. Ray, donanım, CNC operasyonu ve fiziksel üretim onayı bu dilime dahil değildir.

## 16 Kasım 2026 — çekmece kutusu domain konstrüksiyon motoru

- Yeni frontend dışı sürümlü modül: `domain/production/drawerBoxConstruction.ts`.
- Dört çekmece panel grubunu mevcut frontend geometri kurallarıyla uyumlu biçimde hesaplar; dış ölçüler, panel kalınlıkları, quantity, kenar bantlama ve damar yönü açık girdidir.
- Yan ve ön/arka panel adetleri `2 × quantity`; taban ve görünür ön adetleri `quantity` olarak korunur. İç genişlik ve taban uzunluğu formülleri tek domain kaynağında 0.1 mm hassasiyetinde hesaplanır.
- Grup bazlı malzeme override'ları katalog kimliği ve ilgili panel kalınlığıyla doğrulanır; katalog ID'si olmayan legacy serbest metin malzeme korunur.
- `domain/production/drawerBoxConstruction.test.mjs` kabul testleri ve QA strict TypeScript kontrolü eklendi.
- Bu modül henüz proje agregatörüne, JSON v1 veya CSV'ye bağlı değildir; hiçbir `frontend/**` dosyası değiştirilmemiştir.
- Ray boşluğu, reveal, bağlantı, delik, CNC, fire ve fiziksel üretim güvenliği hesabı kapsam dışıdır; gerçek atölye uygunluğu insan doğrulaması gerektirir.
- Kod commit'i sonrası CI/QA/Pages sonuçları bu kayıttan ayrı olarak Actions üzerinden doğrulanacaktır.

## DOM-049 tamamlandı

- [Test commit 96553086](https://github.com/Taylan789/MobilyaCAD/commit/96553086a370c93fd870086f7aaaedde80c60535) mixed-family Part/furniture kaynak izini, quantity-weighted edgeCount ve mm/m tüketim birimlerini doğrular.
- [CI #44487103626](https://github.com/Taylan789/MobilyaCAD/actions/runs/44487103626) ve [QA #44487103661](https://github.com/Taylan789/MobilyaCAD/actions/runs/44487103661) başarılı: 124 frontend + 411 domain test; strict TypeScript, lint, production build ve audit 0 bulgu. [Pages #44487103615](https://github.com/Taylan789/MobilyaCAD/actions/runs/44487103615) başarılı.

## Sıradaki 3 küçük görev — domain sahipliği

1. DOM-099 DONE — CSV import/export 1 MiB UTF-8 payload ve 2.000 satır fark limiti; eski CSV v1/v2/v3 korundu. [CI #44958138720](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138720), [QA #44958138801](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138801), [Pages #44958138729](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138729) passed.
2. DOM-100 VERIFIED — JSON v2 ↔ CSV v3 exact round-trip, source/Part metadata preservation and corrupted row-version fail-closed; CI/QA/Pages successful.
3. DOM-101 VERIFIED — BOM/no-BOM, CRLF/LF/single-CR boundaries round-trip; malformed quote/row-width and blank/truncated records fail closed. [CI #44968313006](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968313006), [QA #44968312997](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312997), [Pages #44968312947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312947) passed.
4. DOM-102 PLANNED — JSON v1/v2 and CSV v1/v2/v3 legacy compatibility matrix; explicitly verify metadata preservation/loss.
5. INT-001 FRONTEND-OWNED — comparison download and production report/export contract; product agent does not edit frontend files.
6. INT-002/PERF-001 INTEGRATION-OWNED — adapter round-trip and measured CAD profiling on the specialist-owned branch.
7. QA-003 BLOCKED — end-to-end export reconciliation after INT-001/INT-002 evidence.

## DOM-100 — JSON v2 / CSV v3 çapraz format bütünlüğü (VERIFIED, 22 Kasım 2026)

- JSON v2 → CSV v3 import/export → JSON v2 çapraz round-trip comparison nesnesi birebir eşit; katalog malzeme/kenar bandı kimlikleri, birimler, Part ID ve kaynak metadata korunuyor.
- CSV line-row sürümünü 3→4 bozmak parser'ı blocked yapıyor ve kısmi comparison döndürmüyor.
- Kod/test: [f704bbd6](https://github.com/Taylan789/MobilyaCAD/commit/f704bbd6af908a1626c61c9d9aa13663ed313087). İlk deneme [5f6b3b19](https://github.com/Taylan789/MobilyaCAD/commit/5f6b3b19d33a50942e61a43f5930d160dbed9d08) serializer envelope file alanı nedeniyle QA'da başarısız oldu; düzeltildi ve yeniden doğrulandı.
- Exact-SHA CI [#44962373022](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373022), QA [#44962373046](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373046), Pages [#44962373013](https://github.com/Taylan789/MobilyaCAD/actions/runs/44962373013) başarılı. QA: 142 frontend + 622 domain tests, strict domain type-check, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- Test sitesi: https://taylan789.github.io/MobilyaCAD/ — exact-SHA Pages deployment succeeded. Bu dilim frontend görünümünü değiştirmez.
- Next: DOM-102 JSON v1/v2 and CSV v1/v2/v3 legacy compatibility matrix; INT-001 frontend-owned adapter contract remains separate.

## DOM-101 — Adversarial CSV record-boundary ve quoting testleri (VERIFIED, 22 Kasım 2026)

- Regression testleri BOM'lu/BOM'suz CSV ile dış CRLF, LF ve tek CR kayıt ayraçlarında exact comparison round-trip'i doğrular.
- Tırnak sınırındaki bozukluk, kapanış tırnağı sonrası karakter, tırnaklı olmayan alan içindeki quote, ek boş kayıt ve yarım final alanı blocked/null comparison ile sonuçlanır.
- Code/test commit [24b5bdc](https://github.com/Taylan789/MobilyaCAD/commit/24b5bdc358d6b8e5fa8404a063dde0f024fd3068). Exact-SHA CI [#44968313006](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968313006), QA [#44968312997](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312997) and Pages [#44968312947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44968312947) succeeded.
- QA: 142/142 frontend + 624/624 domain tests, strict domain type-check, lint 32 warnings / 0 errors, production build and audit 0 vulnerabilities.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/. This is a test-only slice; no visible frontend change and no CSV production parser behavior changed.
- Next: DOM-102 legacy JSON/CSV version compatibility matrix; INT-001 remains frontend-owned.

## Üretim güvenliği ve karar sınırları

- Makine, takım, delik koordinatı, minifix/dübel, menteşe ve kenar mesafesi standardı uydurulmaz.
- Fiyat, fire ve kâr oranları varsayılan gerçek değer gibi sunulmaz; kullanıcı/üretici kataloğundan alınır.
- Fiziksel CNC denemesi, bağlantı dayanımı ve gerçek malzeme davranışı atölye/operatör doğrulaması gerektirir.
- Her küçük aşama otomatik test edilebilir tutulur; kullanıcıdan manuel yazılım testi istenmez.


## 16 Kasım 2026 — çekmece panel grubu bazında malzeme override (doğrulandı)

- Başlangıç HEAD: `0adff4580df8a44b4d56c9d8b461d56aa091ee61`. Başlangıçta aktif CI/QA işi yoktu. Açık yardımcı ajan PR #7 `dev/assistant-viewport-gizmo` yalnızca viewport bileşenine aitti; bu çalışma PR'ı sahiplenmedi ve `frontend/src/components/viewport/Scene3D.tsx` dosyasına dokunmadı. Tasarım ajanının sahibi olduğu `frontend/src/App.css` de değiştirilmedi.
- Kod commit'i: `40b57f933405ddc7adc34e71a3c4776c868b89c1`; doğrulama düzeltmesi: `4a5c456fd5c87f24107631ce7ad4ead00434a3fd`.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `drawerBoxProject.ts`, `projectFile.ts`, `projectProduction.ts`, `cabinetRules.ts`, `frontend/src/components/production/DrawerBoxConfigurator.tsx`, `frontend/src/App.tsx`, `frontend/tests/projectProduction.test.mjs`.
- Çekmece kutusu verisine opsiyonel `panelMaterialIds` eklendi. Yan, ön/arka, taban ve görünür ön panel ayrı katalog malzemesi seçebilir; boş override çekmece grubunun varsayılan `materialId` değerine geri döner. Varsayılan katalog ID'si olmayan eski serbest metin kayıtları korunur.
- Ortak çözücü her panel grubunun efektif malzeme kimliğini ve yalnızca o grubun kalınlığını doğrular. Proje JSON v1, üretim dışa aktarım koruması ve üretim parça motoru aynı çözücüyü kullanır. Part kayıtları malzeme ID + katalog adını taşır; malzeme tüketimi ve CSV aynı Part listesinden beslenir. Panel override referansları katalog silme korumasına dahil edildi.
- Kullanıcı akışı: çekmece formunda varsayılan malzeme seçilir; dört panel grubu için isteğe bağlı ayrı malzeme seçilir; boş gruplar varsayılanı kullanır. Herhangi bir override kimliği veya kalınlığı geçersizse kaydetme/üretim dışa aktarımı engellenir.
- İlk kod commit'inde QA #60 (run `43782899944`) üç testi yakaladı: eski serializer hata mesajı beklentisi, üretim ön kontrolünün panel override çözücüsünü kullanmaması ve bir test regex'inin gerçek hata metniyle uyuşmaması. Loglar incelendi; ortak export guard çözücüye bağlandı, eski hata mesajı uyumluluğu korundu ve test beklentisi düzeltildi. Testler silinmedi veya gevşetilmedi.
- Son doğrulama: CI #95 run `43783058466` başarılı; QA #61 run `43783058478` başarılı, **101/101 test**; Pages deploy #60 run `43783058489` başarılı. TypeScript, production build, lint ve production dependency audit adımları tamamlandı.
- Bilinen sınırlar: bu dilim çekmece kutusunun dört panel grubuyla sınırlı. Gövde yan/üst/alt, raf, arkalık ve kapak için bağımsız malzeme override sonraki iştir. Fiyat, fire, ray/donanım, CNC ve fiziksel üretim doğrulaması dahil değildir.
- Sonraki görev: düz gövde konstrüksiyonunda yan, üst/alt, raf, arkalık ve kapak için ayrı katalog malzemesi override'ı eklemek; her parçanın kalınlığını kendi malzemesinde doğrulayıp tüketim ve CSV'ye taşımak.


## 16 Kasım 2026 — gövde panel malzeme ataması için bağımsız domain dilimi

- Yeni ortak domain modülü `domain/production/bodyPanelMaterials.ts` altında oluşturuldu; bu dizin `frontend/**` sahiplik sınırının dışındadır.
- Sabit grup sözleşmesi: `leftSide`, `rightSide`, `top`, `bottom`, `shelf`, `back`, `door`. Mevcut gövde parça ID anahtarları yalnızca açık eşlemeyle bu gruplara bağlanır; bilinmeyen parçalar tahmin edilmez.
- Resolver, grup override'ını mevcut parça `materialId` değerine göre önceliklendirir; seçilen katalog kaydının panel kategorisini, mm birimini ve parçanın gerçek kalınlığını doğrular. Eski serbest metin malzemeler katalog ID'si yoksa korunur; varsayılan malzeme/kalınlık üretilmez.
- Node testleri ve bağımsız TypeScript kontrolü QA workflow'una eklendi. Testler grup bazlı override, varsayılan kimliğe dönüş, legacy serbest metin, bilinmeyen ID, kalınlık uyuşmazlığı, katalog/parça kimliği tekrarı ve sabit parça anahtarı eşlemesini kapsar.
- **Entegrasyon sınırı:** bu commit UI, `PlacedFurniture`, proje JSON, mevcut `frontend/src/engine/projectProduction.ts`, malzeme tüketimi veya CSV'yi değiştirmez. Frontend yenileme akışı tüm `frontend/**` dosyalarının sahibi olduğundan entegrasyon için gerekli alan/sözleşme burada hazırlanmıştır; uygulama entegrasyonu ayrı frontend sahibinin işi olarak sıraya yazılmıştır.
- Kabul kriteri: domain resolver tek başına güvenli/tekrarlanabilir olmalı; her atanmış parça kendi katalog kalınlığını doğrulamalı; geçersiz atama sessizce legacy değere düşmemeli.
- Üretim/CNC standardı, fiyat, fire veya fiziksel üretim onayı bu dilimde yoktur.

- Kod commit zinciri: `4905293d2e12c2181dab32c1c930218df1fdbae5`, `3d1306b2e22351dda589a08893b2c420a7f3cc12`, `2729298edc976a04d346da1d3816a8c32fbfaadf`, son kod düzeltmesi `c6bc33b1feccf776aa2ec4bcfa4be5355dd6a4a4`.
- Nihai doğrulama: QA run `43792112640` başarılı (mevcut 101/101 + ortak domain 9/9; type-check, lint, build ve audit adımları başarılı); CI run `43792112631` başarılı. Pages run `43792112615` build/artifact başarılı, deploy job'u son kontrolde kuyruktaydı.
- QA sırasında bulunan üç otomasyon/test uyumsuzluğu loglarla teşhis edilip düzeltildi; hiçbir test silinmedi veya gevşetilmedi. Bu domain modülü henüz çalışan UI/proje/CSV akışına entegre değildir.



## 16 Kasım 2026 — gövde paneli resolver ve gerçek Part satırı adaptörü

- `resolveBodyPanelMaterialAssignments` artık parça listesinde o gruba ait satır bulunmasa bile her override malzeme kimliğinin katalogda bulunduğunu doğrular. Böylece örneğin mevcut konfigürasyonda arkalık yokken saklanan geçersiz bir `back` override'ı daha sonra sessizce üretime taşınamaz.
- `resolveCabinetBodyPanelParts` ortak domain adaptörü, mevcut üretim `Part` satırlarının `furnitureId`, sabit parça kimliği ve gerçek `thickness` alanlarını kullanır. Yalnızca açıkça eşlenmiş gövde grupları çözülür; çekmece önü, donanım veya bilinmeyen parçalar değiştirilmez.
- Adaptör birden fazla mobilyanın birleşik `Part[]` listesinde yalnızca hedef `furnitureId` değerine dokunur; diğer mobilyalar ve tanınmayan parça kayıtları aynen korunur. Orijinal parça alanları, mm kalınlığı ve quantity semantiği korunur.
- Otomatik kabul kriterleri: boş parça listesinde dahi katalog referansı doğrulaması; farklı mobilya kimliklerinin yalıtılması; bilinmeyen parça anahtarlarının tahmin edilmemesi; resolver yardımcı alanlarının üretim `Part` nesnesine sızmaması.
- Sınır: bu domain adaptörü henüz `frontend/**` üretim akışına bağlanmadı. Frontend yenileme dalı bu dosyaların sahibi olduğundan entegrasyon UI/proje JSON/CSV katmanında ayrı frontend sahibince yapılmalıdır. Bu commit yalnızca frontend dışı domain sözleşmesini güçlendirir.
- Sonraki domain adımı: mobilya bazlı konstrüksiyon profilini frontend'den bağımsız, doğrulanabilir bir domain sözleşmesine ayırmak; panel kalınlığı, arkalık montajı ve kapak/raf adetlerini açık girdiler olarak tanımlamak. Üretici/atölye standardı olmayan donanım veya CNC ölçüsü eklenmeyecek.



## 16 Kasım 2026 — parametrik düz gövde konstrüksiyon domain motoru (doğrulandı)

- Yeni frontend dışı modül: `domain/production/cabinetConstruction.ts`.
- Sürüm 1 istek sözleşmesi mobilya kimliği, dış ölçüler (mm), varsayılan malzeme adı/ID'si, gövde panel kalınlığı, `between-sides` / `over-sides` konstrüksiyonu, arkalık montajı, raf/kapak adetleri ve her panel grubunun dört kenar bantlama bayrağını açıkça ister.
- Arkalık montajı discriminated union olarak tanımlıdır: kapalı, overlay, grooved (açık kanal derinliği) veya inset (açık içe alma payı). Kapaklar kapalı veya açık adet/stil/boşluk ile tanımlanır. Eksik geometri parametresi varsayılmaz.
- `calculateCabinetConstruction` mevcut düz gövde formüllerinin frontend dışı, saf domain karşılığını üretir: sol/sağ, üst/alt, raf, kapak ve varsa arkalık. Parça kimlikleri mevcut gövde malzeme eşlemesiyle uyumludur; mm ölçüler 0.1 mm hassasiyetinde yuvarlanır; quantity pozitif güvenli tam sayıdır.
- Üretilen Part benzeri satırlar ortak `resolveCabinetBodyPanelParts` adaptöründen geçer. Her override katalog kimliği doğrulanır; gerçek parça kalınlığı ilgili panel malzemesinin mm kalınlık listesinde yoksa hesaplama reddedilir. Legacy serbest metin malzeme, materialId verilmediğinde korunur.
- QA'ya 14 yeni domain testi ve strict TypeScript kontrolü eklendi. Test kapsamı: iki gövde stili, üç arkalık montajı, arkalıksız durum, kapak/raf adetleri, grup bazlı malzeme override, yanlış kalınlık, kullanılmayan grup override kimliği, kenar bantlama şeması, geçersiz ölçü/adet ve eksik montaj parametresi.
- **Entegrasyon sınırı:** bu domain hesaplayıcısı henüz `frontend/**` üretim pipeline, proje JSON v1, mevcut `projectProduction`, tüketim özeti veya CSV'ye bağlı değildir. Frontend yenileme sahibine entegrasyon için sürümlü giriş/çıkış sözleşmesi sunar; bu otomasyon frontend dosyalarını değiştirmez.
- **Üretim sınırı:** kitaplık/gardırop ailesi, değişken yan/üst/alt panel kalınlıkları, sabitleme/raf delikleri, donanım, CNC, kerf/fire ve nesting üretilmez. Fiziksel konstrüksiyon ve bağlantı güvenliği atölye doğrulaması gerektirir.
- Kod commit'i: `a76fff96ce82d524a30c9d3d910de4b934fd0a13`.
- Otomatik doğrulama: QA #87 (`43807168292`) başarılı (101/101 uygulama + 26/26 ortak domain testi); strict TypeScript, lint, production build ve audit başarılı. CI #140 (`43807168281`) ve Pages deploy #77 (`43807168390`) başarılı.
- Sonraki domain görevi: birden fazla mobilyanın doğrulanmış domain parça listelerini furnitureId/parça ID/quantity kaybetmeden birleştiren proje üretim agregatörü; ardından aynı kaynaktan malzeme/kenar bantlama toplamları.



## 16 Kasım 2026 — çoklu mobilya domain üretim agregatörü (doğrulandı)

- `domain/production/projectProduction.ts`, her mobilyanın sürüm 1 konstrüksiyon isteğini bağımsız hesaplayıp proje seviyesinde tek `Part[]` listesinde birleştirir.
- Her satırın `furnitureId`, sabit parça `id`, mm ölçüleri, katalog malzeme kimliği/adı, kenar bayrakları ve `quantity` değeri korunur; parça satırları birleştirilmez veya adetleri yeniden yorumlanmaz.
- Yinelenen mobilya/parça kimlikleri, bozuk istek, desteklenmeyen şema ve geçersiz konstrüksiyon girdileri reddedilir. Boş proje boş sonuç verir.
- Yeni domain modülü strict TypeScript kontrolüne ve `domain/production/*.test.mjs` QA testlerine eklendi.
- Kod commit zinciri: `6b72e43fe38762f66baaa325ad815e22957c775a` (özellik) ve `01b62a8331b7403d483246e94aca5fa28c5c6a33` (test fixture düzeltmesi).
- Gerçek doğrulama: CI run `43821494725` başarılı; QA run `43821494753` başarılı (**101/101 frontend + 31/31 domain testi**); Pages deploy run `43821494767` başarılı. Lint 19 uyarı / 0 hata; TypeScript, strict domain type-check, production build ve production audit eşiği başarılı.
- İlk QA denemesi `43821376989` bir yeni testte başarısız oldu: test fixture'ı `overrides.furniture` alanını nesneye aktarmadığı için geçersiz genişlik senaryosu hesaplayıcıya ulaşmıyordu. Fixture düzeltildi; test silinmedi veya gevşetilmedi.
- Sınırlar: agregatör yalnızca mevcut düz gövde domain hesaplayıcısını çağırır; kitaplık/gardırop, çekmece entegrasyonu, malzeme tüketim özeti, JSON/CSV entegrasyonu, donanım, nesting ve CNC çıktısı sağlamaz. Fiziksel üretim onayı değildir.
- Sonraki görev: agregatörün birleşik Part listesi üzerinden quantity ağırlıklı malzeme tüketimi ve kenar bantlama özetini domain seviyesinde hesaplamak.


## 16 Kasım 2026 — proje genelinde domain malzeme tüketimi ve kenar bantlama özeti (doğrulandı)

- Yeni frontend dışı modül: `domain/production/projectMaterialSummary.ts`. Girdi olarak `calculateCabinetProjectProduction` sonucunu alır; bağımsız bir ikinci parça listesi üretmez.
- Gruplama anahtarı katalog `materialId` (varsa), normalize malzeme adı ve gerçek panel kalınlığıdır. Aynı etiketli farklı katalog kimlikleri ve aynı malzemenin farklı kalınlıkları birleştirilmez.
- Parça alanı (m²), hacim (m³), toplam adet ve açık `top/bottom/left/right` kenar bayraklarından bant uzunluğu (mm) quantity ağırlıklı hesaplanır. Bant yönü sözleşmesi: top/bottom = parça genişliği; left/right = parça uzunluğu. Alan 6, hacim 9, bant uzunluğu 0.1 ondalık hassasiyetinde döner.
- Şema sürümü, proje-mobilya ilişkisi, yinelenen mobilya/parça kimlikleri, pozitif sonlu mm ölçüleri, güvenli tam sayı adetleri, malzeme kimliği ve dört boolean kenar bayrağı doğrulanır. Taşan adet/alan/hacim/bant toplamları reddedilir.
- Kabul testleri gerçek proje agregatörü çıktısı üzerinde iki mobilya, raf quantity çarpanı, malzeme ID/kalınlık gruplaması, boş proje, bozuk ilişki/kimlik/adet/kenar ve taşan toplamları kapsar.
- Kod commit'i: `f6cdf58458eaa8b7dade6360d5538c59ef054e2f`.
- Gerçek GitHub Actions: CI run `43827969421` başarılı; QA run `43827969438` başarılı (**101/101 frontend + 36/36 domain testi**); Pages run `43827969425` başarılı (build ve deploy).
- QA'da strict domain TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları başarılı. Lint 19 uyarı / 0 hata; audit raporunda 6 mevcut bulgu (2 düşük, 4 orta), bundle boyutu ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- Sınırlar: bu hesap yalnızca mevcut düz gövde domain Part listesine uygulanır; frontend üretim paneli, JSON v1 veya CSV'ye henüz bağlı değildir. Fire, levha verimi, kerf, bant kalınlığı, rulo payı, donanım, CNC ve fiziksel atölye onayı kapsam dışıdır.
- Hiçbir `frontend/**` dosyası değiştirilmedi. Açık frontend PR'ları #7 ve #8 sahiplenilmedi veya birleştirilmedi.
- Sonraki görev: frontend yenileme sahibine domain istek/sonuç ve üretim özeti sözleşmesini, JSON v1 geriye uyumluluk ve hata/boş durum kriterleriyle dokümante etmek.


## 16 Kasım 2026 — gövde ve çekmece parçalarının proje agregatöründe birleştirilmesi

- `calculateCabinetProjectProduction` artık mevcut gövde isteklerine ek olarak opsiyonel `drawerBoxes` listesi kabul eder. Her çekmece grubu proje içindeki bir gövde mobilya kimliğine bağlanır.
- Gövde ve çekmece parçaları tek `ProjectProductionPart[]` listesinde tutulur. Çekmece satırlarının `drawerGroupId`, `grainDirection`, malzeme kimliği, kenar bayrakları, mm ölçüleri ve quantity değerleri korunur.
- Aynı mobilyadaki yinelenen çekmece grubu kimlikleri, proje dışı mobilya referansı, yinelenen parça kimliği ve geçersiz çekmece şeması reddedilir. Eski çağrılarda `drawerBoxes` yoksa veya boşsa önceki sonuç şekli korunur.
- Proje malzeme tüketimi ve kenar bantlama özeti aynı birleşik parça listesini kullanır; testler mdf-16 için quantity, net alan ve bant uzunluğunu uçtan uca doğrular.
- Değişen kod/test/dokümantasyon: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`. Hiçbir `frontend/**` dosyası değiştirilmedi.
- Otomatik doğrulama: CI run `43854675631` başarılı; QA run `43854675624` başarılı (**101/101 frontend + 56/56 domain testi**, 0 başarısız); Pages run `43854675588` build ve deploy ile başarılı. Strict domain TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları geçti.


## 16 Kasım 2026 — aile ayrımlı proje agregatörü ve açık kitaplık konstrüksiyonu

- family alanı olmayan mevcut dolap istekleri ve sonuçları geriye uyumlu kaldı; açık family: cabinet isteği de aynı dolap motorunu kullanır.
- Yeni family: bookshelf isteği, açık altı panel grubu kenar bantlama ayarı, raf adedi, gövde stili, arkalık montajı ve malzeme kataloğu ile hesaplanır. Kapak alanı, kapak panel grubu ve kapak override'ı reddedilir.
- Kitaplık geometri hesabı mevcut düz gövde motorunu tekrar kullanır; yeni ve farklı bir ölçü formülü kopyalanmadı. Raf adetleri tek Part satırında quantity olarak korunur.
- Proje agregatörü kitaplık parçalarını gövde/çekmece satırlarıyla aynı parts listesine ekler; family bilgisi açık kitaplık girdilerinin mobilya sonucunda taşınır. Malzeme tüketim özeti aynı listeden hesaplanır.
- Kabul kriterleri: eski dolap istek/sonuç şekli değişmez; bilinmeyen family reddedilir; kitaplıkta altı grup eksiksiz ve kapak grubu olmadan doğrulanır; malzeme override gerçek panel kalınlığıyla eşleşir; raf quantity ve kaynak kimliği korunur.
- Değişen dosyalar: domain/production/bookshelfConstruction.ts, domain/production/bookshelfConstruction.test.mjs, domain/production/projectProduction.ts, domain/production/projectProduction.test.mjs, .github/workflows/qa-test.yml, docs/production-domain-contract.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Kod commit'i `4aaf94e19e7ee69c6b3fcc068371eb07d174fb63`; test beklentisi düzeltme commit'i `d2fab99183c8f0cf236694b0d957053e989c3bb7`.
- İlk QA run `43868921997` tek bir yeni test beklentisinde başarısız oldu (62/63 domain testi): legacy serbest metin dolap malzemesi katalog kimliği olan kitaplık malzemesinden ayrı gruplandığı için mdf-18 satırındaki 11 adet beklentisi yanlıştı. Üretim özeti davranışı doğruydu; test, mdf-18 için 7 ve tüm malzeme grupları toplamı için 11 adet doğrulayacak şekilde düzeltildi. Test silinmedi veya gevşetilmedi.
- Nihai CI run `43869039873` başarılı; QA run `43869039844` başarılı (**101/101 frontend + 63/63 domain testi**, 0 başarısız); Pages deploy run `43869039738` başarılı. Strict domain TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` başarılı.
- Kalite notları: Oxlint 30 uyarı / 0 hata; production audit'te 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği geçti); bundle boyutu ve Actions Node 20 deprecation uyarısı sürüyor.
- Sınırlar: yalnızca açık kitaplık parça ağacı; dikey bölücü, farklı panel grubu kalınlıkları, raf aralığı, duvar sabitlemesi, donanım, delik, CNC, nesting, fire ve fiziksel üretim onayı yoktur.


## 16 Kasım 2026 — kitaplık panel grubu bazlı kalınlık dilimi

- `domain/production/cabinetConstruction.ts` ortak gövde motoruna geriye uyumlu opsiyonel `panelThicknessMmByGroup` alanı eklendi. Eksik gruplar legacy `panelThicknessMm` değerini kullanır; mevcut istek/sonuç alanları değişmez.
- Sol/sağ panel kalınlıkları iç genişliğe ayrı ayrı uygulanır. `over-sides` modelinde üst/alt kalınlıkları iç yüksekliği ve yan panel boyunu belirler. Raf, kapak ve arkalık Part kalınlıkları kendi grubundan çözülür; içten arkalık ve inset kapak açıklıkları etkin grup kalınlıklarını kullanır.
- Kitaplık sözleşmesi yalnızca altı gerçek gruba izin verir. Grup kalınlığı override'ı için katalog malzeme kimliği ve `thicknessesMm` eşleşmesi zorunludur; kullanılmayan raf/arkalık kalınlığı ve bilinmeyen grup reddedilir.
- Kabul testleri: asimetrik sol/sağ/üst/alt ölçüler, raf kalınlığı, arkalık inset derinliği, kapak ölçüleri, katalog uyuşmazlığı, kimlik eksikliği, kapalı grup ve legacy ortak kalınlık fallback'i.
- İlk QA run `43881344222` test dosyasındaki sözdizimi hatası nedeniyle başarısız oldu; `e9715a8fb490b65e3e484d399f150e8d433e42c5` düzeltme commit'i sonrası QA `43881598804` (101/101 frontend + 66/66 domain), CI `43881598968` ve Pages `43881598819` başarılıdır.

### Sıradaki 3-5 küçük görev

1. DOM-044: açıklıklı banyo üst panelinin net alan/hacim tüketimini ve exact kalınlık fiyatını gerçek proje agregatörüyle doğrula.
2. DOM-045: JSON v3 stockSheetSource provenance metadata'sını fresh/stale kesim planı doğrulaması boyunca koru.
3. DOM-046: gruplanmış malzeme teklif satırlarına katkı veren Part ID'lerini kaynak izi olarak ekle; mevcut snapshot/revizyon v1 kayıtlarını geriye uyumlu tut.


## 19 Kasım 2026 01:43 TRT — DOM-041 özel Part tüketimi ve teklif testi (Actions doğrulandı)

- Başlangıç HEAD: `983e1368a1dde9d70dcf37b58baecd1569269803`; kod/test commit'i: [983e1368a1dde9d70dcf37b58baecd1569269803](https://github.com/Taylan789/MobilyaCAD/commit/983e1368a1dde9d70dcf37b58baecd1569269803).
- Yeni test `domain/production/projectSpecialPartPricing.test.mjs`, gardırop ve TV ünitesi özel raf/bölücü Part satırlarını gerçek proje agregatöründen üretir; tüm Part listesi için materialId + malzeme + gerçek mm kalınlık + quantity ağırlıklı net alanı bağımsız hesapla karşılaştırır.
- 18 mm ve 8 mm malzemeler ayrı fiyatlanır; birleşik teklif satır kaynakları doğrulanır. 8 mm özel raf fiyatı kaldırıldığında priced consumption ve quote `incomplete` / `costSummary: null` döndürür.
- CI [#44414697417](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697417): başarılı. QA [#44414697280](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697280): başarılı — **124/124 frontend + 394/394 domain**, shared-domain strict TypeScript, lint, frontend production build ve `npm audit --omit=dev --audit-level=high` başarılı; **0 vulnerability**. Pages [#44414697288](https://github.com/Taylan789/MobilyaCAD/actions/runs/44414697288): başarılı.
- Runtime üretim kodu, frontend/adapter, workflow, package/lockfile veya secrets değiştirilmedi. Fiyatlar yalnızca test fixture'ıdır; gerçek piyasa fiyatı, CNC/makine standardı veya fiziksel üretim onayı değildir.
- Sonraki görevler: DOM-042 özel Part freshness; DOM-043 teklif fiyat snapshot/revizyon izi; DOM-044 kesitli banyo paneli tüketim/fiyat doğrulaması.


## 19 Kasım 2026 05:12 TRT — DOM-044 banyo üst paneli net tüketim/fiyat doğrulaması (Actions doğrulandı)

- Yeni domain kabul testi: domain/production/projectBathroomVanityPanelPricing.test.mjs. Gerçek bathroom-vanity proje agregatöründen açıklıklı üst panel üretir; net alan/hacim değerlerinin malzeme özetine ve m² fiyat satırına taşınmasını doğrular.
- Aynı materialId altında 8 mm üst panel ve 18 mm diğer gövde panelleri ayrı exact fiyat anahtarlarıyla sınanır. 8 mm fiyatı eksikse 18 mm fiyatı fallback olmaz; tüketim ve birleşik teklif incomplete/null toplam üretir.
- Kesitli panelin mevcut JSON/CSV export blocker'ı korunur; frontend, runtime üretim kodu, adapter, workflow, bağımlılık ve secrets değiştirilmez.
- Kod/test commit'i: [441945f](https://github.com/Taylan789/MobilyaCAD/commit/441945f43e9cf7b13fe83b21cee23ddfbe9d87ef). CI [#44442862028](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862028) ve QA [#44442862160](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862160) başarılı — 124/124 frontend + 400/400 domain, strict TS/build/lint ve production audit 0 vulnerability. Pages [#44442862060](https://github.com/Taylan789/MobilyaCAD/actions/runs/44442862060) başarılı.

### Sıradaki küçük domain dilimleri

- DOM-052 **DONE** — edge-band ID/unit değişiminde cut-plan freshness; CI/QA doğrulandı.
- DOM-053 **DONE** — Part edge yönü assignment, legacy fallback ve strict validation; CI/QA doğrulandı.
- DOM-054 **DONE** — yönsel tüketim/fiyat, quantity, edgeCount ve Part provenance; CI/QA doğrulandı.
- DOM-055 **DONE** — [domain JSON v1/v2 extension commit](https://github.com/Taylan789/MobilyaCAD/commit/82c73f4c6f98649ff42ccdc9cbabce96e1fc1caf); [CI #44547140802](https://github.com/Taylan789/MobilyaCAD/actions/runs/44547140802), [QA #44547140762](https://github.com/Taylan789/MobilyaCAD/actions/runs/44547140762) (124/124 frontend + 432/432 domain), [Pages #44547141174](https://github.com/Taylan789/MobilyaCAD/actions/runs/44547141174) all successful.
- DOM-056 **DONE** — [directional freshness regression commit](https://github.com/Taylan789/MobilyaCAD/commit/77e653291c7986258675bf0b7d3af6ffdc0ee6fe); [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227836), [QA 124/124 frontend + 434/434 domain](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227917), [Pages](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227834) başarılı.
- DOM-057 **DONE** — [directional quote snapshot/provenance test](https://github.com/Taylan789/MobilyaCAD/commit/8fe1fb0d064797af528c4d2170b785801cfedf41); [CI/QA](https://github.com/Taylan789/MobilyaCAD/actions/runs/44569030417) passed.
- DOM-058 **DONE** — [versioned project JSON persistence test](https://github.com/Taylan789/MobilyaCAD/commit/ffc89fd657fb932d88b40452627f905667406df4); [CI #44576735505](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735505), [QA #44576735471](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735471), [Pages #44576735561](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735561) successful (124 frontend + 438 domain).


## DOM-046 kabul ve entegrasyon kriterleri

- Her malzeme/kalınlık teklif grubu sorted unique Part ID listesi taşır; aynı gruba katkı veren birden fazla mobilyanın parçaları kaybolmaz.
- Yeni `sourcePartIds` alanı quote revision v1 JSON round-trip ile korunur. Eski v1 snapshot'lar alan olmadan geçerli kalır.
- Boş, duplicate veya sırası bozulmuş Part kimliği listesi revizyonu blocked yapar; donanım BOM'larına Part bağlantısı varsayılmaz.


## 19 Kasım 2026 07:32 TRT — DOM-045 v3 levha kaynak izi freshness kabul testi

- Fresh/stale freshness API'si JSON v3 stockSheetSource.sourceId ve revision metadata'sını koruma sözleşmesi için otomatik test ekleniyor.
- Fresh plan exact JSON stringini ve grup provenance metadata'sını döndürmeli; Part snapshot değişırsa stale, result/json=null ve Part ID tanısı olmalı. Orijinal kayıt metadata'sı korunur.
- Runtime, frontend, adapter/benchmark, workflow, package/lockfile veya secrets değişikliği hedeflenmiyor.
- Commit ve CI/QA sonuçları doğrulama tamamlandığında kaydedilecek.


## 19 Kasım 2026 09:25 TRT — DOM-047 legacy kalınlık uyumluluğu test genişletmesi (Actions bekliyor)

- Mevcut kitaplık domain motorunda grup bazlı kalınlık override ve exact katalog doğrulaması zaten vardı; task board READY durumu uygulamanın gerisinde kalmıştı.
- Ek regresyon testi, panelThicknessMmByGroup olmadan legacy ortak 18 mm kalınlığın tüm üretilen parçalarda korunmasını ve yalnız top/shelf override verilen grupların 25/16 mm olarak, exact katalog materialId ile çözülmesini doğrular.
- Değişen dosya: domain/production/bookshelfConstruction.test.mjs; runtime üretim kodu değiştirilmedi.
- Test/CI sonucu commit sonrası bekleniyor.

## 19 Kasım 2026 09:25 TRT — DOM-047 doğrulama tamamlandı

- Kitaplık domain motorunda panel grubu kalınlık override'ları, exact katalog kalınlığı kontrolü ve legacy ortak kalınlık fallback'i mevcut. Test genişletmesi, override edilmeyen panellerin 18 mm ortak kalınlığını; üst panel 25 mm ve raf 16 mm override'larının exact katalog materialId ile çözülmesini doğruladı.
- Kod/test commit'i: [6d0e197](https://github.com/Taylan789/MobilyaCAD/commit/6d0e19760fb6795ebcb536327d07adb4c2b15715).
- CI [#44472503403](https://github.com/Taylan789/MobilyaCAD/actions/runs/44472503403), QA [#44472503395](https://github.com/Taylan789/MobilyaCAD/actions/runs/44472503395) başarılı — 124/124 frontend + 404/404 domain test, shared-domain strict TypeScript, lint, frontend TypeScript/production build ve production dependency audit 0 vulnerability. Pages [#44472503550](https://github.com/Taylan789/MobilyaCAD/actions/runs/44472503550) başarılı.
- Runtime domain kaynak kodu değişmedi; frontend, adapter/benchmark, workflow, package/lockfile veya secrets değiştirilmedi. CNC/atölye doğrulaması kapsam dışıdır.
- Sıradaki: DOM-048 — proje kenar bandı Part atamalarının validation, diagnostics ve export blocker testleri.

## 19 Kasım 2026 14:16 TRT — DOM-052 edge-band assignment kesim planı freshness (Actions doğrulandı)

- Gerçek `calculateCabinetProjectProductionWithDiagnostics` agregatöründen kenar bandı atamalı Part üretildi; JSON v3 kesim planı, kullanıcı levha kaynağı/revizyon provenance metadata'sıyla kaydedildi.
- Aynı atama fresh kalır. Edge-band katalog ID değişimi, mm/m birim değişimi veya atamanın kaldırılması tam Part snapshot'ını değiştirir; freshness `stale`, `result/json=null`, Part ID tanısı verir. Orijinal v3 metadata korunur.
- JSON v1/CSV export adapter edge-band atama alanlarını henüz kayıpsız taşımadığından gerçek üretim raporu `canExport=false` kalır; export kapısı kaynak blocker'ı `productionDiagnostics` içinde korur ve JSON üretmez.
- Test commit: [0247ad1](https://github.com/Taylan789/MobilyaCAD/commit/0247ad19603965bc5c32881b0bc9b2ff30e7d164). CI [#44513172692], QA [#44513172630], Pages [#44513172814] başarılı — 124 frontend + 416 domain; strict TS, lint 32 uyarı/0 hata, production build ve audit 0 vulnerability.
- Sıradaki: DOM-053 — Part'ın dört fiziksel kenarı için ayrı edge-band assignment ve legacy Part-level fallback.


## 19 Kasım 2026 15:56 TRT — DOM-053 yönsel kenar bandı atamaları (çalışıyor)

- edgeBandingAssignments v1 girdisine opsiyonel edge yönü ekleniyor: top / bottom / left / right.
- Eski Part-level assignment tekil default/fallback olarak korunur; aynı Part'ta yönsel override'lar farklı katalog ID/birim taşır. Yön, Part dış kenarı veya cutout edge flag'iyle desteklenmiyorsa; duplicate, unknown yön veya unknown Part varsa bütün rapor blocked/null olur.
- Per-edge consumption/pricing DOM-054; JSON persistence/export extension DOM-055. Bu dilimde üretim dışa aktarıcıları per-edge alanını kayıpsız desteklemediğinden export blocker korunur.


## 19 Kasım 2026 15:56 TRT — DOM-053 tamamlandı

- Per-edge edge-band assignments domain modeli eklendi; Part-level legacy atama fallback olarak korunurken top/bottom/left/right override'ları ayrı edgeBandingByEdge alanında exact katalog ID ve mm/m birim taşır.
- Dört yönlü atama, legacy fallback + override, duplicate edge, unknown edge ve banded olmayan edge validation otomatik testlerle doğrulandı. Eksik yön/duplicate/invalid girişler tüm proje raporunu blocked/null tutar. Export blocker korunur.
- Kod commit [9df2b61](https://github.com/Taylan789/MobilyaCAD/commit/9df2b619e25952350a7f146608b7e144546852a6). CI [#44529826346](https://github.com/Taylan789/MobilyaCAD/actions/runs/44529826346) ve QA [#44529826191](https://github.com/Taylan789/MobilyaCAD/actions/runs/44529826191) başarılı — 124 frontend + 420 domain; strict TS/lint/build/audit geçti, 0 vulnerability. Pages [#44529826320](https://github.com/Taylan789/MobilyaCAD/actions/runs/44529826320) başarılı.
- DOM-054 tamamlandı: edge başına tüketim/fiyat satırları yön, exact katalog ID/birim, quantity, edgeCount ve Part kaynaklarını korur; eksik veya birim uyuşmaz fiyat fail-closed.
- Sıradaki DOM-057: quote revision directional edge-band cost snapshot, exact unit ve Part provenance.


## 19 Kasım 2026 16:57 TRT — DOM-054 yönsel kenar bandı tüketimi ve fiyatlandırması (Actions doğrulandı)

- `projectMaterialSummary.ts` yönsel `edgeBandingByEdge` alanını strict doğrular; her edge için gerçek outer/cutout kenar uzunluğu ve adet ağırlıklı edgeCount hesaplar. Açık yönler override katalog kimliği/birimiyle ayrı gruplara ayrılır; legacy Part-level atama, override edilmeyen kenarlara fallback olarak tek toplam grubu korur.
- `projectPricedConsumption.ts` yönü maliyet satırı açıklamasına ve missing-price/unit-mismatch tanısına taşır. Fiyat eşleşmesi yalnız exact katalog ID + mm/m biriminden yapılır; toplam tüm fiyatlar tamamlanmadıkça null kalır. Her satır Part provenance listesiyle ilişkilendirilir.
- Testler: mixed edge/fallback quantity, edgeCount, mm/m dönüşümü, cutout edge ölçüsü, geçersiz direction/ID/unit/unknown field, exact fiyat ve missing-price fail-closed.
- Kod/test commit: [fa74ba7](https://github.com/Taylan789/MobilyaCAD/commit/fa74ba7ed58140d0fd4d2122985acfeea44bd8c8). CI [#44540071025](https://github.com/Taylan789/MobilyaCAD/actions/runs/44540071025), QA [#44540070904](https://github.com/Taylan789/MobilyaCAD/actions/runs/44540070904) başarılı — **124/124 frontend + 424/424 domain test**, strict TypeScript, lint **32 uyarı / 0 hata**, production build ve audit **0 vulnerability**. Pages [#44540071001](https://github.com/Taylan789/MobilyaCAD/actions/runs/44540071001) başarılı.
- UI, adapter/export, CNC standardı, gerçek katalog fiyatı, workflow, package/lockfile ve secrets değiştirilmedi. Per-edge export/persistence mevcut JSON v1/CSV adapter'ları tarafından henüz kayıpsız desteklenmediğinden export blocker korunur; fiziksel üretim doğrulaması yapılmadı.
- Sıradaki: DOM-057 — directional edge-band quote revision cost snapshot/provenance.


## 19 Kasım 2026 18:13 TRT — DOM-056 directional edge-band freshness (Actions doğrulandı)

- İki otomatik regresyon eklendi: saved v3 Part snapshot'ında per-edge katalog ID, mm/m unit ve assignment removal değişiklikleri stale/null JSON üretir; aynı atamalar fresh kalır. İkinci test, directional assignment'ların export blocker ve kaynak tanılarını koruduğunu doğrular.
- Test commit [77e6532](https://github.com/Taylan789/MobilyaCAD/commit/77e653291c7986258675bf0b7d3af6ffdc0ee6fe). [CI #44552227836](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227836), [QA #44552227917](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227917) ve [Pages #44552227834](https://github.com/Taylan789/MobilyaCAD/actions/runs/44552227834) başarılı; 124 frontend + 434 domain test, lint 32 warning/0 error, strict TypeScript, production build ve production audit 0 vulnerability.
- Runtime domain kodu değişmedi; mevcut full-Part snapshot davranışı testle güvenceye alındı. JSON v1/CSV directional export hâlâ desteklenmediği için güvenli blocker korunur. Fiziksel CNC/atölye doğrulaması yapılmadı.
- Sıradaki: DOM-057 — teklif revizyonunda yön, exact edge-band ID/unit ve kaynak Part provenance.


## 19 Kasım 2026 19:36 TRT — DOM-057 teklif revizyonu yönsel kenar bandı doğrulaması (DONE)

- DOM-057 [test commit 8fe1fb0](https://github.com/Taylan789/MobilyaCAD/commit/8fe1fb0d064797af528c4d2170b785801cfedf41) ile tamamlandı. Aynı katalog kimliği için üst kenar `m`, sağ kenar `mm` fiyat satırları; teklif snapshot ve immutable revision JSON round-trip'inde yön açıklaması, exact unit, birim fiyat, fiyat kaynağı ve Part ID'lerini koruyor.
- Actions: [CI #44569030384](https://github.com/Taylan789/MobilyaCAD/actions/runs/44569030384) success; [QA #44569030417](https://github.com/Taylan789/MobilyaCAD/actions/runs/44569030417) success — 124/124 frontend + 435/435 domain, 0 fail; strict domain TypeScript, lint 32 warning/0 error, production build ve production dependency audit 0 vulnerability; [Pages #44569030375](https://github.com/Taylan789/MobilyaCAD/actions/runs/44569030375) successful.
- Runtime kodu değişmedi; mevcut snapshot şemasında direction line description içindedir, ayrı structured edge field değildir. Frontend ve adapter sahipliği korunur; JSON v1/CSV directional export hâlâ fail-closed. Fiziksel CNC/atölye doğrulaması yapılmadı.
- Sıradaki 3 küçük görev: DOM-058 READY — project JSON v2 quote-history extension round-trip ve legacy v1 blocker; DOM-059 PLANNED — revision comparison directional edge-band line delta; DOM-060 PLANNED — source-line/Part provenance strict integrity regressions.


## DOM-058 — Directional edge-band quote revision persistence (19 Kasım 2026)

- Domain project-file APIs already append/read quoteRevisionHistory on project JSON v2 (projectId required) with history schemaVersion 1; DOM-058 adds acceptance coverage for directional edge-band revisions rather than duplicate runtime persistence code.
- The round-trip preserves direction labels in cost-line descriptions, exact m/mm unit, quantity, unit price, source reference, and source Part IDs. Snapshot remains immutable after reading.
- Project JSON v1 stays legacy and append is blocked. Unsupported history versions and unknown snapshot fields block reads/appends with no partial project result.
- Test-only change: domain/production/projectEdgeBandingQuoteRevisionProjectFile.test.mjs. First attempt [6127f4c](https://github.com/Taylan789/MobilyaCAD/commit/6127f4c1dbce0fa4887797130d2eb0780958b504) failed QA because the append API requires the compact revision input, not a complete revision; corrected [ffc89fd](https://github.com/Taylan789/MobilyaCAD/commit/ffc89fd657fb932d88b40452627f905667406df4) without weakening checks.
- Actions on the corrected commit: CI [#44576735505](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735505) success; QA [#44576735471](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735471) success — 124 frontend + 438 domain tests, 0 fail, strict domain TypeScript, lint 32 warning/0 error, production build and audit 0 vulnerabilities; Pages [#44576735561](https://github.com/Taylan789/MobilyaCAD/actions/runs/44576735561) success.
- Known boundary: project-file API round-trip is domain-level; frontend project import/export integration is not claimed. Direction remains encoded in quote-line description rather than a separate machine-readable field; CNC and workshop validation are not covered.

### Next domain slices
1. DOM-061 DONE — structured edge direction through consumption, quote summaries and revision snapshots; legacy v1 descriptions remain supported.
2. DOM-062 DONE — revision comparison JSON export contract, exact line deltas/currency/source, no unit conversion.
3. DOM-063 DONE — stable quote comparison CSV v1 serializer/parser with RFC 4180 escaping.
4. DOM-064 DONE — explicit waste/profit provenance and source IDs/references verified through project-history JSON v2.
5. DOM-065 DONE — revision comparator and JSON/CSV round-trip for adjustment-line provenance.
6. DOM-066 PLANNED — frontend-owned revision-comparison download wiring; not this branch's file ownership.
7. DOM-067 DONE — strict material-consumption JSON v1; Actions verified.
8. DOM-068 DONE — strict directional edge-band consumption JSON v1; Actions verified (124 frontend + 468 domain tests; strict TS/build/audit).
9. DOM-069 DONE — strict directional edge-band consumption CSV v1 verified by CI/QA/Pages.
10. DOM-070 IN_PROGRESS — configurable edge-band purchase cost with explicit user prices and roll/waste inputs; no inferred price or yield.

## 19 Kasım 2026 21:21 TRT — DOM-059 teklif revizyon satır karşılaştırması

- `compareProjectQuoteRevisions` artık toplam/kategori farklarına ek olarak `lineChanges` döndürür. Maliyet satırı kimlikleri değişken olabileceğinden eşleşme line ID yerine exact sourceType/sourceId, category, description, unit, tariffId ve sorted sourcePartIds tuple'ına dayanır.
- Yön açıklaması ve birim değişiklikleri birim dönüştürmeden ayrı added/removed; miktar, birim fiyat, satır toplamı ve fiyat kaynağı değişiklikleri matched line üzerinde changed olarak gösterilir. Kaynak Part ID değişikliği ayrı added/removed olur.
- DOM-060: quote history source-line/Part provenance integrity. DOM-061: description parsing bağımlılığını azaltan structured direction metadata, backward-compatible strict schema.


## DOM-059 Actions correction note — 19 Kasım 2026

- İlk kod commit'inde CI ve Pages başarılı, domain testleri 439/439 başarılı; QA strict TypeScript `ProjectQuoteLineSource` readonly-array uyumsuzluğu nedeniyle fail oldu. Kaynak parametresi DeepReadonly ile düzeltildi; final doğrulama pending.


## DOM-059 final verification — 19 Kasım 2026

- [Fix commit 95eeb4c](https://github.com/Taylan789/MobilyaCAD/commit/95eeb4c1f8a34922100fc29d3a96f0d0ebfc51e8) passed [CI #44588617458](https://github.com/Taylan789/MobilyaCAD/actions/runs/44588617458), [QA #44588617424](https://github.com/Taylan789/MobilyaCAD/actions/runs/44588617424) (124 frontend + 439 domain tests, strict TypeScript, lint, build, production audit 0 high vulnerabilities), and [Pages #44588617414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44588617414).
- Initial QA failure was only a readonly source-mapping type mismatch; the corrected type was verified on the final SHA. No manual test was requested or needed.


## DOM-060 — Quote revision source integrity (19 Kasım 2026, verified)
- Code: [0bfffef](https://github.com/Taylan789/MobilyaCAD/commit/0bfffefdb792f6b50f5d2a388609193a8421a479), [legacy compatibility fix e7bd921](https://github.com/Taylan789/MobilyaCAD/commit/e7bd92181da5b6c6c254a3da8795e2e304a1e04e), [strict marker type fix 8ba9115](https://github.com/Taylan789/MobilyaCAD/commit/8ba9115ceb127d9b9d461f5f5b5a90912f9156f4).
- New strict revisions carry `sourceIntegrityVersion: 1`; cost-line mapping, source identity uniqueness, source-type/category alignment and material Part provenance are enforced. Hardware can remain furniture-scoped. Append API always creates strict revisions.
- Legacy v1 revisions/direct create calls without the marker retain prior validation. This was preserved after two QA failures: first 441/443 tests due legacy fixture expectations, then 443/443 tests but strict TypeScript TS2322. The marker type was narrowed and verified.
- Final [CI #44597253393](https://github.com/Taylan789/MobilyaCAD/actions/runs/44597253393) and [QA #44597251224](https://github.com/Taylan789/MobilyaCAD/actions/runs/44597251224) succeeded: **124/124 frontend + 443/443 domain tests, strict TypeScript, lint (32 warnings/0 errors), production build and production audit (0 vulnerabilities)**. Local tests were unavailable because the container could not resolve github.com.
- UI/project import-export adapter and physical CNC/workshop validation remain outside this slice.
- Next: DOM-061 READY — structured edge direction metadata without description parsing.


## 19 Kasım 2026 23:08 TRT — DOM-061 tamamlandı

- Kod/test commit: [1ef583d](https://github.com/Taylan789/MobilyaCAD/commit/1ef583d6a1b52d257c4a3879b58ebe913f2d5bb1). Structured `edgeDirection` artık per-edge tüketim fiyatından teklif satırı ve immutable revizyon JSON round-trip'ine taşınır; karşılaştırmada yön, açıklama metni yerine kimlik olarak kullanılır.
- CI [#44606647153](https://github.com/Taylan789/MobilyaCAD/actions/runs/44606647153) success; QA [#44606647019](https://github.com/Taylan789/MobilyaCAD/actions/runs/44606647019) success — 124 frontend + 446 domain tests, strict domain TS, lint (32 warning/0 error), build ve production audit 0 vulnerability. Pages [#44606646888](https://github.com/Taylan789/MobilyaCAD/actions/runs/44606646888) successful.
- Bilinen sınırlar: UI adapter/CNC/atölye fiziksel doğrulaması ayrı; yön sadece explicit edge-banding satırlarında, legacy v1 kayıtları migrate edilmez.


## 20 Kasım 2026 — DOM-062 teklif karşılaştırması JSON sözleşmesi

- **Durum:** DONE — [kod c5491e4](https://github.com/Taylan789/MobilyaCAD/commit/c5491e47bdc79f2cf9afa2cc86138e8c48a06034), [düzeltme e4dcc985](https://github.com/Taylan789/MobilyaCAD/commit/e4dcc98599196f984cd0ff1b19171ff3f23967e5). CI [#44632874056](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874056), QA [#44632874051](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874051) ve Pages [#44632874042](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874042) başarılı — 124 frontend + 451 domain test, strict TypeScript/lint/build, production audit 0 vulnerability.
- **Teslim:** `mobilyacad-quote-revision-comparison` v1 strict JSON zarfı; hazır revision comparison sonuçlarını exact currency, unit, line delta, source metadata, Part ID, tariff ve structured edge direction ile serileştirir/parses.
- **Fail-closed:** unsupported fields/version, malformed JSON, blocked input, satır toplamı/quantity-price uyuşmazlığı, kategori/genel delta tutarsızlığı veya line-change shape hatasında kısmi JSON döndürmez.
- **Kabul:** domain otomatik test round-trip, metadata ve mm/m ayrımını; tam kategori ve grand-total delta tutarlılığını doğrular. Fiziksel üretim veya frontend dosya indirme entegrasyonu iddia edilmez.
- **Sonraki 3 dilim:** DOM-064 DONE — waste/profit provenance project JSON v2 history round-trip verified; DOM-065 DONE — comparison JSON/CSV adjustment-line provenance and delta reconciliation verified; DOM-066 planned — frontend-owned revision-comparison download wiring.


## Next 5 small tasks

1. **DOM-120 VERIFIED** — independent mixed-stock project cut-plan area-summary reconciliation; [test commit 31ca52de](https://github.com/Taylan789/MobilyaCAD/commit/31ca52de6334d4f36b0b37e7594d20affde91c16), exact-SHA CI/QA/Pages successful (172 frontend + 649 domain tests).
2. **DOM-121 VERIFIED** — canonical Part-snapshot provenance for mixed-family material/edge-band summaries, including source-order invariance; [CI #45090552662](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552662), [QA #45090552670](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552670), [Pages #45090552717](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552717) successful (172 frontend + 650 domain; strict TS, lint, build, audit).
3. **DOM-122 READY** — quote-cost totals reconcile against priced-consumption and labor/operation source lines.
4. **INT-001 FRONTEND-OWNED** — domain/export contract and download-adapter wiring; product agent does not edit frontend.
5. **INT-002/PERF-001 SPECIALIST-OWNED** — adapter round-trip and measured CAD profiling; QA-003 stays blocked until integration evidence.

## 10/10 ölçülebilir kalite kapıları (20 Kasım 2026 baseline)

Kanıtı bulunmayan ölçüm **NOT MEASURED** kalır; checklist tamamlanmadan ürün 10/10 kabul edilmez.

| Alan | 10/10 kabul ölçütü | Baseline / durum |
|---|---|---|
| CAD Core | Geometri/transform/snap/seçim/undo-redo/save-load için deterministik test; 2D ve 3D aynı mm kaynak verisini kullanır | Temel 3D yerleşim ve transform var; tam 2D çizim, snap, undo-redo ve senkron contract eksik |
| Üretim | Her Part için kaynak ID, quantity, mm ölçü, malzeme/kalınlık; unsupported geometri/export kısmi sonuç üretmeden blocker | Domain konstrüksiyon, tüketim, nesting freshness, teklif/revizyon ve JSON/CSV sözleşmeleri var; frontend adapter/CNC postprocessor eksik |
| UX | Ana akışlarda işlevsel kontroller; klavye/focus, erişilebilirlik, responsive, boş/hata durumları otomatik doğrulanır | Frontend ayrı ajan alanında; gerçek tarayıcı görsel kabulü NOT MEASURED |
| Performans | Referans sahnede p95 frame-time hedefi 16,7 ms (60 FPS), scene update p95 <100 ms, bellek ölçümü ve CI regression threshold | Referans sahne/benchmark NOT MEASURED; bu kontrolde aktif Integration/Performance run veya PR bulunmadı; PERF-001 ve INT-002 READY, QA-003 INT-001/INT-002'ye bağlı |
| Güvenilirlik | Strict TS, test, build, audit; import/export round-trip 0 alan kaybı; invalid input 0 partial output | Latest verified SHA [ae76e538](https://github.com/Taylan789/MobilyaCAD/commit/ae76e538fcbd1aa60b22a5d42c602b04e58e4d42): CI [#45576697914](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697914), QA [#45576697866](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697866), Pages [#45576697868](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697868) all passed; QA 283/283 frontend + 763/763 domain, strict shared-domain TS, lint 36 warnings/0 errors, production build and audit 0 vulnerabilities. Vite still warns the main JS chunk is 1.698 MB (475 kB gzip); viewport p95 and memory remain NOT MEASURED. Overall 10/10 gate remains unchecked. |
| Edge-band export | Direction, catalog ID, mm/m, Part/furniture provenance and strict JSON round-trip; malformed/unsupported input blocked | DOM-068 verified: 124 frontend + 468 domain tests, strict type-check, build and audit; see Actions |


## DOM-063 — Teklif revizyon karşılaştırması CSV v1 (20 Kasım 2026, verified)

- `domain/production/projectQuoteRevisionComparisonCsv.ts` sabit kolon sıralı CSV v1 serializer/parser sağlar. Proje/revizyon/para birimi/toplam metadata, genel toplam satırı, altı kategori delta satırı ve satır farkları ayrı rowType değerleriyle taşınır; metadata tüm satırlarda aynı karşılaştırmaya bağlıdır.
- Satır farkları added/removed/changed için from/to alanlarıyla açıklama, quantity, exact unit, unitPriceMinor, lineTotalMinor, currency, sourceReference, sourceType/sourceId, tariffId, sorted sourcePartIds ve edgeDirection (varsa) saklar. mm↔m dönüşümü veya fiyat/kur tahmini yapılmaz.
- CSV bütün alanları çift tırnak içine alır, iç tırnakları ikiye katlar ve CRLF satır sonu kullanır; UTF-8 BOM Excel/Türkçe karakter uyumluluğu için eklenir. Parser exact header/version/row order/row shape/meta consistency ve domain toplam doğrulaması yapar. 5 MB ve 10.000 line-change sınırı vardır.
- Kabul testleri round-trip, Türkçe/virgül/quote/embedded CRLF, mm/m ayrımı, optional metadata, empty comparison, malformed CSV, unknown header ve tutarsız kategori toplamlarını kapsar.
- Final Actions [CI #44646343900](https://github.com/Taylan789/MobilyaCAD/actions/runs/44646343900), [QA #44646343994](https://github.com/Taylan789/MobilyaCAD/actions/runs/44646343994), [Pages #44646343887](https://github.com/Taylan789/MobilyaCAD/actions/runs/44646343887) başarılı. QA: 124/124 frontend + 457/457 domain; strict TS, lint (32 warning/0 error), production build ve audit (0 vulnerability).
- **Boundary:** domain contract only; frontend download adapter/UI wiring is not implemented. CNC/physical workshop validation is not implied.


### DOM-064 — verified project-history provenance (20 November 2026)

- Test commit [dc16d4e](https://github.com/Taylan789/MobilyaCAD/commit/dc16d4ee0562f38149f7ed4920e3502dd30b16d2) adds explicit waste + profit fixture and project JSON v2 append/read assertions for category, source type/ID/reference, quantity, unit, unit price, line total, and category/grand totals.
- Actions: [CI #44656515213](https://github.com/Taylan789/MobilyaCAD/actions/runs/44656515213), [QA #44656515208](https://github.com/Taylan789/MobilyaCAD/actions/runs/44656515208), and [Pages #44656515137](https://github.com/Taylan789/MobilyaCAD/actions/runs/44656515137) passed. QA: 124 frontend + 458 domain tests; strict TS, lint (32 warnings/0 errors), production build and production audit (0 vulnerabilities).
- Next domain task: DOM-065 — comparison JSON/CSV adjustment-line provenance round-trip. No UI adapter or physical CNC/workshop validation is implied.

## DOM-065 — Revision-comparison adjustment-line provenance (20 November 2026, verified)

- Test commit [58cd6aa](https://github.com/Taylan789/MobilyaCAD/commit/58cd6aa1588341a9a9df124c6dd81627c93e8b90) covers actual revision comparison plus JSON/CSV v1 round-trip for waste/profit added, removed, and changed adjustment lines. Exact source IDs/references, units, currency and line totals are preserved; waste delta +125, profit +200, grand delta +325 minor currency units.
- CI [#44661291150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291150), QA [#44661291069](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291069) and Pages [#44661291112](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291112) successful. QA: 124/124 frontend + 459/459 domain, strict domain TS, lint 32 warnings/0 errors, build and production audit 0 vulnerabilities.
- Boundary: frontend download controls remain DOM-066; no inferred rate, unit/currency conversion, CNC or physical workshop validation.


## DOM-067 — Material consumption summary JSON v1 (Actions pending)

- `domain/production/projectMaterialSummaryFile.ts` adds a strict versioned JSON envelope for the calculated material groups, preserving catalog identity, thickness, sorted Part IDs, line count, quantity, net area/volume and edge-banding totals with explicit units.
- Serializer/parser validate group and Part uniqueness, canonical ordering, quantity/line count, area/thickness/volume consistency, edge-banding directional sum and supported units; malformed/unknown fields, unsupported version and oversized input fail closed.
- Empty summaries and legacy material groups without catalog IDs remain compatible. The JSON is net consumption only; no waste/yield, price, CNC or machine data is inferred. UI download wiring is not implemented.
- Acceptance: domain round-trip, empty/legacy, malformed/unknown/unsupported, duplicate IDs and inconsistent arithmetic are covered in the new test file. GitHub Actions verification is pending.



## DOM-067 — Material consumption summary JSON v1 (verified 20 November 2026)

- Domain serializer/parser: [code commit f491c7de](https://github.com/Taylan789/MobilyaCAD/commit/f491c7de0a2b3289001fdc4a97cab27ea01467cf); [follow-up cbe6f51](https://github.com/Taylan789/MobilyaCAD/commit/cbe6f51e793c0c542bb3e3e1e63ee21e2407f003) corrected parser test inputs and enforces the 10,000-Part cap during validation.
- Strict JSON v1 preserves material identity, thickness, sorted Part IDs, line/quantity totals, net area/volume and edge-band lengths/count with explicit units. Unknown/unsupported fields, versions, unit mismatch, duplicate IDs, arithmetic mismatch and oversized input block without partial output.
- CI [#44672158622](https://github.com/Taylan789/MobilyaCAD/actions/runs/44672158622), QA [#44672158633](https://github.com/Taylan789/MobilyaCAD/actions/runs/44672158633), Pages [#44672158703](https://github.com/Taylan789/MobilyaCAD/actions/runs/44672158703) successful. QA: 124 frontend + 463 domain tests, strict TS, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities.
- Frontend download integration, CSV, waste/yield, price, CNC and workshop validation remain separate. Local tests were not run; Actions is the verification source.


## DOM-068 — Directional edge-band consumption JSON v1 (Actions verified — code commit 0fb6e8b04a11251431cc2379d0c1137da10d72a3)

- Adds strict versioned JSON for measured edge-band demand. Directional groups retain edge, catalog ID, unit (mm/m), mm length, edge count, Part IDs and furniture IDs; legacy unassigned edge-banding remains a null-catalog mm group without an invented direction.
- Exact fields/schema/units, group identity, canonical order, provenance IDs, length/quantity conversion and edge/Part counts are validated. Shared Part IDs across distinct groups are allowed; parser returns no partial output on failure.
- No roll size, waste/yield, price, CNC operation or workshop standard is inferred. Download wiring remains frontend-owned.
- Actions verified on commit 0fb6e8b04a11251431cc2379d0c1137da10d72a3: CI https://github.com/Taylan789/MobilyaCAD/actions/runs/44684106913; QA https://github.com/Taylan789/MobilyaCAD/actions/runs/44684106780; Pages https://github.com/Taylan789/MobilyaCAD/actions/runs/44684106800. Domain tests 468/468, frontend 124/124; strict type-check, build and audit successful. Lint 32 warnings, 0 errors; no local run.


## DOM-069 — Directional edge-band consumption CSV v1 (implementation in progress)
- Acceptance: exact metadata/header contract; one row per measured group; preserves catalog ID, direction, exact mm/m, quantities, mm totals, edge count, sorted Part/furniture provenance; UTF-8 BOM, CRLF, RFC 4180 escaped cells; empty summary supported; malformed, unsupported, inconsistent or oversized input blocks with no partial data.
- The CSV parser delegates arithmetic, canonical order, duplicate and provenance limits to the strict JSON v1 contract to avoid validation drift. No price, roll size, waste/yield or CNC standard is inferred.


## DOM-070A — Explicit edge-band roll quantity planning (Actions verified — 20 November 2026)

- **User flow:** supply measured edge-band consumption, then enter actual roll length per catalog ID and optional fixed waste allowance in mm. Omitted allowance means 0 mm; no percentage or workshop standard is inferred.
- **Acceptance:** groups sharing catalog ID aggregate across directions and mm/m; roll count is ceiling of explicit required length divided by roll length; purchased length and leftover are reported to 0.1 mm; Part/furniture IDs are sorted and deduplicated. Missing definitions are `incomplete`; legacy unassigned groups, invalid inputs and unused specs block the complete plan with no partial results. Empty input remains empty.
- **Boundary:** pure domain calculation only. No UI/download adapter, price per roll, supplier catalog, CNC or physical workshop validation. Existing price-per-meter inputs remain separate.
- **Files:** `domain/production/projectEdgeBandingRollPlan.ts`, its test, QA strict TypeScript list, coordination/progress.
- **Actions:** final implementation SHA `15e126e551462b4229847f28a751f2aa6bc5bd1f`. [CI #537](https://github.com/Taylan789/MobilyaCAD/actions/runs/44688842588), [QA #523](https://github.com/Taylan789/MobilyaCAD/actions/runs/44688842631) and [Pages #364](https://github.com/Taylan789/MobilyaCAD/actions/runs/44688842430) all succeeded: 124/124 frontend + 481/481 domain, strict domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. Earlier fixture failures were corrected without relaxing validation. **Next:** DOM-070C full quote/revision integration without double-counting length-based edge-band consumption; DOM-071 project-file persistence; DOM-066 frontend-owned.


## DOM-070B — Per-roll edge-band purchase cost summary (Actions verified — 20 November 2026)

- Code/fix commit [8ad209d](https://github.com/Taylan789/MobilyaCAD/commit/8ad209d30b35dc48bea2f35c4f449126018c7963) adds a strict roll-cost summary using explicit per-roll price, rulo unit, currency and optional price/roll-spec source references.
- One deterministic material line is generated per catalog ID from the purchased roll count, not consumed meters. The source map retains catalog ID, roll count, roll length, purchased length, Part/furniture IDs and plan/price provenance.
- Missing prices produce incomplete with no monetary summary. Mixed currency, unused/duplicate prices, unsupported fields, invalid IDs/source references and inconsistent roll arithmetic block the full result. Explicit zero prices are allowed; no price/currency/waste/yield/roll standard is inferred.
- Test coverage: [QA #44697406838](https://github.com/Taylan789/MobilyaCAD/actions/runs/44697406838) 124/124 frontend + 491/491 domain tests, 0 failures; strict shared-domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. [CI #44697406818](https://github.com/Taylan789/MobilyaCAD/actions/runs/44697406818) and [Pages #44697406803](https://github.com/Taylan789/MobilyaCAD/actions/runs/44697406803) also succeeded.
- Boundary: quote-ready material cost summary only; full quote/revision snapshot integration and project JSON persistence are not implemented.
- Next: DOM-070C full quote integration with explicit pricing mode and no double-counting; DOM-071 roll plan/price project-file persistence; DOM-072 quote-revision provenance. DOM-066 remains frontend-owned.

## 20 Kasım 2026 13:30 TRT — DOM-070C önkoşulu: rulo adedi hata tanısı

- QA Run #542, SHA `3aeddf19c23b707debf92a0f11495f8d0a97fadf` üzerinde 493 domain testinden 492'si geçti; yalnızca mevcut minimum-rulo-adedi regresyon testi, doğrulamanın doğru bloklamasına rağmen genel aritmetik hata mesajını beklenen açık tanıyla eşleştiremedi.
- Düzeltme: gereken uzunluk tutarlılığı, minimum tam rulo adedi ve satın alınan uzunluk güvenli sayı sınırı ayrı kontroller/diagnostics olarak ayrıştırıldı. Rulo sayısı veya hesap kuralları gevşetilmedi; mevcut testin beklediği açık hata mesajı sağlandı.
- Kapsam: yalnızca domain/production hesap modülü, koordinasyon ve roadmap. Frontend, adapter/performance dosyaları değişmedi. Actions doğrulaması bu commit için bekleniyor.
- Sonraki: DOM-070C phase 2 — açık uzunluk/rulo fiyatlama modu, rulo alım satırlarının metre bazlı satırları değiştirmesi (çift sayım olmaması), tek para birimi ve kaynak/Part bütünlüğü.

\n## DOM-070C phase 2 — birleşik teklif rulo fiyatlama modu (Actions verified)\n\n- `calculateProjectQuoteSummary` için altıncı `options` parametresi; mevcut `length` varsayılanı geriye dönük uyumludur.\n- `roll` modunda kenar bandı uzunluk fiyatları baz tüketim özetinden çıkarılır; plan, aynı üretim raporunun kenar bandı tüketiminden ve kullanıcı rulo ölçülerinden üretilir.\n- Rulo fiyat satırları uzunluk satırlarını **yerine** geçer; Part/furniture kimlikleri, rulo adedi/uzunluğu, satın alınan uzunluk ve plan/fiyat kaynak referansları metadata olarak taşınır.\n- Eksik rulo ölçüsü/fiyatı, yanlış seçenekler ve para birimi uyuşmazlığı partial total oluşturmaz.\n- Otomatik doğrulama: CI #44726936464, QA #44726936496 (124 frontend + 497 domain), Pages #44726936449 başarılı; snapshot/revision JSON round-trip henüz bu dilimde değil.\n
## DOM-071 — Roll inputs project JSON persistence (Actions pending)

- Adds strict v2 project-file persistence for roll-length/fixed-waste inputs and per-roll price, currency, and source references under `edgeBandingRollPricing` schema v1.
- Read/write are immutable; tables are independently capped at 1,000 entries, IDs must be unique, and canonical order is by catalog ID. Invalid data fails closed.
- Missing extension reads as empty; clearing inputs removes the extension; malformed saved data cannot be silently overwritten. Project JSON v1 stays legacy/read-only.
- Acceptance tests cover round-trip, update/clear, sorting, source preservation, invalid IDs/units/amounts/references, duplicates, schema/unknown fields, limits, malformed saved data, immutability, and unrelated extension preservation.
- Actions are pending; frontend, adapter/performance, and machine-specific output files are untouched.
## DOM-071 — Roll-input project JSON v2 persistence (verified 20 November 2026)

- `edgeBandingRollPricing` schema v1 stores explicit roll specs (length/fixed allowance/source) and price rows (rulo unit, safe integer price, currency, source) in separate tables.
- Read/write are immutable; unique catalog IDs, unknown fields, invalid units/currency/amounts, 0.1 mm precision, 1,000-row bounds and canonical order are enforced. Empty inputs remove the extension; invalid saved data cannot be overwritten.
- JSON v1 remains legacy read-only. Price-only entries are allowed for later configuration; quote calculation remains responsible for missing/unused input blockers.
- **Actions:** [CI #44744750518](https://github.com/Taylan789/MobilyaCAD/actions/runs/44744750518), [QA #44744750584](https://github.com/Taylan789/MobilyaCAD/actions/runs/44744750584) successful — 124/124 frontend + 518/518 domain tests; strict TypeScript, lint (32 warnings/0 errors), production build, audit 0 vulnerabilities. [Pages #44744750516](https://github.com/Taylan789/MobilyaCAD/actions/runs/44744750516) deployed.
- No frontend, adapter/performance-owned, or machine-specific output files changed. Next: DOM-072 revision-comparison roll-line provenance; DOM-073 standalone quote-summary JSON; DOM-066 remains frontend-owned.

## DOM-072 — Roll purchase provenance in immutable revision comparisons (implementation; Actions pending)

- Quote revision snapshots now carry roll count, roll length, purchased length, furniture provenance and plan/price source references. Comparison identity/value reconciliation distinguishes source metadata changes while preserving exact price/currency/quantity units.
- Strict comparison JSON v1 retains existing optional metadata for non-roll lines. CSV export is v2 with structured roll fields and a legacy v1 parser; rulo lines must reconcile quantity/count and purchased length, and require sorted unique Part/furniture IDs.
- Acceptance: actual immutable revision comparison, JSON/CSV round-trip, malformed metadata rejection and legacy CSV v1 read. No physical CNC/workshop validation is implied. Actions pending.
- Next: DOM-074 per-roll quote-cost CSV; DOM-066 and INT-001/INT-002 remain separate agent-owned tasks.


## DOM-072 — Roll purchase provenance in immutable revision comparisons (verified 20 Nov 2026)

- Revision comparison snapshots retain roll count, roll length, purchased length, furniture IDs, plan source and price source references. Metadata changes participate in comparison values; furniture provenance participates in identity.
- Strict comparison JSON v1 remains backward compatible for ordinary lines. CSV output is v2 with structured roll columns and a v1 legacy parser. Roll quantities/lengths are reconciled at 0.1 mm precision; incomplete/incorrect source metadata blocks export.
- Tests: actual immutable revision comparison and JSON round-trip, CSV roll round-trip, invalid roll metadata blocker, and legacy CSV v1 parsing. No physical CNC validation implied.
- Implementation commits: 82998fe2fc5f98d7a1853d2f824fd3a0a4b759a5, b1b9b47fd1c2102ab7aacbfabb1ea0968366fc51, 5016a7966166ac83505183a2a95bb190fd6e9bfd. QA/Actions on the final SHA are pending.


## DOM-073 — Strict current project quote-summary JSON v1 (verified 20 November 2026)

- **Code SHA:** [4180cced](https://github.com/Taylan789/MobilyaCAD/commit/4180ccedd7e7e075afb5e4cbcff7812ec8e168c8). A standalone strict JSON envelope carries only a complete `ready` quote or a genuinely `empty` summary; `incomplete` and `blocked` states never emit JSON or partial totals.
- **Contract:** exact envelope keys and version; explicit monetary minor-unit and roll-length mm units; each cost line retains its exact unit, quantity, currency, source reference and line total. Roll metadata retains count, roll/purchased lengths, Part/furniture IDs, plan and price source references.
- **Validation:** import revalidates cost lines through the existing cost engine and reconciles line totals, currency, category totals, grand total and source mapping. Unknown fields, malformed/oversized files, unsorted/duplicate provenance and inconsistent roll arithmetic are rejected. JSON cap is 5 MB; line/provenance caps are bounded.
- **Files:** `domain/production/projectQuoteSummaryFile.ts`, `domain/production/projectQuoteSummaryFile.test.mjs`, and QA strict shared-domain type-check list. No frontend, adapter/performance-owned, or machine-specific output files changed.
- **Actions:** CI [#44762193235](https://github.com/Taylan789/MobilyaCAD/actions/runs/44762193235) success; QA [#44762193376](https://github.com/Taylan789/MobilyaCAD/actions/runs/44762193376) success — 124/124 frontend + 536/536 domain tests, strict type-check, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities; Pages [#44762193338](https://github.com/Taylan789/MobilyaCAD/actions/runs/44762193338) success.
- **Boundary:** standalone JSON contract only; frontend download/import wiring is not implemented. Currency conversion, pricing, CNC standards and physical workshop validation are not inferred.
- **Next:** DOM-074 strict per-roll edge-band quote-cost CSV; DOM-066 remains frontend-owned.


## DOM-074 — Per-roll edge-band quote-cost CSV v1 (Actions verified)

- A new strict CSV v1 contract exports only complete per-roll cost summaries or truly empty summaries. Incomplete/blocked totals never produce a partial file.
- Stable quoted columns and row types preserve roll count, explicit unit (rulo), roll length and purchased length in mm, price in smallest currency unit, exact line totals/currency, edge-band catalog ID, Part/furniture provenance and plan/price source references.
- Import recomputes cost line arithmetic and grand total, verifies roll-count × roll-length, row IDs/order, currency, 0.1 mm precision, source arrays and CSV schema/version. Invalid or unsupported rows fail closed.
- CSV uses UTF-8 BOM, CRLF and RFC 4180 quoting; parser cap is 5 MB / 1,000 cost rows. Consumed length and waste allowance are intentionally not invented because the existing quote-cost summary does not expose them.
- Files: `domain/production/projectEdgeBandingRollCostCsv.ts`, `domain/production/projectEdgeBandingRollCostCsv.test.mjs`, QA strict domain type-check list. Frontend files remain untouched.
- Acceptance: 15 automated cases cover ready/empty round-trip, incomplete/blocked, schema/version, totals, roll arithmetic, order/identity, provenance, quoting, immutability and size limits.
- **Verified code SHA:** [ed7a8acd](https://github.com/Taylan789/MobilyaCAD/commit/ed7a8acd749cf7c702500b931a8bd00dd36830d1). [CI #582](https://github.com/Taylan789/MobilyaCAD/actions/runs/44775913609), [QA #582](https://github.com/Taylan789/MobilyaCAD/actions/runs/44775913687) and [Pages #409](https://github.com/Taylan789/MobilyaCAD/actions/runs/44775913803) succeeded. QA: **124/124 frontend + 551/551 domain tests**, strict domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. Local tests were not run.
- **DOM-075 verified:** project quote-summary CSV v1; strict ready/empty round-trip and source mapping. Next is DOM-076 material-consumption CSV; frontend download integration remains UI-owned.


## DOM-075 — Project quote-summary CSV v1 (verified)

- Strict CSV v1 exports only complete `ready` or genuinely `empty` quote summaries. Incomplete/blocked quotes never emit partial totals.
- All six cost categories, exact line units, currency, quantity, unit/minor-unit price, line totals, category totals and grand total are retained; source IDs, Part/furniture provenance, edge direction, tariff, and roll metadata are carried where present.
- Import reconstructs the existing strict quote-summary JSON v1 and reuses its validator/recalculation, so line/category/grand totals, source mappings and roll arithmetic are checked rather than trusted. CSV is BOM + CRLF with RFC 4180 quoting; 5 MB and 10,000-line caps.
- Files: `domain/production/projectQuoteSummaryCsv.ts`, `domain/production/projectQuoteSummaryCsv.test.mjs`, QA strict-domain type-check list and roadmap/progress/coordination. **19 new regression cases**. [Code commit](https://github.com/Taylan789/MobilyaCAD/commit/e6e0e3e24463e2a77e2e37f2206433f1a73b574d). [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/44789821509), [QA](https://github.com/Taylan789/MobilyaCAD/actions/runs/44789821617), [Pages](https://github.com/Taylan789/MobilyaCAD/actions/runs/44789821636) all succeeded. QA: **570/570 domain tests**, strict domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. Frontend unit-test step also passed. Local tests not run.
- No prices, conversions, missing categories, or machine standards are inferred; frontend download/import wiring remains UI-owned.


## DOM-076 — Project material-consumption CSV v1 (DONE; Actions verified)

- Strict CSV v1 preserves material/catalog identity, mm thickness, m2 area, m3 volume, mm directional edge-band totals, Part line count/quantity, Part IDs and furniture IDs.
- Calculated material groups carry sorted furniture provenance. JSON v1 export deliberately omits runtime furniture IDs, keeping its strict legacy schema unchanged; CSV carries the IDs.
- Exact metadata/header, UTF-8 BOM, quoted cells, CRLF, 5 MB and 1,000 group limits; import reuses strict JSON v1 arithmetic/order/ID validation and never returns partial groups.
- Acceptance: CSV round-trip, quoting, empty/legacy files, invalid totals/IDs, wrong version/units/header/numeric fields, truncated/extra rows, immutability and size bounds covered by tests.
- **Verified code commit:** [67d462fa](https://github.com/Taylan789/MobilyaCAD/commit/67d462fa26df55b8f717067d73dd654dd7075d0e). [CI #44793078331](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078331), [QA #44793078386](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078386) and [Pages #44793078458](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078458) succeeded. QA: **579/579 domain tests**, strict domain TS, lint **32 warnings/0 errors**, build and audit **0 vulnerabilities**.
- No price, waste/yield, CNC/machine standard or frontend download wiring is implied. Local Node/TS was unavailable; GitHub Actions is the verification source.
- Next: DOM-077 quote-summary/revision snapshot reconciliation; INT-001/INT-002 and PERF-001 remain separately owned.

### DOM-076 first QA correction — VERIFIED

- First QA [#44792604194](https://github.com/Taylan789/MobilyaCAD/actions/runs/44792604194) exposed 11 failures: missing CSV ID-limit constant and outdated calculated-summary/JSON fixture expectations. These were corrected without relaxing arithmetic or strict validation.
- Correction commit [67d462fa](https://github.com/Taylan789/MobilyaCAD/commit/67d462fa26df55b8f717067d73dd654dd7075d0e) passed [CI #44793078331](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078331), [QA #44793078386](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078386) and [Pages #44793078458](https://github.com/Taylan789/MobilyaCAD/actions/runs/44793078458). QA: 579/579 domain tests, type-check, lint, production build and audit (0 vulnerabilities) all successful.

## Sonraki 5 küçük teslimat

| ID | Sahip | Durum / kabul kriteri | Bağımlılık |
|---|---|---|---|
| DOM-161 | Ürün Geliştirme | VERIFIED — [commit 279067c7](https://github.com/Taylan789/MobilyaCAD/commit/279067c73135e19e36392be76f0fb2ca75e206cc); CI #45563745096, QA #45563745095, Pages #45563745097 successful; 277 frontend + 754 domain tests; exact-SHA test site deployed | DOM-160 |
| INT-003 | Arayüz Tasarımı | OPEN DRAFT [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206) — editor startup/new/save/open must retain v2 envelope and unknown metadata before merge | DOM-151/DOM-152 domain contract |
| DOM-153 | Ürün Geliştirme | PLANNED after INT-003 — append → save → reopen → append preserves revision chain and immutable pricing snapshots | INT-003 |
| INT-001 | Arayüz + Ürün | READY — connect canonical production report to editor and block unsupported geometry export; exact-SHA round-trip/export-block tests | Production-domain contract |
| INT-002 / PERF-001 | Entegrasyon/Performans | READY but specialist execution not verified — adapter round-trip plus measured 2D/3D baseline on isolated branch; do not duplicate owner files | Isolated specialist job/branch |

QA-003 remains blocked until INT-001 and INT-002 evidence exists. The Integration/Performance workflow job is currently disabled; no specialist branch or PR is verified, so no agent delivery is claimed.

## DOM-115 — Blocked mixed-family provenance reconciliation (VERIFIED 22 November 2026)

- Cross-consumer regression compares the blocked mixed-family material-conflict source Part/furniture IDs against isolated valid material summaries and a validated full Part snapshot. The blocked combined report must not expose a partial `result` or `projectPartSnapshot`.
- Previous QA attempts [#45051528277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528277) and [#45055923801](https://github.com/Taylan789/MobilyaCAD/actions/runs/45055923801) exposed assertion-only wording/duplicate-flattening mistakes (640 domain tests passed each, one test assertion failed). Final test commit [d04b156](https://github.com/Taylan789/MobilyaCAD/commit/d04b156fdb49ff742659194cda3938df4c607fa1) compares unique source Part IDs and verifies full source coverage per conflict diagnostic. Exact-SHA CI [#45056168193], QA [#45056168306] and Pages [#45056168182] succeeded: 165 frontend + 641 domain tests, strict TS, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities; test site deployed.
- Next: DOM-116 selected/excluded Part snapshot and material/thickness source-group consistency.

**Parallel specialist work:** PERF-001 repeatable CAD scene/render baseline and measured profiling remains Integration/Performance-owned; QA-003 remains blocked until INT-001 and INT-002 evidence.

## DOM-077 — Quote summary / immutable revision cross-format reconciliation (VERIFIED)

- A cabinet production + priced labor snapshot is appended to project JSON v2, read back, serialized to standalone revision-history JSON, and the quote summary round-trips through strict JSON v1 and CSV v1. History and summary match exactly.
- Tests preserve cost-line/source IDs, sorted unique Part IDs, labor tariff ID, TRY currency, exact units and totals; incomplete exports, legacy project v1 revision append and snapshot currency mismatch fail closed.
- Code [7205c95d](https://github.com/Taylan789/MobilyaCAD/commit/7205c95d6b583cceffc7398085a29e413dd70917); CI [#44806905679](https://github.com/Taylan789/MobilyaCAD/actions/runs/44806905679), QA [#44806905649](https://github.com/Taylan789/MobilyaCAD/actions/runs/44806905649), Pages [#44806905713](https://github.com/Taylan789/MobilyaCAD/actions/runs/44806905713) all succeeded. QA: 127 frontend and 582 domain tests, type-check, lint, build and production audit 0 vulnerabilities.
- No production calculation code or frontend files changed; material catalog ID is not yet carried in quote line-source metadata and is DOM-078.

## OPS-001 — Exact-SHA test-site deployment gate (VERIFIED)

- Pages waits up to 20 minutes for CI and QA on the exact SHA; failed/missing/timeout blocks deployment.
- On SHA 0374ba7c, CI passed and QA failed; Pages build succeeded, verify failed, deploy skipped. The gate was verified fail-closed.



## DOM-078A — Panel material resource provenance (VERIFIED)

- Production priced-consumption material lines now carry catalog `resourceType=material`, `resourceId`, `unit=m2`, and sorted Part IDs independently from generated quote/cost-line identifiers.
- Quote-summary line sources preserve that identity. Strict quote JSON v1 and existing CSV v1 columns validate and round-trip the metadata without changing monetary calculations or the file schema.
- Revision snapshot validation accepts only material source identity matching material category, m2 cost/source unit, no edge direction or roll fields, and non-empty Part provenance.
- Tests cover material IDs across catalog entries/thicknesses, JSON/CSV round-trip, and invalid metadata. CI/QA/Pages all verified on `6963a635a22d26f5e7f725c6167f9b785032d89a`: 130 frontend tests, 585 domain tests, production build and security audit (0 vulnerabilities) passed. Initial QA failures were fixed in the follow-up commit.
- Next: DOM-078C export resource metadata in strict comparison JSON v2/CSV v3 while accepting legacy JSON v1 and CSV v1/v2.


## DOM-078B — Catalog-aware revision comparison matching (VERIFIED)

- Revision comparison now uses catalog resource type, ID and unit as part of its internal line identity. Changing a catalog resource for otherwise identical material produces separate added/removed lines instead of a misleading price-only change.
- Public comparison snapshots and JSON/CSV schemas remain unchanged in this slice; resource metadata export is DOM-078C. This keeps current exporters compatible and avoids silently dropping new fields.
- Code [5e8689b3](https://github.com/Taylan789/MobilyaCAD/commit/5e8689b35116fbed8f5fb82158782434ae641910); CI [#44830602066](https://github.com/Taylan789/MobilyaCAD/actions/runs/44830602066), QA [#44830602034](https://github.com/Taylan789/MobilyaCAD/actions/runs/44830602034), Pages [#44830602182](https://github.com/Taylan789/MobilyaCAD/actions/runs/44830602182) all successful.


## DOM-078C — Strict revision-comparison JSON v2 catalog identity (VERIFIED)

- Public comparison line snapshots retain source catalog identity separately from generated quote-line/source IDs: resource type, resource ID and resource unit.
- JSON v2 is the serializer's new output. The nested comparison domain schema remains v1; strict legacy envelope v1 remains readable only without resource fields.
- Resource metadata is all-or-none, restricted to material/edge-banding, with a valid catalog ID and unit matching the quote line; catalog identity changes remain added/removed pairs.
- Code [e6330272](https://github.com/Taylan789/MobilyaCAD/commit/e63302724ec7b8586f2733e46023c8d22e864ba4); CI [#44841432348](https://github.com/Taylan789/MobilyaCAD/actions/runs/44841432348), QA [#44841432343](https://github.com/Taylan789/MobilyaCAD/actions/runs/44841432343), Pages [#44841432370](https://github.com/Taylan789/MobilyaCAD/actions/runs/44841432370) successful — 130 frontend + 589 domain tests, type-check, lint, build and production audit (0 vulnerabilities).
- Next: DOM-078D strict CSV v3 resource identity with legacy v1/v2 readers.

## DOM-078D — Strict revision-comparison CSV v3 catalog identity (VERIFIED)

- CSV v3 adds resource type, catalog ID and unit for both sides of each line change. Complete metadata is preserved; partial or unit/category mismatches fail through the strict JSON domain validator.
- CSV v1/v2 headers remain accepted by dedicated strict readers; roll/source provenance and exact units are retained. No silent resource metadata loss or partial export is allowed.
- Code [81a39f4c](https://github.com/Taylan789/MobilyaCAD/commit/81a39f4c421fb53cff92b117cc18112849b75f16); fixture correction [573810ee](https://github.com/Taylan789/MobilyaCAD/commit/573810ee6e1fc697f1eb9693dd6ce450b2d659a9). CI [#44847105808](https://github.com/Taylan789/MobilyaCAD/actions/runs/44847105808), QA [#44847105831](https://github.com/Taylan789/MobilyaCAD/actions/runs/44847105831), Pages [#44847105832](https://github.com/Taylan789/MobilyaCAD/actions/runs/44847105832) all successful — 130 frontend + 590 domain tests, type-check, lint, production build and audit (0 vulnerabilities).
- Test site deployed: https://taylan789.github.io/MobilyaCAD/
- Next: DOM-079 safe standalone revision-history import into project v2 with strict projectId match and no silent overwrite.

## DOM-079 — Safe standalone revision-history import into project v2 (VERIFIED)

- Adds an import API for standalone quote-revision history JSON. Import is permitted only for a valid project v2 target with an empty history and an exact matching projectId.
- Existing non-empty histories fail closed: the import returns blocked/null and never silently replaces a revision chain. Empty history files, malformed JSON, mismatched project IDs and project v1 targets are rejected.
- Import returns a new immutable project envelope; the source project is unchanged. The full room/furniture/material schema remains the project parser's responsibility.
- Four regression tests cover successful import/round-trip, input immutability, foreign projectId, no-overwrite, malformed/empty history and v1 rejection.
- Code [45410f6f](https://github.com/Taylan789/MobilyaCAD/commit/45410f6f9ef2ba8294a526eb0e5bda4435719971). CI [#44854578281](https://github.com/Taylan789/MobilyaCAD/actions/runs/44854578281), QA [#44854578278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44854578278), Pages [#44854578405](https://github.com/Taylan789/MobilyaCAD/actions/runs/44854578405) all succeeded: 130 frontend + 594 domain tests, strict domain TS, lint, production build, production audit 0 vulnerabilities.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/
- Next: DOM-080 adversarial fixtures (duplicate revision IDs, foreign revisions, malformed metadata and version downgrade), then reassess INT-001 adapter contract.

## DOM-080 — Quote-history import adversarial fixtures (VERIFIED)

- Added four import-path regression fixtures for duplicate revision IDs, a revision whose project identity differs from its envelope, unsupported source-integrity metadata, and standalone/project-history version downgrade payloads.
- Each fixture rejects the payload without returning a partial project or mutating the target. Production validation was unchanged; test-only hardening.
- Initial QA caught a case-sensitive diagnostic assertion (not a product bug); corrected without weakening validation. Exact-SHA CI [#44862393833](https://github.com/Taylan789/MobilyaCAD/actions/runs/44862393833), QA [#44862393777](https://github.com/Taylan789/MobilyaCAD/actions/runs/44862393777), and Pages [#44862393772](https://github.com/Taylan789/MobilyaCAD/actions/runs/44862393772) succeeded: 130 frontend + 598 domain tests, strict type-check, lint, production build, production audit 0 vulnerabilities.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/
- Next 3 slices: DOM-081 project quote-history JSON round-trip invariants; DOM-082 strict malformed/unknown-field import boundaries; reassess frontend-owned import/export wiring and INT-001 adapter contract.


## DOM-081 — Project v2 quote-history import envelope isolation (VERIFIED, 21 November 2026)

- Import deep-clones the target project envelope before attaching validated history, preserves unrelated room/furniture/material/custom fields, and freezes the returned nested JSON values. Target data is not aliased or mutated by the result.
- Unsupported JSON values, accessor/symbol/non-JSON fields and cyclic data fail closed with no partial project result. Existing project v1/version/projectId/history validation remains intact.
- Regression file: `domain/production/projectQuoteRevisionProjectFileImportImmutability.test.mjs`; verifies exact envelope preservation, nested identity separation, frozen output, target immutability and invalid/cyclic target rejection.
- Code [f4bb4337](https://github.com/Taylan789/MobilyaCAD/commit/f4bb4337a6991db0e33f5f7cd01ea1d99f203f6e); fixture correction [f33f6188](https://github.com/Taylan789/MobilyaCAD/commit/f33f61887f303849a1f13d7e49fb6d4e8bc57a80).
- Exact-SHA CI [#44868995581](https://github.com/Taylan789/MobilyaCAD/actions/runs/44868995581), QA [#44868995531](https://github.com/Taylan789/MobilyaCAD/actions/runs/44868995531) and Pages [#44868995560](https://github.com/Taylan789/MobilyaCAD/actions/runs/44868995560) all succeeded: **132 frontend + 600 domain tests**, strict domain type-check, lint, production build and production audit (0 vulnerabilities).
- Test site deployment succeeded: https://taylan789.github.io/MobilyaCAD/
- First QA attempt caught only an empty quote fixture (snapshot status `empty`, not `ready); the fixture was corrected by adding an explicit test-only profit line. No production validation was loosened.
- Next: DOM-082 two-revision standalone history import/export round-trip.


## DOM-082 — Standalone two-revision quote-history round-trip (VERIFIED, 21 November 2026)
- Automated domain regression now validates two distinct dated price snapshots through standalone JSON serialize → parse: revision IDs/numbers, dates, previous links, source-integrity version, catalog version, material resource ID/unit/Part IDs/source reference, exact snapshot totals and deterministic re-export.
- Code/test commit [6d1d267](https://github.com/Taylan789/MobilyaCAD/commit/6d1d267ee3db611ae26360614a046996050a64ca). CI [#44870286067](https://github.com/Taylan789/MobilyaCAD/actions/runs/44870286067), QA [#44870286066](https://github.com/Taylan789/MobilyaCAD/actions/runs/44870286066), Pages [#44870286049](https://github.com/Taylan789/MobilyaCAD/actions/runs/44870286049) all successful.
- QA: 136 frontend + 601 domain tests; strict shared-domain type-check, lint (32 warnings / 0 errors), production build and production audit (0 vulnerabilities). DOM-082 test passed.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/
- Next small slices: DOM-083 embedded project-v2 history ↔ standalone two-revision equivalence; DOM-084 quote comparison source/resource provenance cross-check; INT-001 frontend-owned adapter/export wiring and INT-002/PERF-001 specialist-owned integration/performance tasks remain isolated.

## DOM-083 — Embedded project-v2 ↔ standalone quote-history equivalence (VERIFIED, 21 November 2026)
- Automated domain test appends two dated revisions into project JSON v2, reads the embedded chain, and compares it exactly to the validated source history.
- The same embedded history is serialized to standalone quote-history JSON and compared byte-for-byte with the standalone export path; parsed histories match, project identity stays v2, and the original project input is unchanged.
- Code/test [commit 191a0f1d](https://github.com/Taylan789/MobilyaCAD/commit/191a0f1d884ce9a6fe363bb19a65884163ec571f). Verification SHA f598cf7a: [CI #44881090457](https://github.com/Taylan789/MobilyaCAD/actions/runs/44881090457), [QA #44881090447](https://github.com/Taylan789/MobilyaCAD/actions/runs/44881090447), [Pages #44881090459](https://github.com/Taylan789/MobilyaCAD/actions/runs/44881090459) all succeeded. QA: 139 frontend + 602 domain tests, strict domain type-check, lint 32 warnings / 0 errors, production build, audit 0 production vulnerabilities.
- Test site deployment verified: https://taylan789.github.io/MobilyaCAD/
- Next: DOM-084 quote comparison source/resource provenance cross-check; INT-001 frontend adapter remains UI-owned and INT-002/PERF-001 remain specialist-owned. No frontend, adapter/performance-owned files, or machine-specific output changed.


## DOM-084 — Quote comparison catalog/source provenance cross-check (VERIFIED, 21 November 2026)
- A revision comparison with stable cost/source ID and Part provenance but changed catalog resource type/ID/unit emits a removed + added pair instead of a price-only change.
- The test asserts exact old/new resource identity, units, and sorted Part provenance, reconciles category/grand-total deltas, and round-trips strict comparison JSON v2 and CSV v3.
- Test commit [82c5c7e1](https://github.com/Taylan789/MobilyaCAD/commit/82c5c7e1c8ea4568862ef57e6ac43b83b91d8746). Exact-SHA CI [#44884528629](https://github.com/Taylan789/MobilyaCAD/actions/runs/44884528629), QA [#44884528643](https://github.com/Taylan789/MobilyaCAD/actions/runs/44884528643) and Pages [#44884528624](https://github.com/Taylan789/MobilyaCAD/actions/runs/44884528624) succeeded on `0824ee38`. Production audit found 0 vulnerabilities; lint reported 32 warnings and 0 errors.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/
- Next: DOM-085 source-reference value-change cross-check on an unchanged catalog resource with exact Part provenance through JSON v2/CSV v3.

## DOM-085 — Quote comparison source-reference value change (VERIFIED, 21 November 2026)
- Changing only the material price/source reference on the same catalog resource and Part scope produces one `changed` line (no added/removed pair), while category and grand-total deltas remain zero.
- The regression asserts exact before/after source reference and Part IDs, plus strict comparison JSON v2 and CSV v3 round-trip equality.
- Code/test [commit 0a14278a](https://github.com/Taylan789/MobilyaCAD/commit/0a14278a52828c47ac1809e85aa6604e9297cba0); exact-SHA [CI #44885185709](https://github.com/Taylan789/MobilyaCAD/actions/runs/44885185709), [QA #44885185708](https://github.com/Taylan789/MobilyaCAD/actions/runs/44885185708), [Pages #44885185716](https://github.com/Taylan789/MobilyaCAD/actions/runs/44885185716) all succeeded. QA: 139 frontend + 604 domain tests; strict domain type-check, lint (32 warnings / 0 errors), production build, and production audit (0 vulnerabilities).
- Test site deployment succeeded: https://taylan789.github.io/MobilyaCAD/. No frontend files or production logic changed.
- Next: DOM-088 deterministic comparison/export when quote lines and source mappings are reordered; preserve exact JSON/CSV output and parsed equality.

## DOM-087 — Multi-line Part provenance isolation (VERIFIED, 21 November 2026)
- Added two Part-scoped material quote lines sharing the catalog resource and source-reference context, with distinct source IDs. Changing only Part A provenance yields exactly one removed/added pair; the unchanged Part B line does not appear in comparison changes.
- Category and grand-total deltas remain zero. Strict comparison JSON v2 and CSV v3 round-trip the full comparison exactly.
- Code/test commit [`ab8bbdd6b11f3cdc38c504c3c3e6a8f0f5ea68aa`](https://github.com/Taylan789/MobilyaCAD/commit/ab8bbdd6b11f3cdc38c504c3c3e6a8f0f5ea68aa); exact-SHA [CI #44895275292](https://github.com/Taylan789/MobilyaCAD/actions/runs/44895275292), [QA #44895275286](https://github.com/Taylan789/MobilyaCAD/actions/runs/44895275286), and [Pages #44895275291](https://github.com/Taylan789/MobilyaCAD/actions/runs/44895275291) succeeded.
- QA: **142 frontend + 606 domain tests**, DOM-087 passed; strict domain TypeScript, lint (32 warnings / 0 errors), production build, production audit (0 vulnerabilities).
- Test site deployment succeeded: https://taylan789.github.io/MobilyaCAD/. No production quote logic or frontend files changed.
- Known boundary: regression-only slice; local tests were not run in this runtime. AI Developer [#44886646460](https://github.com/Taylan789/MobilyaCAD/actions/runs/44886646460) failed with OpenRouter free-model HTTP 429 (daily limit 50/50); no paid retry or secrets/quota changes. Integration/performance job was skipped; no active specialist PR/run was evidenced. UI PRs remain unmerged, so this slice does not provide the pending visible redesign.
- Next: DOM-088 reordered-line/source mapping determinism; INT-001 remains frontend-owned and INT-002/PERF-001 specialist-owned.


## DOM-090 — Three-revision quote comparison r1→r3 (VERIFIED, 21 November 2026)
- Three-revision history compares r1 directly to r3, intentionally skipping r2; source Part IDs remain exact. A stable material line changes quantity, a second line is removed, and a third is added.
- Material-category and grand-total deltas both reconcile to +800 TRY minor units; reverse-order and unknown revision selections are blocked with null comparison payload.
- Strict comparison JSON v2 and CSV v3 round-trip equality are asserted. Test commit 41afe676.
- Exact-SHA CI #44911402763 and QA #44911402703 succeeded. QA: 142 frontend + 609 domain tests, DOM-090 subtest passed, strict domain TypeScript, lint 32 warnings / 0 errors, production build, production audit 0 vulnerabilities.
- Pages deployment #44911402698 succeeded on the same code SHA; test site: https://taylan789.github.io/MobilyaCAD/. No frontend or production calculation changed.
- Next: DOM-091 deterministic pairing for repeated identical source lines across three revisions; preserve Part provenance and JSON/CSV output. UI PRs, integration/performance work, and AI Developer quota blocker remain separate.

## DOM-091 — Repeated identical source lines across three revisions (VERIFIED, 21 November 2026)
- Regression fixture covers legacy revisions with two identical source identity rows in r1, an intermediate r2, and three matching rows in r3. Comparing r1 directly to r3 ignores r2, deterministically matches the unchanged row, emits the expected changed + added rows, and preserves Part provenance.
- Reordering paired cost lines and source mappings independently within all three snapshots yields the same comparison and byte-identical JSON v2 / CSV v3; both parsers round-trip exactly.
- Material-category and grand-total deltas reconcile to **+4,500 TRY minor units**.
- Code/test commit [bb1de957](https://github.com/Taylan789/MobilyaCAD/commit/bb1de9575aed24c10f6540e2c854fa5d34e8971a); exact-SHA CI [#44915382998](https://github.com/Taylan789/MobilyaCAD/actions/runs/44915382998), QA [#44915382980](https://github.com/Taylan789/MobilyaCAD/actions/runs/44915382980), and Pages [#44915383004](https://github.com/Taylan789/MobilyaCAD/actions/runs/44915383004) all succeeded.
- QA: **142 frontend + 610 domain tests**; DOM-091 passed; strict domain TypeScript, production build, lint **32 warnings / 0 errors**, npm audit **0 production vulnerabilities**. Local tests were not run in this runtime.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/. No frontend, production calculations, adapter/performance-owned files, or machine-specific output changed.


## DOM-092 — strict source-integrity / legacy comparison boundary (VERIFIED, 21 November 2026)

- Strict revisions reject duplicate material source identities while legacy two-revision history accepts reordered duplicate source rows and compares them without false changes.
- Test commit [8005e9ab](https://github.com/Taylan789/MobilyaCAD/commit/8005e9ab1ec42b29ec9e0985f337e0f7cae16566); exact-SHA CI [#44921550797](https://github.com/Taylan789/MobilyaCAD/actions/runs/44921550797), QA [#44921550733](https://github.com/Taylan789/MobilyaCAD/actions/runs/44921550733) and Pages [#44921550778](https://github.com/Taylan789/MobilyaCAD/actions/runs/44921550778) succeeded.
- QA: **142 frontend + 611 domain tests**, DOM-092 passed; strict shared-domain type-check, lint **32 warnings / 0 errors**, production build, production audit **0 vulnerabilities**. Local tests were not run in this runtime.
- Test site deployment succeeded: https://taylan789.github.io/MobilyaCAD/. AI Developer run [#44924539196](https://github.com/Taylan789/MobilyaCAD/actions/runs/44924539196) failed on OpenRouter free-model daily 429; no paid retry or quota change. Integration/performance specialist remains skipped.

## DOM-093 — Three-revision Part-provenance isolation (VERIFIED, 21 November 2026)

- Comparing r1 directly to r3 ignores an intermediate r2 quantity change. The r3 material restores quantity but changes one Part scope; a second Part-scoped material is unchanged.
- Exactly one source emits removed + added lines with the original/replacement Part IDs; material and grand-total deltas stay **0**. JSON v2 and CSV v3 serialize/parse the full comparison exactly.
- Code/test commit [34381ae4](https://github.com/Taylan789/MobilyaCAD/commit/34381ae4231f291c2826509fa7b3369a6e3964ff). Exact-SHA CI [#44925107973](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925107973), QA [#44925108135](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925108135), Pages [#44925107985](https://github.com/Taylan789/MobilyaCAD/actions/runs/44925107985) all succeeded.
- QA: **142 frontend + 612 domain tests**; DOM-093 passed, strict domain TypeScript, lint **32 warnings / 0 errors**, production build and audit **0 production vulnerabilities**. Local tests were not run in this runtime.
- Test site deployment verified: https://taylan789.github.io/MobilyaCAD/. No frontend or production calculation changed; AI Developer free-model quota failure and disabled specialist lane remain separate.
- Next: DOM-094 quantity/price reductions with fractional quantities and rounding, then DOM-095 mixed-category reconciliation.


## DOM-094 — Fractional quote rounding and material price reduction (VERIFIED, 21 November 2026)

- Three-revision r1→r3 regression covers fractional quantities and rounded minor-unit line totals while skipping an intermediate r2. The material unit price falls from 101 to 80 minor units at 0.375 m²; the rounded line total changes from 38 to 30 minor units. A separate half-minor-unit line verifies half-up rounding (0.5→1) and a sub-half line rounds to 0 (0.4→0).
- The comparison emits exactly one changed line; material-category and grand-total deltas both reconcile to **−8 minor units** with all other categories at zero. Strict JSON v2 and CSV v3 round-trip equality is asserted.
- Test commit [3235df04](https://github.com/Taylan789/MobilyaCAD/commit/3235df04df6fc0d3e7c4937590f9c3ac8dd60bb5). CI [#44931241164](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241164), QA [#44931241180](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241180), and Pages [#44931241155](https://github.com/Taylan789/MobilyaCAD/actions/runs/44931241155) succeeded: **142 frontend + 613 domain tests**, strict domain TypeScript, lint 32 warnings / 0 errors, production build, audit 0 vulnerabilities.
- Test site deployment verified: https://taylan789.github.io/MobilyaCAD/. Test-only regression; production pricing logic and frontend files unchanged.
- Next 3: DOM-096 adversarial comparison JSON/CSV rejection without partial payload; INT-001 frontend/domain adapter contract and export integration (joint ownership; no frontend edits from this agent); DOM-097 fractional hardware quantity and labor/operation revision reconciliation.

## DOM-095 — Mixed-category three-revision quote comparison (VERIFIED, 21 November 2026)

- r1→r3 comparison skips the intermediate r2 and reconciles a fractional material price reduction plus a new material line, hardware price increase, labor price increase, removed operation, waste reduction and unchanged profit.
- Expected per-category deltas in minor units: material **+50**, hardware **+100**, labor **+50**, operation **−400**, waste **−200**, profit **0**; grand-total delta **−400**, equal to the sum of category deltas. Added/removed/changed counts (1/1/4) and Part provenance are asserted.
- Exact JSON v2 and CSV v3 comparison round-trips are asserted. No production calculations, frontend or machine-specific output changed.
- Test commit [9258473e](https://github.com/Taylan789/MobilyaCAD/commit/9258473ebe4521ee1df5143c8215e1ab4772fb0f); CI [#44934335237](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335237), QA [#44934335265](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335265), Pages [#44934335205](https://github.com/Taylan789/MobilyaCAD/actions/runs/44934335205) all succeeded.
- QA: **142/142 frontend + 614/614 domain tests**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build and production audit **0 vulnerabilities**. Test site deployment verified: https://taylan789.github.io/MobilyaCAD/.
- Fixture correction: quote-adjustment sources are restricted to waste/profit; hardware/material use production-consumption sources and labor/operation use labor-operation sources. Corrected fixture passes exact-SHA QA.
- Next: DOM-097 fractional hardware quantity and labor/operation revision reconciliation; INT-001 frontend/domain export contract (joint ownership, no frontend writes); DOM-098 bounded JSON comparison import.


## DOM-096 — Duplicate quote comparison snapshot rejection (VERIFIED, 21 November 2026)

- JSON v2 and CSV v3 serialization/import reject repeated exact line snapshots on the same revision side without returning partial payload. A changed line's from/to snapshots may share identity, and repeated source identity with different quantity/price remains supported (DOM-091 regression preserved).
- Existing line-total arithmetic, per-category deltas and grand-total reconciliation remain fail-closed; tests assert malformed JSON/CSV yields null comparison/file and valid JSON/CSV stays exact.
- Final code/test commit [798e29b](https://github.com/Taylan789/MobilyaCAD/commit/798e29b84731352e8249012c16e635a6a97d28f0); CI [#44943420344](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420344), QA [#44943420373](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420373), Pages [#44943420330](https://github.com/Taylan789/MobilyaCAD/actions/runs/44943420330) all succeeded.
- QA: **142 frontend + 616 domain tests** passed; strict domain TypeScript, production build, audit **0 vulnerabilities**, lint **32 warnings / 0 errors**. Deployment confirmed at https://taylan789.github.io/MobilyaCAD/.
- Iteration evidence: DOM-091 repeated source identities with different snapshots were initially blocked and then explicitly preserved; CSV duplicate fixture metadata was corrected after a failed run. Only the final exact-SHA run is green.
- Next: DOM-097 fractional hardware quantity and labor/operation revision reconciliation; INT-001 shared export contract; DOM-098 bounded JSON comparison import.

## DOM-097 — Three-revision fractional hardware and labor/operation reconciliation (IMPLEMENTED, Actions pending)

- Regression test: [code/test commit 56e00eef](https://github.com/Taylan789/MobilyaCAD/commit/56e00eefa5d8a29a77362bea10345a3b31586745), in `domain/production/projectQuoteRevision.test.mjs`.
- r1→r3 test carries fractional hardware quantity and price, changes existing labor quantity/tariff, and adds a changing operation line; r2 is deliberately intermediate.
- Acceptance assertions: category deltas hardware +1,000 / labor +1,300 / operation +384 minor units, grand total +2,684; each rounded line total and exact JSON v2/CSV v3 comparison round-trip is preserved.
- Code/test scope is regression coverage only; no frontend, adapter/performance-owned file or production calculation changes.
- Exact-SHA CI/QA and Pages deployment are pending verification; do not mark fully verified until real Actions results are observed.
- **Next 3 small tasks:** DOM-098 bounded comparison JSON import (fail closed/no partial payload); INT-001 domain/frontend export contract review (joint ownership, no frontend writes); then QA-003 end-to-end export reconciliation after INT-001/INT-002.

## DOM-098 — Bounded quote-comparison JSON import/export (VERIFIED, 22 November 2026)

- Strict comparison JSON import rejects UTF-8 payloads over **1 MiB** before JSON parsing; comparison line changes are limited to **2,000** before per-line validation. Rejections return blocked status with `file=null` and `comparison=null`.
- Serializer enforces the same 2,000-line limit and refuses output over 1 MiB, so generated files stay importable under the same resource bounds.
- Tests cover multibyte UTF-8 expansion, line-count rejection on import and export, serializer byte-size rejection, and no partial payload.
- Code/test commit [88bb19f](https://github.com/Taylan789/MobilyaCAD/commit/88bb19f441349563fb7c23fd858a2ba0df490755); syntax-fixture correction [2ed95db](https://github.com/Taylan789/MobilyaCAD/commit/2ed95db6639a1f9bdb70cb95c5f9e156f6136e2e).
- Exact-SHA Actions: CI [#44950880826](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880826), QA [#44950880888](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880888), Pages [#44950880938](https://github.com/Taylan789/MobilyaCAD/actions/runs/44950880938) succeeded. QA: **142 frontend + 620 domain tests**, strict domain type-check, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities.
- Test site deployed at https://taylan789.github.io/MobilyaCAD/. No frontend or CNC/machine-specific output changed.
- First QA attempt exposed a syntax typo in the new multibyte test fixture; it was corrected in 2ed95db and the final exact-SHA QA passed. No tests were weakened.
- Next: DOM-100 cross-format equivalence and malformed CSV fail-closed coverage; INT-001 remains frontend-owned.


## DOM-099 — Bounded quote comparison CSV import/export (VERIFIED, 22 Kasım 2026)

- CSV comparison parsing shares the JSON envelope's **1 MiB UTF-8 byte limit** and **2,000 line-change maximum**. Input is rejected before parsing when oversized; total records are capped at 2,008 (8 fixed rows plus 2,000 line rows) to bound memory and work.
- CSV serialization also rejects output above 1 MiB UTF-8. CSV v1/v2/v3 column contracts and legacy import paths remain unchanged.
- Regression coverage verifies multibyte payload byte count, 2,001 line-change rows under the byte ceiling, and fail-closed `comparison=null`. Fixture size is 640,024 bytes.
- Code/test commit [24f945c0](https://github.com/Taylan789/MobilyaCAD/commit/24f945c0dd05c2653daaacdba5361460f20883b6). Exact-SHA CI [#44958138720](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138720), QA [#44958138801](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138801), and Pages [#44958138729](https://github.com/Taylan789/MobilyaCAD/actions/runs/44958138729) all succeeded. QA: **142/142 frontend + 621/621 domain tests**, strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build and audit **0 vulnerabilities**.
- Test site deployment completed successfully at https://taylan789.github.io/MobilyaCAD/. A direct web fetch was unavailable in this runtime; the deployment run itself is confirmed green.
- AI Developer run [#44953172176](https://github.com/Taylan789/MobilyaCAD/actions/runs/44953172176) failed because OpenRouter's free-model daily quota was exhausted (HTTP 429). The integration/performance job was skipped; no specialist branch/PR was found. No paid retry, quota or secret change was made.
- **Next 3 small tasks:** DOM-100 JSON v2 ↔ CSV v3 equivalence and malformed fail-closed cross-format tests; DOM-101 adversarial CSV quoting/record-boundary tests; INT-001 frontend-owned adapter/export contract review. INT-002/PERF-001 remains specialist-owned.

## DOM-104 — Deterministic quote-comparison CSV exports (VERIFIED, 22 November 2026)

- Added a regression test that serializes one logical quote comparison three times from the original and independent deep copies; it asserts exact byte equality, UTF-8 BOM, CRLF ending, v3 parse equality, and source immutability.
- The serializer already uses stable fixed columns, category order, and input line order; no production serializer or CSV schema change was needed. This slice locks its existing deterministic contract rather than introducing unnecessary sorting that could change quote line semantics.
- Code/test commit [614d559](https://github.com/Taylan789/MobilyaCAD/commit/614d559c902cc4038f9c177eaa31ce86045ef3fe). Exact-SHA CI [#44983853404](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853404), QA [#44983853400](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853400), and Pages [#44983853533](https://github.com/Taylan789/MobilyaCAD/actions/runs/44983853533) all succeeded. QA: **142 frontend + 629 domain tests**, strict domain TypeScript, lint **32 warnings / 0 errors**, production build, and audit **0 vulnerabilities**.
- Test site deployed at https://taylan789.github.io/MobilyaCAD/; Pages exact-SHA deployment succeeded. Local test execution was unavailable; GitHub Actions is the verification evidence.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) failed due OpenRouter free-model daily HTTP 429; integration/performance job was skipped. The failed quota-limited run was not retried; no paid fallback, secrets, or quota settings were changed.
- UI PR [#145](https://github.com/Taylan789/MobilyaCAD/pull/145) remains draft and unmerged; its QA run [#44975896881](https://github.com/Taylan789/MobilyaCAD/actions/runs/44975896881) succeeded. It has no test-site deployment until merged and verified.
- **Next:** DOM-105 canonical v3 export after legacy v1/v2 import, preserving supported line/roll provenance and explicitly omitting catalog identity unavailable in legacy headers. INT-001 frontend-owned; INT-002/PERF-001 specialist-owned.


## DOM-105 — Canonical v3 export after legacy CSV import (IN_PROGRESS, 22 November 2026)

- **Acceptance:** Legacy v1 and v2 comparison CSVs parse successfully, expose the detected version, and re-export through the current canonical v3 serializer without changing the parsed comparison. The v1/v2 headers cannot supply catalog resource identity; canonical v3 must leave those identity fields absent rather than infer them.
- **Coverage slice:** v1 line/source/Part provenance and v2 roll count/length, furniture IDs, plan/price source references; canonical v3 header/version, repeated export bytes and import immutability.
- **Scope:** domain regression tests only; no production schema, frontend, adapter/performance-owned files, pricing assumptions, or CNC output changes.
- **Correction:** first test commit [28ed773](https://github.com/Taylan789/MobilyaCAD/commit/28ed773e8b8dc3a266d0eead4ecb1f8c739ef488) had CI success but QA failed because a v2 fixture delta (1,375) was compared with the helper's baseline (1,075); Pages #44989919118 correctly blocked deployment. The helper now accepts explicit fixture totals; no assertions were weakened.
- **Verified:** correction commit [1d4503be](https://github.com/Taylan789/MobilyaCAD/commit/1d4503be5a277ec8a9eca8e1c5fc71120caee214). Exact-SHA CI [#44990018540](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018540), QA [#44990018528](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018528), and Pages [#44990018506](https://github.com/Taylan789/MobilyaCAD/actions/runs/44990018506) all succeeded: **144 frontend + 630 domain tests**, strict domain TypeScript, lint **32 warnings/0 errors**, production build and audit **0 vulnerabilities**. Test-site deployment confirmed: https://taylan789.github.io/MobilyaCAD/.
- **Scope:** domain tests/docs only; no production serializer/schema, frontend, adapter/performance-owned files, or CNC output changed.
- **Next:** DOM-106 legacy v1/v2 → canonical v3 → JSON v2 → CSV v3 cross-format round-trip; INT-001 frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 blocked until adapter evidence.


## DOM-106 — Legacy CSV → canonical v3 → JSON v2 → CSV v3 (VERIFIED, 22 Kasım 2026)

- **Acceptance:** Both legacy CSV v1 and v2 import cases traverse canonical CSV v3, strict JSON v2 parse/serialize, and a final CSV v3 parse; every stage preserves the exact normalized comparison, supported line/roll provenance, and absent catalog identity.
- **Coverage:** Existing DOM-105 fixtures are reused and extended; no duplicate fixtures or schema changes. Failed JSON/CSV conversion is asserted rather than treated as a successful output.
- **Scope:** Domain regression tests only; no production serializer/schema, frontend, adapter/performance-owned files, pricing assumptions, or CNC output changes. Local execution is unavailable; exact-SHA Actions evidence is pending.
- **Verified:** current branch SHA `9f3d8ba3a180cf18b83b9b18d528c11c6a4f80fb`; exact-SHA [CI #44996078563](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078563), [QA #44996078516](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078516), and [Pages #44996078532](https://github.com/Taylan789/MobilyaCAD/actions/runs/44996078532) all succeeded. Local test execution unavailable; Actions is the verification evidence.
- **Next:** DOM-107 table family material group override propagation through project Parts, snapshot restore/comparison and material consumption summary; frontend persistence remains INT-001-owned, adapter/performance work remains INT-002/PERF-001 specialist-owned.


## DOM-107 — Table-family material group override propagation (VERIFIED, 22 Kasım 2026)

- **Acceptance:** Table material group overrides must remain accurate in the aggregated project Part list, canonical Part snapshots and material-consumption summary; the request must not be mutated during calculation.
- **Coverage:** Tabletop uses an explicit 8 mm catalog override, legs use the 60 mm group material, and aprons retain the default material. Snapshot serialize/validate/compare is unchanged; summary quantities, line counts, area and volume agree with resulting Parts.
- **Scope:** Domain regression test in `domain/production/projectProduction.test.mjs` only; no production geometry, schema, frontend, adapter/performance-owned files or CNC output changed.
- **Verification:** [commit 55d8e104](https://github.com/Taylan789/MobilyaCAD/commit/55d8e104d8842f48faad1b53f6e32230ec88eb89) verified with exact-SHA [CI #44999210991](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210991), [QA #44999210952](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210952), and [Pages #44999210947](https://github.com/Taylan789/MobilyaCAD/actions/runs/44999210947), all successful. QA unit/domain tests, strict domain TypeScript, lint (32 warnings, 0 errors), production build, and audit (0 vulnerabilities) passed. Local tests unavailable; Actions are the evidence. Test site updated: https://taylan789.github.io/MobilyaCAD/.
- **Next:** DOM-113 structured conflict provenance consumer validation and fail-closed export readiness contract. INT-001 remains frontend-owned; INT-002/PERF-001 specialist-owned.


## DOM-108 — Mixed-family material-reference fail-closed reconciliation (VERIFIED, 22 November 2026)

- Acceptance: A project containing multiple furniture families must not return a partial Part list when any family has a missing catalogue identity or a material/thickness mismatch. Diagnostics identify the blocked furniture family and ID; unaffected-family Parts are never presented as a partial exportable result.
- Coverage: Cabinet carcass top override references a missing material while a valid table is present; separately, a valid cabinet is combined with a table whose 8 mm top is assigned an 18 mm-only material. Both reports are blocked, result=null, strict aggregation throws, and inputs remain unchanged.
- Scope: Domain regression test only; no production geometry, frontend, adapter/performance-owned files, project schema, or CNC output changes.
- Verification: [test commit 5595e8c9](https://github.com/Taylan789/MobilyaCAD/commit/5595e8c9a36b4edf8dd1decb2dbfc27dc1fb7ef7) passed exact-SHA [CI #45001931586](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931586), [QA #45001931594](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931594), and [Pages #45001931632](https://github.com/Taylan789/MobilyaCAD/actions/runs/45001931632). QA: 148 frontend + 632 domain tests, strict domain TypeScript, lint 32 warnings/0 errors, production build, and dependency audit 0 vulnerabilities. Local execution unavailable; Actions is the evidence.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/.
- AI Developer [#44972838278](https://github.com/Taylan789/MobilyaCAD/actions/runs/44972838278) remains blocked by OpenRouter free-model daily HTTP 429 (remaining 0; reset 23 Nov 2026 03:00 TRT); no rerun or paid fallback.
- UI PRs #151, #149 and #147 remain draft/unmerged; visible frontend redesign is not deployed. This agent does not touch frontend files.

## DOM-109 — Cross-family catalogue identity reconciliation (VERIFIED, 22 November 2026)

- Same material ID across cabinet, bookshelf, table and other mixed-family Part rows must retain one normalized label. Labels are compared after Unicode compatibility normalization, whitespace collapsing and case normalization.
- Conflicting names block the project atomically with diagnostics identifying both furniture/Part sources; no partial Part result is returned. Compatible normalized labels aggregate consistently, and distinct thicknesses stay separate.
- Direct material-consumption summary calls also reject conflicting labels for a catalogue ID instead of splitting the same identity into multiple groups.
- Code/test commit: [a6d34fe17bf7eddc26f2aac97373adb61e346d03](https://github.com/Taylan789/MobilyaCAD/commit/a6d34fe17bf7eddc26f2aac97373adb61e346d03). Files: `domain/production/projectProduction.ts`, `projectProduction.test.mjs`, new `materialIdentity.ts`, `projectMaterialSummary.ts`, and `projectMaterialSummary.test.mjs`. No frontend, adapter/performance-owned files, export schema or CNC output changed.
- Exact-SHA CI [#45014447877](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447877), QA [#45014447767](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447767), and Pages [#45014447798](https://github.com/Taylan789/MobilyaCAD/actions/runs/45014447798) all succeeded. QA: **150 frontend + 635 domain tests**, strict domain TS, lint 32 warnings/0 errors, production build, and audit 0 vulnerabilities.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/.
- Next: DOM-110 exact-SHA Actions verification; DOM-111 stable multi-error diagnostics.

## DOM-110 — Mixed-family material summary invariants (VERIFIED, 22 November 2026)

- Acceptance: repeated material IDs across cabinet/bookshelf families, quantity multipliers and distinct thicknesses preserve exact Part IDs, quantity, net area, volume and edge-band totals; inputs are immutable.
- Test commit [b03280ce](https://github.com/Taylan789/MobilyaCAD/commit/b03280ce1ba64a1982fa10b871d7b02a46f448c5). Exact-SHA CI [#45015876727](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876727) and QA [#45015876733](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876733) succeeded; QA 150/150 frontend + 636/636 domain, strict domain TypeScript, lint 32 warnings/0 errors, production build and production dependency audit 0 vulnerabilities. Pages [#45015876696](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876696) succeeded.
- Test site deployed: https://taylan789.github.io/MobilyaCAD/.
- Next: DOM-111 stable multi-error diagnostics and source-wide blocking.

## DOM-111 — Deterministic multi-error diagnostics (VERIFIED, 22 November 2026)

- Prior exact-SHA run on [cf4efd38](https://github.com/Taylan789/MobilyaCAD/commit/cf4efd3841197b4fc8510b2c6a779d8341c47fb6) exposed strict TypeScript narrowing and pairwise-only blocking. Intermediate [a84e371](https://github.com/Taylan789/MobilyaCAD/commit/a84e3712533b71bf360f9b3e1d62410d9f4345a2) passed CI but QA found an incomplete message; final correction [864f37d](https://github.com/Taylan789/MobilyaCAD/commit/864f37d2523b71bf360f9b3e1d62410d9f4345a2) narrows materialId, groups all Parts by ID, uses sorted label representatives, blocks every contributor, and lists all affected furniture IDs.
- Exact-SHA CI [#45027201001](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027201001), QA [#45027201043](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027201043), and Pages [#45027200963](https://github.com/Taylan789/MobilyaCAD/actions/runs/45027200963) succeeded. QA: 150/150 frontend + 637/637 domain, strict TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities.
- Test site deployment confirmed: https://taylan789.github.io/MobilyaCAD/.
- **Next:** DOM-112 structured material conflict provenance (catalog ID and all source Part/furniture IDs) with backwards-compatible diagnostics.

## DOM-112 — Structured material-conflict source provenance (READY)

- Acceptance: additive report fields expose catalogue ID and sorted source furniture/Part identities; legacy diagnostic messages, atomic blocking, deterministic order and strict validation remain unchanged.
- Scope: domain report contract/tests and integration notes only; frontend-owned files remain untouched.


## DOM-112 — Structured material-identity conflict provenance (VERIFIED, 22 Kasım 2026)

- **Acceptance:** Additive typed report metadata exposes catalogue identity and every contributing material-bearing Part's furniture/Part ID and original label. Sources are sorted deterministically; every blocked furniture diagnostic carries the complete group. Legacy message text, ordering, atomic blocking, strict aggregation and inputs remain unchanged.
- **Tests:** The mixed-family conflict test builds the expected provenance from isolated valid cabinet/bookshelf/table results and checks every source. The order-reversal diagnostic regression additionally confirms table-family provenance survives.
- **Scope:** `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, and `docs/production-domain-contract.md`; no frontend, adapter/performance-owned files, project persistence/export schema or CNC output changed.
- **Initial attempt:** CI [#45032813075](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813075) passed; QA [#45032813113](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813113) found a TypeError in the new test assertion callback (636/637 domain tests), and Pages [#45032813098](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032813098) was gate-blocked. The callback was corrected without weakening assertions.
- **Final code/test SHA:** [2cf8ff82](https://github.com/Taylan789/MobilyaCAD/commit/2cf8ff82fbae62ef8b8d7ca9bd807d2653e7ffcf). CI [#45032940332](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940332) and QA [#45032940341](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940341) passed: 158 frontend + 637 domain tests, strict domain TypeScript, lint (32 warnings/0 errors), production build, audit (0 vulnerabilities). Pages [#45032940318](https://github.com/Taylan789/MobilyaCAD/actions/runs/45032940318) deployed successfully to https://taylan789.github.io/MobilyaCAD/. Local tests were not run in this runtime.
- **Next:** DOM-113 validate structured provenance and its fail-closed export/diagnostic consumers; INT-001 remains frontend-owned and INT-002/PERF-001 specialist-owned.


## DOM-113 — Structured material conflict provenance in cut-plan export diagnostics (VERIFIED, 22 November 2026)

- **User flow:** when a mixed-family project has conflicting material labels for one catalog ID, the cut-plan export gate shows every blocked furniture source and retains structured catalog/Part provenance for diagnostics. It never offers a partial plan.
- **Acceptance:** valid metadata survives into `productionDiagnostics`; malformed, unordered, duplicate, non-conflicting, mismatched, or incomplete source metadata blocks with `result=null` and `json=null). Legacy source/furniture/family/code/message remains unchanged.
- **Scope:** domain export contract/test and docs only; no frontend, adapter/performance-owned files, project schema, CNC output or machine-standard assumptions.
- **Dependencies/risks:** frontend diagnostic presentation is UI-agent-owned; additive fields must not weaken the existing blocked export gate. Source labels are user/catalog text, not supplier verification.
- **Verification:** [final code/test SHA b8fdbda7](https://github.com/Taylan789/MobilyaCAD/commit/b8fdbda7c1175afa766712c471ed8974c5ba369a); exact-SHA CI [#45041353850](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353850), QA [#45041353786](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353786) and Pages [#45041353780](https://github.com/Taylan789/MobilyaCAD/actions/runs/45041353780) all successful. QA: 162 frontend + 639 domain tests, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site updated: https://taylan789.github.io/MobilyaCAD/. Local test execution unavailable; Actions evidence is authoritative.
- **Next 3 slices:** DOM-115 reconcile blocked mixed-family nesting reports with material-summary and Part-snapshot consumers; DOM-116 continue strict cross-consumer production/export integrity; INT-001 remains frontend-owned while INT-002/PERF-001 specialist-owned.

## DOM-114 — Structured production diagnostics in nesting batches (VERIFIED, 22 November 2026)

- **Acceptance:** a blocked mixed-family material-identity report passes through the nesting-batch consumer with validated, sorted, complete conflict source metadata; every contributing furniture diagnostic is present, input order does not alter the output, and incomplete source coverage fails closed.
- **Scope:** `domain/production/projectSheetNestingBatches.ts`, its regression test, shared cut-plan diagnostic validator, and production-domain integration contract only. No frontend, specialist adapter/benchmark, project schema, machine-specific CNC output, or `main` changes.
- **Behavior:** the additive `productionDiagnostics` field preserves validated source-aware diagnostic records; existing human-readable `diagnostics` remain unchanged and blocked batch `result` stays null.
- **Verification:** code/test commit [751065b](https://github.com/Taylan789/MobilyaCAD/commit/751065b1437da702200696da588949bc0243596d); exact-SHA CI [#45043968666](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968666), QA [#45043968727](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968727) and Pages [#45043968653](https://github.com/Taylan789/MobilyaCAD/actions/runs/45043968653) all successful. QA: 162 frontend + 640 domain tests, strict TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities. Test site updated: https://taylan789.github.io/MobilyaCAD/. Local test execution unavailable; Actions evidence is authoritative.
- **Next:** DOM-115 blocked mixed-family nesting/material-summary/Part-snapshot reconciliation; INT-001 frontend-owned, INT-002/PERF-001 specialist-owned.


## DOM-115 — Blocked mixed-family source reconciliation (READY)

- **User flow:** a project blocked because two furniture families use conflicting names for the same material catalogue ID remains diagnosable without presenting partial production or nesting output.
- **Acceptance:** conflict provenance Part/furniture IDs reconcile exactly with material summaries from isolated valid source reports and a validated Part snapshot; nesting stays blocked, `result` stays null, and the blocked report does not expose a partial `projectPartSnapshot`. Inputs remain unchanged.
- **Scope:** cross-consumer regression test and production contract documentation only; no production behavior/schema, frontend, adapter/performance-owned files, machine-specific output, or CNC assumptions changed.
- **Next:** DOM-116 validate the ready nesting-batch report's material-group/source snapshot consistency across selected and excluded Parts; INT-001 remains frontend-owned, INT-002/PERF-001 specialist-owned, QA-003 remains blocked until integration evidence.


## Güncel domain öncelikleri — 23 Kasım 2026

| Sıra | Dilim | Kabul kriteri / bağımlılık |
|---|---|---|
| DOM-118 VERIFIED | Stock-sheet group/order diagnostics | Stable batch order and canonical diagnostics; exact-SHA CI/QA/Pages passed |
| DOM-119 VERIFIED | Ready batch → cut-plan source coverage | Every selected source/physical piece reconciles; excluded Parts remain snapshot-only; CI/QA/Pages passed |
| DOM-120 VERIFIED | Mixed-stock cut-plan area reconciliation | Per-sheet and project area totals/weighted occupancy independently reconcile; CI/QA/Pages passed |
| DOM-121 VERIFIED | Mixed-family material and edge-band provenance | Canonical Part snapshot source IDs, quantities, assignments and order invariance; CI/QA/Pages passed |
| DOM-122 VERIFIED | Quote totals cross-consumer reconciliation | CI [#45097364302](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364302), QA [#45097364273](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364273) passed (175 frontend + 651 domain; strict TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities); Pages [#45097364279](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364279) deployed |
| DOM-123 VERIFIED | Hardware BOM provenance mapping in priced consumption | [code/test 2362065](https://github.com/Taylan789/MobilyaCAD/commit/2362065f73426adce64cade856d4e4fb180c39fc); CI [#45099919245](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919245), QA [#45099919275](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919275) passed (175 frontend + 653 domain, strict TypeScript, lint 32 warnings/0 errors, build, production audit 0); Pages [#45099919290](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919290) deployed |
| DOM-124 READY | Hardware BOM provenance through combined quote lineSources | Hardware/resource identity, unit, furniture/source references and separate price source mapping; no Part IDs |
| DOM-125 VERIFIED — [feature commit 6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456), [test correction 332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e); CI [#45118738218](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738218), QA [#45118738120](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738120) passed (175 frontend + 658 domain, strict TypeScript, build, lint 32 warnings/0 errors, audit 0); Pages [#45118738144](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738144) deployed to https://taylan789.github.io/MobilyaCAD/ | Quote revision JSON + CSV preservation of additive hardware provenance | Strict validation, round-trip, and legacy compatibility/fail-closed coverage |
| DOM-124 READY | Hardware BOM provenance through combined quote lineSources | Hardware/resource identity, unit, furniture/source references and separate price source mapping; no Part IDs |
| DOM-125 VERIFIED — [feature commit 6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456), [test correction 332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e); CI [#45118738218](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738218), QA [#45118738120](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738120) passed (175 frontend + 658 domain, strict TypeScript, build, lint 32 warnings/0 errors, audit 0); Pages [#45118738144](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738144) deployed to https://taylan789.github.io/MobilyaCAD/ | Quote revision JSON + CSV preservation of additive hardware provenance | Strict validation, round-trip, and legacy compatibility/fail-closed coverage |
| INT-001 | Domain ↔ frontend adapter/export contract | UI-owned files untouched; round-trip and unsupported-geometry fail-closed proof |
| INT-002 / PERF-001 | Specialist-owned adapter integration/performance | Separate specialist branch/PR and measurable CI evidence; not owned/merged here |

## DOM-120 — Project cut-plan area-summary reconciliation (VERIFIED, 23 Kasım 2026)

- **Acceptance:** each mixed-material group area summary independently reconciles stock dimensions, per-sheet trim, usable area, placement geometry, unoccupied area and sheet occupancy; project totals equal the sum of group totals and geometric occupancy is weighted across all groups rather than averaged.
- **Fixture:** nonzero MDF trim plus a different stock size/material with multiple sheets. The test is cross-consumer and test-only; no production algorithm or export format changed.
- **Verification:** code/test commit [31ca52de](https://github.com/Taylan789/MobilyaCAD/commit/31ca52de6334d4f36b0b37e7594d20affde91c16); exact-SHA CI [#45083257996](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257996), QA [#45083257987](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257987), and Pages [#45083257991](https://github.com/Taylan789/MobilyaCAD/actions/runs/45083257991) all succeeded. QA: 172 frontend + 649 domain tests, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site deployed to https://taylan789.github.io/MobilyaCAD/. Local tests unavailable; Actions is authoritative.
- **Next:** DOM-121 is verified; continue with DOM-122 priced-consumption/quote reconciliation. INT-001 remains frontend-owned and INT-002/PERF-001 specialist-owned.


## DOM-121 — Mixed-family material and edge-band summary provenance (VERIFIED)

- **User flow:** the project material and edge-band consumption summaries must remain traceable to the exact production Part rows, including furniture IDs, catalog material identity, thickness, quantity, directional banding and legacy unassigned banding.
- **Acceptance:** a canonical Part snapshot is the independent source; material summary source IDs/furniture IDs/line count/quantity reconcile to it; edge-band summary groups reconcile to each Part's edge assignment, unit, geometry, edge count, Part IDs and furniture IDs; reversing source Part/furniture order leaves both summaries unchanged.
- **Scope:** test-only cross-consumer regression. No production algorithm, frontend, adapter/performance-owned file, project schema, CNC output or machine-specific standard changed.
- **Verification:** code/test commit [96f122d8](https://github.com/Taylan789/MobilyaCAD/commit/96f122d8be2fbeedcb8d3b11df7aea0d713cdc50); exact-SHA CI [#45090552662](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552662), QA [#45090552670](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552670), and Pages [#45090552717](https://github.com/Taylan789/MobilyaCAD/actions/runs/45090552717) all succeeded. QA: 172 frontend + 650 domain tests, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. Local test execution unavailable; GitHub Actions is authoritative.
- **Next:** DOM-122 source-priced consumption/quote reconciliation (implemented; Actions pending). DOM-123 hardware BOM provenance follows; INT-001 frontend-owned, INT-002/PERF-001 specialist-owned, QA-003 blocked until integration evidence.

## DOM-122 — Priced-consumption and combined quote reconciliation (VERIFIED, 23 November 2026)

- **Acceptance:** independent source quantities (Part area, explicit BOM quantities, assigned edge length, usage durations and adjustment inputs) reconcile to component priced-consumption/labor rows and the combined quote; each line's unit price, currency, source reference and half-up minor-unit rounding is checked; category totals and grand total are derived independently; all source mappings and Part IDs are preserved.
- **Coverage:** one ready mixed material/hardware/edge-band quote plus labor, operation, explicit waste and profit lines; all seven quote rows reconcile without partial totals.
- **Scope:** regression test only (domain/production/projectQuoteSummary.test.mjs) and contract/roadmap/coordination records; no production calculation, frontend, adapter/performance-owned file, schema, CNC output or main branch change.
- **Code/test commit:** [467627bd](https://github.com/Taylan789/MobilyaCAD/commit/467627bd1ca85e5d70ed21c451a6cecfbd1633ce).
- **Exact-SHA CI/QA/Pages:** CI [#45097364302](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364302), QA [#45097364273](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364273), Pages [#45097364279](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364279) all succeeded. QA: 175 frontend + 651 domain tests, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/. Local execution unavailable; Actions is authoritative.
- **Next:** DOM-123 hardware BOM source provenance through priced consumption and combined quote mapping. INT-001 frontend-owned; INT-002/PERF-001 specialist-owned; QA-003 remains blocked.


## DOM-123 — Hardware BOM provenance at priced consumption (VERIFIED, 23 November 2026)

- **Acceptance:** each priced hardware summary line maps by `costLineId` to its hardware ID and original unit; source furniture IDs and optional BOM references are sorted, unique and retained; BOM references remain separate from price-list references; no hardware-to-Part link is invented; source input is unchanged and reversed BOM/furniture order yields the same mapping. Incomplete pricing exposes no partial source map.
- **Scope:** additive domain API `lineHardwareSources`, regression test and production-domain contract only. No frontend, quote line mapping, snapshot/CSV schema, pricing defaults, CNC output or `main` branch changes.
- **Code/test commit:** [2362065f](`https://github.com/Taylan789/MobilyaCAD/commit/2362065f73426adce64cade856d4e4fb180c39fc`).
- **Exact-SHA CI:** [#45099919245](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919245) successful.
- **Exact-SHA QA:** [#45099919275](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919275) successful — **175 frontend + 653 domain tests, 0 failures**; strict shared-domain TypeScript, lint **32 warnings / 0 errors**, production build, production dependency audit **0 vulnerabilities**. Full install reports 4 moderate dependency findings.
- **Pages:** [#45099919290](https://github.com/Taylan789/MobilyaCAD/actions/runs/45099919290) successful; test site deployed at https://taylan789.github.io/MobilyaCAD/.
- **Local:** test-file syntax checked with Node; full repository tests were not run locally because the repository is not mounted. Actions are authoritative.
- **Next:** DOM-126 quote revision/snapshot hardware provenance coverage and cross-consumer reconciliation; DOM-127 hardware BOM traceability contract review.


## 23 Kasım 2026 — DOM-124 combined-quote hardware provenance (VERIFIED)
- Quote source mapping carries hardware ID, original BOM unit, sorted furniture IDs and optional BOM source references in hardware-specific fields. Hardware price-list `sourceReference` remains on the priced cost line; no hardware-to-Part association is inferred.
- Ready quote generation fails closed when a priced hardware line lacks exactly one source map. Regression coverage uses two furniture records, repeated BOM references and reversed input order.
- **Code/test:** [2621c51c](https://github.com/Taylan789/MobilyaCAD/commit/2621c51cfc507627f5b5b929f7a71e0995d38449). CI [#45111962178](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111962178), QA [#45111961982](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961982) passed (**175 frontend + 654 domain tests**; strict TypeScript, lint 32 warnings/0 errors, production build, audit 0 vulnerabilities). Pages [#45111961983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961983) deployed to https://taylan789.github.io/MobilyaCAD/.
- **Compatibility (DOM-125 verified):** JSON v1 accepts complete optional hardware BOM metadata only on hardware consumption lines; CSV v1 accepts both extended and legacy headers. Both fail closed on partial metadata and recompute totals.

### Next 3 domain slices
1. DOM-126 — Quote revision/snapshot hardware provenance coverage and cross-consumer reconciliation using the validated DOM-125 JSON/CSV.
2. DOM-127 — Re-evaluate hardware BOM → furniture/Part traceability contract; keep hardware-to-Part links absent unless a real relationship is supplied.
3. DOM-128 — Add strict project quote source-map identity/unit reconciliation across snapshot imports and downstream reports.


## DOM-125 — Hardware BOM provenance persistence (verified — exact-SHA Actions and Pages successful)
- Quote-summary JSON v1 now validates optional hardware BOM metadata on hardware cost lines; required identity/unit/furniture IDs are all-or-nothing, bounded and sorted/unique. Optional BOM source references are sorted/unique. Non-hardware placement is blocked.
- CSV v1 exports four trailing hardware provenance columns and accepts both the current and legacy v1 headers. Legacy files normalize to blank optional fields and remain compatible without fabricated source mappings.
- Automated regressions cover JSON and CSV round-trip, partial metadata, wrong category, unsorted metadata and legacy CSV compatibility.
- Scope: domain quote-summary JSON/CSV adapters and tests only; no UI, adapter/performance-owned files, machine output, prices or `main` changes.


## DOM-126a — Hardware BOM provenance in quote revision snapshots (VERIFIED, 23 November 2026)

- Revision source validation recognizes hardware BOM metadata only on production-consumption hardware lines; hardware identity, unit and furniture IDs are all-or-nothing, unit matches the cost line, and optional BOM refs are sorted/unique. Legacy snapshots without these fields remain valid.
- Regression acceptance: a priced hardware fixture preserves BOM references separately from the price source through revision validation, standalone history JSON and project-v2 embedded history. Partial/misplaced metadata blocks; no hardware-to-Part relationship is fabricated.
- Scope: domain revision validator + regression test + contract/roadmap/progress; no frontend, machine-specific output or main.
- Code/test [53c72cbd](https://github.com/Taylan789/MobilyaCAD/commit/53c72cbdf8e04c9df46d2ab13b7d499fe7fae5b4); exact-SHA CI [#45132439080](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439080), QA [#45132439155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439155) passed (175 frontend + 660 domain tests; strict domain TS; lint 32 warnings/0 errors; production build; audit 0 vulnerabilities); Pages [#45132439031](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439031) deployed https://taylan789.github.io/MobilyaCAD/.
- Next: DOM-126b comparison projection and comparison JSON/CSV provenance; then DOM-127 hardware BOM traceability review.


## 23 Kasım 2026 — DOM-126b revision comparison provenance (VERIFIED)
- Revision comparison snapshots now carry hardware BOM ID, original unit, sorted furniture IDs and BOM source references. BOM source-only changes are included in the line-value comparison, producing a single `changed` hardware line while money/category deltas remain zero; price-list references and panel Part IDs are not conflated.
- Code/test commit [ec937609](https://github.com/Taylan789/MobilyaCAD/commit/ec9376091721bee90605caf292b5e88af3f2748d). Exact-SHA CI [#45144318230](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144318230), QA [#45144317923](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317923) and Pages [#45144317913](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317913) succeeded; deployment URL: https://taylan789.github.io/MobilyaCAD/.
- QA evidence: 661 domain tests passed; strict domain TypeScript passed; lint 32 warnings/0 errors; production build passed; audit 0 vulnerabilities. Frontend build/lint and Pages build/deploy succeeded.
- Comparison JSON/CSV still do not expose the new hardware fields; separate DOM-126c and DOM-126d are required. Local tests unavailable in this environment; Actions are authoritative. No frontend, adapter/performance-owned files, CNC output, or `main` changed.

### Next 3 domain slices
1. DOM-126c — Comparison JSON v3 hardware BOM metadata, strict validation, JSON v1/v2 compatibility.
2. DOM-126d — Comparison CSV v4 BOM columns, strict round-trip and v1/v2/v3 compatibility.
3. DOM-127 — Hardware BOM → furniture/Part traceability boundary; do not fabricate hardware-to-Part links.


## 23 Kasım 2026 — DOM-126c comparison JSON v3 (VERIFIED)

- Comparison JSON remains v2 without BOM metadata, preserving older consumers; hardware BOM fields trigger strict v3 serialization. v1/v2 parsing remains backward-compatible.
- v3 permits hardwareId, hardwareUnit, hardwareFurnitureIds, and optional hardwareSourceReferences only on production-consumption hardware lines. Required metadata is atomic, unit-consistent, sorted/unique and bounded. Invalid imports/exports fail closed; no hardware-to-Part mapping is inferred.
- Verified code/test [8af74858](https://github.com/Taylan789/MobilyaCAD/commit/8af748584c5f301b38a5ee6daff783b49c69ded4): CI [#45148425243](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425243), QA [#45148425227](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425227) (178 frontend + 664 domain tests; strict TypeScript, production build, lint 32 warnings/0 errors, audit 0 vulnerabilities) and Pages [#45148425478](https://github.com/Taylan789/MobilyaCAD/actions/runs/45148425478) successful. Test site: https://taylan789.github.io/MobilyaCAD/.

### Next 3 domain slices
1. DOM-126d — Comparison CSV v4 hardware BOM columns, strict round-trip and v1/v2/v3 compatibility.
2. DOM-127 — Hardware BOM → furniture/Part traceability boundary; preserve absent links unless a real relationship is provided.
3. DOM-128 — Cross-consumer quote source-map identity/unit reconciliation with fail-closed import/report checks.


## DOM-126d — Comparison CSV v4 hardware BOM provenance (implementation; verification pending)
- CSV v4 appends eight paired hardware BOM columns (ID, unit, furniture IDs and source references) while preserving v3 resource columns. Strict v1/v2/v3/v4 headers are recognized; legacy readers remain intact.
- Acceptance: v4 hardware BOM and JSON v3 cross-format round-trip; partial/unsorted metadata fails closed; v3 resource identity remains readable; line/category/grand-total deltas reconcile. No UI or CNC output is claimed.
- Verification complete on commit `32e15e753f02c3d43d2be2eb660c31d1154e840b`: CI and QA passed, and the exact-SHA Pages deployment succeeded. Frontend export integration remains frontend-owned.
### Updated next domain slices
1. DOM-127 — Hardware BOM-to-furniture/Part traceability boundary (do not infer panel Part links).
2. DOM-128 — Quote source-map identity/unit reconciliation across consumers with fail-closed diagnostics.
3. DOM-129 — Project export compatibility guards for production metadata.


## 23 Kasım 2026 — DOM-127a explicit hardware BOM-to-Part mapping (verified)

- **Delivered:** optional `hardwareItems[].sourcePartIds` is explicit-only; exact Part IDs must exist in the same production project and belong to the BOM row's furniture. Empty/oversized, unsorted/duplicate, missing or cross-furniture mappings fail closed. The hardware summary aggregates the explicit sorted Part-ID union.
- **Existing consumers:** priced consumption and quote line-source snapshots carry the union using `sourcePartIds`; revision history, comparison JSON v3 and CSV v4 preserve it.
- **Limitation:** grouped hardware summaries do not allocate each row's quantity to individual Parts. Keep original BOM rows for per-row quantity association. No CNC/machine validation is implied.
- **Verification:** code `4808746daa13d4bbce55ff78657098308c4f4694`; CI `45165232791`, QA `45165232778`, Pages `45165232708` all successful. Local tests unavailable; exact-SHA Actions evidence is used.

### Updated next domain slices
1. DOM-129 — Project export compatibility guards for production metadata and lossless legacy handling.
2. DOM-130 — Hardware trace persistence/export contract and schema-version compatibility.
3. DOM-131 — Immutable quote source-map audit summary across revision history.


## DOM-127b — Hardware BOM line-level traceability (VERIFIED — exact-SHA CI/QA/Pages successful)

- `calculateProjectHardwareBomTrace` exposes each validated hardware BOM row in its original order with its independent quantity/unit/reference and exact linked Part snapshots (ID, name, production quantity, material identity and mm dimensions).
- Part links are explicit and same-furniture only. Part quantity is descriptive production quantity; hardware quantity is not allocated to Parts. Grouped hardware consumption/costing is unchanged.
- Automated regressions cover multiple BOM rows for one hardware identity/unit across furniture, distinct row quantities/references/Part mappings, unlinked rows, aggregate quantity/union consistency, input immutability, legacy empty projects and missing/cross-furniture links.
- Frontend, JSON/CSV adapters, CNC and machine-specific standards remain outside this slice. Local tests unavailable; exact-SHA Actions are the verification evidence.
### Updated next domain slices
1. DOM-128 — Cross-consumer quote source-map identity/unit reconciliation with fail-closed diagnostics.
2. DOM-129 — Project export compatibility guards for production metadata.
3. DOM-130 — Hardware trace persistence/export contract and schema-version compatibility; frontend-owned integration only after adapter ownership is available.
- **Exact-SHA verification:** commit [a87c46f6](https://github.com/Taylan789/MobilyaCAD/commit/a87c46f6f0ecf57eccd327004ac1ae743ac81dc8); CI [#45173461621](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461621) and QA [#45173461653](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461653) successful (188 frontend + 668 domain tests, strict TypeScript, production build, lint 34 warnings/0 errors, audit 0 vulnerabilities); Pages [#45173461683](https://github.com/Taylan789/MobilyaCAD/actions/runs/45173461683) deployed https://taylan789.github.io/MobilyaCAD/.


## DOM-128 — Hardware quote comparison identity reconciliation (VERIFIED — exact-SHA CI/QA/Pages successful)

- Revision comparison identity now includes hardware catalog ID, hardware unit, furniture scope and explicit Part IDs. Catalog/scope/Part mapping changes are reported as removed + added rather than incorrectly paired as a changed line; BOM source-reference-only changes remain value changes.
- Added regressions for hardware identity, furniture-scope and explicit Part-link changes across comparison JSON/CSV round-trips, unchanged monetary totals, hardware unit mismatch blocking, and rejection of forged changed-lines with different hardware identity.
- Initial implementation commit [68439af3](https://github.com/Taylan789/MobilyaCAD/commit/68439af3056311ae2a1109951f36fc17abd157bc) had CI pass and QA caught only a wrong diagnostic assertion; Pages deployment was gated. Assertion correction commit [75a88485](https://github.com/Taylan789/MobilyaCAD/commit/75a884850b631716c35232c1ce699b19bb4ddedb) is verified by CI [#45190394525](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394525), QA [#45190394796](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394796), and Pages [#45190394590](https://github.com/Taylan789/MobilyaCAD/actions/runs/45190394590), all successful. QA: 188 frontend + 669 domain tests, strict domain TypeScript, lint 34 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.
- No frontend, adapter/performance-owned files, CNC/machine output or main changes.


## 23 Kasım 2026 — DOM-129 hardware BOM export compatibility guard (VERIFIED — exact-SHA CI/QA/Pages successful)

- Integrated regression now exercises a real production report with two hardware BOM rows through project JSON v2 revision history, standalone revision-history JSON v1, quote-summary JSON v1 and quote-summary CSV v1.
- Acceptance: hardware catalog ID/unit, furniture scope and sorted BOM source references survive every export/import; the hardware price reference remains separate from BOM provenance; each round-trip reconciles to the original immutable quote summary.
- Test-only slice; no production source/schema, frontend, adapter/performance-owned files, CNC/machine output or `main` changes. Local Node tests are unavailable in this runtime. First QA exposed a fixture assertion using a nonexistent `diagnostics` field; the follow-up QA then caught a `hardwareSource` temporal-dead-zone error in assertion ordering. The test now moves metadata comparisons after declaration. Exact-SHA CI/QA/Pages for the correction are pending.
- Next: DOM-130 hardware BOM trace persistence/export contract and schema-version compatibility, then DOM-131 immutable quote source-map audit summary across revision history.


## 23 Kasım 2026 18:14 TRT — DOM-131 source-map audit (VERIFIED — exact-SHA CI/QA/Pages successful)

- Domain API `calculateProjectQuoteRevisionSourceMapAudit(historyValue)` validates the full quote revision chain and returns a revision-ordered, deeply immutable source-map audit with per-revision/project totals for source types, categories, price-reference rows, Part references/unique IDs, resources, hardware BOM refs and furniture scope.
- Legacy revisions lacking `sourceIntegrityVersion` are represented as `null`; no missing provenance is inferred, prices are recalculated, or export schema changed. Empty histories return zero-count audit; malformed histories return blocked with no partial audit.
- Regressions: mixed two-revision source counts, exact price/BOM-reference separation, Part/furniture provenance, determinism, deep-freeze, input immutability, empty/invalid fail-closed. **Exact-SHA QA: 188 frontend + 671 domain tests, all passed; strict domain TypeScript, production build, lint 34 warnings/0 errors, production audit 0 vulnerabilities.**
- Code/test [commit 5f1fbf1f](https://github.com/Taylan789/MobilyaCAD/commit/5f1fbf1f55ff2bd45468939abf7d2e76fecd0cdf); CI [#45204878883](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204878883), QA [#45204879024](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204879024), Pages [#45204879129](https://github.com/Taylan789/MobilyaCAD/actions/runs/45204879129) succeeded. Test site deployed: https://taylan789.github.io/MobilyaCAD/.
- Scope: `domain/production/projectQuoteRevision.ts`, `domain/production/projectQuoteRevision.test.mjs`, `AI_COORDINATION.md`, `PRODUCT_ROADMAP.md`, `docs/production-domain-contract.md`. No frontend, adapter/performance-owned files, CNC/machine output or `main` changes. Local tests were unavailable; Actions are the verification evidence.
- `npm ci` reported 4 moderate vulnerabilities in the full dependency tree; production-only audit returned 0 vulnerabilities. Existing lint warnings are 34, with no lint errors.

### Updated next domain slices
1. DOM-130 — Hardware BOM trace persistence/export/schema compatibility; deferred until adapter ownership is available (integration-performance workflow is disabled).
2. DOM-132 — Legacy revision source-map audit should surface duplicate source identities without changing or rejecting historical data.
3. DOM-133 — Compare revision source-map provenance changes independently from monetary deltas, using existing comparison identity rules.

- Added domain API `calculateProjectQuoteRevisionSourceMapAudit(historyValue)`: validates a full quote history before returning revision-ordered immutable source-line metadata and per-revision/project totals for source types, categories, price-reference rows, Part links/references/unique IDs, resources and hardware BOM/furniture provenance.
- Legacy revisions with absent `sourceIntegrityVersion` are explicitly reported as `null`; the audit does not infer missing metadata, calculate prices or alter export formats. Empty histories yield zero-count audit; invalid histories fail atomically with no partial audit.
- Acceptance: mixed two-revision fixture verifies counts, hardware price reference vs BOM refs, Part/furniture traceability, deterministic result, deep freeze and input immutability; empty and malformed-history cases.
- No frontend, export adapters, CNC/machine output or main changes.

### Updated next domain slices
1. DOM-130 — Hardware BOM trace persistence/export/schema compatibility; deferred until adapter ownership is available (integration-performance workflow is disabled).
2. DOM-132 — Legacy revision source-map audit should surface duplicate source identities without changing or rejecting historical data.
3. DOM-133 — Compare revision source-map provenance changes independently from monetary deltas, using the existing comparison identity rules.


## 23 Kasım 2026 19:32 TRT — DOM-132 legacy duplicate source identity audit (VERIFIED)

- User value: legacy quote revisions may contain repeated source identities that strict v1 revisions disallow. The audit now surfaces repeated (sourceType, sourceId) groups, counts the groups and every participating cost-line reference, and returns deterministic sorted cost-line IDs.
- Acceptance: legacy history validates and audits as ready; duplicate groups are revision-scoped, stable under paired line reorder, inputs remain immutable, and strict source-integrity v1 continues to block duplicates. No source is inferred or repaired and no cost/export schema changes.
- Changed files: domain/production/projectQuoteRevision.ts, domain/production/projectQuoteRevision.test.mjs, docs/production-domain-contract.md, AI_COORDINATION.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md. Frontend and adapter/performance-owned files remain untouched.
- Exact-SHA CI [#45217498055](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217498055), QA [#45217498277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217498277), and Pages [#45217499095](https://github.com/Taylan789/MobilyaCAD/actions/runs/45217499095) all succeeded; QA: 191 frontend + 672 domain tests, strict TypeScript, production build, lint 34 warnings/0 errors, production audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/; local test execution unavailable.

### Next domain slices
1. DOM-133 — compare provenance changes independently from monetary deltas.
2. DOM-134 — reconcile duplicate source-map identity groups across three revisions and stable ordering.
3. DOM-135 — disclose legacy source-integrity markers without inferring strict integrity (verified).


## 10/10 quality gates — evidence-based, not yet achieved
- [ ] CAD Core: measured geometry, 2D/3D sync, transforms/snap, selection/groups, undo/redo, camera and save/load integration.
- [ ] Production: canonical Part tree, material/edge-band/hardware/waste, nesting/cost and export reconciliation.
- [ ] UX: functional controls, clear navigation, accessibility, responsive states and recovery.
- [ ] Performance: repeatable viewport/bundle/memory baseline with measured improvements.
- [ ] Reliability: typed validation, backward-compatible project schemas, lossless import/export and exact-SHA CI/QA evidence; verified SHA 25f04468 passed 283 frontend + 760 domain tests, strict TypeScript, lint (36 warnings / 0 errors), production build and production audit (0 vulnerabilities). Overall 10/10 gate remains unchecked.
- [ ] Physical production: operator and machine-standard verification remains separate from automated checks.

## Current domain queue — 25 November 2026
- DOM-160: VERIFIED — JSON v2 edge-band roll-pricing envelope now has descriptor-safe reads, bounded deep clone/freeze and fail-closed reflection handling; exact-SHA CI #45557877841, QA #45557878887 and Pages #45557877766 passed.
- DOM-161: VERIFIED — saved v2 roll inputs feed immutable quote snapshots in explicit roll mode; code/test [279067c7](https://github.com/Taylan789/MobilyaCAD/commit/279067c73135e19e36392be76f0fb2ca75e206cc), CI [#45563745096](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745096), QA [#45563745095](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745095), Pages [#45563745097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745097); 277 frontend + 754 domain tests passed.
- INT-003: UI-owned draft [PR #206](https://github.com/Taylan789/MobilyaCAD/pull/206); editor startup/new/save/open wiring is intentionally deferred until current App.tsx owners finish. Do not merge yet.
- DOM-153: Product Development, planned only after INT-003; append → save → reopen → append must preserve the revision chain and immutable snapshots.
- INT-001: UI + Product READY; frontend must consume canonical production data and fail closed for unsupported geometry exports.
- INT-002/PERF-001: Integration/Performance-owned; workflow specialist job is disabled and no isolated branch/PR is verified. QA-003 remains blocked until INT-001/INT-002 evidence.

### DOM-134 verified acceptance
Three valid quote revisions reconcile revision-local duplicate groups, line-reference counts, additive project totals and project-wide unique Part/hardware identities. Paired cost/source row reordering leaves the audit summary stable; source history is immutable and duplicate-group output is deeply frozen.


## DOM-134 — Three-revision source-map audit reconciliation
- Three-revision test verifies two legacy duplicate identity groups per revision, deterministic group/source/line-ID ordering, revision-local and project-wide counts, unique Part/hardware/BOM identities, and stable summaries after paired source/cost row reversal.
- The existing audit API remains the source of truth; no production behavior or export schema was introduced.
- Exact-SHA code/test commit [cbbe098c](https://github.com/Taylan789/MobilyaCAD/commit/cbbe098cc7e86d50b9c08a2c24bf752e09c1a09b) CI [#45248747459](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747459), QA [#45248747535](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747535) and Pages [#45248747497](https://github.com/Taylan789/MobilyaCAD/actions/runs/45248747497) all succeeded. QA: 191 frontend + 675 domain tests, strict TypeScript, lint 34 warnings/0 errors, production build, audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.
- Local Node tests unavailable in this runtime; exact-SHA Actions are the evidence. No frontend, adapter, CNC/machine output or main changes.
- Next: DOM-136 strict-vs-legacy marker coverage reconciliation; DOM-130 remains deferred until adapter ownership is available.


## DOM-135 — Legacy source-integrity disclosure (VERIFIED)
- Source-map comparisons now include explicit revision-level marker fields, `fromSourceIntegrityVersion` and `toSourceIntegrityVersion`, copied from the validated audit (`1` strict; `null` legacy/missing marker).
- Acceptance: three-revision legacy → strict v1 → legacy fixture reconciles `null / 1 / null`, unchanged source lines, zero provenance changes, immutable history; strict v1 validation remains unchanged.
- Additive comparison response only. No export adapters, frontend, machine output, or `main` changes.
- Exact-SHA CI/QA/Pages succeeded: [CI]( https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565667 ), [QA]( https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565549 ), [Pages]( https://github.com/Taylan789/MobilyaCAD/actions/runs/45256565818 ). QA: 194 frontend + 676 domain tests, strict TypeScript, lint 34 warnings/0 errors, production build, audit 0 vulnerabilities. Test site deployed: https://taylan789.github.io/MobilyaCAD/

### Next domain slices
1. DOM-139 — explicit stock-sheet purchase cost per validated nesting group, with user prices and no automatic quote integration.
2. DOM-138 — strict/legacy marker comparison export compatibility; deferred until adapter ownership and round-trip evidence.
3. DOM-130 — hardware BOM trace persistence/export/schema compatibility; deferred until adapter ownership is available.

## DOM-136 — Strict/legacy revision integrity coverage (VERIFIED)
- Added `calculateProjectQuoteRevisionSourceIntegrityAudit` from validated source-map audit snapshots. Strict marker `1` and legacy `null` counts reconcile to `revisionCount`; ordered markers are preserved.
- Acceptance: legacy → strict v1 → legacy, deterministic output, immutable input/output, empty history and malformed marker fail-closed.
- Code/test commit [384a1f94](https://github.com/Taylan789/MobilyaCAD/commit/384a1f94a031622b3db03dc5db712e62f037d30a). Exact-SHA CI [#45275145213](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145213), QA [#45275145182](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145182), Pages [#45275145114](https://github.com/Taylan789/MobilyaCAD/actions/runs/45275145114) passed: 194 frontend + 678 domain tests, strict TS, lint 34 warnings/0 errors, build and audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-137 — Project-file append/read integrity coverage (VERIFIED)
- Project JSON v2 append/read and strict/legacy audit reconciliation are covered across two append operations. A legacy revision without the marker remains legacy; the two appended revisions are strict.
- Acceptance: ordered markers `[null, 1, 1]`, strict=2, legacy=1, revisionCount=3; previous links, numbering and input immutability.
- Code/test [commit 4f67c7d6](https://github.com/Taylan789/MobilyaCAD/commit/4f67c7d6d205f054faef866e93bc574b23bbf613); exact-SHA CI [#45292256838](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256838), QA [#45292256730](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256730), Pages [#45292256696](https://github.com/Taylan789/MobilyaCAD/actions/runs/45292256696) successful. QA: 201 frontend + 679 domain tests, strict TS, lint 34 warnings/0 errors, production build, audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-139 — Explicit nesting stock-sheet purchase cost (VERIFIED)
- API: `calculateProjectSheetNestingStockCostSummary` revalidates the supplied project cut-plan area request and calculates per-group purchase cost from exact validated sheet counts.
- User prices are explicit integer minor units per sheet with currency and optional source reference. Material ID, normalized thickness and stable group ID must match; every group requires exactly one price, unused/duplicate definitions are blocked, and currencies must be homogeneous.
- Acceptance passed: exact multi-sheet group costs and project totals; safe arithmetic/overflow; empty and blocked inputs; malformed price definitions; deterministic group ordering; immutable result/input.
- This purchase-cost summary remains separate from net-area consumption and quote totals. No inferred supplier price, waste/yield or automatic quote integration.
- Code/test [commit 538c3bd46514de1b5e0aabd7dc1e8714bdda569c](https://github.com/Taylan789/MobilyaCAD/commit/538c3bd46514de1b5e0aabd7dc1e8714bdda569c); CI [#45298432627](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432627), QA [#45298432528](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432528), Pages [#45298432481](https://github.com/Taylan789/MobilyaCAD/actions/runs/45298432481) succeeded; test site https://taylan789.github.io/MobilyaCAD/.

## Current domain queue — 24 November 2026
1. **DOM-140 VERIFIED:** explicit material-cost basis selector (net-consumption vs stock-sheet purchase), no double counting; [commit 207df9aa](https://github.com/Taylan789/MobilyaCAD/commit/207df9aa51548ab1156aed8327173f4cfc6dbc52), exact-SHA CI/QA/Pages passed. Next DOM-141 quote integration.
2. **DOM-138 DEFERRED:** strict/legacy source-integrity comparison export compatibility; adapter ownership unavailable.
3. **DOM-130 DEFERRED:** hardware BOM trace persistence/export/schema compatibility; adapter ownership unavailable.
4. **QA-003 BLOCKED:** end-to-end import/export reconciliation until INT-001/INT-002 evidence exists.


## DOM-140 — Explicit material-cost basis selection (VERIFIED)
- API `calculateProjectMaterialCostBasisSummary` accepts schema v1 and exactly one basis: `net-consumption` or `stock-sheet-purchase`, plus that basis's source report. It never requests or sums both sources.
- Net consumption uses only validated material-category lines (not hardware/labor/operations/waste/profit); line, six category and grand totals reconcile, currency matches, and incomplete price coverage yields no partial amount.
- Stock-sheet purchase uses only validated nesting-group purchase costs; sheet count × explicit per-sheet price, currency, unique source Part IDs and project totals reconcile. No supplier price or yield is inferred.
- Regression: ready net consumption, real nesting stock-cost summary, incomplete/empty input, inconsistent totals, unsupported fields/basis, deterministic output and immutability.
- Code/test [207df9aa](https://github.com/Taylan789/MobilyaCAD/commit/207df9aa51548ab1156aed8327173f4cfc6dbc52); exact-SHA CI [#45315954884](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954884), QA [#45315954813](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954813), Pages [#45315954792](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954792) all succeeded. QA: 204 frontend + 693 domain tests, strict TS/build, lint 34 warnings/0 errors, audit 0 vulnerabilities; deployed https://taylan789.github.io/MobilyaCAD/.
- Initial commit [92f361b9](https://github.com/Taylan789/MobilyaCAD/commit/92f361b9f01df1be96c064c4cf39cd045ebc7d09) had 2 QA fixture/validation failures; corrected by 207df9aa. No frontend, adapter/performance files or `main` changes.
- Next: DOM-141 versioned quote integration with the chosen basis; adapter-owned export tasks remain deferred.


## 24 Kasım 2026 07:14 TRT — DOM-141 quote material-basis integration (verification pending)

- Added one quote aggregation path for explicit panel material basis selection: net-area consumption or stock-sheet purchase.
- Net-area mode requires line-to-Part provenance and separates panel material from edge-band cost. Stock-sheet mode suppresses only panel net-area price lines, retains edge-band/hardware/work costs, and requires exact project Part coverage with matching material identity and normalized mm thickness.
- Combined category totals and grand total use safe integer arithmetic and one currency; missing provenance, partial Part coverage, wrong material/thickness or mixed currencies fail closed.
- Regression tests cover net/stock modes, edge-band preservation, panel-only stock quote, empty projects, provenance mismatch and currency mismatch.
- Verified on fix commit `2daf2046d37cc2d0aaf562c4e61da5ea455852d9`: CI and QA passed, and Pages deployment succeeded ([45326256041](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326256041)).
- Next: persist the selected basis and stock-group provenance in a backward-compatible quote pricing snapshot/revision extension; keep legacy v1 snapshots readable.


### DOM-141 first verification and correction — 24 Kasım 2026 07:23 TRT

- Commit `890f787`: CI/build/lint passed; QA shared-domain suite failed 64/622 due to a scope error in the new panel-pricing mode. The failing branch placed shared accumulators inside the optional panel-material block.
- Test-site Pages artifact build passed, but the required same-SHA CI+QA gate failed and the deploy job was skipped. No broken version was published.
- Follow-up fix keeps cost accumulators, hardware/edge-band pricing and counters available in both panel modes; only panel material line creation is conditional. All original tests remain enabled.
- DOM-141 is verified on `2daf2046d37cc2d0aaf562c4e61da5ea455852d9`: all QA/domain checks passed and Pages deployed successfully. Next: DOM-142 snapshot/revision persistence.


### DOM-141 verified delivery — 24 Kasım 2026 07:26 TRT

- Fix commit: `2daf2046d37cc2d0aaf562c4e61da5ea455852d9`.
- CI passed: [45326255975](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326255975).
- QA passed: [45326255984](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326255984): 206 unit tests + 701 shared-domain tests, strict domain type-check, lint, production build, and `npm audit --omit=dev --audit-level=high` (0 vulnerabilities).
- Pages deployment passed: [45326256041](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326256041).
- The separate UI agent's PR #187 was merged by its owner. Its exact-merge CI [45326441304](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441304), QA [45326441439](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441439) and Pages deployment [45326441274](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326441274) passed. The merged UI slice is a compact viewport room-dimension HUD; this domain agent did not touch frontend files.
- Integrated test site: https://taylan789.github.io/MobilyaCAD/ (deployed branch head `adc448d58a3c905e602515f3d4bfe207737b1c5c`; Pages run [45326675155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45326675155)).
- DOM-142 is verified on 0f72244657a3f0c940529e1f3299eb53c9b271b7; exact-SHA CI, QA and Pages passed. Next: DOM-143 — group-aware stock-sheet revision comparison and source-map audit.


## DOM-142 — Teklif snapshot'ında seçilen panel maliyet temeli ve levha provenance'ı

**Kullanıcı akışı:** Kullanıcı teklif oluştururken net panel tüketimi veya açık levha satın alma temelini seçer; teklif snapshot'ı ve proje teklif revizyonu aynı seçimi, birleşik maliyet toplamlarını ve gerekiyorsa her levha grubunun Part kaynaklarını saklar.

**Kabul kriterleri**
- Eski schemaVersion 1 teklif fiyat snapshot'ları okunmaya devam eder.
- Açık maliyet temeli seçildiğinde yalnızca yeni snapshot schemaVersion 2 olur; materialCostBasis alanı zorunludur.
- Net tüketim modunda panel satırları, kenar bandı satırları ve tüm kategori/genel toplamları teklif özetiyle bire bir uzlaşır; levha grubu listesi boş kalır.
- Levha satın alma modunda her grup; grup kimliği, malzeme kimliği, normalize edilmiş 0.1 mm kalınlık, levha adedi, açık levha birim fiyatı, grup toplamı, para birimi, varsa fiyat kaynak referansı ve sıralı/benzersiz Part kimliklerini korur.
- Grup maliyetleri panel maliyet toplamına; panel + kenar bandı material toplamına; kategori toplamları genel toplama güvenli tam sayı aritmetiğiyle eşit olmalıdır.
- Yalnızca levha satın alma maliyeti bulunan teklif, temel quoteSummary boş olsa da hazır snapshot oluşturabilir.
- Bozuk grup aritmetiği, yinelenen/eksik Part kapsamı, malzeme/kalınlık uyuşmazlığı ve para birimi tutarsızlığı snapshot üretimini engeller.
- Revizyon JSON v2 append/read round-trip'i v1 snapshot'ları da korur.

**Güvenli kapsam sınırı:** DOM-142, stock-sheet tabanlı revizyon karşılaştırmasını ve kaynak-haritası denetimini grup bazlı destek tamamlanana kadar fail-closed yapar. Bu iki tüketicinin gerçek grup maliyetini ve Part provenance'ını karşılaştırması DOM-143 kapsamıdır; mevcut UI veya export bu desteği varmış gibi sunmamalıdır.

**Doğrulama (24 Kasım 2026):** projectQuotePricingSnapshot.test.mjs gerçek nesting/stock-cost domain çıktısıyla iki maliyet temelini; projectQuoteRevisionProjectFile.test.mjs v2 revizyon round-trip'ini, bozuk grup maliyetini ve güvenli karşılaştırma/denetim bloklarını doğrular. [CI #45335196984](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335196984), [QA #45335197030](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335197030) ve [Pages #45335197060](https://github.com/Taylan789/MobilyaCAD/actions/runs/45335197060) tam olarak 0f72244657a3f0c940529e1f3299eb53c9b271b7 SHA'sında başarılıdır. QA: 208/208 unit, 706/706 domain; type-check, lint, production build ve production dependency audit başarılı.


## DOM-143 — Levha satın alma bazlı revizyon karşılaştırması ve kaynak denetimi

**Kullanıcı akışı:** Kullanıcı iki teklif revizyonunu karşılaştırdığında, net tüketim satırları gibi levha satın alma grupları da maliyet farkında görünür; hangi malzeme/kalınlık grubunun, kaç levhanın ve hangi Part kaynaklarının değiştiği doğrulanabilir.

**Kabul kriterleri**
- Snapshot v2 içindeki stock-sheet group'lar grup kimliği, malzeme, normalize 0.1 mm kalınlık, levha adedi, birim fiyat, grup toplamı, para birimi, varsa kaynak referansı ve Part kimlikleriyle karşılaştırılır.
- Panel satın alma maliyeti, material kategori toplamı ve teklif genel toplamı grup bazında uzlaşır; güvenli integer sınırı aşılırsa karşılaştırma bloklanır.
- Eklenen/silinen/değişen gruplar açık fark kayıtları üretir; Part kaynakları kaybolmaz veya tahmin edilmez.
- Source-map audit, stock-sheet Part referanslarını line-level kaynaklarla karıştırmadan ayrı ve ölçülebilir biçimde sayar.
- JSON/CSV dışa aktarımları v1 revizyonlarını geriye dönük okuyabilir; makine/CNC formatı iddiası üretmez.
- Testler aynı para birimi, fiyat değişimi, kalınlık/malzeme değişimi, Part değişimi, eksik provenance ve overflow durumlarını kapsar.

**Bağımlılık:** DOM-142 snapshot v2. Stock-sheet karşılaştırma ve source-map audit, DOM-143 otomatik doğrulaması tamamlanana kadar fail-closed kalır.


## DOM-143A — Stock-sheet source-map audit (first vertical slice)

**Status:** Verified on 12687c9b. CI and production build passed; QA passed 211/211 unit tests and 708/708 domain tests, type-check, lint and production dependency audit; exact-SHA Pages deployment passed. The earlier stale project-file assertion was corrected without weakening tests.

- The revision audit reports stock-sheet purchase groups independently from quote cost lines, including explicit material/thickness, Part provenance, sheet count, unit price, group cost, currency and optional price reference.
- Per-revision and project totals distinguish stock-sheet Part references from line-source Part references and deduplicate unique Part IDs across revisions.
- Valid stock-only revisions with an empty base quote summary are auditable without inventing quote lines.
- DOM-143B now provides a tested domain API for group-level stock-sheet comparison; the existing full quote-comparison envelope and JSON/CSV stock-sheet exports remain blocked until DOM-143C/D integrate and round-trip the group changes.


## DOM-143B — Stock-sheet group comparison core

**Status:** VERIFIED on commit b6b39177. Exact-SHA CI #45343121349, QA #45343121488 and Pages #45343121506 passed.

- Adds compareProjectQuoteRevisionStockSheetGroups as an immutable domain API over fully validated quote revision history.
- Matches persisted stock-sheet groups by stable material/thickness groupId. Price, sheet-count, Part-source and source-reference changes are changed; material or thickness identity changes are explicit removed + added records.
- Reports stock-sheet purchase-cost and sheet-count deltas separately, alongside material-category and grand-total deltas.
- Adds immutable deterministic `groupCounts` for added, removed, changed and unchanged groups. Unchanged groups are counted but omitted from the change payload.
- Requires the sum of group cost changes to equal the panel stock-purchase delta and the sum of category deltas to equal the grand-total delta; unsafe arithmetic and currency mismatch block the whole result.
- Supports a stock-only v2 revision with an empty quote line summary and a legacy v1/net-consumption revision as the other side without fabricating quote lines.
- The existing full comparison envelope and JSON/CSV stock-sheet exports remain fail-closed until DOM-143C/D integrate the result.

**Automated acceptance:** stable identity changed/removed/added coverage, Part ID and source-reference preservation, group/material/grand-total reconciliation, stock-only empty-summary comparison, legacy-v1 transition and unsupported-basis blocking. Physical stock yield, CNC and workshop fit remain outside this software-only validation.

**Next domain and integration handoffs**
1. DOM-143B1: VERIFIED on 511796f; exact-SHA CI #45352730741, QA #45352730704 (218/218 unit + 713/713 domain), Pages #45352730829 passed; domain type-check, lint, production build and production audit passed.
2. DOM-143C: backward-compatible JSON comparison serialization/parsing for stock-sheet group changes while retaining legacy comparison file versions. Adapter-owned; do not edit the comparison JSON adapter from the domain lane.
3. DOM-143D: CSV group rows and source-map provenance comparison; preserve Part IDs and explicit source references. Also adapter-owned.
4. Integration prerequisite: verify an active specialist workflow/branch/PR and file ownership before DOM-143C/D. No specialist branch is currently verified; the latest specialist job was skipped after the AI Developer free-model quota failure.
**Acceptance:** Exact-SHA CI, QA, type-check, lint, production build and Pages must pass for each published slice. DOM-143A has passed all of these gates on 12687c9b. No machine-specific CNC or nesting optimization claim is implied.


**DOM-143B1 domain extension — 24 November 2026**
- Group comparison now exposes deterministic added/removed/changed/unchanged counts while retaining the existing changed-snapshot list semantics.
- Exact-SHA CI, QA and Pages all passed on [511796f](https://github.com/Taylan789/MobilyaCAD/commit/511796f60b5274ee8cacf93a85f5ef1944f8df66); 218 unit + 713 domain tests, strict domain type-check, lint, production build and production dependency audit (0 vulnerabilities).
- Next independent domain slice: return a stable changed-field reason list for each matched group (sheet count, per-sheet price, group cost, Part IDs, optional source reference); JSON/CSV integration remains with the specialist adapter owner.


## DOM-143B2 — Levha grubu alan bazlı fark nedenleri

**Durum:** VERIFIED on [commit a294cb7](https://github.com/Taylan789/MobilyaCAD/commit/a294cb7bd2bd2546f7c2e10e9464f64c2b13d182). Exact-SHA CI [#45357651839](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651839), QA [#45357651760](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651760) and Pages [#45357651858](https://github.com/Taylan789/MobilyaCAD/actions/runs/45357651858) passed.

- Eşleşen levha grubunun değişiklik kaydı, kaynak Part kimlikleri, levha adedi, levha birim fiyatı, grup maliyeti ve isteğe bağlı fiyat kaynağı referansından hangilerinin değiştiğini sabit sıralı anahtarlarla açıklar.
- Malzeme/kalınlık kimlik değişiklikleri kaldırma + ekleme olarak kalır; eklenen/kaldırılan gruplarda changedFields boş dizidir.
- QA: 218/218 unit + 713/713 domain tests; strict domain type-check, lint 34 warnings/0 errors, production build and production dependency audit 0 vulnerabilities.
- JSON/CSV karşılaştırma adaptörleri ayrı entegrasyon/performance ajanının sahipliğinde kalır. Doğrulanmış uzman branch/job/PR bulunmadan adapter dosyalarına dokunulmaz.
- DOM-143C-domain tam revizyon karşılaştırma zarfına entegre edildi; exact-SHA CI/QA/Pages doğrulaması bekleniyor. JSON/CSV adapter dosyaları ayrı sahiplikte kalır.


## DOM-143C-domain — Tam teklif revizyon zarfında levha grubu farkları

**Durum:** VERIFIED on [0c75f4b](https://github.com/Taylan789/MobilyaCAD/commit/0c75f4b1e3a1008df2e4bad688b1527bc15b74d3). Exact-SHA CI [#45364406712](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406712), QA [#45364406673](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406673) and Pages [#45364406852](https://github.com/Taylan789/MobilyaCAD/actions/runs/45364406852) passed. QA: 218/218 unit + 715/715 domain, strict TS, lint, production build, production audit 0 vulnerabilities. Bu domain dilimidir; JSON/CSV adaptörlerinin tamamlandığı anlamına gelmez.

- `compareProjectQuoteRevisions` artık en az bir revizyon `stock-sheet-purchase` temeli kullandığında doğrulanmış grup karşılaştırmasını `stockSheetGroupComparison` altında taşır.
- Üst zarfın para birimi, başlangıç/hedef toplamları ve kategori farkları alt grup karşılaştırmasıyla aynı kaynaktan gelir; kategori farkları genel toplam farkına tekrar uzlaştırılır.
- Var olan line-level `lineChanges` korunur. Stok levha grupları sahte maliyet satırlarına çevrilmez.
- Validator tarafından kabul edilmiş boş stock-only quote snapshot'ları `lineChanges: []` döndürür; group delta alanı yine mevcuttur.
- Herhangi bir grup, para birimi veya integer/toplam uzlaşmazlığında tam karşılaştırma fail-closed olur; kısmi comparison nesnesi dönmez.
- JSON/CSV comparison serializer'ları yeni nested alanı henüz kabul etmez. Strict schema nedeniyle export fail-closed kalır; adapter round-trip işi INT-002 / specialist sahibine aittir.

**Kabul kanıtı:** Karışık stok grubu + hardware satır değişikliği, stock-only boş quote, üst/alt toplam uzlaşması, immutable sonuç ve input immutability için iki yeni domain regresyon testi. Fiziksel levha verimi/CNC/atölye doğrulaması kapsam dışıdır.

**Sıradaki 3–5 küçük görev**
1. DOM-146: revizyon zinciri kaynak/önceki-revizyon bağlantılarının import ve geri yükleme sırasında tutarlılığını denetle.
2. DOM-143C-json / INT-002: stock-sheet group comparison alanlarını JSON comparison şemasına geriye uyumlu ekle; yalnızca doğrulanmış uzman branch/PR ve dosya sahipliği varsa.
3. DOM-143D: CSV'de deterministik stock-sheet group rows ve Part/source-reference provenance deltas — adapter sahibi kapsamı; uzman sahiplik kanıtı olmadan bu dosyalara dokunma.
4. PERF-001: ölçülebilir 2D/3D baseline ve profiling; yalnızca entegrasyon/performance uzmanının sahiplenilmiş dosyalarında.
5. QA-003: INT-001 ve INT-002 kanıtları tamamlandığında uçtan uca export/data-flow denetimi.


**DOM-143C-domain QA düzeltme notu — 24 Kasım 2026**
- İlk QA, üretim karşılaştırma kodundan değil iki test beklentisinden başarısız oldu: karışık fixture'da hardware satırı bulunmuyor (labor satırı var) ve project-file testi eski blocked sonucunu bekliyordu.
- Testler mevcut gerçek fixture ve yeni ready API sözleşmesiyle hizalandı; hiçbir test kaldırılmadı veya zayıflatılmadı.
- Pages exact-SHA gate, QA başarısız olduğu için deployment'ı atladı. Düzeltme doğrulanmadan test sitesi yeni SHA'ya taşınmış sayılmaz.


**DOM-143C-domain ikinci QA bulgusu — 24 Kasım 2026**
- İlk düzeltmeden sonra 714/715 domain testi geçti. Tek kalan test fixture hatası, labor line toplamı güncellenirken aynı revizyonun `materialCostBasis.categoryTotalsMinor.labor` kaynağının güncellenmemesiydi.
- Fixture artık quoteSummary ve materialCostBasis kaynaklarını birlikte uzlaştırıyor; üretim kodu değiştirilmedi ve assertion gevşetilmedi.
- QA tekrar başarılı olmadan Pages deployment yapılmayacak.


**DOM-143C-domain doğrulama sonucu — 24 Kasım 2026**
- Final SHA 0c75f4b1e3a1008df2e4bad688b1527bc15b74d3 exact-SHA CI/QA/Pages kontrollerinin tümünü geçti. QA: 218/218 unit + 715/715 domain tests; strict domain TypeScript, lint, production build ve production audit 0 vulnerability.
- Test sitesi exact verified SHA üzerinden deploy edildi: https://taylan789.github.io/MobilyaCAD/.
- İlk iki QA başarısızlığı yalnızca fixture/assertion uyumsuzluğuydu; başarısız SHA'lar deploy edilmedi ve hiçbir test zayıflatılmadı.
- JSON/CSV adapter ve fiziksel CNC doğrulaması hâlâ ayrı sahiplik/önkoşul gerektirir.


## DOM-144 — Cross-revision stock-sheet Part ownership

**Status:** VERIFIED on [correction commit 90523051](https://github.com/Taylan789/MobilyaCAD/commit/90523051fafadda9001e7ad405628b5a63e8ff8e). Exact-SHA CI [#45376004983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004983), QA [#45376004882](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376004882), Pages [#45376005022](https://github.com/Taylan789/MobilyaCAD/actions/runs/45376005022) passed.

**User flow:** When a user compares stock-sheet purchase revisions, the domain result explains which source Parts were added, removed, kept in the same material/thickness group or moved to a different group. The same saved history can contain three or more revisions; consecutive comparisons must preserve the Part identity.

**Acceptance criteria**
- Expose unique from/to stock-sheet Part counts and added, removed, moved and unchanged counts.
- Emit only added/removed/moved Part records, sorted by Part ID; a moved Part retains one identity with both group IDs.
- Reconcile from = removed + moved + unchanged and to = added + moved + unchanged; block duplicate Part ownership across groups.
- Keep source-map audit revision-ordered and immutable; verify a three-revision history with two consecutive group transitions.
- Do not infer missing project Parts, geometry, machine operations, prices or CNC coordinates from quote history.

**Boundaries and risks:** The comparison describes the Part IDs persisted in stock-sheet groups; it is not a completeness check against the live project Part snapshot. JSON/CSV comparison serializers remain specialist-owned and fail-closed until round-trip tests pass. No frontend or physical production claim is implied.


**DOM-144 QA correction — 24 Kasım 2026**
- Exact-SHA CI passed on implementation commit 65060046. QA ran 716 domain tests: 715 passed; the new regression expected two unchanged Parts but the fixture contains three (part-a, part-c, part-stay).
- The implementation's from/to counts and moved/added/removed results were correct; only the test expectation is corrected to 3. No test is removed or weakened.
- Pages site build succeeded, but the exact-SHA QA gate correctly skipped deployment for the failed implementation SHA. The previously verified site remains unchanged until the correction SHA passes all gates.


**DOM-144 verification result — 24 Kasım 2026**
- Final correction SHA 90523051 passed exact-SHA CI #45376004983, QA #45376004882 and Pages deployment #45376005022.
- QA: 221/221 unit + 716/716 shared-domain tests; strict domain TypeScript, lint, production build and production dependency audit (0 production vulnerabilities).
- Test site deployed from the verified correction SHA: https://taylan789.github.io/MobilyaCAD/.
- The initial implementation SHA 65060046 was not deployed because one test expectation was wrong; the correction changed only the expected unchanged Part count from 2 to 3. No tests were removed or weakened.


## DOM-145 — Bounded quote revision history and fail-closed JSON limits

**Status:** VERIFIED on [commit ea8d1d6](https://github.com/Taylan789/MobilyaCAD/commit/ea8d1d6dbb25c9737347c66a357981c56a505cbc); exact-SHA CI [#45388338099](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338099), QA [#45388338060](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338060) and Pages [#45388338056](https://github.com/Taylan789/MobilyaCAD/actions/runs/45388338056) passed. QA: 225/225 unit + 718/718 domain tests, strict domain TypeScript, lint 34 warnings/0 errors, production build and production dependency audit (0 vulnerabilities).

**User flow:** A project or standalone history import/export can carry a long quote-revision chain without allowing unbounded validation work or oversized JSON payloads to be accepted or emitted.

**Acceptance criteria**
- Validate no more than 2,000 revisions in one history; over-limit input returns `blocked`, `history: null` and a diagnostic before per-revision snapshot validation begins.
- Enforce a 1 MiB UTF-8 byte limit on standalone quote-history JSON serialization and parsing; parser checks the byte limit before JSON parsing.
- A blocked export returns `json: null`; a blocked import returns `history: null`. No prefix, partial history, truncation or automatic repair is returned.
- Preserve v1 schema shape and all existing histories within the documented resource limits; test multi-byte UTF-8 strings where JS string length is smaller than encoded byte length.

**Boundaries and risks:** The limits are explicit resource guards, not history pruning, compression, retention, archive splitting or automatic persistence. Project-v2 embedded history inherits the revision-count limit through the shared validator. JSON/CSV stock-sheet comparison serializers remain specialist-owned and fail-closed; this task does not alter them. No frontend, CNC/machine or physical-production claim is implied.


## DOM-146 — Revizyon zinciri import/restore bütünlüğü

**Durum:** VERIFIED — [commit b0bf259](https://github.com/Taylan789/MobilyaCAD/commit/b0bf259cb5b68b61ad69f3c2bb4ba6963cac3992); exact-SHA CI [#45396661732](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661732), QA [#45396661870](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661870) ve Pages [#45396661726](https://github.com/Taylan789/MobilyaCAD/actions/runs/45396661726) başarılı. QA: 225/225 frontend + 720/720 domain testi; strict TypeScript, lint 34 warnings/0 errors, production build ve production audit 0 vulnerabilities.

**Kullanıcı akışı:** Kullanıcı standalone teklif geçmişini boş bir v2 projeye aktarır veya kaydedilmiş v2 projeyi açar. Her iki yol da önceki revizyon ve fiyat snapshot kaynak bağlantılarını aynı domain doğrulayıcısından geçirir.

**Kabul kriterleri**
- İkinci ve sonraki her revizyonun `previousRevisionId` alanı hemen önceki revizyonun kimliğiyle eşleşmelidir; kopuk/fork edilmiş zincir import ve restore sırasında reddedilir.
- `pricingSnapshot.quoteSummary.lineSources[].costLineId` aynı snapshot'taki maliyet satırının `id` alanıyla eşleşmelidir; bozuk kaynak bağlantısı reddedilir.
- Başarısız import `project: null` ve `history: null` döndürür, hedef projeyi değiştirmez. Başarısız restore `history: null` döndürür ve giriş nesnesini değiştirmez.
- Geçerli eski v1 geçmişler ve v2 proje zarfı değişmeden kalır; yeni alan veya şema sürümü eklenmez.

**Sınırlar ve riskler:** Bu testler teklif geçmişi içindeki kaynak/önceki-revizyon bağlantılarını doğrular. Güncel proje Part ağacının veya 3D geometri kaynaklarının geçmiş snapshot'ıyla birebir aynı olduğunu, nesting verimini ya da CNC makine uyumluluğunu kanıtlamaz.

## DOM-147 — JSON v2 proje append derin kopya / immutability sınırı

**Durum:** VERIFIED — [commit 61184f6](https://github.com/Taylan789/MobilyaCAD/commit/61184f659213ce56b2e4c7c961ba58f963366f4d); exact-SHA CI [#45405142317](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142317), QA [#45405142329](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142329) ve Pages [#45405142314](https://github.com/Taylan789/MobilyaCAD/actions/runs/45405142314) başarılı. QA: 225/225 frontend + 722/722 domain testi; strict TypeScript, lint 34 warnings/0 errors, production build ve production audit 0 vulnerabilities.

**Kullanıcı akışı:** Kullanıcı mevcut JSON v2 projesine yeni teklif revizyonu ekler. Dönen proje, mevcut proje ağacının bağımsız ve değiştirilemez snapshot'ı olur; sonradan yapılan değişiklikler önceki proje verisini veya yeni sonucu etkileyemez.

**Kabul kriterleri**
- Başarılı append, proje zarfındaki tüm geçerli JSON object/array değerlerini derin kopyalar ve dondurur; `room`, `furniture`, `materials` ve özel metadata için girişle nested referans paylaşımı olmaz.
- Geçerli bilinmeyen JSON alanları korunur; yeni teklif geçmişi doğrulanmış ve immutable kalır.
- Döngüsel veya JSON dışı envelope `blocked`, `project: null`, `history: null` döndürür; giriş değişmez ve kısmi proje üretilmez.
- JSON v2 şeması ve legacy v1 davranışı değişmez; fiyat/ölçü/üretim hesapları ve export adapter'ları kapsam dışıdır.

**Sınırlar ve riskler:** Derin kopya maliyeti proje zarfı boyutuyla doğrusal artar. Bu dilim fiziksel üretim, nesting verimi veya CNC makine uyumluluğu iddiası taşımaz.

**Sıradaki 3–5 küçük görev**
1. DOM-148: append zarfı JSON sınırlarında `__proto__`, null-prototype kayıt, sparse array, accessor, symbol ve non-enumerable alanlar için adversarial regresyonları ekle.
2. DOM-143C-json: stock-sheet group comparison JSON şemasını yalnızca gerçek entegrasyon/performans uzmanı sahipliği ve round-trip kanıtı geldiğinde genişlet.
3. INT-002: JSON/CSV adapter round-trip ve miktar/geometri sadakati testleri — uzman agent sahipliğinde.
4. PERF-001: 2D/3D veri akışında tekrarlanabilir baseline ve profiling — uzman agent sahipliğinde.
5. QA-003: INT-001 ve INT-002 kanıtı tamamlandığında uçtan uca export/data-flow denetimi.


## DOM-148 — JSON v2 append zarfı adversarial sınırları

**Durum:** VERIFIED — [implementation commit 7f050c5](https://github.com/Taylan789/MobilyaCAD/commit/7f050c53ca1d68394280fa488bc6f1335be8e438); exact-SHA CI [#45415951229](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951229), QA [#45415951209](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951209) ve Pages [#45415951415](https://github.com/Taylan789/MobilyaCAD/actions/runs/45415951415) başarılı.

**Kullanıcı akışı:** Kullanıcı teklif revizyonunu JSON v2 proje dosyasına ekler. Sistem özel JavaScript nesne özelliklerini sessizce kaybetmeden veya getter çalıştırmadan ya güvenli JSON snapshot üretir ya da işlemi atomik olarak engeller.

**Kabul kriterleri**
- Null-prototype düz kayıtlar kabul edilir; own __proto__ anahtarı sıradan veri olarak korunur ve prototype pollution oluşturmaz.
- Sparse array, object/array accessor, symbol ve enumerable olmayan own alanlar reddedilir.
- Accessor getter'ları çalıştırılmaz; blocked sonuç project: null ve history: null verir, kaynak zarfı değiştirmez.
- Legacy v1 ve JSON v2 şemaları değişmez; production behavior değişikliği yoktur.

**QA kanıtı:** 228/228 frontend unit + 726/726 domain test; dört DOM-148 regresyonu geçti; strict TypeScript, lint 34 warnings/0 errors, production build ve production dependency audit 0 vulnerabilities. Test sitesi exact SHA üzerinden https://taylan789.github.io/MobilyaCAD/ adresine deploy edildi.

**Sınırlar:** Bu dilim test ve sözleşme sertleştirmesidir; serializer şeması, CNC çıktısı, makine standardı, malzeme/fiyat varsayımı veya fiziksel üretim onayı eklemez.

## DOM-149 — JSON v2 proje zarfı kaynak sınırları

**Durum:** VERIFIED — [correction commit 4c9c14c6](https://github.com/Taylan789/MobilyaCAD/commit/4c9c14c6acb3d059d7fe91783a4b931f54c06542); exact-SHA CI [#45429499653](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429499653), QA [#45429500219](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429500219), Pages [#45429500230](https://github.com/Taylan789/MobilyaCAD/actions/runs/45429500230) successful.

**Kullanıcı akışı:** Kullanıcı teklif revizyonunu proje JSON v2 dosyasına ekler veya standalone revizyon geçmişini boş bir v2 projeye aktarır. Sistem büyük ya da aşırı derin zarfı kısmi snapshot oluşturmadan reddeder.

**Kabul kriterleri**
- Append/import girişindeki tüm proje zarfı JSON-uyumlu UTF-8 serileştirme boyutunda en fazla 16 MiB ve en fazla 64 iç içe nesne/dizi seviyesi içermelidir.
- Limit, JS UTF-16 string uzunluğuna değil JSON kaçışları dahil UTF-8 byte sayısına dayanır.
- Append/import sonucu, yeni teklif geçmişi eklendikten sonra aynı boyut/derinlik sınırlarından tekrar geçirilir; sınır aşımında `blocked`, `project: null`, `history: null` döner ve kaynak nesne değişmez.
- Standalone teklif geçmişi dosyasının 1 MiB limiti ve geçmişin 2.000 revizyon sınırı bağımsız kalır; proje zarfına 1 MiB sınırı genellenmez.
- Legacy JSON v1 okuma davranışı ve mevcut v2 şeması değişmez.

**Sınırlar ve riskler:** 16 MiB ve 64 seviye, büyük oda/mobilya/katalog metadata'sına alan bırakırken recursive kopya maliyetini sınırlayan açık domain sınırlarıdır. Otomatik kırpma, geçmiş silme, sıkıştırma veya CNC/üretim güvenliği iddiası yoktur; gerçek proje kullanım ölçümleri arttıkça limitler ayrı bir ürün kararıyla gözden geçirilebilir.

**Sonraki 3–5 küçük görev**
1. DOM-151: ana proje parser/save-load akışında quote-history extension ve unknown envelope metadata round-trip sadakatini doğrula; JSON v1 uyumluluğunu koru.
2. DOM-143C-json: nested stock-sheet group comparison JSON round-trip — yalnızca gerçek specialist branch/PR ve sahiplik kanıtı geldiğinde.
3. INT-002: JSON/CSV adapter geometry/quantity round-trip — Entegrasyon/Performans sahipliğinde.
4. PERF-001: 2D/3D veri akışı için tekrarlanabilir baseline ve profiling — uzman agent sahipliğinde.
5. QA-003: INT-001/INT-002 kanıtı tamamlandıktan sonra uçtan uca export/data-flow denetimi.


## DOM-150 — JSON v2 teklif geçmişi doğrudan okuma kaynak sınırları

**Durum:** VERIFIED — [commit 36d38ae](https://github.com/Taylan789/MobilyaCAD/commit/36d38aec3199a2b76f9397bcfb4a30bd9b20fe84); CI [#45441047955](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047955), QA [#45441047792](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047792) ve Pages [#45441047926](https://github.com/Taylan789/MobilyaCAD/actions/runs/45441047926) başarılı.

**Kullanıcı akışı:** Uygulama mevcut JSON v2 proje dosyasından teklif geçmişini doğrudan okur. Büyük, aşırı derin veya JSON dışı descriptor içeren zarf kısmi geçmiş üretmeden bloklanır.

**Kabul kriterleri**
- Read API, geçmiş doğrulamasından önce tam v2 zarfına 16 MiB UTF-8 JSON ve 64 nested object/array seviyesi limitlerini uygular.
- Tam sınırlar kabul edilir; bir byte veya bir seviye aşımı fail-closed olur, `projectId: null` ve `history: null` döner, kaynak nesne değişmez.
- Accessor getter çalıştırılmaz; JSON dışı descriptor'lar reddedilir.
- Legacy v1, geçmiş alanı olmadan `legacy` sonucunu korur; v1 içine history extension eklenmişse reddedilir.
- Mevcut v2 şeması, import sonucu ve standalone history 1 MiB / 2.000 revision limitleri değişmez. Import path zaten hedef ve merged envelope limitlerini uygular.
- Internal append/import history validation, önceden güvenli biçimde clone edilmiş envelope için gereksiz ikinci kaynak taramasını atlar; final merged envelope kontrolü korunur.

**Sınırlar ve riskler:** Bu API yalnızca quote-history extension'ını okur; tam room/furniture/material schema validation ana project parser'ına aittir. Otomatik kırpma, history silme, yeni schema version, CNC veya fiziksel üretim onayı eklenmez.


**QA kanıtı:** 239/239 frontend unit + 733/733 domain test; exact UTF-8/depth/getter regresyonları geçti; strict TypeScript, lint 36 warnings/0 errors, production build ve production dependency audit (0 vulnerabilities) başarılı. Test sitesi exact verified SHA üzerinden https://taylan789.github.io/MobilyaCAD/ adresine deploy edildi.


## DOM-151 — JSON v2 proje zarfında teklif geçmişi JSON kalıcılığı

**Durum:** DOMAIN SLICE VERIFIED — [implementation 748d9aa4](https://github.com/Taylan789/MobilyaCAD/commit/748d9aa4c2101d62fb137532b4d2408ec9193900), [fixture correction 640dbf51](https://github.com/Taylan789/MobilyaCAD/commit/640dbf51c225b5595fa7c706901f4749bc8cc138); exact-SHA CI [#45457153776](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153776), QA [#45457153728](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153728), Pages [#45457153747](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153747) başarılı.

**Kullanıcı akışı:** Proje v2 zarfına iki teklif revizyonu eklenir, bütün proje JSON olarak kaydedilip yeniden parse edilir; teklif geçmişi ve gelecekteki modüllere ait bilinmeyen metadata aynı kalır. Yeniden yüklenen projeye üçüncü revizyon eklenebilir ve önceki revizyon zinciri devam eder.

**Kabul kriterleri**
- appendProjectQuoteRevisionToProjectFile ile üretilen v2 zarfı JSON.stringify → JSON.parse sonrasında aynı doğrulanmış revizyon geçmişini döndürür.
- Bilinmeyen nested metadata, bilinmeyen top-level alanlar ve own __proto__ veri anahtarı normal JSON verisi olarak korunur; prototype pollution oluşmaz.
- Yeniden yüklenen zarfa eklenen üçüncü revizyon doğru previousRevisionId bağlantısını korur ve ikinci JSON round-trip sonrasında da doğrulanır.
- JSON v1, geçmiş alanı yokken legacy sonucunu korur; v1 içine quoteRevisionHistory eklenmesi fail-closed kalır.
- Bu test yalnızca domain quote-history envelope katmanını doğrular; tam room/furniture/material schema validation iddiası taşımaz.

**Sahiplik sınırı ve açık entegrasyon:** frontend/src/engine/projectFile.ts halen format v1 kabul ediyor ve bilinen alanlardan yeni sonuç nesnesi kuruyor; JSON v2 quote history ve bilinmeyen üst seviye alanlar editörün save/open akışına henüz bağlı değil. frontend/** UI ajanının sahipliğinde olduğundan bu turda değiştirilmedi. INT-003, UI sahibine açık entegrasyon görevi olarak eklendi. Bu domain testi tek başına editörde uçtan uca save/load tamamlandı anlamına gelmez.

**Sıradaki 3–5 küçük görev**
1. INT-003: UI sahibinin v2 proje parser/save/open entegrasyonu; v1 legacy testleri ve unknown metadata round-trip'i koru.
2. DOM-153: INT-003 sonrasında gerçek editör v2 dosyasıyla append/save/reopen/append round-trip kabul testini genişlet.
3. INT-002: JSON/CSV adapter geometry/quantity round-trip — yalnızca doğrulanmış Integration/Performance uzmanı sahipliğinde.
4. PERF-001: 2D/3D profiling ve tekrarlanabilir performans baseline'ı — yalnızca uzman sahipliğinde.
5. QA-003: INT-001/INT-002/INT-003 kanıtları tamamlandığında uçtan uca export/data-flow denetimi.

**QA kanıtı:** 242/242 frontend unit + 735/735 domain test; DOM-151'in iki yeni testi geçti. Strict domain TypeScript, lint 36 uyarı / 0 hata, production build ve production dependency audit (0 açık production vulnerability) başarılı. Test sitesi exact-SHA deployment ile https://taylan789.github.io/MobilyaCAD/ adresine güncellendi.

**İlk doğrulama düzeltmesi:** İlk deneme commit'i 748d9aa4'te fixture, teklif snapshot'ını boş ürettiği için QA 733/734 ile başarısız oldu; logdaki status mismatch incelendi. Fixture'a açık test quote adjustment eklendi; test silinmedi veya gevşetilmedi. 640dbf51 düzeltmesi sonrası exact-SHA QA 735/735 geçti.

## DOM-152 — JSON v2 zarf discriminator alanlarında getter güvenliği

**Durum:** VERIFIED — [commit dd806171](https://github.com/Taylan789/MobilyaCAD/commit/dd8061718c88b2e0ddad2f6994a64a3362c88726); CI [#45482452559](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452559), QA [#45482452470](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452470) ve Pages [#45482452461](https://github.com/Taylan789/MobilyaCAD/actions/runs/45482452461) başarılı.

**Kullanıcı akışı:** Domain quote-history read/append API'leri proje zarfının kimlik ve sürüm alanlarını inceler. JSON dışı JavaScript nesnesi own veya inherited getter ile bu alanları sağlıyorsa API getter'ı çalıştırmadan işlemi engeller.

**Kabul kriterleri**
- `format`, `formatVersion` ve v2 `projectId` yalnızca own, enumerable data descriptor üzerinden okunur.
- Own accessor ve inherited accessor her iki public girişte de `blocked` üretir; getter çağrı sayısı sıfırdır.
- Blocked read geçmiş döndürmez; blocked append `project: null` ve `history: null` döndürür, kaynak nesne değiştirilmez.
- Normal v1 legacy okuma ve geçerli v2 append/read davranışı değişmez.
- Tam proje şeması doğrulaması ve editör save/open entegrasyonu bu domain korumasının kapsamı dışındadır; INT-003 UI sahibindedir.

**Sonraki bağımlı iş:** INT-003 tamamlandıktan sonra DOM-153 editörün gerçek save/reopen round-trip akışını doğrular. Bağımsız domain güvenlik işi DOM-154, doğrudan teklif revizyon API girdilerindeki accessor yürütülmesini ayrıca kapatır.


## DOM-154 — Teklif revizyon API girdilerinde descriptor güvenliği

**Durum:** VERIFIED — implementation [6ecde75](https://github.com/Taylan789/MobilyaCAD/commit/6ecde75d272e7337b7f73b6955eacf1e96d64594) and boundary correction [f5d8581](https://github.com/Taylan789/MobilyaCAD/commit/f5d8581d9dd250dacd410136a0755d693dc18c98); final exact-SHA CI [#45497019522](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019522), QA [#45497019530](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019530) and Pages [#45497019534](https://github.com/Taylan789/MobilyaCAD/actions/runs/45497019534) successful.

**Kullanıcı akışı:** Teklif revizyon geçmişi doğrulama, ilk revizyon oluşturma ve append API'leri doğrudan JavaScript nesnesi alabilir. Bu nesnelerdeki own/inherited accessor alanları doğrulama sırasında kod çalıştırmamalıdır.

**Kabul kriterleri**
- Public history/create/append girişleri alan okumadan önce own enumerable data descriptor'larından güvenli bir kopya üretir.
- Own, inherited ve nested accessor getter çağrıları sıfırdır; işlem blocked ve kısmi geçmişsiz sonuç verir.
- Null-prototype kopya, Object.prototype üzerinden gelen eksik opsiyonel alanları yok sayar; custom prototype, symbol, non-enumerable, sparse array, cycle ve JSON dışı değerler reddedilir.
- Geçerli geçmiş, create ve append sonuçları ile JSON v1/v2 davranışı değişmez; opsiyonel own undefined değerleri korunur.
- Root dahil toplam 64 object/array seviyesi kabul edilir; 65. seviye bloklanır. Mevcut project-v2 16 MiB ve standalone history 1 MiB sınırları değişmez.

**Sınırlar:** Bu güvenlik katmanı Proxy trap'lerinin çalıştırılmasını engellediği iddiası taşımaz; JavaScript Proxy reflection trap'leri descriptor incelemesi sırasında çalışabilir. CNC, üretici standardı ve UI save/open entegrasyonu kapsam dışıdır.


## DOM-155 — Teklif revizyon sayım sınırını derin kopya öncesinde uygula

**Durum:** VERIFIED — [commit 9e8e20f](https://github.com/Taylan789/MobilyaCAD/commit/9e8e20fb0f706c05229612cb7d9e3415cf17ef72); CI [#45498324216](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324216), QA [#45498324252](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324252), Pages [#45498324257](https://github.com/Taylan789/MobilyaCAD/actions/runs/45498324257) all successful. QA: 245/245 frontend + 740/740 domain; strict TypeScript, lint 36 warnings/0 errors, production build, production audit 0 vulnerabilities; test site deployed.

**Sorun:** Geçmişin 2.000 revizyon sınırı, güvenilmeyen girdinin derin kopyası oluşturulduktan sonra kontrol ediliyordu. Çok büyük doğrudan API girdilerinde sınır, kopyalama maliyetini önlemiyordu.

**Dikey dilim:** `validateProjectQuoteRevisionHistory`, yalnızca own enumerable data descriptor üzerinden `revisions` dizisini bulur ve dizinin own `length` descriptor'ını okur. 2.000'i aşan geçmiş, nested revizyon payload'ları kopyalanmadan fail-closed reddedilir. Accessor-backed `revisions` getter'ı çalıştırılmaz. Mevcut kopyalama ve şema doğrulaması savunma katmanı olarak korunur.

**Kabul kriterleri**
- Tam 2.000 kayıt preflight tarafından reddedilmez; sonraki normal şema doğrulamasına ilerler.
- 2.001 kayıt, ilk revizyondaki nested accessor descriptor'ına bakılmadan 2.000 sınır mesajıyla reddedilir.
- Own accessor-backed `revisions` getter çağrı sayısı sıfırdır; blocked sonuçta history null kalır.
- JSON v1/v2 şemaları, standalone 1 MiB ve project-v2 16 MiB byte limitleri değişmez.

**Bilinen sınır:** Proxy reflection trap'leri bu API garantisinin dışındadır. Bu değişiklik byte-limitlerinin veya UI save/open entegrasyonunun yerine geçmez.

**Sonraki işler:** INT-003 UI sahibinin parser/save/open entegrasyonu; ardından DOM-153 gerçek editör append/save/reopen/append round-trip. INT-002/PERF-001 adapter ve profiling işleri uzman sahibinde kalır.


## 25 Kasım 2026 — DOM-156: teklif geçmişi append kapasite kontrolü

**Durum:** VERIFIED — [commit e4daf7fa](https://github.com/Taylan789/MobilyaCAD/commit/e4daf7fad89aa5ef15ee2f85f3f00e14ce42894e); [CI #45510837681](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837681), [QA #45510837534](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837534), [Pages #45510837542](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837542) başarılı. QA 245 frontend + 741 domain testi; strict TS, lint 36 uyarı/0 hata, production build ve production audit 0 zafiyet.

- `appendProjectQuoteRevision`, mevcut geçmiş 2.000 kayıt olduğunda yeni revizyon snapshot'ını veya geçmiş girdilerini kopyalamadan önce işlemi bloklar.
- Okuma/doğrulama amacıyla tam 2.000 kayıtlı geçmiş hâlâ kabul edilir; yalnızca 2.001'inci kaydı ekleme girişimi reddedilir.
- Kabul kriteri: tam kapasitede mevcut geçmişteki ilk kayıt getter'ı ve yeni snapshot getter'ı hiç çalışmaz; `history: null` döner; kaynak dizi değişmez.
- Geriye uyumluluk: JSON v1/v2 şemaları, standalone dosya byte sınırı, mm/adet/maliyet hesapları değişmez.
- Sınır: Proxy reflection trap'leri JavaScript descriptor API'lerinin doğası gereği engellenemez. Fiziksel CNC/atölye doğrulaması bu güvenlik dilimiyle ilgili değildir.

## DOM-157 — JSON v2 proje append kapasite ön kontrolü

**Durum:** VERIFIED — [commit 9a109959](https://github.com/Taylan789/MobilyaCAD/commit/9a10995914e6d36cbd954acee3565b263a521701). CI [#45532828711](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532828711), QA [#45532829097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532829097) and Pages [#45532828671](https://github.com/Taylan789/MobilyaCAD/actions/runs/45532828671) passed; 259 frontend + 742 domain tests, strict TS, lint 36 warnings/0 errors, production build, production audit 0 vulnerabilities; test site deployed.

- Project v2 append now reads the own data descriptor for `quoteRevisionHistory` and checks the existing `revisions` array length before copying the complete project envelope.
- At the 2,000-revision cap, the operation returns `blocked` before traversing nested revision entries, reading the incoming revision, or reaching the 16 MiB envelope clone.
- Acceptance: an oversized envelope plus a full sparse history returns the revision-cap diagnostic first; existing-entry and incoming-revision getters remain uncalled; no partial project/history is returned and the source references remain unchanged.
- Compatibility: valid 2,000-revision histories remain readable/exportable; only an additional append is blocked. JSON v1, standalone 1 MiB history files, mm/quantity/cost calculations and CNC/adapter contracts are unchanged.
- Boundary: proxy reflection traps remain outside the guarantee; physical CNC validation is unrelated to this data-safety slice.

## DOM-158 — JSON v2 standalone history import preflight

**Durum:** VERIFIED — [commit 8b5d2fda](https://github.com/Taylan789/MobilyaCAD/commit/8b5d2fdacc06825b568c944857a1da7aa14357e4); [CI #45542323197](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323197), [QA #45542323156](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323156) and [Pages #45542323163](https://github.com/Taylan789/MobilyaCAD/actions/runs/45542323163) all successful. QA 259 frontend + 745 domain tests; strict TypeScript, lint 36 warnings/0 errors, production build and production audit 0 vulnerabilities; exact-SHA test-site deployment.

- Hedef proje kendi `quoteRevisionHistory` alanını taşıyorsa alanın own enumerable data descriptor'ı okunur; accessor getter çalıştırılmaz.
- Geçmiş, hedef `projectId` ile doğrulanır. Dolu geçmiş varsa standalone dosya parse edilmeden ve 16 MiB'ye kadar çıkabilen diğer proje alanları kopyalanmadan import engellenir.
- Geçerli boş geçmişe import ve JSON v1 legacy reddi korunur; başarısız sonuçta proje/history kısmi döndürülmez, kaynak proje değiştirilmez.
- Otomatik kabul: büyük zarf + dolu geçmişte dolu-geçmiş tanısı kaynak sınırı tanısından önce gelir; accessor çağrı sayısı sıfırdır; boş geçmiş import'u ready, v1 import'u blocked olur.

**Sıradaki küçük işler**
1. INT-003 — UI sahibinin JSON v2 parser/save/open entegrasyonunu tamamlamasını takip et; frontend dosyalarına dokunma ve draft PR #206'yı merge etme.
2. INT-003 — UI sahibinin JSON v2 parser/save/open entegrasyonunu tamamlamasını takip et; frontend dosyalarına dokunma ve draft PR #206'yı merge etme.
3. DOM-153 — INT-003 tamamlandıktan sonra editör append → save → reopen → append round-trip sözleşmesini test et.
4. DOM-164 — nested quote adjustment ve diğer public quote input sınırlarını audit et; sahiplik dışı adapter dosyalarına dokunma.
5. PERF-001 / INT-002 — specialist-owned adapter/profile işleri için gerçek etkin branch/PR ve ölçüm kanıtı bekle; disabled job'ı varmış gibi sunma.

## DOM-159 — Legacy v1 zarfı reflection hatalarını fail-closed yönet

**Durum:** VERIFIED — [code/test commit 585a4d4a](https://github.com/Taylan789/MobilyaCAD/commit/585a4d4a01c4e097ca63a06bedcd86be58c4da49); exact-SHA [CI #45545857249](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857249), [QA #45545857344](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857344) and [Pages #45545857268](https://github.com/Taylan789/MobilyaCAD/actions/runs/45545857268) successful. QA: 272 frontend + 746 domain tests; strict TypeScript, lint 36 warnings/0 errors, production build, production audit 0 vulnerabilities.

**Bulgu:** Legacy JSON v1 zarfı incelenirken `Object.prototype.hasOwnProperty.call(value, "quoteRevisionHistory")` kontrolü korumasızdı. Düz JSON dosyalarında sorun oluşmaz; ancak public domain API'lerine doğrudan verilen Proxy nesnesinin `getOwnPropertyDescriptor` trap'i hata fırlatırsa read/append/import çağrısı blocked sonuç yerine exception dışarı sızdırabiliyordu.

**Kullanıcı akışı:** Eski bir v1 projeyi teklif geçmişi API'sine veren çağıran katman, malformed/özel nesne girdisinde uygulama akışını kıran beklenmeyen exception yerine tutarlı bir blocked sonucu alır.

**Kabul kriterleri**
- v1 discriminator kontrolündeki own-property reflection hatası genel bir güvenli-inceleme tanısıyla blocked döner.
- `readProjectQuoteRevisionHistoryFromProjectFile`, `appendProjectQuoteRevisionToProjectFile` ve `importProjectQuoteRevisionHistoryFileIntoProject` hiçbirinde exception dışarı sızmaz; proje ve history payload'ları null kalır.
- Normal v1 dosyası legacy olarak okunur; v1 içine quote history eklenmesi hâlâ blocked olur.
- Proxy trap'lerinin çalıştırılmasını engellediği iddia edilmez; yalnızca trap hataları fail-closed biçimde yakalanır.
- JSON v1/v2 şemaları, mm/adet/maliyet hesapları, frontend, adapter ve CNC sözleşmeleri değişmez.

**Sonraki adımlar:** UI sahibinin INT-003 JSON v2 save/open entegrasyonu; entegrasyon tamamlanınca DOM-153 append → save → reopen → append round-trip. Fiziksel CNC doğrulaması bu dilimin kapsamında değildir.


## DOM-160 — Kenar bandı rulo fiyatlama zarfı güvenliği (VERIFIED 25 Kasım 2026)

**Kullanıcı akışı:** Kullanıcı, JSON v2 projesinde katalog kimliğine bağlı rulo uzunluğu, sabit ek pay ve rulo fiyatı saklar. Proje dosyası açılırken bu alan okunur; kaydetme sırasında diğer proje metadata alanları korunur.

**Sorun:** DOM-071'in v2 uzantı okuyucusu proje discriminator ve pricing alanlarını doğrudan property access ile okuyordu; setter ise yalnızca root nesneyi kopyalayıp donduruyordu. Own/inherited accessor'lar getter çalıştırabilir, nested metadata kaynak proje ile alias paylaşabilirdi.

**Dikey dilim:** Own enumerable data descriptor okumaları, 16 MiB UTF-8 / 64 seviye JSON-safe envelope clone, fail-closed reflection trap yakalama ve nested project metadata için deep clone/freeze eklendi. JSON v1 legacy read-only davranışı korundu.

**Kabul kriterleri**
- Own/inherited envelope ve nested pricing getter çağrı sayısı sıfır; invalid girdiler blocked ve partial project/pricing döndürmez.
- Proxy reflection trap hataları public read/write API dışına exception sızdırmaz; trap çalıştırılmasını engellediği iddia edilmez.
- v2 write sonrası oda/özel metadata nesneleri kaynak projeden farklı referanstır ve derin donduruludur.
- Own `__proto__` JSON metadata anahtarı veri olarak korunur.
- 16 MiB UTF-8 ve 64 object/array depth sınırları exact-SHA testlerle doğrulanır.
- JSON v1 legacy read ve v1 extension blocker değişmez; mevcut roll/price sorting, 0.1 mm, currency ve 1.000 satır kuralları korunur.

**Sınırlar:** Bu domain dilimi UI save/open entegrasyonu, CNC, gerçek rulo/tedarik standardı, fiyat kaynağı veya fiziksel üretim doğrulaması değildir. UI sahibinin INT-003 JSON v2 editor entegrasyonu tamamlanmadan DOM-153 editör round-trip işi başlatılmaz.


**İlk doğrulama düzeltmesi:** CI #45557729163 başarılıydı; QA #45557728923 751/752 test ile başarısız oldu. Tek başarısız test, yalnızca `ownKeys` trap'i olan Proxy için read API'nin blocked dönmesini bekliyordu; read API bu yolda proje anahtarlarını enumerate etmediği için doğru biçimde empty döndürmüştü. Üretim davranışı değiştirilmedi; regresyon artık read/write descriptor trap'i ve write clone ownKeys trap'ini ayrı ayrı doğruluyor. İlk Pages run #45557728945 exact-SHA QA gate nedeniyle başarısız oldu ve bu SHA yayınlanmadı.


**Exact-SHA doğrulaması:** [domain implementation 757e959](https://github.com/Taylan789/MobilyaCAD/commit/757e959842a24c697ae1d5f92ce1b96f6a80359d) ve [Proxy test correction 357198f](https://github.com/Taylan789/MobilyaCAD/commit/357198fda15f71ae10aabf0a541174fcd05ebe19). CI [#45557877841](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877841), QA [#45557878887](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557878887) ve Pages [#45557877766](https://github.com/Taylan789/MobilyaCAD/actions/runs/45557877766) başarılı. QA: 272/272 frontend + 752/752 domain; strict shared-domain TypeScript, 36 lint uyarısı/0 hata, production build ve production dependency audit 0 vulnerability. Exact-SHA test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-161 — Saved edge-band roll pricing into quote snapshots (VERIFIED 25 November 2026)

**User flow:** An operator saves explicit roll lengths, fixed allowances and roll prices in a JSON v2 project. When creating a quote, the caller selects roll pricing explicitly and passes the current project envelope; the quote engine uses the saved inputs without copying them into a second UI/domain payload.

**Vertical slice:** `createProjectQuotePricingSnapshot` accepts an optional `projectFile` only with `edgeBandingPricingMode: "roll"`. It reads the persisted extension through the existing descriptor-safe project-file reader and supplies the validated arrays to both normal quote and material-cost-basis paths.

**Acceptance criteria**
- Saved roll count × explicit roll price reconciles to the quote line and retains Part IDs plus plan/price source references.
- A project file never silently switches from length to roll mode; explicit roll mode is mandatory.
- Legacy v1, blocked/malformed extensions, duplicate explicit-vs-persisted sources and ambiguous modes return blocked with no snapshot.
- Existing explicit roll-array callers and default length pricing remain backward compatible.
- Missing saved roll inputs never fall back to a fabricated length, price or waste percentage.

**Exact-SHA verification:** code/test commit [279067c7](https://github.com/Taylan789/MobilyaCAD/commit/279067c73135e19e36392be76f0fb2ca75e206cc); CI [#45563745096](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745096), QA [#45563745095](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745095), Pages [#45563745097](https://github.com/Taylan789/MobilyaCAD/actions/runs/45563745097) all succeeded. QA: 277/277 frontend + 754/754 domain tests, strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and production dependency audit 0 vulnerabilities. Exact-SHA test site deployed: https://taylan789.github.io/MobilyaCAD/.

**Limits / next dependency:** This is a domain API, not editor UI wiring. INT-003 PR #206 remains draft and defers App integration; after it is completed, the UI owner must pass the current envelope. No machine/CNC output or physical production claim is introduced. Next domain work after this slice: DOM-153 editor append → save → reopen → append contract, but only after INT-003.

## DOM-162 — Teklif fiyat snapshot istek zarfı descriptor güvenliği (25 Kasım 2026)

**Kullanıcı akışı:** Teklif oluşturulurken tarih, fiyat/tarife katalog sürümleri, açık kenar bandı fiyatlama modu ve isteğe bağlı malzeme maliyet temeli domain snapshot API'sine verilir. Geçersiz metadata, beklenmeyen getter çalıştırmadan veya kısmi teklif üretmeden engellenmelidir.

**Bulgu:** `createProjectQuotePricingSnapshot` dış request ve metadata kayıtlarını `Object.keys` + doğrudan property access ile okuyordu. Own accessor'lar çalışabilir, Object.prototype üzerinden miras alınan isteğe bağlı pricing getter'ı eksik alanı etkileyebilir, Proxy reflection hataları blocked sonuç yerine exception dışarı sızdırabilirdi.

**Dikey dilim:** Request zarfı, katalog sürümü ve material-cost-basis kayıtları own enumerable data descriptor üzerinden kopyalanıp null-prototype nesnelere normalize edilir. Accessor, symbol, non-enumerable alan ve custom prototype fail-closed reddedilir. Prototype/ownKeys/descriptor reflection hataları blocked döner; quoteSummary ve snapshot null kalır.

**Kabul kriterleri**
- Own request, catalog-version ve material-cost-basis accessor getter çağrı sayısı sıfırdır.
- Object.prototype inherited optional pricing getter'ı çağrılmaz ve eksik alanı dolduramaz.
- getPrototypeOf, ownKeys ve getOwnPropertyDescriptor Proxy trap hataları public API dışına sızmaz; partial quote/snapshot dönmez.
- Normal JSON nesneleri ve null-prototype kayıtlar aynı geçerli teklif sonucunu üretmeye devam eder.
- Fiyat/para birimi/yuvarlama/mm/adet kuralları, JSON v1/v2 ve roll-vs-length seçimi değişmez.

**Sınır:** Production report, price table, work-item, roll array ve stock-sheet report içeriği kendi downstream domain validator'larının sorumluluğunda kalır; bu slice bütün iç içe payload'ları recursive sanitize ettiğini iddia etmez. CNC/makine veya fiziksel atölye doğrulaması değildir.

**Durum:** VERIFIED — [commit 25f04468](https://github.com/Taylan789/MobilyaCAD/commit/25f044686aa7cbed89ed73d0bd8285a09908fe8e); exact-SHA CI [#45572928664](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928664), QA [#45572928650](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928650), Pages [#45572928855](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928855) passed. QA 283 frontend + 760 domain; strict TS, lint 36 warnings/0 errors, build, audit 0 vulnerabilities. Test site deployed.

### DOM-162 doğrulama düzeltmesi — 25 Kasım 2026

İlk exact-SHA CI başarılıydı; QA 759/760 testte tek bir yeni regresyonu yakaladı. Public request null-prototype kopyası doğruydu, ancak `resolveEdgeBandingRollOptions` ve material-cost-basis ara request nesneleri normal prototip taşıdığı için Object.prototype üzerindeki test getter'ı downstream hesaplayıcıda okunabiliyordu. İki ara nesne de null-prototype yapıldı; aynı regresyon hem normal quote hem material-cost-basis akışında doğrulanıyor. İlk başarısız SHA Pages'e yayınlanmadı.

### DOM-162 exact-SHA verification — 25 Kasım 2026

The first implementation SHA was not published after QA found one inherited-getter leak in the downstream options container. The corrected SHA [25f04468](https://github.com/Taylan789/MobilyaCAD/commit/25f044686aa7cbed89ed73d0bd8285a09908fe8e) passed CI [#45572928664](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928664), QA [#45572928650](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928650) and Pages [#45572928855](https://github.com/Taylan789/MobilyaCAD/actions/runs/45572928855). QA: 283/283 frontend + 760/760 domain, strict shared-domain TypeScript, lint 36 warnings/0 errors, production build and audit 0 vulnerabilities. The verified test site is https://taylan789.github.io/MobilyaCAD/.


## DOM-163 — Teklif snapshot levha satın alma raporu güven sınırı (25 Kasım 2026)

**Kullanıcı akışı:** Atölye, açıkça seçtiği levha satın alma maliyet temelini teklif snapshot'ına aktarır. Rapor önce güvenli biçimde normalize edilir; geçersiz nested veri varsa teklif ve snapshot birlikte engellenir.

**Bulgu:** DOM-162 request zarfını güvenli kopyalıyordu; ancak stockSheetPurchaseReport nested grupları ve sourcePartIds dizileri downstream maliyet hesaplayıcısına ham referansla aktarılıyordu. Nested own/inherited accessor'lar hesap sırasında çalışabilir, Proxy reflection hataları da beklenen blocked sonucu yerine dışarı sızabilirdi.

**Dikey dilim:** Stock-sheet raporu hesaplamadan önce own enumerable data descriptor üzerinden sınırlı JSON kopyasına alınır. Nesneler null-prototype; diziler yoğun ve ek özelliksizdir. Aynı kopya hesaplama ve snapshot provenance üretiminde kullanılır.

**Kabul kriterleri**
- Nested group alanı ve sourcePartIds indeks accessor getter çağrısı sıfırdır; sonuç blocked, quote ve snapshot null olur.
- Eksik own alan Object.prototype getter'ından doldurulamaz.
- Proxy prototype/descriptor/ownKeys reflection hatası exception olarak dışarı çıkmaz; fail-closed blocked döner.
- 64 seviye, 250.000 node ve 16 MiB UTF-8 sınırları aşılırsa kısmi çıktı üretilmez.
- Mevcut geçerli stock-sheet purchase ve net-consumption snapshot davranışı, maliyet toplamı, currency ve Part provenance değişmez.

**Sınırlar:** Bu koruma yalnızca stock-sheet quote snapshot rapor girdisine uygulanır; diğer bağımsız domain girişlerinin kendi validator sorumluluğu sürer. JSON v1/v2 formatı, frontend, adapter, CNC/postprocessor, fiyat kaynağı veya fiziksel atölye davranışı değiştirilmez.

**Durum:** VERIFIED — [commit ae76e538](https://github.com/Taylan789/MobilyaCAD/commit/ae76e538fcbd1aa60b22a5d42c602b04e58e4d42); exact-SHA CI [#45576697914](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697914), QA [#45576697866](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697866), Pages [#45576697868](https://github.com/Taylan789/MobilyaCAD/actions/runs/45576697868) başarılı. QA 283/283 frontend + 763/763 domain; strict shared-domain TypeScript, lint 36 uyarı/0 hata, production build ve production-only audit 0 açık bulgu. Test sitesi aynı SHA'dan dağıtıldı: https://taylan789.github.io/MobilyaCAD/. Üretim JS ana chunk'ı 1.698 MB (gzip 475 kB) olarak ölçüldü ve Vite 500 kB chunk uyarısı verdi; viewport p95/bellek ölçümü hâlâ NOT MEASURED. Sonraki domain adımı DOM-164: quote adjustment ve diğer nested quote input sınırlarının sahiplik/validator denetimi. UI-owned INT-003 editör save/open entegrasyonu ayrı kalır.
## DOM-164 — Teklif ek kalemleri ve public quote request güvenliği (VERIFIED — b932c60)

**Kullanıcı akışı:** Operatör, teklifine açık fire/kâr kalemleri ekler veya kayıtlı proje üzerinden malzeme maliyet temeliyle teklif üretir. Domain, hesaplamadan önce dış girdileri güvenli biçimde normalize eder; bozuk/şüpheli girdide kısmi teklif göstermez.

**Dikey dilim:** Ortak maliyet hesaplayıcısı en fazla 10.000 satırlık standart, yoğun diziyi ve yalnızca own enumerable data descriptor taşıyan plain/null-prototype satırları kabul eder. Quote option ve material-basis request zarfı descriptor-safe kopyalanır. Quote-specific kategori/kaynak kontrolü yalnızca normalize edilmiş satırlarda yapılır.

**Kabul kriterleri**
- Own/inherited getter çağrı sayısı sıfır; symbol, accessor, non-enumerable, custom prototype, sparse/extended array, 10.000 satır üstü ve reflection-trap girdileri fail-closed bloklanır.
- Direct cost summary, direct quote, material-basis quote ve pricing snapshot yollarında geçersiz girdiden kısmi toplam/snapshot üretilmez.
- Normal JSON ve null-prototype girdilerde mevcut para birimi, mm, adet, 6 ondalık miktar ve half-up minor-unit yuvarlama davranışı korunur.
- Nested roll-spec/roll-price ve diğer kaynak raporların kendi validator sınırları ayrı kalır; bu görev bunları derin kopyaladığını iddia etmez.

**Durum:** VERIFIED — [code/test commit b932c60](https://github.com/Taylan789/MobilyaCAD/commit/b932c60acfc6d673155721398abc777ca5d124b1); exact-SHA CI [#45600686688](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686688), QA [#45600686727](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686727) ve Pages [#45600686669](https://github.com/Taylan789/MobilyaCAD/actions/runs/45600686669) başarılı; test sitesi https://taylan789.github.io/MobilyaCAD/ adresine dağıtıldı. QA: 290 frontend + 773 domain testi, strict TypeScript, lint 36 uyarı/0 hata, production build ve production audit 0 açık. Sonraki domain görevi DOM-165 — nested roll-spec/roll-price listelerinin descriptor-safe sınır denetimi; UI-owned INT-003 ve DOM-153 bağımlılığı ayrı kalır.


## DOM-165 — Teklif rulo girdilerinde nested descriptor güvenliği (VERIFIED — 25 Kasım 2026)

**Kullanıcı akışı:** Operatör, teklif oluştururken kendi rulo uzunluğu/ek payı ve rulo fiyat tablosunu doğrudan quote API'sine verir. Domain, bu listeleri hesaplamadan önce güvenli biçimde normalize eder; şüpheli satır veya dizi yapısında hiçbir getter çalıştırmadan tüm teklifi engeller.

**Dikey dilim:** Ortak `descriptorSafeInput.ts` yardımcı modülü, rulo planı ve rulo maliyet özeti public sınırlarında kullanılır. En fazla 1.000 satırlık standart yoğun diziler, plain/null-prototype kayıtlar ve own enumerable data descriptor alanları kabul edilir. Bilinmeyen/symbol/non-enumerable alan, custom prototype, accessor, sparse/extended array ve Proxy reflection hataları fail-closed reddedilir.

**Kabul kriterleri**
- Own/inherited satır getter'ı ve array-index getter çağrı sayısı sıfırdır.
- Proxy `ownKeys` / descriptor hataları public API dışına sızmaz; blocked sonuç, boş lineSources ve null costSummary üretilir.
- 1.000 satır sınırı, dense-array ve whitelist sözleşmesi her iki public hesaplayıcıda aynıdır.
- Geçerli JSON v2 kayıtlı rulo girdileri, null-prototype satırlar, 0.1 mm hesaplama, açık ek pay, adet, fiyat ve kaynak referansı davranışı korunur.
- UI, JSON v1/v2 şeması, para birimi/yuvarlama, CNC ve fiziksel üretim varsayımları değiştirilmez.

**Ölçülen 10/10 kalite kapıları — mevcut kanıt:** En son doğrulanmış taban SHA `9940200` için CI #45601036021 ve QA #45601036179 başarılı; QA 290 frontend + 773 domain testi, strict shared-domain TypeScript, lint 36 uyarı / 0 hata, production build ve production-only audit 0 bulgu. Vite ana bundle büyüklüğü ve viewport p95/bellek için yeni ölçüm yok; bu kapılar **NOT MEASURED**. Genel 10/10 durumu işaretlenmez. CNC/makine koordinatı ve fiziksel üretim doğrulaması operatör/atölye tarafından ayrıca yapılmalıdır.

**İlk exact-SHA doğrulaması:** [e77957c](https://github.com/Taylan789/MobilyaCAD/commit/e77957c2d5472a539f2f2a64c37be56d3744d1f2) için CI [#45602347319](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602347319) başarılı; domain testleri 776/776 geçti. QA [#45602347365](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602347365) strict TypeScript aşamasında TS18046 (`rollSpecs` unknown iken eski ham `.length` okuması) nedeniyle başarısız oldu; Pages [#45602347321](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602347321) exact-SHA kapısında yayın yapmadan durdu. Bu SHA dağıtılmadı.

**Düzeltme:** Boş tüketim dalı artık yalnızca descriptor-safe kopyalanmış `validatedSpecs.length` değerini kullanır; Proxy `get("length")` çağrısının sıfır olduğunu doğrulayan regresyon testi eklendi.

**Durum:** VERIFIED — code/test commit [ffab4aa](https://github.com/Taylan789/MobilyaCAD/commit/ffab4aa29051182a825c1ba77428a911a48fad55); exact-SHA CI [#45602592844](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602592844), QA [#45602592876](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602592876), Pages [#45602593126](https://github.com/Taylan789/MobilyaCAD/actions/runs/45602593126) all successful. QA 290/290 frontend + 777/777 domain, strict shared-domain TypeScript, lint 36 warnings/0 errors, production build, production audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/. İlk SHA `e77957c` QA'da TS18046 ile durdu ve deploy edilmedi; `ffab4aa` raw Proxy length read regression'ını da kapatarak exact-SHA doğrulamayı geçti.

**Sıradaki 3–5 küçük görev**
1. DOM-168 — Extend saved/direct roll-input parity to stock-sheet-purchase material-cost-basis snapshots and reconcile stock-group plus roll-line provenance.
2. INT-003 — UI-owned PR #206 save/open envelope integration; keep frontend files and PR ownership with the UI agent.
3. DOM-153 — append → save → reopen → append quote revision history after INT-003 integration is verified.
4. CAD/production quality gates — collect viewport p95/memory baseline and define CNC fixture/postprocessor requirements only with a confirmed machine standard.


## 25 Kasım 2026 15:09 TRT — DOM-166 (implementation submitted; exact-SHA verification pending)

**Kullanıcı akışı:** Teklif snapshot API'sine üretim raporu, tüketim fiyat tablosu, işçilik satırları ve tarife tablosu gelir. Bu girdiler herhangi bir hesaplayıcı alan okumadan önce tek bir toplam kaynak bütçesiyle güvenli JSON kopyasına alınır.

**Kabul kriterleri**
- Dört kaynağın içindeki own getter'lar hiç çalışmaz; inherited-only fiyat alanı fiyat olarak kabul edilmez.
- Her kaynaktaki Proxy reflection hatası public API dışına sızmaz; sonuç blocked, quoteSummary null ve snapshot null olur.
- Kaynaklar toplamda en fazla 64 iç içe nesne/dizi seviyesi, 250.000 ziyaret edilmiş düğüm ve 16 MiB UTF-8 JSON boyutu kullanır.
- Geçerli JSON v1 üretim raporu, fiyat satırları, işçilik süreleri ve tarife eşleşmesi mevcut para/ölçü/yuvarlama davranışını korur.
- JSON v1/v2 proje dosyası şeması, frontend API'si, CNC/postprocessor veya fiyat varsayımları değiştirilmez.

**Durum:** VERIFIED — implementation [ca1a3768](https://github.com/Taylan789/MobilyaCAD/commit/ca1a3768dad42cf7dec91be5ba6bbeb2c91caab8) + test correction [15583066](https://github.com/Taylan789/MobilyaCAD/commit/15583066d9f77a243c03a74d083154a826a55439). Exact-SHA CI [#45611964638](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964638), QA [#45611964676](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964676) ve Pages [#45611964911](https://github.com/Taylan789/MobilyaCAD/actions/runs/45611964911) başarılı. QA: 294/294 frontend + 781/781 domain; shared-domain TypeScript, lint, production build ve dependency audit geçti. Test sitesi exact SHA için yayınlandı: https://taylan789.github.io/MobilyaCAD/. İlk SHA ca1a376 iki test beklentisi nedeniyle QA'da kaldı ve deploy edilmedi; düzeltilmiş SHA yayınlandı.

**Sonraki adım:** Exact-SHA CI + QA + production build + Pages sonucunu doğrula; ardından DOM-167 saved/direct roll quote parity testlerine geç. UI-owned INT-003 PR #206 ve adapter/performance-owned PERF-001 / INT-002 kapsamına müdahale etme.

## DOM-167 — Saved JSON v2 / direct roll quote parity (implementation submitted; verification pending)

**Kullanıcı akışı:** Atölye, kenar bandı rulo ölçüsü ve fiyatını ya doğrudan teklif girdisine verir ya da MobilyaCAD JSON v2 proje dosyasına kaydeder. Aynı proje ve aynı açık kullanıcı girdileri iki yoldan da aynı teklif tutarını ve kaynak izini üretmelidir.

**Dikey dilim:** projectQuotePricingSnapshot.test.mjs içinde direct roll listeleri ile kayıtlı JSON v2 uzantısı karşılaştırılır. Hem line-only snapshot hem net-consumption material-cost-basis snapshot için tam quoteSummary ve immutable snapshot eşitliği doğrulanır; roll count, purchased length, Part/furniture IDs ve plan/price source references ayrıca assert edilir.

**Kabul kriterleri**
- Her iki giriş yolu explicit edgeBandingPricingMode: "roll" gerektirir ve aynı tek kaynak kuralını korur.
- Aynı üretim raporu, fiyat, para birimi, rulo uzunluğu ve kaynak referanslarıyla toplamlar ve tüm line provenance alanları birebir eşleşir.
- Line-only ve net-consumption snapshot yolları aynı sonucu verir; başarısız/eksik girdide kısmi teklif üretilmez.
- JSON v1, frontend API, UI save/open akışı, fiyat varsayımları ve CNC/makine standardı değiştirilmez.

**Durum:** IMPLEMENTED — exact-SHA CI, QA ve Pages doğrulaması bekleniyor. Test otomatik QA kapsamına eklendi; bu turda yerel test çalıştırıldığı iddia edilmez.

**Sınır:** Bu domain parity testi, UI-owned INT-003 editor save/open entegrasyonunun tamamlandığı anlamına gelmez. Fiziksel rulo/atölye/CNC doğrulaması değildir.

