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
| Kenar bantlama / malzeme tüketimi | Domain summary shared Part list calculates quantity-weighted net area/volume, directional edge-banding and catalog/Part/furniture provenance; DOM-067 JSON v1 and DOM-076 strict CSV v1 contracts | JSON/CSV round-trip automatically verified; frontend download adapter, waste/yield, kerf, edge-band thickness and CNC output remain missing |
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

1. DOM-109 DONE — [commit a6d34fe](https://github.com/Taylan789/MobilyaCAD/commit/a6d34fe17bf7eddc26f2aac97373adb61e346d03); exact-SHA CI/QA and Pages succeeded (150 frontend + 635 domain tests).
2. DOM-110 VERIFIED — mixed-family cabinet/bookshelf material summary (8/18 mm, quantity, Part provenance, area/volume/banding); exact-SHA CI [#45015876727](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876727), QA [#45015876733](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876733) passed; Pages [#45015876696](https://github.com/Taylan789/MobilyaCAD/actions/runs/45015876696) deployed.
3. DOM-111 VERIFIED — material-ID conflicts block all furniture contributors and diagnostics list all affected IDs; exact-SHA CI/QA/Pages successful (150 frontend + 637 domain, 0 audit vulnerabilities).
4. INT-001 frontend-owned — comparison/download and production export adapter contract; document integration handoff only, no frontend edits.
5. INT-002/PERF-001 specialist-owned — integration profiling/benchmark evidence; QA-003 remains blocked until INT-001 and specialist evidence are available.

## 10/10 ölçülebilir kalite kapıları (20 Kasım 2026 baseline)

Kanıtı bulunmayan ölçüm **NOT MEASURED** kalır; checklist tamamlanmadan ürün 10/10 kabul edilmez.

| Alan | 10/10 kabul ölçütü | Baseline / durum |
|---|---|---|
| CAD Core | Geometri/transform/snap/seçim/undo-redo/save-load için deterministik test; 2D ve 3D aynı mm kaynak verisini kullanır | Temel 3D yerleşim ve transform var; tam 2D çizim, snap, undo-redo ve senkron contract eksik |
| Üretim | Her Part için kaynak ID, quantity, mm ölçü, malzeme/kalınlık; unsupported geometri/export kısmi sonuç üretmeden blocker | Domain konstrüksiyon, tüketim, nesting freshness, teklif/revizyon ve JSON/CSV sözleşmeleri var; frontend adapter/CNC postprocessor eksik |
| UX | Ana akışlarda işlevsel kontroller; klavye/focus, erişilebilirlik, responsive, boş/hata durumları otomatik doğrulanır | Frontend ayrı ajan alanında; gerçek tarayıcı görsel kabulü NOT MEASURED |
| Performans | Referans sahnede p95 frame-time hedefi 16,7 ms (60 FPS), scene update p95 <100 ms, bellek ölçümü ve CI regression threshold | Referans sahne/benchmark NOT MEASURED; bu kontrolde aktif Integration/Performance run veya PR bulunmadı; PERF-001 ve INT-002 READY, QA-003 INT-001/INT-002'ye bağlı |
| Güvenilirlik | Strict TS, test, build, audit; import/export round-trip 0 alan kaybı; invalid input 0 partial output | 20 Nov 2026 verified SHA [67d462fa](https://github.com/Taylan789/MobilyaCAD/commit/67d462fa26df55b8f717067d73dd654dd7075d0e): QA 124/124 frontend + 579/579 domain; strict TS, lint (32 warnings/0 errors), production build and audit 0 vulnerabilities. DOM-076 strict CSV round-trip passed; JSON v1 schema unchanged. |
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
- Files: \`domain/production/projectEdgeBandingRollCostCsv.ts\`, \`domain/production/projectEdgeBandingRollCostCsv.test.mjs\`, QA strict domain type-check list. Frontend files remain untouched.
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
| DOM-088 | Ürün Geliştirme | VERIFIED — reordered comparison is identical; JSON/CSV byte-exact and parse round-trip; 142 frontend + 607 domain tests; [CI](https://github.com/Taylan789/MobilyaCAD/actions/runs/44901772791), [QA](https://github.com/Taylan789/MobilyaCAD/actions/runs/44901772751), [Pages](https://github.com/Taylan789/MobilyaCAD/actions/runs/44901772717) succeeded | DOM-087 |
| DOM-089 | Ürün Geliştirme | IMPLEMENTED — detached source mapping order blocks revision creation; exact-SHA Actions pending (test commit e6eca800) | DOM-088 |
| DOM-090 | Ürün Geliştirme | READY — compare r1→r3 in a three-revision chain; exact provenance/totals, unknown and reverse selection fail closed | DOM-089 |
| INT-001 | Arayüz + Ürün | READY — frontend adapter consumes production domain and blocks unsupported geometry exports; round-trip tests | Production-domain contract |
| INT-002 | Entegrasyon/Performans | READY — adapter round-trip and geometry/quantity fidelity tests; isolated specialist branch | INT-001 |
| PERF-001 | Entegrasyon/Performans | READY — repeatable CAD scene/render baseline and measured optimization | Separate specialist ownership |

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
- Regression coverage verifies multibyte payload byte count, 2,001 line-change rows under the byte ceiling, and fail-closed \`comparison=null\`. Fixture size is 640,024 bytes.
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
- **Next:** DOM-112 additive structured conflict provenance (catalog ID + all source Part/furniture IDs), preserving diagnostic message compatibility. INT-001 remains frontend-owned; INT-002/PERF-001 specialist-owned.


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
