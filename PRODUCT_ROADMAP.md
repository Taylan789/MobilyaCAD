# MobilyaCAD Ürün Yol Haritası

> Kapsam: yalnızca `Taylan789/MobilyaCAD` deposunun `dev/github-work` dalı. Bu belge ürün hedefini ve doğrulanabilir geliştirme sırasını tanımlar; tamamlanmamış veya üretim onayı almamış özellikleri tamamlanmış gibi göstermez.

## Ürün hedefi

MobilyaCAD'i tarayıcıda çalışan bir 3D mobilya yerleşim aracından; parametrik mobilya tasarımı, ölçü ve parça mühendisliği, malzeme/aksesuar yönetimi, teklif hazırlığı ve makineye özel üretim verisi hazırlığını kapsayan modüler bir CAD/CAM platformuna dönüştürmek.

Temel ilke: ekrandaki model, hesaplama motoru, kesim listesi ve dışa aktarılan veriler aynı kaynak parametreleri kullanmalı. Fiziksel üretime giden ölçüler, bağlantılar ve CNC işlemleri ancak gerçek üretici/atölye standardı doğrulandığında onaylı kabul edilebilir.

## Doğrulanmış mevcut temel — 17 Kasım 2026

| Alan | Mevcut durum | Sınır |
|---|---|---|
| Teknoloji | React 19, TypeScript, Vite, Three.js / React Three Fiber | Tarayıcı istemcisi; ayrı backend yok |
| Oda ve 3D sahne | Ölçülü oda ve perspektif sahne | Tam 2D teknik çizim, kesit ve görünüş araçları yok |
| Yerleşim | Katalogdan ekleme, seçme, taşıma, döndürme ve boyutlandırma; SAT tabanlı yatay ayak izi çakışma ve oda sınırı uyarıları 3D sahnede gösterilir | Gelişmiş snap, çoklu seçim, duvar montajı/kapak açılımı boşlukları ve tam undo/redo akışı doğrulanmış değil |
| Katalog | Mutfak, gardırop, banyo, masa, kitaplık ve diğer ailelerden 100 varyasyon | Şablonlar tam parametrik konstrüksiyon aileleri değil |
| Parçalar | Görsel kapak/çekmece/raf parçaları; domain gövde, çekmece kutusu, kitaplık, masa, gardırop ve TV ünitesi Part listesi; dikdörtgen iç açıklıklar opsiyonel `ProjectProductionPart.panelGeometry` alanıyla taşınır; banyo dolabı v1 üst panelinde açık ölçülü çoklu dikdörtgen açıklıklar zorunludur | Kesitli Part JSON v1/CSV adapter entegrasyonu henüz ayrı frontend sahibince yapılmadı; diğer aileler, donanım ve CNC operasyonları eksik |
| Hesap motoru | `cabinetConstruction`, `drawerBoxConstruction`, `bookshelfConstruction`, `tableConstruction`, `wardrobeConstruction`, `tvUnitConstruction` (floor-standing gövde, açık ölçülü raf ve dikey bölücü) ve `bathroom-vanity` (cabinet gövdesi + zorunlu açık ölçülü üst panel açıklığı) aile ayrımlı sürüm 1 proje agregatörü; ortak Part listesi quantity, malzeme, damar yönü ve kenar bantlamayı korur | Frontend adapter henüz domain agregatörünü çağırmıyor; duvar montajlı TV ünitesi/ayak-baza modelleri ve diğer aileler, üreticiye özel konstrüksiyonlar eksik |
| Kesim listesi | Projedeki desteklenen düz mutfak gövdeleri ve tam tanımlı çekmece parçaları için tek Türkçe Excel uyumlu CSV; her satır kaynak mobilya adı/ID'si ve varsa katalog Malzeme ID değeriyle izlenir | Köşe/cihaz/evye konstrüksiyonları, diğer aileler, nesting ve CNC çıktısı yok |
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

## Sıradaki 5 küçük görev — domain sahipliği

1. Kitaplık için panel grubu bazlı kalınlık girdilerini ekle; her grubun gerçek katalog kalınlığını doğrula ve ortak kalınlık kullanan eski dolap/kitaplık isteklerini geriye uyumlu tut.
2. İlk farklı konstrüksiyon ailesi olarak masa motorunu açık tabla, ayak ve varsa kayıt/apron ölçüleriyle tasarla; bağlantı standardı uydurma.
3. Proje agregatörüne aile bazlı destek/engelleme tanılaması ekle; desteklenmeyen mobilyalar sessizce kesim listesine girmesin.
4. Domain gövde/çekmece/kitaplık sonuçları için stabil aile ve kaynak kimliği sözleşmesini genişlet; eski proje sonuç alanlarını koru.
5. Frontend sahibi domain agregatörünü JSON v1/CSV adapter'ına bağladıktan sonra aynı Part listesinin export ile birebir uzlaştığını otomatik test et.

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

1. Frontend sahibinin `drawerBoxSpecs` → `drawerBoxes` adapter'ını ve JSON v1 geriye uyumluluğunu kendi frontend dalında tamamlaması.
2. Frontend sahibinin ready/blocked/unsupported/empty rapor durumlarını güvenli CSV export kapısına bağlaması.
3. [x] Karışık cabinet + bookshelf + table + wardrobe projelerinde bölücü/raf, malzeme/kalınlık, quantity, alan/hacim ve kenar bantlama toplamlarını ortak Part listesinden doğrulayan regresyon testi (QA #163: 105/105 domain testi).
4. Domain tarafında kullanıcı ölçülü TV ünitesi ailesini mevcut cabinet motorunu yeniden kullanarak küçük bir sürüm 1 dilimine ayırmak.
5. Frontend JSON/CSV adapter'ı domain Part listesini kullandığında export satırlarının hesapla birebir eşleşmesini ayrı frontend sahibinin otomatik testleriyle doğrulamak.


## 16 Kasım 2026 — açık parametreli masa konstrüksiyon domain dilimi

- Yeni `domain/production/tableConstruction.ts` motoru, `family: "table"` ve `schemaVersion: 1` sözleşmesiyle eklendi.
- Tabla genişliği/uzunluğu/toplam yüksekliği, tabla kalınlığı, ayak kesiti/adedi ve etkinse uzun/kısa kayıt ölçüleri/adetleri zorunlu girdidir. Ayak yüksekliği toplam yükseklikten tabla kalınlığı çıkarılarak hesaplanır; 0.1 mm hassasiyetinde pozitif kalması gerekir.
- Tabla, ayak, uzun kayıt ve kısa kayıt ayrı parça satırlarıdır. Her satır kaynak mobilya ID'si, stabil parça ID'si, quantity, mm ölçüleri, malzeme kataloğu referansı, kenar bantlama ve damar yönü taşır. Grup malzeme override'ları gerçek katalog kalınlığıyla doğrulanır.
- Kayıt uzunlukları ve adetleri kullanıcı girdisidir; sistem 2 uzun + 2 kısa kayıt, ayak konumu, tabla taşması veya birleşim standardı varsaymaz. Kullanılmayan kayıt yönü için hem adet hem uzunluk sıfır olmalıdır.
- Kabul kapsamı: açık/kapalı kayıt, yalnız tek yönde kayıt, grup malzeme override'ı, katalog kalınlığı, eksik kenar/damar girdisi, geçersiz ölçü/adet, bilinmeyen alan/aile ve güvenli toplam adet sınırı test edilir.
- `qa-test.yml` domain strict TypeScript kontrolüne yeni motoru ekler; mevcut `domain/production/*.test.mjs` glob'u yeni regresyon testini otomatik çalıştırır.
- Sınırlar: bu dilim kesim-parça hesabıdır; parça yerleşim koordinatı, bağlantı, delik, donanım, CNC, nesting, fire ve fiyat üretmez. Gerçek montaj/üretim için atölye doğrulaması gerekir.
- Hiçbir `frontend/**` dosyası değiştirilmedi.

### Güncel sıradaki küçük görevler

1. [x] Açık parametreli masa parça motoru ve otomatik kabul testleri.
2. [ ] Masa ailesini proje agregatörüne ekle; aileye özgü dış ölçü sonucunu, parça kimliklerini ve malzeme özetini geriye dönük uyumlu biçimde koru.
3. [ ] Proje agregatörüne desteklenmeyen aile/konfigürasyon tanılaması ekle; hiçbir aile sessizce dolap olarak yorumlanmasın.
4. [ ] Domain parça listesinin frontend JSON v1/CSV adapter'ına bağlanması için ayrı frontend sahibinin kullanacağı entegrasyon kabul testlerini ve sözleşmesini netleştir.
5. [ ] Masa, kitaplık ve dolap ailelerinin birleşik quantity, malzeme ve kenar bantlama özetlerini proje düzeyinde regresyon testleriyle doğrula.


- **Masa motoru doğrulaması:** kod commit'i `8477ac40aca83efc7acd1983358e5ee8a2514cc4`, test fixture düzeltmesi `06e8a1b91b1dae7f3d16926ff218e71e303d2e97`. CI #211 `43893588170`, QA #131 `43893588200` (**101/101 frontend + 79/79 domain testi**) ve Pages #107 `43893588256` başarılı. QA strict domain TypeScript, lint, production build ve yüksek önem dependency audit eşiği başarılıdır. İlk QA #130'da üç fixture hatası bulundu ve testler gevşetilmeden düzeltildi.

## 16 Kasım 2026 — masa ailesinin proje üretim agregasyonuna eklenmesi

- `calculateCabinetProjectProduction` artık açık `family: "table"` isteklerini `calculateTableConstruction` motoruna yönlendirir. Masa tabla/ayak/kayıt parçaları cabinet, bookshelf ve drawer satırlarıyla aynı `ProjectProductionPart[]` listesine girer.
- Proje mobilya sonucunda masa için `overallDimensionsMm: { width, length, height }` döner. Legacy family-less dolaplar ve açık kitaplıklar mevcut `innerDimensionsMm` sonuç şeklini korur; masa için yapay iç ölçü üretilmez.
- Kaynak mobilya/parça ID'leri, mm ölçüleri, quantity, katalog malzeme kimliği, kenar bantlama ve damar yönü korunur. Malzeme tüketim özeti aynı birleşik Part listesinden hesaplanır; ikinci bir geometri/özet listesi üretilmez.
- Otomatik kabul testleri karışık dolap + kitaplık + masa projesini, masa-only quantity/alan/hacim/bantlama toplamlarını ve geçersiz masa konfigürasyonunun reddini kapsar.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Kod commit'i: `a003f81479602c2ce3d6491f3a4665e92d275f57`.
- Gerçek GitHub Actions: CI #213 `43899050507` başarılı; QA #133 `43899050521` başarılı (**101/101 frontend + 82/82 domain testi**, 0 başarısız); Pages deploy #109 `43899050832` başarılı. QA strict domain TypeScript, lint, production build ve `npm audit --omit=dev --audit-level=high` adımları geçti.
- Kalite notları: Oxlint 32 uyarı / 0 hata; audit raporunda 6 mevcut bulgu (2 düşük, 4 orta; yüksek önem eşiği aşılmadı). Büyük frontend chunk ve GitHub Actions Node 20 deprecation uyarıları sürüyor.
- Sınırlar: masa ayak/kayıt koordinatı, tabla taşması, bağlantı standardı, delik/donanım, CNC, nesting, fire, levha verimi, fiyat ve fiziksel üretim güvenliği hesaplanmaz. Frontend JSON v1/CSV adapter'ı domain agregatörüne henüz bağlanmamıştır. Hiçbir `frontend/**` dosyası değiştirilmemiştir.

### Sıradaki 3-5 küçük görev

1. Proje agregatörüne desteklenmeyen aile/konfigürasyon için açık, mobilya kimliğine bağlı tanılama/engelleme sonucu ekle; bilinmeyen aile hiçbir zaman dolap olarak varsayılmamalı.
2. Domain Part listesi ile frontend JSON v1/CSV adapter'ı arasındaki entegrasyon kabul testlerini ayrı frontend sahibinin kullanacağı şekilde tamamla; bu otomasyon `frontend/**` dosyalarına dokunmaz.
3. Karışık masa/kitaplık/dolap projelerinde malzeme, kalınlık, quantity ve kenar bantlama toplamları için ek sınır/regresyon testleri ekle.
4. Masa ailesi için açık ayak/kayıt yerleşim koordinatı sözleşmesini, yalnızca kullanıcı/atölye girdisiyle ve CNC standardı uydurmadan tasarla.
5. Kullanıcı kataloğu ve üretici/atölye girdileri doğrulanmadan nesting, CNC postprocessor veya fiyat/teklif çıktısı ekleme.

## 16 Kasım 2026 — masa agregatörü kaynaklarının geri yüklenmesi

- Masa agregatörü uygulaması ve üç regresyon testi, kaynak commit `a003f81479602c2ce3d6491f3a4665e92d275f57` içindeki doğrulanmış blob'lardan geri yüklendi.
- Geri yükleme commit'i: `67b2d8444adb3a50997f2ce6592b6318c4ca48ba` — yalnızca `domain/production/projectProduction.ts` ve `domain/production/projectProduction.test.mjs`.
- Önceki dokümantasyon commit'inde ağaç tabanı yanlışlıkla eski bir commit'ten alındığı için bu iki dosya geçici olarak dal ağacından çıkmıştı. Bu düzeltme yeni HEAD üzerine fast-forward commit ile dosyaları geri getirir; history rewrite/force-push kullanılmadı.
- Bu geri yükleme commit'i için yeni CI/QA/Pages doğrulaması push sonrasında bekleniyor. Önceki kod doğrulaması #133, kaynak kodun bulunduğu HEAD `6fb558d6a2bb9a197ea01f65141855d9593ebe47` üzerinde 101/101 frontend + 82/82 domain testiyle başarılıydı; güncel HEAD yeniden doğrulanmalıdır.

- **Geri yükleme doğrulaması:** kaynak restorasyon commit'i `67b2d8444adb3a50997f2ce6592b6318c4ca48ba`; son doğrulanan branch HEAD `fdba90a1d4e27c9d418281ff88c07211d79945cf`. CI #220 (`43899762924`), QA #135 (`43899762852`, **101/101 frontend + 82/82 domain testi**) ve Pages #111 (`43899762943`) başarılı. Strict domain TypeScript, lint, frontend production build ve yüksek önem dependency audit kapısı geçti.


## 16 Kasım 2026 — proje üretim hazır olma raporu

- `domain/production/projectProduction.ts` içine `calculateCabinetProjectProductionWithDiagnostics` eklendi. Desteklenen cabinet/bookshelf/table aileleri, bilinmeyen aileler, geçersiz konstrüksiyonlar, çekmece grubu hataları ve proje düzeyi hatalar ayrı alanlarda raporlanır.
- Güvenlik kapısı: herhangi bir mobilya veya çekmece hatasında `result` null olur; kısmi Part listesi dışarı verilmez. `canExport` yalnızca hatasız ve boş olmayan projede true'dur; boş proje `empty` durumuyla ayrılır.
- Mevcut `calculateCabinetProjectProduction` strict API'si korunur ve aynı geçerli sonuç şekline devam eder; tanılama API'si mevcut hesap motorlarını kullanır, geometri formüllerini kopyalamaz.
- Değişen dosyalar: `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`.
- Otomatik kabul testleri: desteklenen + desteklenmeyen karışık aile, geçersiz gövde, geçersiz çekmece, hazır rapor/strict sonuç eşitliği, boş proje ve bozuk proje zarfı.
- Sınırlar: bu rapor yalnızca yazılım girdilerini doğrular; fiziksel üretim, bağlantı, makine koordinatı, CNC veya güvenlik onayı değildir. Hiçbir `frontend/**` dosyası değiştirilmedi.
- Gerçek Actions doğrulaması commit sonrasında kaydedilecektir.

### Sıradaki 3-5 küçük görev

1. Frontend sahibinin `drawerBoxSpecs` → `drawerBoxes` adapter'ını ve JSON v1 geriye uyumluluğunu kendi frontend dalında tamamlaması.
2. Frontend sahibinin ready/blocked/unsupported/empty rapor durumlarını güvenli CSV export kapısına bağlaması.
3. Karışık gardırop + masa + kitaplık projelerinde bölme rafı, malzeme/kalınlık, quantity ve kenar bantlama sınır testlerini genişletmek.
4. Domain tarafında kullanıcı ölçülü TV ünitesi ailesini mevcut cabinet motorunu yeniden kullanarak küçük bir sürüm 1 dilimine ayırmak.
5. Frontend JSON/CSV adapter'ı domain Part listesini kullandığında export satırlarının hesapla birebir eşleşmesini ayrı frontend sahibinin otomatik testleriyle doğrulamak.


## 16 Kasım 2026 — gardırop gövdesi ve dikey bölücü domain dilimi

- Yeni domain/production/wardrobeConstruction.ts motoru, wardrobe ailesi için mevcut doğrulanmış gövde konstrüksiyonunu yeniden kullanır; legacy cabinet ve bookshelf formüllerini kopyalamaz.
- Her gardırop bölücüsü açık kimlik, iç sol yüzeyden ofset (mm), kalınlık, katalog materialId, dört kenar bandı bayrağı ve damar yönü ister. Bölücüler net iç yükseklik ve derinlikte panel satırlarıdır.
- Her özel rafın açık X/Y/Z ölçüleri, katalog malzemesi, kenar bandı ve damar yönü gerekir. Raflar bölücü açıklığına sığmalı; sınır aşımı ve raflar arası hacim çakışması reddedilir. Tam genişlik raf adedi özel raflarla birleştirilmez.
- Proje agregatörü wardrobe ailesini ready/blocked tanı akışına ve ortak Part listesine ekler. Proje malzeme özeti bölücü adet/alan/hacim/bantlama tüketimini aynı Part listesi üzerinden hesaplar.
- Değişen dosyalar: domain/production/wardrobeConstruction.ts, domain/production/wardrobeConstruction.test.mjs, domain/production/projectProduction.ts, .github/workflows/qa-test.yml, docs/production-domain-contract.md, PRODUCT_ROADMAP.md, AI_PROGRESS.md.
- Kabul kriterleri: cabinet/bookshelf/table sonuç şekilleri korunur; wardrobe iç ölçüsü, stabil divider ID, mm konumu, malzeme kalınlığı, grainDirection ve edgeBanding doğrulanır; karışık proje raporu ready olur; geçersiz bölücüde result null ve export kapalı kalır.
- Kod commit SHA: 66b106e9726388240326170a6671bf30bebfb4b0.
- Otomatik kontroller: bu commit için CI, QA ve Pages Actions sonuçları henüz oluşmadı.
- Bilinen sınırlar: raf taşıma kapasitesi, askı borusu, çekmece yerleşimi, bağlantı, delik, CNC, nesting, fire ve fiyat hesabı yoktur. Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibinin kapsamındadır; hiçbir frontend/** dosyası değiştirilmedi.
- Sonraki görevler: karışık aile raf/malzeme/kenar bantlama sınır testleri; frontend wardrobe JSON/CSV kabul kriterleri; kullanıcı girdili TV ünitesi domain motoru; doğrulanmış üretici standartları olmadan CNC/nesting/teklif yok.


- İlk wardrobe QA kontrolü: run 43915442898 içinde yeni gardırop testleri başarılıydı; iki mevcut proje tanılama testi wardrobe ailesini desteklenmeyen sayan eski fixture nedeniyle başarısız oldu. Bu fixture'lar yeni desteklenen aileye dokunmadan, gerçekten bilinmeyen sofa ailesini sınayacak şekilde düzeltildi; doğrulama düzeltme commit'i sonrasında yeniden çalıştırılacak.


- QA düzeltme notu: wardrobe artık desteklenen aile olduğundan bilinmeyen aile regresyon fixture'ı sofa olarak değiştirildi. İlk düzeltme sonrası tek kalan başarısız assertion eski wardrobe-unsupported kimlik metnini bekliyordu; beklenen kimlik de sofa-unsupported olarak güncellendi. Yeni Actions doğrulaması bekleniyor.


## 16 Kasım 2026 — gardırop bölme rafları ve net iç yükseklik

- `WardrobeConstructionRequest.shelves` geriye uyumlu opsiyonel bir alan olarak eklendi; eski wardrobe istekleri ve açık `verticalDividers: []` davranışı korunur.
- Her özel raf açık X/Y/Z yerleşim ölçüsü, katalog malzeme kimliği/kalınlığı, kenar bandı ve damar yönü ister. Raf ölçüleri 0.1 mm'ye normalize edilir; bölücü alanına girme, iç sınırı aşma, raflar arası hacim çakışması ve yinelenen kimlikler reddedilir.
- Gardırop net iç yüksekliği, gerçek üst/alt panel kalınlıkları dış yükseklikten çıkarılarak hesaplanır; dikey bölücü uzunluğu da aynı net açıklığı kullanır. Düzeltme legacy cabinet/bookshelf motorlarına dokunmaz.
- Proje agregatörü ve malzeme özeti yeni raf Part satırlarını mevcut ortak listeden tüketir. Frontend JSON v1/CSV adapter'ı değiştirilmedi.
- Kabul kriterleri: bölücülerin iki yanında raf; sınır/kalınlık/malzeme/çakışma reddi; temas eden raf yüzeylerinin kabulü; ready/blocked proje raporu; eski istek uyumluluğu.
- Değişen dosyalar: `domain/production/wardrobeConstruction.ts`, `domain/production/wardrobeConstruction.test.mjs`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`, `AI_PROGRESS.md`.
- Kod commit SHA: `2dd891cb68be80dbd6e091774369e3a4cc4f43eb`.
- GitHub Actions: CI #259 (`43935535640`), QA #159 (`43935535641`) ve Pages #127 (`43935535931`) başarılı. QA 101/101 frontend + 104/104 domain testiyle 0 başarısız; strict domain TypeScript, lint, production build ve production dependency audit adımları geçti. Oxlint 32 uyarı/0 hata; audit 6 bulgu (2 düşük/4 orta), yüksek önem eşiği geçti.
- Bilinen sınırlar: raf taşıma kapasitesi, bağlantı, askı borusu, çekmece yerleşimi, donanım, delik, CNC, nesting, fire ve fiyat hesabı yok; fiziksel üretim öncesi atölye doğrulaması gerekir.


### Son tamamlanan dikey dilim — karışık aile malzeme özeti

- Tek proje içinde cabinet, bookshelf, table ve wardrobe istekleri birleştirildi; gardırop dikey bölücüsü ve farklı katalog kalınlığındaki bölme rafı aynı ortak Part listesinde korundu.
- Malzeme özeti MDF 18, MDF 8 ve masif ayak grupları için parça satırı/adet, net alan, hacim ve kenar bantlama uzunluğunu ayrı ayrı doğruladı; toplam adet tüm Part satırlarıyla eşleşti.
- İlk test commit'indeki MDF 18 beklenen alan/hacim toplamı eksikti; QA gerçek Part listesi üzerinden daha yüksek toplamı gösterdi. Yalnızca test beklentisi düzeltildi; üretim hesap motoru değiştirilmedi.
- Test commit'i: `f60d89081a51d308b8015e580b8ecc163d6a3310`; doğrulanmış beklenti düzeltmesi: `62e9dfc5e980f27754faa3ce794f149843f82fda`.
- GitHub Actions: CI #266, QA #163 (101/101 frontend + 105/105 domain, 0 başarısız) ve Pages #130 başarılı.
- Sınırlar: fire/levha verimi, kerf, bant rulo payı, donanım, CNC ve maliyet hesabı yoktur; fiziksel üretim doğrulaması ayrıca gerekir.


## 16 Kasım 2026 — TV ünitesi v1 domain dilimi

- `family: "tv-unit"` ve `mounting: "floor-standing"` açıkça istenen TV ünitesi v1, mevcut cabinet gövde motorunu tekrar kullanır; geometri formülleri kopyalanmaz.
- Proje agregatörü aileyi `ready/blocked` tanılamasına ve ortak Part listesine ekler. Malzeme özeti aynı parça listesinden quantity ve malzeme/kalınlık gruplarını hesaplar.
- Duvara montajlı istekler, ayak/baza/braket/ankraj ve yük hesapları bu dilimde desteklenmez; doğrulanmış montaj standardı olmadan üretim verisi üretilmez.
- Kabul testleri: TV ünitesi dış ölçülerinin cabinet iç ölçülerinden ayrı aile etiketiyle korunması; parça kimlik/adet/malzeme satırlarının ortak listede bulunması; duvar montajı isteğinin `blocked` olması.
- Değişen dosyalar: `domain/production/tvUnitConstruction.ts`, `domain/production/tvUnitConstruction.test.mjs`, `domain/production/projectProduction.ts`, `domain/production/projectProduction.test.mjs`, `.github/workflows/qa-test.yml`, `docs/production-domain-contract.md`, `PRODUCT_ROADMAP.md`.
- Kod commit SHA: `a29f7a254bba0f652d50c0378303300d3f57aa20`.
- GitHub Actions: CI #268 (`43947151618`), QA #165 (`43947151884`; 101/101 frontend + 111/111 domain testi, 0 başarısız) ve Pages #132 (`43947151610`) başarılı. Strict domain TypeScript, lint, frontend production build ve `npm audit --omit=dev --audit-level=high` başarılı.
- Fiziksel montaj/üretim doğrulaması kapsam dışıdır.

### Sıradaki 3-5 küçük görev

1. TV ünitesi için kullanıcı girdili dikey bölücü/compartment panellerini, açık ölçü ve katalog malzeme/kalınlık sözleşmesiyle tasarla; raflarla çakışma testlerini ekle.
2. Banyo dolabı ailesini yalnızca kullanıcı/üretici tarafından verilen lavabo boşluğu, ayak/baza ve arkalık kurallarıyla küçük bir domain dilimine ayır.
3. Karışık cabinet/bookshelf/table/wardrobe/tv-unit projelerinde özel TV raflarının malzeme, quantity, net alan/hacim ve kenar bantlama uzlaşmasını doğrula.
4. Domain Part listesi ile frontend JSON v1/CSV adapter entegrasyonunu ayrı frontend sahibinin kabul testleri üzerinden takip et; bu otomasyon `frontend/**` dosyalarına dokunmaz.
5. CNC, duvar montajı, ayak/ankraj, nesting, fire ve maliyet çıktıları için gerçek üretici/atölye girdisi ve standart olmadan varsayılan üretim kuralı ekleme.


### 16 Kasım 2026 — floor-standing TV ünitesi açık ölçülü raflar

- TV ünitesi v1'e geriye uyumlu shelves alanı eklendi; eski isteklerde alanın olmaması mevcut cabinet gövde/raf davranışını değiştirmez.
- Her özel raf için açık X/Y/Z yerleşimi, katalog malzemesi/kalınlığı, damar yönü ve dört kenar bantlama bayrağı zorunludur. Net iç genişlik, gerçek üst-alt panel kalınlıklarıyla bulunan net iç yükseklik ve arkalık sonrası iç derinlik sınırları kontrol edilir.
- Hacimsel çakışma reddedilir; yüzey teması kabul edilir. Özel raflar profile.shelfCount tam genişlik raflarıyla aynı istekte çift sayım oluşturamaz.
- Proje agregatörü TV raflarını ortak Part listesine taşır; malzeme özeti aynı satırdan quantity, alan, hacim ve kenar bantlama hesaplar.
- Kabul kriterleri: legacy TV ünitesi isteği aynı sonuç şeklini korur; özel rafın ölçü/kimlik/malzeme/kenar/damar alanları korunur; sınır, çakışma, katalog kalınlığı ve yinelenen kimlik hataları reddedilir; proje raporu geçerli istekte ready kalır.
- Değişen dosyalar: domain/production/tvUnitConstruction.ts, domain/production/tvUnitConstruction.test.mjs, domain/production/projectProduction.ts, domain/production/projectProduction.test.mjs, docs/production-domain-contract.md, PRODUCT_ROADMAP.md.
- Commit SHA ve GitHub Actions doğrulaması bu dilimin commit'i sonrasında AI_PROGRESS.md içinde kaydedilecektir.
- Bilinen sınırlar: dikey bölücü, ayak/baza, ankraj, yük, bağlantı/delik, donanım, CNC, nesting, fire ve fiyat hesabı yoktur. Fiziksel üretim doğrulaması atölyeye aittir.
- Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibindedir; hiçbir frontend/** dosyası değiştirilmedi.


## 17 Kasım 2026 — floor-standing TV ünitesi dikey bölücü panelleri

- `TvUnitConstructionRequest.verticalDividers` geriye uyumlu opsiyonel alan olarak eklendi; alanın olmaması veya boş liste eski TV ünitesi isteklerini değiştirmez.
- Her bölücü açık X/Y/Z panel zarfı, gerçek katalog malzemesi/kalınlığı, damar yönü ve dört kenar bandı bayrağı taşır. Tam yükseklik/derinlik varsayımı yapılmaz; 0.1 mm çözünürlük ve iç hacim sınırları doğrulanır.
- Dikey paneller birbiriyle ve özel raflarla pozitif hacimde çakışamaz; yüzey teması geçerlidir. Bölücü varken koordinatsız tam genişlik raf adedi reddedilir.
- Proje agregatörü zaten `TvUnitConstructionPart` birleşimini kullandığından yeni panel satırları ortak Part listesine taşınır; malzeme özeti aynı listeden MDF 18 / MDF 8 quantity, alan, hacim ve kenar bantlama toplamlarını hesaplar.
- Otomatik kabul kapsamı: eski istek uyumluluğu, 0.1 mm normalizasyon, sınır/katalog/kimlik doğrulaması, divider-divider ve shelf-divider çakışması, yüzey teması, ready/blocked proje raporu ve malzeme özeti uzlaşması.
- Bilinen sınırlar: bağlantı, yük, ayak/baza, ankraj, delik/donanım, CNC, nesting, fire ve maliyet hesabı yoktur; fiziksel üretim öncesi atölye doğrulaması gerekir. Frontend JSON v1/CSV entegrasyonu ayrı frontend sahibindedir; hiçbir `frontend/**` dosyası değiştirilmedi.

### Sıradaki 3-5 küçük görev

1. Frontend sahibinin TV ünitesi `verticalDividers` + `shelves` alanlarını JSON v1'e geriye uyumlu bağlaması ve `ready/blocked` export kapısını otomatik test etmesi.
2. Domain tarafında banyo dolabı için lavabo boşluğu, ayak/baza ve arkalık ölçülerini yalnızca kullanıcı/üretici girdisiyle açık sözleşmeye ayırmak; varsayılan kesim/ankraj standardı uydurmamak.
3. Karışık cabinet/bookshelf/table/wardrobe/tv-unit projelerinde yeni TV bölücü satırlarını malzeme ve kenar bantlama toplamlarıyla birlikte doğrulayan son sınır testlerini genişletmek.
4. TV ünitesi ve gardırop için kullanıcı girdili bağlantı/delik veri modelinin önkoşullarını araştırmak; gerçek üretici standardı yoksa CNC koordinatı üretmemek.
5. CNC, nesting, fire ve teklif/maliyet katmanlarına ancak katalog, makine profili ve kullanıcı fiyat verisi tanımlandığında geçmek.


## 17 Kasım 2026 — çoklu çekmece grubu malzeme tüketimi uzlaşması

- Proje agregatörünün aynı mobilyaya bağlı farklı drawerGroupId değerlerini bağımsız tutması, her grubun kendi panel malzeme override'larını ve quantity değerlerini koruması otomatik entegrasyon testiyle doğrulandı.
- İki çekmece grubu farklı yan panel kalınlığı/malzeme kimliği kullanırken MDF 16, MDF 18 ve MDF 8 için Part satırı sayısı, toplam adet, net alan, hacim ve kenar bantlama toplamları aynı proje Part listesinden uzlaştırıldı.
- Kabul değerleri: MDF 16 — 3 satır / 14 adet / 0.903840 m² / 0.014461440 m³ / 560 mm; MDF 18 — 3 satır / 11 adet / 0.846000 m² / 0.015228000 m³ / 840 mm; MDF 8 — 2 satır / 5 adet / 0.973104 m² / 0.007784832 m³ / 0 mm.
- Üretim motoru değiştirilmedi; yeni test, mevcut proje agregatörü ve malzeme özeti arasında regresyon koruması sağlar. CNC, ray boşluğu, bağlantı, fire, nesting ve maliyet hesabı bu dilimin kapsamında değildir.

### Güncel sıradaki küçük görevler

1. Ayrı frontend sahibinin TV ünitesi verticalDividers/shelves ve proje drawerBoxes alanlarını JSON v1/CSV akışına geriye uyumlu bağlamasını ve blocked projelerde export'u kapatmasını takip et; bu otomasyon frontend/** dosyalarına dokunmaz.
2. Banyo dolabı ailesinden önce lavabo kesiti/açıklığı için panel geometri sözleşmesini tasarla. Mevcut Part modeli yalnızca dikdörtgen panel alanı taşıdığı için kesit geometrisi, net alan/hacim ve iç kenar işlemleri temsil edilmeden banyo üst tablasını üretime hazır göstermemeliyiz.
3. Kesit destekli panel veri modelini açık ölçü ve katalog girdileriyle küçük, geriye uyumlu bir domain dilimine ayır; doğrulanmamış lavabo, gider, sifon, baza/ayak veya ankraj standardı uydurma.
4. Kesit alanı ve iç çevre/kenar işlemi hesapları için sınır testleri ekle; kesitli parçaları eski dikdörtgen CSV/JSON tüketicilerine kayıpsız aktaramıyorsak export'u açıkça engelle.
5. Kesit sözleşmesi ve frontend veri uyumluluğu hazır olduğunda, yalnızca açık kullanıcı/üretici ölçüleriyle floor-standing banyo dolabı konstrüksiyonunu mevcut cabinet motoru üzerine kur.

## 17 Kasım 2026 — dikdörtgen iç açıklıklı panel geometri öncülü

- panelCutoutGeometry.ts tek bir dikdörtgen panel için açık ölçülü dikdörtgen geçiş açıklıklarını doğrular; net alan/hacim, dış/iç çevre ve ayrı dış/iç kenar bantlama uzunluğu üretir.
- Tüm geometri ölçüleri mm'dir ve 0.1 mm'ye normalize edilir. Açıklıklar panel dış sınırına temas edemez; birbirleriyle alan, kenar veya köşe teması yapamaz. Her açıklığın dört kenar bant bayrağı açıkça verilir.
- Bu bir domain geometri öncülüdür; ProjectProductionPart, proje malzeme özeti, JSON/CSV veya CNC çıktısına bağlanmamıştır. Kesitli parçalar eski dikdörtgen tüketicilere aktarılmaz ve üretime hazır olarak sunulmaz.
- Kabul kapsamı: 13 otomatik test; sınır/çakışma/temas/kimlik/şema/kenar işlemi doğrulaması ve net tüketim hesapları. Gerçek lavabo, yarıçap/pah, malzeme ve makine standardı bu modülde uydurulmaz.

### Sıradaki 3-5 küçük görev

1. Domain ProjectProductionPart sözleşmesine geriye uyumlu, sürümlü panel profil/geometri alanı ekle; legacy dikdörtgen parçalar için mevcut width/length/area davranışını koru.
2. calculateProjectMaterialConsumptionSummary için kesitli parça alanı/hacmi ve iç kenar bantlama uzlaşmasını aynı quantity semantiğiyle hesapla; profil verisi eksik veya bozuksa projeyi blocked tut.
3. Kesitli Part satırlarının JSON v1/CSV tüketicilerinde kayıpsız taşınamadığı durumda export'u açıkça engelle; frontend entegrasyon sözleşmesini ayrı frontend sahibine dokümante et.
4. Köşe yarıçapı, pah, çokgen/oval açıklık ve iç yüzey işlemlerini ancak gerçek geometri ve makine standardı tanımlandığında ayrı sürümlü genişletme olarak ele al.
5. Kesitli panel tüketimi doğrulandıktan sonra banyo dolabı lavabo açıklığı, baza/ayak ve arkalık kurallarını yalnızca açık kullanıcı/üretici girdileriyle küçük bir konstrüksiyon dilimine ayır.

### Kesit geometri dilimi Actions doğrulaması

- İlk QA run `43991327655` test fikstürü kaynaklı 136/137 sonuç verdi; test yardımcısının eksik kenar bayrağını varsayılan `false` ile doldurması düzeltildi (`1c09bf639ddb84b2d31277a7ce5e5adc6104a2df`). Geometri doğrulama kodu değiştirilmedi.
- Son doğrulama: CI `43991437104`, QA `43991437194` (**101/101 frontend + 137/137 domain**) ve Pages `43991437103` başarılı.


## 17 Kasım 2026 — kesitli panelin proje Part ve malzeme tüketimine bağlanması

- `panelCutouts` isteğiyle mevcut bir Part kimliğine sürüm 1 dikdörtgen açıklık geometrisi bağlanır; ölçü ve dış kenar bant bayrakları hedef Part ile uyuşmak zorundadır.
- Doğrulanan kesit `ProjectProductionPart.panelGeometry` alanında taşınır. Legacy dikdörtgen Part'larda alan bulunmaz ve mevcut proje v1 istekleri değişmeden çalışır.
- Malzeme özeti kesitli paneller için net yüzey alanı/hacim ve iç + dış kenar bantlamasını hesaplar; tüm değerler Part quantity ile çarpılır. Geometri, özet hesaplanırken tekrar doğrulanır.
- Geçerli kesit domain sonucunu `ready` tutar ancak mevcut JSON v1/CSV adapter'ı profili taşımadığı için `canExport: false` ve açık `exportBlockers` döndürür. Geçersiz/tekrarlı/olmayan Part kesit girdisi ise `blocked`, `result: null` olur.
- Otomatik kabul kapsamı: Part eşleştirme, ölçü/dış bant uyumu, yinelenen kimlik, kesitli net alan/hacim, yön bazlı iç bantlama, quantity ve bozuk sonuç geometrisi reddi.
- Sınırlar: frontend JSON v1/CSV adapter'ı henüz `panelGeometry` alanını taşımıyor; CNC, lavabo standardı, pah/yarıçap, fire, levha verimi ve makine işlemleri yoktur.

### Sıradaki 3-5 küçük görev

1. Ayrı frontend sahibinin `panelGeometry` alanını proje JSON v1'de kayıpsız saklaması ve eski CSV tüketicisi kesitli parçayı temsil edemiyorsa export'u engellemesi.
2. Kesitli panelin dış/iç kenar çevresi için malzeme tüketim uzlaşmasını gerçek proje örneklerinde genişletmek; kesit çevresi ile bant uzunluğu arasındaki ayrımı korumak.
3. Banyo dolabı lavabo açıklığı, arkalık ve baza/ayak girdilerini yalnızca kullanıcı/üretici ölçüleriyle sürümlü konstrüksiyon isteğine ayırmak.
4. Kesitli panelde birden çok açıklık, farklı quantity ve farklı malzeme/kalınlık kombinasyonlarını karışık aile projelerinde test etmek.
5. Donanım/delik ve CNC operasyon modelini gerçek üretici/atölye standardı sağlanana kadar yalnızca veri sözleşmesi araştırması olarak tutmak.


## 17 Kasım 2026 — banyo dolabı üst panel açıklığı domain dilimi

- Proje agregatörüne `bathroom-vanity` ailesi eklendi. Mevcut cabinet konstrüksiyon motoru kullanılır; böylece ölçü, panel kalınlığı, arkalık, kapak, raf, malzeme ve kenar bantlama kuralları kopyalanmaz.
- Bu ailede üst panel Part'ına en az bir açık ölçülü dikdörtgen geçiş açıklığı bağlanması zorunludur. Bir panelde birden fazla ayrık açıklık desteklenir; eksik açıklık veya yalnızca başka bir paneldeki açıklık projeyi bloklar ve kısmi Part listesi döndürmez.
- Net alan/hacim ve iç kenar bantlama mevcut `calculateProjectMaterialConsumptionSummary` üzerinden aynı quantity semantiğiyle hesaplanır.
- Kesitli panel JSON v1/CSV adapter'ı ayrı frontend sahibinin kapsamındadır; bu nedenle `canExport: false` kapısı korunur.
- Bu dilim lavabo/armatür şablonu, musluk/drenaj deliği, tesisat boşluğu, oval/köşeli kesit, baza/ayak, ankraj, yük, bağlantı, CNC veya fiziksel üretim onayı sağlamaz.

### Güncel sıradaki 3-5 küçük görev

1. Ayrı frontend sahibinin `panelGeometry` alanını JSON v1'e kayıpsız bağlamasını ve kesitli Part eski CSV şemasında temsil edilemiyorsa export'u kapalı tutmasını takip et; frontend dosyalarına dokunma.
2. Banyo üst paneli için oval/çokgen lavabo şablonlarını ancak üretici tarafından verilen gerçek kesit koordinatları veya kullanıcı tarafından açıkça tanımlanan geometri sözleşmesi sağlandığında ayrı sürüm olarak ele al.
3. Banyo dolabı baza/ayak, arkalık ve montaj seçeneklerini yalnızca kullanıcı/üretici ölçüleriyle parametrik aile dilimlerine ayır; duvar/zemin ankrajı veya yük kapasitesi varsayma.
4. Kesitli panellerin karışık cabinet/bookshelf/table/wardrobe/tv-unit/bathroom-vanity projelerinde farklı malzeme, kalınlık, quantity ve çoklu açıklık kombinasyonlarını otomatik testlerle genişlet.
5. Donanım/delik/CNC veri modelini gerçek üretici/atölye standardı bulunana kadar koordinat üretmeyen, kaynak ve birimi izlenebilir sözleşme olarak tasarla.


## 17 Kasım 2026 07:18 TRT — DOM-002 karışık aile kesit/tüketim kabulü

- Banyo dolabı üst panelindeki iki açıklık ve kitaplık rafındaki tek açıklık aynı proje üretim raporunda doğrulanır.
- Kitaplık rafı 8 mm \`mdf-8\`, quantity 3; banyo üst paneli 18 mm \`mdf-18\`, quantity 1 olarak korunur. Kesit öncesi/sonrası malzeme özeti farkları net alan, hacim ve iç kenar bant uzunluklarında otomatik test edilir.
- Part satırı ve adet toplamları değişmez; kesitli her proje için JSON v1/CSV adapter desteği gelene kadar \`canExport: false\` korunur.
- Teslimat commit: `23385aaf14cac1550a37558cdadb6df3b60d3b1a`; CI #`44016704571` ve QA #`44016704658` başarılı (**101/101 frontend + 145/145 domain testi, 0 başarısız**); Pages build/deploy #`44016704645` başarılı.
- Değişen dosyalar: \`domain/production/projectProduction.test.mjs\`, \`docs/production-domain-contract.md\`, \`PRODUCT_ROADMAP.md\`, \`AI_PROGRESS.md\`, \`AI_COORDINATION.md\`. \`frontend/**\` değişmedi.
- Bilinen sınırlar: CNC/üretici standardı, lavabo şablonu, bağlantı, delik, fire, nesting ve fiyat hesabı yok; fiziksel üretim onayı değildir.

### Sıradaki küçük görevler

1. Frontend sahibinin \`panelGeometry\`, \`verticalDividers\`, \`shelves\` ve \`blocked/canExport\` durumlarını JSON v1/CSV akışına kayıpsız bağlamasını ayrı PR üzerinden doğrula; frontend dosyalarına dokunma.
2. Banyo dolabı arkalık, baza ve ayak seçeneklerini yalnızca kullanıcı/üretici tarafından sağlanan ölçü ve bağlantı girdileriyle ayrı parametrik dilimlere ayır.
3. Karışık mobilya ailelerinde çoklu kesit, farklı kenar bayrakları ve 0.1 mm normalizasyon sınırları için domain regresyon testlerini genişlet.
4. Donanım/delik operasyonları için kaynak ve birimi izlenebilir, koordinat üretmeyen veri sözleşmesi tasarla; gerçek üretici standardı olmadan CNC çıktısı üretme.
5. Levha optimizasyonu, fire ve maliyet hesaplarını ancak kullanıcı kataloğu, makine profili ve fiyat girdileri tanımlandığında başlat.


## 17 Kasım 2026 — açık donanım BOM satırları (domain v1)

- Proje agregatörü, kullanıcı/katalog girdili `hardwareItems` satırlarını panel Part listesinden ayrı taşır; satır kimliği, mobilya ilişkisi, donanım kimliği, ad, miktar, birim ve opsiyonel kaynak referansı korunur.
- Geçersiz miktar/birim, yinelenen satır kimliği veya olmayan/hesaplanmamış mobilya ilişkisi projeyi `blocked` yapar; kısmi sonuç verilmez.
- Donanım satırları panel alanı/hacmi ve kenar bantlama özetine karıştırılmaz. Fiyat, üretici standardı, montaj, delik koordinatı ve CNC operasyonu tahmin edilmez.
- Geçerli donanım satırı içeren domain raporu `ready` olabilir; JSON v1/CSV adapter desteği olmadığı için `canExport: false` ve `exportBlockers` korunur.

## 17 Kasım 2026 — donanım BOM tüketim özeti (domain v1)

- `calculateProjectHardwareConsumptionSummary`, açık `hardwareItems` satırlarını `hardwareId + unit` anahtarıyla gruplayarak donanım miktarlarını panel tüketiminden ayrı raporlar.
- Aynı donanım kimliği ve özgün birim için satır adı tutarlı olmalıdır. Özet satır sayısını, kesirli miktar toplamını, mobilya kimliklerini ve varsa benzersiz kaynak referanslarını taşır.
- Kesirli miktarlar tam ondalık toplama ile korunur; birimler arasında dönüşüm yapılmaz. Sayı türünde kayıpsız/güvenli temsil edilemeyen toplam reddedilir.
- Donanım olmayan legacy v1 sonuçları boş özet üretir. Donanım satırı bulunan projelerde JSON v1/CSV adapter'ı `hardwareItems` alanını kayıpsız destekleyene kadar `canExport: false` korunur.
- Fiyat, stok, tedarik, montaj/delik, bağlantı veya CNC standardı varsayılmaz; bu çıktı teklif fiyatı değil, kullanıcı girdili BOM miktar özetidir.

### Güncel sıradaki 3-5 küçük görev

1. Arayüz ajanının `hardwareItems` alanını JSON v1 round-trip'e bağlamasını ve desteklenmeyen CSV için export kapısını korumasını PR üzerinden doğrula; frontend dosyalarına dokunma.
2. Donanım kataloğu kimlikleri için kullanıcı/katalog kaynak referansı ve sürüm sözleşmesini belirle; harici kimliği doğrulanmış gibi sunma.
3. Fiyat/teklif motorunu yalnızca kullanıcı tarafından sağlanan para birimi, birim fiyat ve geçerlilik tarihi girdileriyle ayrı bir domain dilimine ayır.
4. Banyo dolabı arkalık, baza ve ayak seçeneklerini yalnızca açık kullanıcı/üretici ölçüleri ve bağlantı girdileriyle parametrik hale getir.
5. Delik/CNC operasyon modelini gerçek makine profili ve doğrulanmış koordinat standardı sağlandığında genişlet; standart yokken koordinat üretme.


## 17 Kasım 2026 — kullanıcı girdili proje maliyet motoru (domain v1)

- calculateProjectCostSummary, kullanıcı/katalog tarafından açıkça sağlanan maliyet satırlarını malzeme, donanım, işçilik, operasyon, fire ve kâr kategorilerinde toplar.
- Her satır özgün birim ve aynı proje para birimini taşır; fiyat, para biriminin en küçük biriminde tam sayı olarak sağlanır. Miktar en fazla altı anlamlı ondalık basamakla işlenir ve satır bazında yarım-yukarı yuvarlanır.
- Kısmi hesap yoktur: farklı para birimi, geçersiz satır, yinelenen kimlik veya güvenli tam sayı taşması bütün hesabı reddeder.
- Boş liste sıfır tutarlı empty durumudur; fiyatı doğrulanmış veya ücretsiz proje anlamına gelmez. Kâr/fire yüzdesi, vergi, döviz dönüşümü, fiyat kataloğu ve teklif revizyonu üretilmez.
- Bu dilim maliyet satırlarını mevcut panel/donanım tüketim özetlerine otomatik eşlemez; bu entegrasyon ayrı domain görevidir.

### Sıradaki 3-5 küçük görev

1. Kullanıcı fiyat tablosunu materialId/hardwareId + özgün birim anahtarıyla mevcut malzeme ve donanım özetlerine bağlayan domain adapter'ı ekle; fiyatı bulunmayan satırları açıkça eksik göster ve toplamı hazır sayma.
2. İşçilik ve operasyon satırları için kullanıcı tarafından girilen süre/birim ve tarife referansını koruyan teklif girdisi sözleşmesini ekle; süre veya tarife varsayma.
3. Teklif revizyonu, para birimi ve fiyat geçerlilik tarihi için sürümlenebilir domain zarfını tasarla; eski proje JSON v1 alanlarını değiştirmeden tut.
4. Vergi, indirim ve kâr yüzdesini yalnızca açık ülke/işletme ayarları ve kullanıcı girdisi tanımlandığında ayrı hesap kuralları olarak ele al.
5. Fiyatlı malzeme/donanım/işçilik satırlarının JSON/CSV round-trip ve UI entegrasyonunu ilgili frontend sahibiyle sözleşme üzerinden tamamla; frontend dosyalarına dokunma.


### DOM-005 teslimat ve Actions doğrulaması

- Commit: [6d1d820d6469777f24cb0c7d5e251dfe7ec39c61](https://github.com/Taylan789/MobilyaCAD/commit/6d1d820d6469777f24cb0c7d5e251dfe7ec39c61).
- [CI #44042058150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058150), [QA #44042058139](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058139) ve [Pages #44042058240](https://github.com/Taylan789/MobilyaCAD/actions/runs/44042058240) başarılı.
- QA kanıtı: 101/101 frontend + 164/164 domain testi; 0 başarısız. Strict shared-domain TypeScript, lint, production build ve production dependency audit adımları geçti.
- Sonraki domain dilimi: açık fiyat tablosunu materialId/hardwareId ve özgün birim ile tüketim özetlerine eşlemek; eksik fiyat veya para birimi uyuşmazlığında toplamı hazır göstermemek.


## 17 Kasım 2026 11:32 TRT — üretim tüketiminden fiyatlı maliyet kapsamı (DOM-006)

- Yeni domain adapter'ı, doğrulanmış proje üretim raporundaki malzeme ve donanım tüketimini kullanıcı fiyat tablosuyla eşleştirir.
- Malzeme eşleşmesi `materialId + m2`; donanım eşleşmesi `hardwareId + özgün BOM unit` anahtarıyla yapılır. Birim dönüşümü veya varsayılan fiyat yoktur.
- Eksik fiyat, eksik legacy malzeme kimliği ve birim uyuşmazlığı `incomplete` döndürür; `costSummary` null kalır. Üretim raporu bozuksa, fiyat tablosu geçersizse veya para birimleri karışıyorsa `blocked` döner.
- Kenar bantlama uzunluğu domain özetinde bulunsa da henüz ayrı katalog kimliği taşımadığından toplamı tamamlamayı engeller; panel m² fiyatı kenar bandı fiyatı olarak kullanılamaz.
- Açık sıfır fiyat geçerlidir; sıfır fiyat varsayılmaz. Tek toplam yalnızca tüm tüketim satırları açık fiyatlı ve aynı para birimindeyse üretilir.
- Doğrulama: [özellik commit 106bb4d6](https://github.com/Taylan789/MobilyaCAD/commit/106bb4d6da1cb1316f5386080e6b34d491a09016); [CI #44048122112](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122112), [QA #44048122147](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122147) (101/101 frontend + 175/175 domain, 0 başarısız) ve [Pages #44048122140](https://github.com/Taylan789/MobilyaCAD/actions/runs/44048122140) başarılı.

### Sonraki küçük domain görevleri

1. DOM-009: üretim tüketimi ve işçilik/operasyon maliyet özetlerini tek teklif toplamında birleştir; herhangi bir alt kapsam incomplete/blocked ise genel toplamı hazır gösterme.
2. DOM-010: kullanıcı fiyat listesi ve tarife kaynağı için sürüm/etkinlik tarihi snapshot'ı ekle; tarih veya katalog sürümü varsayma.
3. DOM-011: teklif revizyon zarfını geriye uyumlu ve salt okunur maliyet snapshot'larıyla tanımla; vergi/kur/iskonto kurallarını uydurma.
4. Frontend sahibinin maliyet/tarife ready, incomplete ve blocked durumlarını JSON v1/CSV sözleşmesiyle bağlamasını PR üzerinden doğrula; frontend dosyalarına dokunma.
5. INT-002 adapter round-trip testleri tamamlandığında QA-003 uçtan uca export denetimini yürüt.


### DOM-006 kabul sonucu

- Fiyat eşleşmesi `resourceType + resourceId + unit` anahtarıyla test edildi; malzeme için `m2`, donanım için özgün BOM birimi korunur.
- Eksik fiyat, eksik malzeme kimliği, birim uyuşmazlığı ve henüz katalog kimliği taşımayan kenar bandı `costSummary: null` bırakır; farklı para birimi ve bozuk girdiler blocked olur.
- Açık sıfır fiyat yalnızca fiyat satırı olarak verilmişse geçerlidir. Miktar hassasiyeti mevcut maliyet motorunun altı ondalık basamak sınırını aşarsa toplam reddedilir.
- DOM-006 tamamlandı; sonraki domain görevi DOM-007 kenar bandı katalog kimliği ve özgün birim sözleşmesidir.


### DOM-007 kabul sonucu — tamamlandı

- Part bazlı `edgeBandingAssignments`, açık `edgeBandingId` ve kullanıcı tarafından seçilen `mm` / `m` birimiyle üretim sonucuna bağlandı. Bir Part'ın bütün bantlı dış ve dikdörtgen açıklık iç kenarları v1'de aynı kaynağı kullanır.
- `calculateProjectEdgeBandingConsumptionSummary` Part quantity değerini dış/iç kenar uzunluğuna uygular; tüketimi kaynak kimliği + birim ile gruplar. Atanmamış legacy Part, null kaynak kimliği olarak kalır ve fiyatlı toplamı incomplete tutar.
- Fiyat adapter'ı `resourceType: "edge-banding"` satırlarını aynı kimlik/birim anahtarıyla eşleştirir. Eksik fiyat/birim uyuşmazlığı `costSummary: null` bırakır. Yeni Part alanları JSON v1/CSV adapter'ı tarafından henüz taşınmadığı için `canExport: false` korunur.
- Kabul testleri: açık metre fiyatı ve toplam; mm/m birim uyuşmazlığı; bilinmeyen, bantlanmamış, yinelenen Part ve geçersiz katalog kimliği; legacy atamasız tüketim.
- Özellik commit: [ea78777b1f2852f0b81b44eb0fe6bb68a84f5157](https://github.com/Taylan789/MobilyaCAD/commit/ea78777b1f2852f0b81b44eb0fe6bb68a84f5157).
- [CI #44056080300](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080300) başarılı; [QA #44056080414](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080414) başarılı: **101/101 frontend + 178/178 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, frontend production build ve production dependency audit yüksek önem eşiği geçti. Oxlint 32 uyarı / 0 hata; audit'te 4 orta önem bulgusu sürüyor.
- [Pages #44056080332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44056080332) başarılı. PR açılmadı; yalnızca `dev/github-work` güncellendi. `frontend/**` ve `main` değiştirilmedi.
- Bilinen sınırlar: bir Part için tek band kaynağı v1; gerçek katalog kaydı, renk/kalınlık/yapışkan, rulo payı/fire, işçilik ve CNC standardı doğrulanmaz. Fiziksel üretim onayı değildir.
- Sonraki domain adımı DOM-009: üretim tüketimi ve işçilik/operasyon maliyetlerini eksik-girdi güvenli tek teklif toplamında birleştirmek.


## 17 Kasım 2026 13:49 TRT — DOM-008 işçilik/operasyon tarifesi (Actions doğrulandı)

- Domain dilimi, kullanıcı girdili iş kullanım satırlarını ayrı tarife tablosuyla eşleştirir. Her kullanım satırı açık kategori, süre, süre birimi ve tarife kimliği taşır; tarife açık birim fiyatı, para birimi ve zorunlu kaynak referansı taşır.
- Kabul kriterleri: tarife ve kullanım kimlikleri benzersiz; kategori eşleşmesi zorunlu; dakika/saat birimleri birebir eşleşir; otomatik dönüşüm ve varsayılan fiyat yoktur; eksik tarife/birim uyuşmazlığında kısmi parasal toplam yoktur; farklı para birimleri blocked olur.
- Sıfır fiyat yalnızca açık tarife girdisiyle kabul edilir. Süre en fazla altı ondalık basamak; mevcut maliyet motorunun satır yuvarlaması kullanılır.
- Uygulama commit ve Actions kanıtları aşağıdaki kayıtta ve AI_PROGRESS.md / AI_COORDINATION.md içinde yer alır.
- Bilinen sınırlar: tarife kaynağının gerçekliği ve güncelliği doğrulanmaz; geçerlilik tarihi, vergi, kur, teklif revizyonu ve üretim tüketimiyle tek toplam sonraki görevlerdir. Fiziksel üretim onayı değildir.

- Uygulama commit: [b42fe770c2045739c12366108489e28bec25591b](https://github.com/Taylan789/MobilyaCAD/commit/b42fe770c2045739c12366108489e28bec25591b).
- [CI #44069400982](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400982), [QA #44069401154](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069401154) ve [Pages #44069400970](https://github.com/Taylan789/MobilyaCAD/actions/runs/44069400970) başarılı. QA: 101/101 frontend + 187/187 domain testi, 0 başarısız; strict TypeScript, lint, production build ve production dependency audit geçti.


## 17 Kasım 2026 14:06 TRT — DOM-009 birleşik teklif toplamı (Actions doğrulandı)

- Özellik commit'i: [e78152351f679547f064048cceff33063555b9cc](https://github.com/Taylan789/MobilyaCAD/commit/e78152351f679547f064048cceff33063555b9cc).
- `calculateProjectQuoteSummary`, malzeme/donanım/kenar bandı tüketim fiyatlarını ve kullanıcı girdili işçilik/operasyon tarifelerini aynı maliyet motorunda toplar. Kaynak kimlikleri `lineSources` ile korunur.
- Herhangi bir alt kapsam incomplete/blocked ise `costSummary: null`; iki alt kapsam ready ise aynı para birimi zorunludur. İki boş kapsam empty; yalnızca biri dolu ve ready ise o kapsamın toplamı hesaplanabilir.
- [CI #44072219005](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219005) başarılı; [QA #44072219133](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072219133) başarılı: **101/101 frontend + 194/194 domain testi, 0 başarısız**. Shared-domain strict TypeScript, lint, production build ve production dependency audit eşiği geçti. [Pages #44072218712](https://github.com/Taylan789/MobilyaCAD/actions/runs/44072218712) build/deploy başarılı.
- Kalite notları: lint 32 uyarı / 0 hata; production audit eşiği geçti ancak 4 orta seviye dependency bulgusu sürüyor. Force/breaking dependency güncellemesi yapılmadı.
- Bilinen sınırlar: teklifin JSON/CSV ve frontend UI entegrasyonu ayrı sahiplik alanındadır. Vergi, döviz dönüşümü, iskonto, fiyat geçerlilik tarihi, teklif revizyonu, fire/kâr yüzdesi veya CNC standardı üretilmez. Fiziksel üretim onayı değildir.
- Hiçbir `frontend/**` dosyası değiştirilmedi; açık UI PR #46 yalnızca `frontend/src/App.css` değiştiriyor ve ayrı sahibinde bırakıldı. `main` dalına dokunulmadı.

### Sıradaki 3-5 küçük görev

1. DOM-012: fire ve kârı yalnızca kullanıcı tarafından girilen açık miktar/birim/fiyat satırlarıyla ekle; yüzde, vergi veya marj uydurma.
2. INT-001: domain üretim raporundaki kesit geometrisi, malzeme ve miktarı JSON/CSV adapter'ında kayıpsız taşı veya desteklenmeyen çıktıyı engelle.
3. Frontend sahibinin DOM-009/010/011 ready, incomplete ve blocked sözleşmelerini proje akışına bağlamasını PR üzerinden doğrula; frontend dosyalarına dokunma.
4. INT-002: sahiplenilmemiş adapter testlerinde JSON/CSV round-trip ve geometri/miktar sadakatini doğrula; entegrasyon ajanının dosyalarına müdahale etme.
5. QA-003: INT-001/INT-002 tamamlandığında birleşik teklif ve export akışını uçtan uca denetle.

## 17 Kasım 2026 15:43 TRT — DOM-010 fiyat/tarife sürüm snapshot'ı (doğrulama bekleniyor)

### Kullanıcı akışı ve kabul ölçütleri

- Teklif oluşturulurken kullanıcı teklif tarihini, üretim tüketimi fiyat listesinin katalog kimliği/sürümünü ve işçilik/operasyon tarife listesinin katalog kimliği/sürümünü açıkça sağlar.
- Her kaynak için başlangıç tarihi ve isteğe bağlı bitiş tarihi YYYY-MM-DD biçiminde doğrulanır; teklif tarihi aralığın içinde ve sınır günleri dahil olmalıdır.
- Üretim tüketimi satırı bulunan hazır teklifte fiyat listesi; işçilik/operasyon satırı bulunan hazır teklifte tarife listesi metadata'sı zorunludur.
- Snapshot, hazır birleşik teklif satırlarını, miktar/birim/fiyat/para birimi ve kaynak eşlemesini mevcut quote summary'den saklar; kullanıcı girdisi katalog kimliği, sürümü ve geçerlilik tarihleriyle birlikte derin dondurulur.
- Eksik kaynak metadata'sı, geçersiz tarih, aralık dışı teklif tarihi veya desteklenmeyen alan snapshot'ı blocked yapar. Incomplete/blocked/empty teklif için hazır snapshot oluşturulmaz.
- Tarih yalnızca kullanıcı tarafından sağlanan takvim günüdür; sistem saati, katalog sürümü, fiyat, vergi, kur veya geçerlilik aralığı tahmin edilmez.

### Sınırlar ve entegrasyon

- Kaynak katalogların gerçekliği, fiyatların doğruluğu ve geçmişte gerçekten yürürlükte olduğu dışarıdan doğrulanmaz; domain yalnızca kullanıcının verdiği sürüm ve tarih iddiasını saklar.
- Bu domain snapshot henüz proje JSON v1/CSV adapter'ına veya arayüze bağlanmadı. Frontend sahibinin entegrasyonu için snapshot schemaVersion, quotedOn, consumptionPriceList, laborOperationTariffList ve quoteSummary alanları kullanılabilir.
- Sonraki görevler: DOM-011 salt okunur teklif revizyon geçmişi; DOM-012 açık tutar satırlarıyla fire/kâr kapsamı; ayrı adapter sahibinin JSON/CSV round-trip sözleşmesi.


### DOM-010 doğrulama sonucu — 17 Kasım 2026 15:43 TRT

- [Özellik commit'i 215bfbeae1583505936d0f8f2549fe247a36efa9](https://github.com/Taylan789/MobilyaCAD/commit/215bfbeae1583505936d0f8f2549fe247a36efa9).
- [CI #44086836332](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836332) başarılı.
- [QA #44086836369](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836369) başarılı: 101/101 frontend + 203/203 domain testi, 0 başarısız; yeni snapshot modülü strict TypeScript kontrolünden geçti.
- [Pages #44086836270](https://github.com/Taylan789/MobilyaCAD/actions/runs/44086836270) başarılı.
- Lint 32 uyarı / 0 hata; production audit yüksek önem eşiğini geçti, 4 orta seviye bulgu sürüyor.
- DOM-010 DONE. Sonraki görev DOM-011: salt okunur teklif revizyon zarfı ve maliyet snapshot'ı.


## 17 Kasım 2026 17:42 TRT — DOM-011 teklif revizyon zarfı (Actions doğrulaması bekleniyor)

- Kullanıcı akışı: hazır birleşik teklifin fiyat/tarife snapshot'ı, proje kimliği ve açık revizyon kimliği/sırası/tarihiyle ayrı bir revizyon kaydına alınır; sonraki kayıt önceki revizyona bağlanır.
- Kabul ölçütleri: ilk revizyon 1 numarasıyla başlar; sonraki revizyon aynı projeye ait olur, sıra numarasını bir artırır ve daha yeni saat dilimli ISO 8601 tarihi taşır. Kimlik, tarih, snapshot para birimi, maliyet satırı/kategori toplamı ve kaynak eşlemesi doğrulanır.
- Maliyet snapshot'ı JSON uyumlu derin kopyaya alınır ve runtime'da dondurulur. Eksik/boş/incomplete/blocked teklif revizyon oluşturmaz.
- Mevcut proje JSON v1 şeması ve frontend/adapter dosyaları değiştirilmedi; revizyon zarfı ayrı domain kaydıdır. Kalıcı geçmiş ve tüm geçmişte kimlik tekilliği sonraki depolama/adapter entegrasyonunda sağlanmalıdır.
- Kod ve test commit'i oluşturuldu; gerçek CI/QA sonucu bu kayıt tamamlanmadan DONE ilan edilmeyecektir.


### DOM-011 doğrulama sonucu — 17 Kasım 2026 17:49 TRT

- [Özellik commit 84a24e80](https://github.com/Taylan789/MobilyaCAD/commit/84a24e80ad2122d08c6384bfdc7ccc21fdb3a0b0) ve [test düzeltmesi 49101591](https://github.com/Taylan789/MobilyaCAD/commit/491015912a38b47ef2f0d31b664d21038f790859).
- [CI #44107254101](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254101), [QA #44107254191](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254191) ve [Pages #44107254198](https://github.com/Taylan789/MobilyaCAD/actions/runs/44107254198) başarılı.
- QA: **101/101 frontend + 214/214 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint, production build ve yüksek önem eşiğinde dependency audit başarılı.
- Lint 32 uyarı, production audit 4 orta seviye bulgu ve mevcut büyük bundle uyarısı sürüyor; bu dilimde bağımlılık yükseltmesi yapılmadı.
- DOM-011 tamamlandı. Sonraki görev DOM-012: yalnızca açık kullanıcı fiyat satırlarıyla fire/kâr maliyet kapsamı.


## 17 Kasım 2026 18:16 TRT — DOM-012 açık fire/kâr satırları

### Kullanıcı akışı ve kabul ölçütleri

- Teklif hazırlayan kişi fire veya kârı yüzdeyle tahmin ettirmek yerine ayrı bir maliyet satırı olarak girer.
- Her satır için kimlik, kategori (`waste` / `profit`), açıklama, miktar, birim, birim fiyatı, para birimi ve kaynak referansı zorunludur.
- Yalnızca açık satırlar birleşik teklif maliyet motoruna girer. Varsayılan oran, yüzde, vergi, marj veya fiyat üretilmez.
- Satırların maliyeti, malzeme/donanım/işçilik/operasyonla aynı para birimi ve yuvarlama kurallarında hesaplanır. Hatalı satır veya para birimi uyuşmazlığında genel toplam gösterilmez.
- Fire/kâr satırları tarihli fiyat snapshot'ında ve teklif revizyonunda kaynak kimliğiyle korunur.

### Uygulama sınırı ve bağımlılıklar

- Domain değişikliği `calculateProjectQuoteSummary` fonksiyonunun geriye uyumlu beşinci opsiyonel girdisidir; eski dört argümanlı çağrılar aynı sonucu korur.
- `createProjectQuotePricingSnapshot` isteğe bağlı `quoteAdjustments` alanını snapshot içindeki birleşik maliyete aktarır.
- `createProjectQuoteRevision` yalnızca `quote-adjustment` kaynak eşlemesiyle `waste` / `profit` satırlarını kabul eder.
- JSON v1 proje serializer/parser, CSV adapter ve `frontend/**` bu dilimde değiştirilmez. Frontend entegrasyonu ayrı sahiplik alanındadır.
- Fiziksel fire oranı, levha verimi, kerf, vergi ve ticari marj kararı kullanıcı/işletme girdisi olmadan hesaplanmaz.

### DOM-012 teslimat ve Actions doğrulaması — 17 Kasım 2026

- Özellik commit'i: [288baf10dfff33a393561b5c35a0fb9be79265ef](https://github.com/Taylan789/MobilyaCAD/commit/288baf10dfff33a393561b5c35a0fb9be79265ef); doğrulama düzeltmesi: [c1257200890cd477dbbec3063defd379f55b9b64](https://github.com/Taylan789/MobilyaCAD/commit/c1257200890cd477dbbec3063defd379f55b9b64).
- [CI #44113620081](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113620081), [QA #44113620028](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113620028) ve [Pages #44113619995](https://github.com/Taylan789/MobilyaCAD/actions/runs/44113619995) başarılı.
- QA: **101/101 frontend + 220/220 domain testi, 0 başarısız**; strict shared-domain TypeScript, lint, production build ve yüksek önem eşiğinde dependency audit başarılı.
- İlk QA'da 6 yeni test eksik `isRecord` koruyucusu nedeniyle blocked kaldı; düzeltme test kapsamını değiştirmeden yapıldı.
- Lint 32 uyarı / 0 hata; production audit'te 4 orta önem minimatch zinciri bulgusu sürüyor. Yalnızca kırıcı `npm audit fix --force` önerildiği için bağımlılık yükseltilmedi.
- DOM-012 DONE; JSON v1/CSV adapter ve frontend entegrasyonu ayrı sahiplik alanında kalır.

### Güncel sıradaki 3-5 küçük görev

1. SEC-001: frontend sahibinin production audit içindeki picomatch yüksek bulgularını Vite 8'i kırmadan çözmesini veya build-only paket sınıflandırmasını doğrulamasını bekle; `frontend/**` dosyalarına dokunma.
2. DOM-014: append API ve schemaVersion round-trip kodu hazır; SEC-001 sonrasında tam QA yeniden yeşil olduğunda DONE kanıtını kaydet.
3. DOM-015: kod ve regresyonlar Actions'ta geçti; QA yalnızca ortak production dependency audit nedeniyle BLOCKED. SEC-001 sonrasında tam QA yeşil olunca DONE yap.
4. INT-001: domain üretim raporundaki kesit geometrisi, malzeme ve quantity kaybını JSON/CSV adapter sözleşmesinde önle veya desteklenmeyen export'u engelle; yalnız domain sözleşmesi/devir kapsamı.
5. INT-002: entegrasyon/performans ajanının ayrı dalındaki JSON/CSV round-trip ve geometri/miktar testlerini incele; aynı adapter/test dosyalarına müdahale etme.

## 17 Kasım 2026 — DOM-014 immutable teklif revizyon append ve doğrulama durumu

- Kod commit'i: [90139782f8185c0fb399d1d88174d8d46472f572](https://github.com/Taylan789/MobilyaCAD/commit/90139782f8185c0fb399d1d88174d8d46472f572). Follow-up uyumluluk düzeltmesi: [34d9ee813f0f96eafec12568059d25850d2318cd](https://github.com/Taylan789/MobilyaCAD/commit/34d9ee813f0f96eafec12568059d25850d2318cd).
- `appendProjectQuoteRevision` önce tüm geçmişi doğrular; yeni ID, tarih ve ready snapshot dışında proje kimliği/sıra/önceki bağlantı kabul etmez. Sıra ve previousRevisionId mevcut zincirden türetilir. Duplicate ID, bozuk geçmiş, kopuk zincir, geriye giden tarih, invalid snapshot veya bilinmeyen alan kısmi sonuç üretmeden blocked döner.
- Follow-up düzeltmesi, `schemaVersion: 1` taşıyan fonksiyon çıktısının yeniden doğrulanmasını ve sonraki append çağrısına girdi olmasını sağlar. SchemaVersion bulunmayan eski girdiler geriye uyumlu kalır; sağlanırsa yalnızca 1 kabul edilir.
- Otomatik testler: boş geçmişten ilk append, ardışık append, geçmiş genelinde duplicate ID, bozuk zincir, kronoloji, invalid snapshot, kapalı girdi şeması ve schemaVersion round-trip.
- [CI #44142328774](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328774) başarılı. [QA #44142328778](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328778): **101/101 frontend + 234/234 domain testi geçti**, strict shared-domain TypeScript, lint ve production build başarılı; ancak production dependency audit adımı başarısız. [Pages #44142328629](https://github.com/Taylan789/MobilyaCAD/actions/runs/44142328629) başarılı.
- Audit engeli: 12 bulgu (2 moderate, 10 high), yüksek bulgular picomatch/ReDoS zincirinde; log `npm audit fix --force` için Vite 6.2.7 kırıcı downgrade öneriyor. Frontend bağımlılık manifesti ve lockfile arayüz ajanının sahipliğindedir; domain agent'ı bu dosyalara dokunmadı ve zorlayıcı bağımlılık değişikliği yapmadı. SEC-001 frontend sahibine devredildi.
- Bilinen sınırlar: append saf/in-memory domain işlemidir; kalıcı depolama, atomik transaction, eşzamanlı yazma kilidi ve ID üretimi sağlamaz. JSON v1/CSV ve UI entegrasyonu ayrı sahiplik alanındadır. CNC/atölye üretim onayı değildir.


## 17 Kasım 2026 21:20 TRT — DOM-015 teklif satır aritmetiği doğrulaması

- Kod commit'i: [f160360f2050f4021a850d0c49123ac0ed1ccd3a](https://github.com/Taylan789/MobilyaCAD/commit/f160360f2050f4021a850d0c49123ac0ed1ccd3a).
- Teklif maliyet motoru ile revizyon snapshot doğrulaması aynı `calculateProjectCostLineTotalMinor` fonksiyonunu kullanır. Altı ondalık miktar hassasiyeti, güvenli tam sayı sınırı ve satır bazında yarım-yukarı yuvarlama tek yerde uygulanır.
- Yeni regresyonlar, aggregate kategori/genel toplamları da değiştirilmiş olsa bile miktar × birim fiyatla uyuşmayan satır toplamını ve altı basamaktan fazla miktar hassasiyetini reddeder.
- [CI #44147550422](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550422) başarılı; [QA #44147550175](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550175) 101/101 frontend + 237/237 domain testi, strict TypeScript, lint ve production build aşamalarını geçti. QA genel job'u 12 production audit bulgusu (2 moderate, 10 high; picomatch ReDoS zinciri) nedeniyle başarısız; [Pages #44147550068](https://github.com/Taylan789/MobilyaCAD/actions/runs/44147550068) başarılı.
- Bağımlılık/lockfile/secrets ve `frontend/**` değiştirilmedi. `npm audit fix --force` Vite 6.2.7 kırıcı downgrade önerdiği için uygulanmadı. DOM-015 domain davranışı ve testleri doğrulandı; tam QA, SEC-001 çözülene kadar BLOCKED.
- Sonraki adım: frontend sahibinin SEC-001 audit düzeltmesini bekle; ardından DOM-014/015 için tam QA doğrulaması ve INT-001 domain/export sözleşmesi entegrasyonu.


## 17 Kasım 2026 22:44 TRT — DOM-016 teklif revizyon farkı (domain doğrulandı)

- Özellik commit'i: [dc032abe3e60523eadbe9dbba618c83ae65fa9ec](https://github.com/Taylan789/MobilyaCAD/commit/dc032abe3e60523eadbe9dbba618c83ae65fa9ec).
- `compareProjectQuoteRevisions` doğrulanmış geçmişten aynı proje içindeki daha yeni iki revizyonu karşılaştırır; para birimi aynı değilse kur uydurmadan blocked döner.
- Sonuç: genel toplam ve altı maliyet kategorisi için minor-unit farkları; artı artış, eksi azalıştır. Sonuç immutable; satır eşlemesi, FX, vergi/iskonto ve fiyat tahmini yoktur.
- Test kanıtı: [CI #44162404907](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162404907) başarılı; [QA #44162404959](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162404959) **101/101 frontend + 241/241 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint ve production build başarılı. [Pages #44162405010](https://github.com/Taylan789/MobilyaCAD/actions/runs/44162405010) başarılı.
- QA genel sonucu yalnızca 12 production audit bulgusu (2 moderate, 10 high; picomatch ReDoS zinciri) nedeniyle başarısızdır. SEC-001 frontend sahibinin kapsamındadır; bu otomasyon frontend, manifest, lockfile veya secrets değiştirmedi.
- Durum: domain teslimatı test/build açısından doğrulandı; tam QA audit çözülene kadar BLOCKED.

### Güncel sıradaki 3-5 küçük görev

1. SEC-001: frontend sahibinin picomatch production audit bulgularını Vite 8'i kırmadan çözmesini bekle; `frontend/**`, manifest ve lockfile sahipliğine dokunma.
2. DOM-014/015/016: audit düzeltmesi sonrası aynı kod SHA'ları için tam QA sonucu ve görev durumlarını güncelle.
3. INT-001: kesit geometrisi, malzeme ve quantity kaybını JSON/CSV adapter sözleşmesinde önle veya desteklenmeyen export'u engelle; adapter dosyalarını değiştirme.
4. INT-002: entegrasyon/performans ajanının round-trip ve geometri/miktar testlerini kendi dalında tamamlamasını bekle; PR'ını sahiplenme/merge etme.
5. QA-003: INT-001 ve INT-002 kanıtları geldikten sonra uçtan uca export ve veri sadakati denetimi.


## 18 Kasım 2026 — DOM-017 teklif revizyon geçmişi JSON zarfı

- Teklif revizyon geçmişi için bağımsız mobilyacad-quote-revision-history dosya türü ve v1 JSON zarfı eklendi.
- Serializer önce tüm geçmişi doğrular; yalnızca ready/empty sonucu JSON'a dönüştürür. Parser dosya türü, sürüm ve kapalı zarf şemasını denetler, ardından tüm revizyon zincirini ve maliyet snapshot'larını yeniden doğrular.
- Eski iç geçmiş kayıtlarında schemaVersion alanının bulunmaması geriye uyumlu kalır; yeni export kanonik schemaVersion 1 yazar. Empty geçmiş empty olarak korunur; bozuk JSON/şema/geçmişte kısmi sonuç yoktur.
- Bu ayrı bir teklif geçmişi dosyasıdır; mevcut proje JSON v1'e otomatik eklenmez. Frontend, disk yazımı, otomatik kayıt ve eşzamanlılık/backup altyapısı ayrı entegrasyon işidir.
- Test kabul kriterleri: iki revizyonun round-trip ile ID/sıra/önceki bağlantı ve toplamları koruması; empty geçmiş; legacy nested v1; bozuk zincir; bozuk JSON; yanlış fileType; bilinmeyen alan; desteklenmeyen sürüm; immutable parse sonucu.
- Doğrulama: [CI #44179904406](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904406) ve [Pages #44179904575](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904575) başarılı; [QA #44179904377](https://github.com/Taylan789/MobilyaCAD/actions/runs/44179904377) 101/101 frontend + 245/245 domain testi, strict TypeScript, lint ve build aşamalarını geçti; yalnızca 12 production audit bulgusu (2 moderate, 10 high; picomatch ReDoS) nedeniyle job başarısız. Domain davranışı doğrulandı, tam QA SEC-001'e bağlı.

## 18 Kasım 2026 — DOM-018 proje JSON v2 teklif geçmişi uzantısı

- Yeni domain adapter'ı, mevcut MobilyaCAD proje dosyasının sürüm sınırını koruyarak teklif revizyon geçmişini yalnızca gelecekteki JSON v2 zarfında opsiyonel `quoteRevisionHistory` alanı olarak taşır.
- JSON v1'de alan bulunmuyorsa kayıt legacy olarak okunur; v1'e bu alan eklenmişse sessiz veri kaybı riskine karşı işlem bloklanır. V1 dosyasında kararlı `projectId` bulunmadığından otomatik kimlik türetilmez.
- JSON v2 için açık ve kararlı `projectId` zorunludur. Uzantı yoksa boş geçmiş kabul edilir; varsa geçmişin tüm revizyon zinciri doğrulanır ve host proje kimliğiyle eşleşmesi aranır.
- Append işlemi yalnızca v2 üzerinde çalışır; yeni proje nesnesi üretir, girdiyi mutate etmez ve geçersiz geçmiş/snapshot durumunda kısmi proje döndürmez.
- Bu modül tam v2 proje şema doğrulaması, disk yazımı, atomik transaction, otomatik kayıt veya UI entegrasyonu değildir. Mevcut frontend JSON v1 serializer/parser değiştirilmemiştir; v2 serializer çağırmadan önce kendi tam proje şemasını doğrulamalıdır.
- Kabul testleri: v1 legacy davranışı, v1 uzantı reddi, v2 boş geçmiş, ilk/ardışık append, kimlik uyuşmazlığı, bozuk geçmiş, eksik projectId, desteklenmeyen sürüm ve kısmi sonuçsuz hata.
- Doğrulama: [CI #44187315115](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315115) ve [Pages #44187315339](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315339) başarılı. [QA #44187315211](https://github.com/Taylan789/MobilyaCAD/actions/runs/44187315211): 101/101 frontend + 254/254 domain testi, strict TypeScript, lint ve production build başarılı; yalnızca 12 production audit bulgusu (2 moderate, 10 high; picomatch ReDoS/minimatch) nedeniyle job başarısız. DOM-018 domain davranışı doğrulandı, genel QA SEC-001'e bağlı.

### Güncel sıradaki 3-5 küçük görev

1. SEC-001: frontend sahibinin picomatch production audit bulgularını Vite 8'i kırmadan çözmesini bekle; frontend/**, manifest ve lockfile sahipliğine dokunma.
2. DOM-014/015/016/017: SEC-001 sonrası yeni HEAD'de tam QA audit sonucunu kontrol et; aynı SHA için başarılı testleri yeniden çalıştırma.
3. INT-001: domain üretim raporu ile JSON/CSV adapter sözleşmesinde kesit geometrisi, malzeme kimliği ve quantity kaybını önle veya desteklenmeyen export'u engelle; adapter dosyalarına dokunma.
4. INT-002 / QA-003: entegrasyon-performans ajanının kendi dalındaki round-trip kanıtı geldikten sonra uçtan uca export/veri sadakati denetimini tamamla.
5. DOM-019: kullanıcı tanımlı levha ölçüsü, kerf ve damar yönü girdileri için nesting öncesi geometri/birim doğrulama modelini oluştur; makine standardı veya optimizasyon sonucu varsayma.


## 18 Kasım 2026 02:58 TRT — DOM-019 levha nesting girdisi ön doğrulaması

- Kullanıcı akışı: üretim sorumlusu tek bir malzeme/kalınlık batch'i için levha en-boy/kalınlık, levha damar yönü ve kerf değerini; her dikdörtgen parçanın ölçü, quantity ve damar yönüyle birlikte açıkça girer.
- Kabul kriterleri: 0.1 mm normalizasyon; aynı katalog malzeme kimliği ve kalınlık; pozitif güvenli integer quantity ve güvenli batch toplamı; benzersiz parça kimliği; grain uyumlu 0/90 derece dönüş adayları; levha zarfına sığmayan parçada blocked; herhangi bir hata halinde kısmi parça listesi yok.
- İlk dikey dilim yalnızca doğrulanmış batch girdisini üretir. Kesit/açıklık geometrisi desteklenmez ve blocked olur. Kerf doğrulanıp saklanır ancak henüz yerleşim hesabına uygulanmaz.
- Sınırlar: nesting algoritması/yerleşim koordinatı, levha verimi/fire, kenar payı, kesim sırası, CNC/postprocessor, makine standardı ve fiziksel üretim onayı yoktur. Mevcut frontend JSON v1/CSV adapter'ı ve tüm frontend/** dosyaları değişmez.
- Kod commit'i: [63841cd3933de238962ffb60059ea3224b02c6cd](https://github.com/Taylan789/MobilyaCAD/commit/63841cd3933de238962ffb60059ea3224b02c6cd); test beklentisi düzeltmesi: [d807ec187c2d79afb030f0d838b9286eeb7ee143](https://github.com/Taylan789/MobilyaCAD/commit/d807ec187c2d79afb030f0d838b9286eeb7ee143).
- Son Actions: [CI #44204537545](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537545) başarılı; [Pages #44204537387](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537387) başarılı. [QA #44204537384](https://github.com/Taylan789/MobilyaCAD/actions/runs/44204537384): 101/101 frontend + 268/268 domain testi, 0 başarısız; shared-domain strict TypeScript, lint ve production build başarılı. QA genel job'u yalnızca production dependency audit'teki 12 bulgu (2 moderate, 10 high; picomatch ReDoS) nedeniyle başarısız.
- İlk test koşusunda iki yeni beklenti hatası yakalandı: test fixture'ındaki width/length yönü ve büyük/küçük harf duyarlı hata mesajı regex'i. Üretim kodu veya test kapsamı gevşetilmedi; yalnızca fixture/regex düzeltildi ve ikinci Actions koşusunda 268/268 domain testi geçti.
- Güvenlik sınırı: npm audit fix --force Vite 6.2.7 kırıcı downgrade önerdiğinden ve SEC-001 frontend sahibinin kapsamı olduğundan manifest/lockfile/frontend dosyalarına dokunulmadı. DOM-019 domain davranışı ve otomatik doğrulaması geçti; tam QA SEC-001 çözülene kadar BLOCKED.

### DOM-019 sonrasındaki küçük görevler

1. SEC-001: frontend sahibinin production dependency audit içindeki picomatch yüksek bulgularını Vite sürümünü kırmadan çözmesini bekle; frontend, manifest ve lockfile sahipliğine dokunma.
2. INT-001: açık PR #61'in domain üretim raporu ile frontend workspace sözleşmesini ve kesit/malzeme/quantity kayıpsız akışını ayrı sahiplik sınırlarında doğrula; PR'ı sahiplenme veya birleştirme.
3. INT-002 / QA-003: entegrasyon-performans ajanının kendi dalındaki adapter round-trip kanıtı geldikten sonra uçtan uca export denetimini yap.
4. DOM-020: doğrulanmış rectangular batch'i proje Part listesiyle eşleyen, kaynak Part kimliğini ve quantity'yi koruyan domain bağlayıcısını tasarla; kesitli/uyumsuz parçaları export edilebilir gösterme.
5. Nesting yerleşim algoritmasını ancak kerf uygulaması, grain kısıtları, malzeme/kalınlık batch sınırı ve otomatik geometri testleri tanımlandıktan sonra ayrı bir dikey dilim olarak ele al; üretici/makine standardı uydurma.


## 18 Kasım 2026 — DOM-020: proje Part listesinden levha batch girdisi

- Kullanıcı akışı: üretim raporundaki bütün Part satırlarını veya açıkça seçilmiş bir Part alt kümesini tek bir levha batch'ine dönüştür; farklı malzeme/kalınlık batch'lerini sessizce birleştirme.
- Kabul kriterleri: source Part ID, quantity, genişlik/uzunluk/kalınlık mm ve katalog materialId korunur; seçilmeyen Part ID'leri `excludedPartIds` ile görünür; grain yönü yalnızca Part'ta açıkça kayıtlıysa veya kullanıcı eşlemesiyle kullanılır.
- Kesitli panel geometri, eksik materialId/grain, hatalı ölçü/adet, seçilmeyen kimliğe ait grain override ve tek levha malzemesi/kalınlığıyla uyuşmayan batch blocked olur; kısmi sonuç üretilmez.
- `createProjectSheetNestingInput` yalnızca mevcut `validateSheetNestingInput` doğrulayıcısını çağırır. Kerf doğrulanır ve saklanır; bu aşamada yerleşim koordinatı, kerf tüketimi, fire/yield, kesim sırası veya CNC komutu yoktur.
- Kod commit'i [184e4e75](https://github.com/Taylan789/MobilyaCAD/commit/184e4e75e3a0f96e5f7d39b21b5ed2db36e3639f) ve seçim kapsamı düzeltmesi [c67c328](https://github.com/Taylan789/MobilyaCAD/commit/c67c328610ee3e48d0387b2911418a12ec98790b) tamamlandı. [CI #44216125480](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125480) ve [Pages #44216125319](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125319) başarılı. [QA #44216125310](https://github.com/Taylan789/MobilyaCAD/actions/runs/44216125310): 101/101 frontend + 278/278 domain testi, strict TypeScript, lint ve production build başarılı; genel QA yalnızca 12 production audit bulgusu (2 moderate, 10 high) nedeniyle başarısız. SEC-001 PR #59 frontend sahibinin kapsamındadır; domain agent'ı bağımlılık/lockfile/frontend dosyalarına dokunmadı.

### DOM-020 sonrası sıradaki küçük işler

1. SEC-001: frontend sahibinin Vite 8'i düşürmeden production dependency audit high bulgularını gidermesini bekle; manifest/lockfile/frontend dosyalarına dokunma.
2. INT-001 / PR #61: domain production report'un frontend view-model ve CSV akışına gerçek entegrasyonunu ayrı frontend sahipliği içinde doğrula; PR'ı sahiplenme veya merge etme.
3. INT-002 / QA-003: entegrasyon-performans ajanının kendi dalındaki adapter round-trip ve veri sadakati kanıtını bekle; aynı test/adapter dosyalarına dokunma.
4. DOM-021: açık Part seçimi ve excluded ID listesini koruyarak malzeme + kalınlık bazında batch gruplama; her grup için kullanıcı tarafından sağlanan ayrı levha/kerf/grain tanımı iste.
5. DOM-022: DOM-021 sonrasında, kerf uygulama kuralı ve 0/90 grain kısıtları test edilmiş deterministik 2D yerleşim motoru; üretici/makine standardı veya fire oranı varsayma.


## 18 Kasım 2026 05:38 TRT — DOM-021 çoklu malzeme/kalınlık levha batch grupları

- Kullanıcı akışı: üretim sorumlusu projedeki bütün Part satırlarını veya açık bir alt kümeyi seçer; sistem seçili parçaları katalog materialId ve 0.1 mm'ye normalize edilmiş kalınlığa göre deterministik gruplar. Her grup için ayrı levha ölçüsü, kerf ve levha damar yönü kullanıcı tarafından sağlanır.
- Kabul kriterleri: Part ID ve quantity kayıpsız korunur; seçilmeyen ID'ler tek bir excludedPartIds listesinde görünür; her grup için tam bir levha tanımı gerekir; eksik, yinelenen veya kullanılmayan tanım reddedilir; grain override yalnızca kendi grubundaki Part ID'lerine uygulanır.
- Herhangi bir grup blocked ise aggregate result null olur; diğer grupların geçerli görünümlü kısmi girdileri dışarı verilmez. Tek-grup doğrulaması mevcut createProjectSheetNestingInput / validateSheetNestingInput üzerinden yapılır.
- Yeni domain modülü: domain/production/projectSheetNestingBatches.ts. Otomatik test: domain/production/projectSheetNestingBatches.test.mjs. QA shared-domain strict TypeScript listesine modül eklenir.
- Sınırlar: kerf doğrulanıp batch içinde saklanır ancak henüz yerleşimde tüketilmez; koordinat, optimizasyon, fire/yield, kesim sırası veya CNC/postprocessor üretilmez. Fiziksel üretim güvenliği ve makine standardı iddia edilmez.
- Uygulama commit'i [fd05aba86bd318dbc8f14f2a638265ff48300be2](https://github.com/Taylan789/MobilyaCAD/commit/fd05aba86bd318dbc8f14f2a638265ff48300be2), test sözdizimi düzeltmesi [15a720c4cc2a1f587912e94228fb02b7c57cfa8a](https://github.com/Taylan789/MobilyaCAD/commit/15a720c4cc2a1f587912e94228fb02b7c57cfa8a). [CI #44225359365](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359365) başarılı; [QA #44225359372](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359372) **102/102 frontend + 290/290 domain testi, 0 başarısız**; shared-domain strict TypeScript, lint, production build ve production dependency audit (0 bulgu) başarılı. [Pages #44225359404](https://github.com/Taylan789/MobilyaCAD/actions/runs/44225359404) build/deploy başarılı. İlk QA denemesinde yalnızca yeni test dosyasındaki regex slash kaçışı hatalıydı; test kapsamı azaltılmadan test-only commit ile düzeltildi. DOM-021 DONE.

### DOM-021 sonrası sıradaki küçük işler

1. DOM-022: her malzeme/kalınlık batch'inde kullanıcı levha ölçüsü, kerf ve grain kısıtlarını tüketen deterministik 2D dikdörtgen yerleşim motoru; adetleri güvenli biçimde ele al, kesitli geometriyi blocked tut, koordinat ve fire/yield hesabını ayrı kabul kriterlerine bağla.
2. DOM-023: yerleşim çıktısı için makine bağımsız kesim planı veri modeli; operasyon ve CNC formatı üretmeden parça/levha koordinatlarını, dönüşleri ve kaynak ID'lerini doğrula.
3. INT-001 / PR #61: frontend sahibinin dal senkronizasyonu ve güncel Actions doğrulamasını bekle; bu domain ajanı frontend PR'ını değiştirmez veya merge etmez.
4. INT-002 / QA-003: entegrasyon-performans ajanının ayrı dalındaki adapter round-trip kanıtı geldikten sonra salt okunur QA entegrasyon denetimi; adapter/test dosyalarına dokunma.
5. AI Developer: OpenRouter free-models-per-day kotası 429 ile dolu; reset 19 Kasım 2026 03:00 TRT olduğundan reset öncesi rerun yapılmayacak.


## 18 Kasım 2026 06:20 TRT — DOM-022 deterministik 2D levha yerleşimi

- Kullanıcı akışı: doğrulanmış malzeme/kalınlık batch'i, kullanıcı levha ölçüsü, kerf ve damar yönü girdileriyle fiziksel parça koordinatlarına dönüştürülür.
- Kabul kriterleri: her quantity bir fiziksel placement olur; her placement levha sınırları içinde kalır; 0/90 dönüşler doğrulanmış grain izinlerini kullanır; aynı sıra ve ardışık sıralar arasında kerf boşluğu korunur; kaynak Part ID ve parça numarası korunur; tutarsızlıkta kısmi sonuç verilmez.
- Yeni domain modülü: `domain/production/sheetNestingLayout.ts`; testler: `domain/production/sheetNestingLayout.test.mjs`; strict shared-domain TypeScript listesine eklendi.
- Algoritma `deterministic-shelf-v1` sezgisel raf yerleşimidir; optimal nesting değildir. 50.000 fiziksel parça sınırı vardır. Trim, fire/yield, kesim yolu/sırası, CNC/makine standardı ve fiziksel üretim onayı kapsam dışıdır.
- Kod: [fb37c5bdf386380a33b7f93f43253b612867a9ac](https://github.com/Taylan789/MobilyaCAD/commit/fb37c5bdf386380a33b7f93f43253b612867a9ac); yatay kerf assertion düzeltmesi: [39639040181ad8036c94babd7fa5b29749865a33](https://github.com/Taylan789/MobilyaCAD/commit/39639040181ad8036c94babd7fa5b29749865a33). [CI #44230651897](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651897), [QA #44230651902](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651902) ve [Pages #44230651898](https://github.com/Taylan789/MobilyaCAD/actions/runs/44230651898) başarılı; QA 102/102 frontend + 304/304 domain testi, strict TypeScript, lint, production build ve audit 0 bulgu. DOM-022 DONE.

### DOM-022 sonrası sıradaki küçük işler

1. DOM-023: yerleşim sonucunu makine bağımsız kesim planı veri modeline dönüştür; kaynak Part ID, levha indeksi, koordinat, dönüş ve kerf ilişkisini doğrula; CNC/postprocessor üretme.
2. DOM-024: yerleşim planı için çakışma, sınır, kerf aralığı, adet tamlığı ve JSON round-trip denetimi ekle.
3. INT-001 / PR #61: frontend sahibinin domain üretim raporu / JSON-CSV adapter entegrasyonunu ve Actions kanıtını bekle; PR'ı sahiplenme veya merge etme.
4. INT-002 / QA-003: entegrasyon-performans ajanının ayrı dalındaki adapter round-trip kanıtından sonra salt okunur uçtan uca denetim yap.
5. AI Developer: önceki workflow 429 kotası nedeniyle eski SHA üzerinde kaldı; güncel checkout ile güvenli tetikleme ayrıca değerlendirilir.
