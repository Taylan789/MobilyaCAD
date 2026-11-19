# MobilyaCAD Ürün Yol Haritası

> Kapsam: yalnızca `Taylan789/MobilyaCAD` deposunun `dev/github-work` dalı. Bu belge ürün hedefini ve doğrulanabilir geliştirme sırasını tanımlar; tamamlanmamış veya üretim onayı almamış özellikleri tamamlanmış gibi göstermez.

## Ürün hedefi

MobilyaCAD'i tarayıcıda çalışan bir 3D mobilya yerleşim aracından; parametrik mobilya tasarımı, ölçü ve parça mühendisliği, malzeme/aksesuar yönetimi, teklif hazırlığı ve makineye özel üretim verisi hazırlığını kapsayan modüler bir CAD/CAM platformuna dönüştürmek.

Temel ilke: ekrandaki model, hesaplama motoru, kesim listesi ve dışa aktarılan veriler aynı kaynak parametreleri kullanmalı. Fiziksel üretime giden ölçüler, bağlantılar ve CNC işlemleri ancak gerçek üretici/atölye standardı doğrulandığında onaylı kabul edilebilir.

## Doğrulanmış mevcut temel — 18 Kasım 2026

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
| Kenar bantlama / malzeme tüketimi | Domain malzeme özeti gövde, çekmece, kitaplık, masa, gardırop, TV bölücü/raf ve kesitli panellerin ortak Part listesinden quantity ağırlıklı net alan/hacim ve dış/iç kenar bantlamasını hesaplayabilir | Domain özeti henüz UI/JSON/CSV'ye bağlı değil; fire, levha verimi, kerf, bant kalınlığı ve rulo payı yok |
| Malzeme kataloğu | UI CRUD; mobilya varsayılan materialId ve çekmece grubunda varsayılan + dört panel grubu override; domain gövde/kitaplık motorları altı gövde panel grubu için malzeme override'ını doğrular | Gövde panel override'ları henüz frontend JSON v1/CSV ve UI akışına bağlanmadı; fiyat, tedarikçi ve fire henüz yok |
| Proje dosyası | Yerel JSON v1 indirme/yükleme; saf serializer/parser; round-trip ve eski v1 uyumluluk; mm, mobilya ve çekmece grubu katalog referansları ile dört çekmece panel kalınlığının doğrulanması | Şema migrasyonu, otomatik kayıt ve kurtarma yok |
| Teklif/maliyet | Kullanıcı fiyat tablosu malzeme tüketimini materialId + m2, donanımı hardwareId + özgün BOM birimi, kenar bandını edgeBandingId + açık mm/m birimi ile fiyatlandırır; kullanıcı girdili işçilik/operasyon tarifesi, tek para birimli birleşik teklif ve tarihli fiyat/tarife katalog snapshot'ı, DOM-014 doğrulanmış immutable append ve DOM-015 ortak satır aritmetiği doğrulaması vardır | Frontend/UI ve JSON v1/CSV kalıcı revizyon geçmişi entegrasyonu ayrı sahibindedir; tüm geçmişte ID tekilliği depolama katmanında doğrulanmalıdır; vergi, kur, iskonto, otomatik fire/kâr yüzdesi ve üretim onayı yok |
| Test/CI | DOM-015 kod HEAD `f160360f2050f4021a850d0c49123ac0ed1ccd3a`: [CI #44147550422](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550422) başarılı; [QA #44147550175](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550175) 101/101 frontend + 237/237 domain testi, strict TypeScript, lint ve production build başarılı; [Pages #44147550068](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550068) başarılı | QA genel sonucu yalnızca production dependency audit'teki 12 bulgu (2 moderate, 10 high; picomatch ReDoS zinciri) nedeniyle BLOCKED; kırıcı Vite downgrade uygulanmadı, frontend sahipliği korunuyor |

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

1. DOM-055 — per-edge assignment'ları proje JSON v2'ye kaydet; v1 kayıtlarını koru ve unsupported export için güvenli blocker/round-trip doğrula.
2. DOM-056 — yönsel kenar bandı değişikliklerinde saved cut-plan freshness snapshot'ını stale/blocker yap.
3. DOM-057 — teklif revizyonlarında yönsel kenar bandı maliyet satırları, exact unit ve Part kaynak izini koru.

### Sonraki adaylar

- Per-edge edge-band assignments için schema/validation, tüketim/fiyat ve JSON persistence dilimlerini sırayla tamamla.
- Adapter/export round-trip için INT-001/INT-002 sahipliğini ve mevcut UI/domain sözleşmesini takip et; adapter dosyalarını bu domain ajanı değiştirme.


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
1. DOM-061 DONE — structured edge direction is carried as `edgeDirection` through consumption, quote summaries, revision snapshots, and JSON round-trip; legacy v1 descriptions remain supported.
2. DOM-062 READY — revision comparison JSON export contract, exact line deltas/currency/source, no unit conversion.
3. DOM-063 PLANNED — stable quote CSV export with exact units, currency, source and escaping validation.
4. DOM-064 PLANNED — strict quote adjustment provenance for explicit waste/profit lines; no inferred percentages.


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

- **Durum:** uygulandı; GitHub Actions doğrulaması bekleniyor.
- **Teslim:** `mobilyacad-quote-revision-comparison` v1 strict JSON zarfı; hazır revision comparison sonuçlarını exact currency, unit, line delta, source metadata, Part ID, tariff ve structured edge direction ile serileştirir/parses.
- **Fail-closed:** unsupported fields/version, malformed JSON, blocked input, satır toplamı/quantity-price uyuşmazlığı, kategori/genel delta tutarsızlığı veya line-change shape hatasında kısmi JSON döndürmez.
- **Kabul:** domain otomatik test round-trip, metadata ve mm/m ayrımını; tam kategori ve grand-total delta tutarlılığını doğrular. Fiziksel üretim veya frontend dosya indirme entegrasyonu iddia edilmez.
- **Sonraki 3 dilim:** DOM-063 stable-column CSV export/escaping ve exact source/currency/unit; DOM-064 explicit waste/profit quote adjustment provenance; DOM-065 frontend revision-comparison export wiring (frontend sahibiyle sözleşme).
