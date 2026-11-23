# Üretim Domain Entegrasyon Sözleşmesi

> Durum: mevcut kodun doğrulanmış sözleşmesini ve frontend yenileme ekibinin entegrasyon sınırlarını açıklar. Bu belge tek başına UI entegrasyonu veya üretime hazır CNC çıktısı anlamına gelmez.
>
> Kapsam: `Taylan789/MobilyaCAD` / `dev/github-work`. Ölçü birimi aksi açıkça belirtilmedikçe milimetredir (mm).

## 1. Sahiplik ve mimari sınır

- `domain/production/**`: frontend dışı üretim domain motoru ve ortak sözleşmeler. Bu alanı domain geliştirme akışı sürdürür.
- `frontend/**`: ayrı frontend yenileme dalının sahipliğindedir. Bu belge mevcut frontend tiplerini yalnızca entegrasyon gereksinimini tarif etmek için okur; frontend dosyalarını değiştirmez.
- Domain modelleri frontend'in `Part` tipine benzer alanlar taşısa da birebir aynı tip değildir. Özellikle domain gövde parçalarında `grainDirection` ve `cncOperations` alanları yoktur. Bir adapter bu alanları açıkça ele almadan domain sonucunu doğrudan CNC/üretim emri olarak sunmamalıdır.

## 2. Mevcut domain API'leri

### 2.1 Tek dolap konstrüksiyonu

Kaynak: `domain/production/cabinetConstruction.ts`

Giriş `CabinetConstructionRequest` sözleşmesidir:

- `schemaVersion: 1`
- `furniture`: `id`, `widthMm`, `heightMm`, `depthMm`, `material` ve isteğe bağlı `materialId`
- `profile`:
  - `panelThicknessMm`
  - `carcassStyle`: `between-sides` veya `over-sides`
  - `backPanel`: açıkça kapalı veya `overlay`, `grooved` (açık `grooveDepthMm`) ya da `inset` (açık `insetMm`) montajı
  - `shelfCount`
  - `doors`: kapalı `count: 0` veya açık adet, `full-overlay` / `half-overlay` / `inset` stili ve pozitif `gapMm`
  - `edgeBandingByGroup`: yedi panel grubunun her biri için `top`, `bottom`, `left`, `right` boolean değerleri
- `materials`: `id`, `name`, `category: "panel"`, `thicknessesMm` ve `unit: "mm"` alanları olan katalog kayıtları
- isteğe bağlı `panelMaterialOverrides`: panel grubu → katalog malzeme kimliği eşlemesi

Panel grupları: `leftSide`, `rightSide`, `top`, `bottom`, `shelf`, `back`, `door`.

Hesaplayıcı eksik ölçü, montaj, adet, kenar bayrağı veya katalog kalınlığı için varsayılan uydurmaz. Override malzemesi gerçek parça kalınlığını katalogda bulundurmalıdır. Legacy serbest metin malzeme kimliği olmayan satırlarda korunabilir.

Çıktı `CabinetConstructionResult` içindeki `innerDimensionsMm` ve `parts` listesidir. Parçalar `id`, `furnitureId`, `name`, `width`, `length`, `thickness`, `quantity`, `material`, isteğe bağlı `materialId` ve dört kenar bayrağını taşır. Ölçüler mm, adet pozitif güvenli tam sayıdır; boyutlar 0.1 mm hassasiyetinde yuvarlanır.

Gövde parça ID son ekleri sabit eşlemedir: `left-side`, `right-side`, `top`, `bottom`, `shelf`, `back`, `door`. Bilinmeyen parça anahtarı bir gövde panel grubu olarak tahmin edilmez.

### 2.2 Proje agregatörü

Kaynak: `domain/production/projectProduction.ts`

Çağrı: `calculateCabinetProjectProduction({ schemaVersion: 1, furniture: [...], drawerBoxes?: [...] })`.

- `furniture`, aile ayrımlı sürüm 1 isteklerini taşır. `family` alanı olmayan eski kayıtlar dolap olarak hesaplanır; `family: "cabinet"` açık dolap, `family: "bookshelf"` ise kitaplık konstrüksiyon motorunu seçer. Bilinmeyen aile reddedilir.
- Kitaplık isteği altı panel grubunun (yanlar, üst, alt, raf, arkalık) kenar bayraklarını açıkça ister; kapak profili ve `door` override'ı kabul edilmez. Dolap isteğinin eski alanları ve sonucu değişmez.
- İsteğe bağlı `drawerBoxes`, `calculateDrawerBoxConstruction` tarafından doğrulanan sürüm 1 çekmece kutusu isteklerini taşır. Her çekmece isteğinin `furniture.id` değeri `furniture` listesindeki bir mobilyaya ait olmalıdır.
- Aynı mobilya altında `drawerGroup.id` benzersiz olmalıdır. Bilinmeyen mobilya, yinelenen grup/parça kimliği veya geçersiz çekmece girdisi reddedilir.
- Çıktı, gövde, kitaplık ve çekmece satırlarını tek `parts` listesinde birleştirir. Çekmece satırları ek olarak `drawerGroupId` ve `grainDirection` taşır; `drawerGroups` ölçü özeti yalnızca en az bir çekmece grubu varsa bulunur.
- `drawerBoxes` alanı verilmeyen veya boş olan eski çağrılarda önceki sonuç şekli korunur; `drawerGroups` alanı eklenmez.

Gövde, kitaplık ve çekmece parçaları ayrı satırlar olarak kalır. Kaynak mobilya/parça kimlikleri, mm ölçüleri, katalog malzeme alanları, kenar bayrakları ve `quantity` korunur; adetler yeniden yorumlanmaz.

### 2.3 Proje malzeme tüketimi ve kenar bantlama özeti

Kaynak: `domain/production/projectMaterialSummary.ts`

Çağrı: `calculateProjectMaterialConsumptionSummary(projectProductionResult)`.

Girdi, agregatörün aynı `parts` listesini kullanan sürüm 1 sonucudur. Gruplama anahtarı katalog `materialId` (varsa), normalize malzeme adı ve gerçek `thicknessMm` değeridir. Aynı isimli fakat farklı kimlikli veya farklı kalınlıklı malzemeler ayrı kalır.

Özet alanları:

- `partLineCount`, `totalQuantity`
- net panel yüzey alanı `panelAreaM2`
- net hacim `volumeM3`
- `edgeBanding.widthEdgesLengthMm`, `lengthEdgesLengthMm`, `totalLengthMm`, `edgeCount`

`top/bottom` kenarları parça genişliği; `left/right` kenarları parça uzunluğu boyunca sayılır ve her kenar parça `quantity` değeriyle çarpılır. Alan 6, hacim 9, bant uzunluğu 0.1 ondalık basamağa yuvarlanır.
- Aynı mobilyaya bağlı birden fazla drawerBoxes grubu ayrı kimlik ve kendi panelMaterialIds/quantity değerleriyle tek proje Part listesine katılır. Malzeme özeti her grubun parça satırlarını malzeme kimliği ve gerçek kalınlığa göre birleştirir; adet, alan, hacim ve bant uzunluğu her satırın quantity değeriyle ağırlıklandırılır.

Bu değerler net tüketimdir. Fire, levha verimi, kerf, bant kalınlığı, rulo payı, donanım, fiyat, nesting, delik, CNC veya işçilik eklenmez.

### 2.4 Çekmece kutusu konstrüksiyon domain motoru

Kaynak: `domain/production/drawerBoxConstruction.ts`

Çağrı: `calculateDrawerBoxConstruction({ schemaVersion: 1, furniture, drawerGroup, spec, materials })`.

- Mobilya ve çekmece grubu kimlikleri ayrı taşınır; çıktı parça kimlikleri mevcut `furnitureId-drawerGroupId-suffix` sözleşmesini korur.
- Dört panel grubu üretilir: yan paneller (2 × quantity), ön/arka paneller (2 × quantity), taban (quantity) ve görünür ön panel (quantity).
- `innerWidthMm = outerWidth - 2 × sideThickness`; `bottomLengthMm = outerDepth - 2 × frontBackThickness`. Sonuçlar 0.1 mm hassasiyetinde yuvarlanır ve pozitif kalmalıdır.
- Her grup için kalınlık, kenar bantlama bayrakları ve damar yönü açık girdidir. `panelMaterialIds` override'ı ilgili katalog kimliğini ve o grubun gerçek kalınlığını doğrular; override yoksa `materialId`, o da yoksa legacy serbest metin malzeme korunur.
- Taban montajı yalnızca `between-sides-and-front-back` olarak desteklenir. Eksik ölçü, katalog referansı, kenar bayrağı veya damar yönü varsayılmaz.
- Bu modül artık `calculateCabinetProjectProduction` içindeki isteğe bağlı `drawerBoxes` listesiyle proje seviyesinde birleştirilebilir. Her grup, mevcut bir gövde mobilya kimliğine bağlanır; grup ve parça kimlikleri proje çapında doğrulanır. Frontend JSON/CSV adapter'ı henüz bu domain alanını çağırmamaktadır.

Motor ray boşluğu, reveal, bağlantı, delik, işleme payı, CNC koordinatı, fire veya üretim güvenliği hesabı yapmaz. Gerçek ray/bağlantı seçimi ve fiziksel uygunluk operatör/atölye doğrulaması gerektirir.


### 2.5 Açık kitaplık konstrüksiyon domain motoru

Kaynak: domain/production/bookshelfConstruction.ts

Çağrı: calculateBookshelfConstruction({ schemaVersion: 1, family: "bookshelf", furniture, profile, materials, panelMaterialOverrides? }).

- Mobilya dış ölçüleri, ortak gövde kalınlığı, between-sides / over-sides konstrüksiyonu, raf adedi, arkalık montajı ve panel malzeme kataloğu açıkça verilir.
- Kenar bantlama ayarları yalnızca altı gerçek grup için zorunludur: leftSide, rightSide, top, bottom, shelf, back. Kapak grubu ve kapak profili bu ailede reddedilir.
- Geometri, mevcut doğrulanmış düz gövde hesaplayıcısı üzerinden üretilir; böylece iç ölçü, arkalık montajı, raf ölçüsü, malzeme override'ı ve 0.1 mm yuvarlama kuralları ikinci kez kopyalanmaz.
- Raflar tek parça satırında quantity = shelfCount olarak kalır. Parça kimlikleri mevcut gövde suffix sözleşmesini korur; sonuç family = bookshelf işaretini taşır.
- Proje agregatörü furniture listesinde kitaplık isteğini kabul eder ve kitaplık Part satırlarını gövde/çekmece parçalarıyla aynı proje listesine ekler. Malzeme özeti aynı Part listesinden quantity ağırlıklı hesaplanır.
- `profile.panelThicknessMmByGroup` isteğe bağlı kısmi bir mm kalınlık haritasıdır. Altı gerçek kitaplık grubundan (leftSide, rightSide, top, bottom, shelf, back) yalnızca verilenler override edilir; diğer gruplar legacy `panelThicknessMm` değerini kullanır. Eski isteklerde alanın bulunmaması önceki geometriyi aynen korur.
- Yan panel kalınlıkları iç genişliği; `over-sides` konstrüksiyonunda üst/alt kalınlıkları iç yüksekliği ve yan panel boyunu etkiler. Raf kalınlığı raf Part satırına uygulanır. `back` override'ı etkin arkalığın profil kalınlığının yerine geçer; içten montaj derinlik hesabı da bu etkin kalınlığı kullanır. Kapak grubu kitaplıkta reddedilir.
- Kalınlığı override edilen her grup için seçili malzeme kimliği (grup override'ı veya mobilyanın varsayılan `materialId` değeri) zorunludur ve katalog kaydının `thicknessesMm` listesinde gerçek kalınlık bulunmalıdır. Serbest metin legacy malzeme, grup kalınlığı override'ı verilmediğinde geriye uyumlu kalır.
- Dikey bölücü, raf aralığı, duvar sabitlemesi, delik, bağlantı, donanım, nesting, CNC, fire veya üretim güvenliği hesabı bu dilime dahil değildir; bunlar ayrı ve açık parametreli dilimlerdir.

### 2.7 Masa ailesinin proje agregatörüne bağlanması

Kaynaklar: `domain/production/tableConstruction.ts`, `domain/production/projectProduction.ts`, `domain/production/projectMaterialSummary.ts`.

- Proje isteğinde `family: "table"` bulunan kayıtlar `calculateTableConstruction` motoruna yönlendirilir; `TableConstructionPart` satırları cabinet/bookshelf/drawer satırlarıyla aynı `parts` listesine eklenir.
- Masa mobilya sonucu `overallDimensionsMm: { width, length, height }` alanını taşır. Dolap ve kitaplık sonuçlarının `innerDimensionsMm` alanı ve family-less legacy dolap sonucu değişmez; masa sonucuna sahte iç ölçü eklenmez.
- Stabil parça ID'si, kaynak `furnitureId`, mm ölçüleri, quantity, `materialId`, kenar bantlama ve damar yönü aynen korunur. Masa motoru kendi başına çekmece parçası üretmez; proje agregatörü, açıkça sağlanan `drawerBoxes` isteklerini `furnitureId` ile projedeki bir mobilyaya bağlayabilir. Masa için otomatik çekmece veya ölçü varsayımı yapılmaz.
- Proje malzeme özeti aynı birleşik `parts` listesini kullanır. Malzeme katalog kimliği ve gerçek kalınlık grupları ayrıdır; quantity ağırlıklı net alan/hacim ve yalnızca açık kenar bayraklarından bant uzunluğu hesaplanır.
- Kabul testleri cabinet + bookshelf + table karışık projede legacy/inner/overall ölçü şekillerini, masa parça ID/adet/malzeme alanlarını ve aynı liste üzerinden masa alan/hacim/bantlama toplamlarını doğrular. Bozuk masa isteği ve bilinmeyen aile reddedilir.
- Bu entegrasyon yalnızca domain agregatörüdür. Frontend JSON v1/CSV adapter'ı henüz bu domain API'yi çağırmaz; UI, CNC, nesting, bağlantı koordinatı, fire, levha verimi, fiyat veya üretim güvenliği onayı sağlamaz.

## 3. Mevcut frontend proje verisi ve uyumluluk

Kaynaklar: `frontend/src/types/placedFurniture.ts`, `frontend/src/engine/projectFile.ts`, `frontend/src/engine/drawerBoxParts.ts`, `frontend/src/engine/projectProduction.ts`.

- Dosya biçimi `format: "MobilyaCAD"`, `formatVersion: 1`; oda ölçüleri mm'dir. `materials` isteğe bağlıdır.
- Eski v1 dosyalarında `room.unit` ve `drawerBoxSpecs` bulunmayabilir; mevcut parser bunları geriye uyumlu kabul eder ve oda ölçülerini mm yorumlar.
- `PlacedFurniture` mevcut durumda `drawerBoxSpecs?: DrawerBoxProjectConfig[]` alanını taşır. Bu konfigürasyonlar proje v1 JSON içinde saklanır; hesaplanan domain sonuçları henüz bu dosya biçimine bağlanmış değildir.
- Çekmece kutusu girdisi açık dış genişlik, yan yüksekliği, dış derinlik, dört panel grubu için kalınlık, görünür ön ölçüleri, adet, malzeme, kenar bayrakları, damar yönü ve yalnızca `between-sides-and-front-back` taban kurgusunu ister. Ray boşluğu, reveal, bağlantı ve CNC koordinatı çıkarılmaz.
- Çekmece kutusu geometrisinin mevcut kullanıcı akışı `frontend/src/engine/drawerBoxParts.ts` içindedir. Aynı açık ölçü ve panel grubu sözleşmesini kullanan frontend dışı domain motoru `domain/production/drawerBoxConstruction.ts`, artık proje agregatörünün isteğe bağlı `drawerBoxes` girdisine bağlanmıştır. Frontend JSON v1 / CSV adapter'ı henüz bu domain agregatörünü çağırmamaktadır.
- Frontend `projectProduction.ts` mevcut aşamada yalnızca belirli düz mutfak gövde katalog kimliklerini destekler; köşe, cihaz ve evye varyasyonları ile diğer mobilya ailelerini özel geometri olmadan dışarıda bırakır. Çekmece yapılandırması geçersiz/eksikse kesim listesi dışa aktarımı engellenir.

Önemli veri boşluğu: mevcut `PlacedFurniture` tipinde gövde panel grubu malzeme override'larını kalıcılaştıran bir alan henüz tanımlı değildir. Domain `panelMaterialOverrides` girdisini kabul etse de frontend bunu proje v1'e eklemiş gibi davranmamalıdır. Gelecekte eklenecek alanlar v1'e yalnızca opsiyonel ve eski dosyalar için güvenli varsayılanı olmayan şekilde eklenmeli; uyumsuz değişiklikte format sürümü artırılmalıdır.

## 4. Frontend entegrasyon akışı

Frontend sahibi entegrasyonu aşağıdaki sırayla yapmalıdır:

1. Her desteklenen mobilya için mevcut `PlacedFurniture`, katalog kaydı, mobilyaya çözülmüş konstrüksiyon kuralları ve malzeme kataloğundan aile ayrımlı bir istek üret: legacy/dolap için `CabinetConstructionRequest`, açık kitaplık için `BookshelfConstructionRequest`, masa için `TableConstructionRequest` üret.
2. mm ölçülerini dönüştürmeden taşı; mm dışı bir kaynaktan dönüşüm gerekiyorsa tek adapter noktasında yap ve test et.
3. `materialId` ve panel override referanslarını katalogda doğrula; gerçek parça kalınlığı `thicknessesMm` listesinde yoksa sonucu hatalı/engelli göster.
4. Her mobilyanın stabil ID'sini ve agregatörün ürettiği parça ID'sini aynen koru. Dolap, kitaplık ve masa isteklerini `furniture` listesinde; yalnızca ilgili gövde mobilyasına ait açık çekmece isteklerini `drawerBoxes` alanında aynı agregatör çağrısına ver.
5. Domain `ProjectProductionPart` birleşiminde gövde, masa ve çekmece satırlarını ayırt et. Çekmece satırlarının `drawerGroupId` ve `grainDirection` alanlarını koru; gövde satırlarına uydurma damar yönü veya CNC operasyonu ekleme.
6. Malzeme özeti aynı birleşik agregatör sonucundan hesaplanmalıdır; UI veya CSV için ikinci, bağımsız geometri hesabı yazılmamalıdır.
7. Üretilmiş parça listesi ve özet proje JSON'a sessizce yazılmaz. JSON v1 mevcut tasarım girdilerini ve katalog referanslarını saklamaya devam eder; türetilmiş sonuç gerektiğinde yeniden hesaplanır.

### UI durumları ve kabul kriterleri

- **Hazır:** desteklenen tüm mobilyalar doğrulanmış ve parça listesi/özet hesaplanmışsa parça adedi, quantity, mm ölçüleri, malzeme kimliği, kalınlık ve kenar bantlama toplamı gösterilir.
- **Boş:** projede desteklenen üretim mobilyası yoksa sıfır parçalı sahte kesim listesi veya tahmini malzeme maliyeti gösterilmez; boş durum açıkça anlatılır.
- **Kısmi destek:** desteklenmeyen mobilyalar `unsupportedFurniture` gerekçeleriyle listelenir; eksik aileler sessizce düz gövdeye dönüştürülmez.
- **Engelli / hata:** `errors`, `blockedFurniture` veya `exportBlockReason` varsa üretim dışa aktarımı engellenir ve ilgili mobilya/parça sebebi gösterilir.
- **Geriye uyumluluk:** eski v1 dosyaları yeni opsiyonel alanlar olmadan açılabilmeli; yeni alanların bozuk veya bilinmeyen enum değerleri sessizce atılmamalıdır.
- **İzlenebilirlik:** her parça kaynak mobilyasına, malzeme kataloğu kimliğine ve kullanılan açık konstrüksiyon girdilerine geri bağlanabilmelidir.

## 5. Açıkça kapsam dışı olanlar

Bu sözleşme makineye hazır CNC, DXF, nesting/levha optimizasyonu, kesim kerfi, fire, levha verimi, donanım/bağlantı koordinatı, ray boşluğu, fiyat, işçilik veya fiziksel üretim güvenliği onayı sağlamaz. Bunlar için kullanıcı kataloğu, gerçek üretici standardı ve atölye doğrulaması gerekir.

## 6. Sıradaki teknik dilimler

1. Frontend sahibi, mevcut `drawerBoxSpecs` kayıtlarını domain `drawerBoxes` isteklerine dönüştüren adapter'ı kendi frontend dalında uygulasın; JSON v1 geriye uyumluluğunu ve boş/hata durumlarını korusun.
2. [x] Kitaplık panel grubu bazlı kalınlık girdileri ve gerçek katalog kalınlığı doğrulaması.
3. [x] Masa motorunu proje agregatörüne bağla; aileye özgü `overallDimensionsMm` ve ortak Part listesi doğrulandı.
4. [x] `calculateCabinetProjectProductionWithDiagnostics` ile desteklenmeyen aile, geçersiz konstrüksiyon/çekmece ve proje düzeyi hataları açıkça raporla; bloklu projede kısmi Part listesi verme.
5. Frontend sahibi domain agregatörünü JSON v1/CSV adapter'ına bağladıktan sonra aynı Part listesinin export ile birebir uzlaştığını otomatik test et.

### Proje üretim hazır olma raporu

Kaynak: `domain/production/projectProduction.ts`.

- `calculateCabinetProjectProductionWithDiagnostics(value)` `cabinet`, `bookshelf` ve `table` ailelerini doğrular; bilinmeyen aileleri `unsupportedFurniture` listesinde mobilya ID'siyle bildirir.
- Geçersiz mobilya/çekmece konfigürasyonları `blockedFurniture` içinde `invalid-request`, `invalid-construction` veya `invalid-drawer` koduyla döner. Proje zarfı ve yinelenen kimlik sorunları `projectErrors` alanındadır.
- `status` `ready`, `blocked` veya `empty`; `canExport` yalnızca hatasız ve boş olmayan projede true'dur.
- Herhangi bir hata varsa `result: null`; kısmi parça listesi dışarı verilmez. UI tanılama gösterebilir ancak blocked durumda kesim listesi/CSV export etmemelidir.
- Eski `calculateCabinetProjectProduction` strict API'si ve geçerli proje sonuç şekli korunur. Boş proje strict agregatörde boş sonuç döndürür; rapor ise boş durumu ayrıca işaretler.
- Hesap CNC, ray/donanım, delik, nesting, fire veya fiyat tahmini yapmaz; fiziksel üretim onayı değildir.


### 2.6 Açık parametreli masa konstrüksiyon domain motoru

Kaynak: `domain/production/tableConstruction.ts`

Çağrı: `calculateTableConstruction({ schemaVersion: 1, family: "table", furniture, profile, materials })`.

- Mobilya ölçülerinde `widthMm` ve `lengthMm` tabla plan ölçüleridir; `heightMm` zeminden tabla üst yüzeyine toplam yüksekliği belirtir.
- Profil tabla kalınlığını, ayak en/derinlik kesitini ve ayak adedini açıkça ister. Ayak yüksekliği yalnızca `heightMm - topThicknessMm` olarak hesaplanır; sonuç 0.1 mm hassasiyetinde pozitif olmalıdır.
- Kayıtlar `enabled: false` ile kapatılabilir. Etkin kayıtta uzun/kısa kayıt uzunlukları ve adetleri ayrı ayrı verilir; kullanılmayan yönün uzunluğu ve adedi sıfır olmalıdır. Kayıt yüksekliği ve kalınlığı açıkça sağlanır.
- Parça grupları `top`, `legs`, `longApron`, `shortApron` şeklindedir. Her grup için dört kenar bantlama bayrağı ve `length | width | none` damar yönü açıkça verilir. Grup malzeme override'ı katalog kimliği ve gerçek `thicknessesMm` değeriyle doğrulanır.
- Çıktı tabla, ayak ve etkin kayıtları ayrı satırlar olarak verir; stabil parça kimliği, kaynak mobilya kimliği, mm ölçüleri, quantity, malzeme kimliği, kenar bantlama ve damar yönü korunur.
- Bu ilk dilim bir kesim-parça hesabıdır; ayak/kayıt konumları, tabla taşması, birleşim/vida standardı, delik, donanım, CNC, nesting, fire veya montaj güvenliği üretmez. Fiziksel yerleşim ve bağlantı seçimi atölye tarafından doğrulanmalıdır.


## 7. Masa motoru sonrası güncel domain sırası — 16 Kasım 2026

1. Masa ailesini `calculateCabinetProjectProduction` proje agregatörüne ekle. `ProjectProductionPart` birleşimine `TableConstructionPart` eklenirken eski cabinet/bookshelf isteklerinin sonuç şekli ve legacy family-less davranışı değişmemelidir.
2. Proje mobilya sonucunda masa için `overallDimensionsMm` gibi aileye özgü dış ölçü alanı ekle; mevcut cabinet/bookshelf `innerDimensionsMm` alanını kaldırma veya yeniden yorumlama. Eski sonuçlarda yeni alan bulunmaması geriye uyumlu kalmalıdır.
3. `calculateProjectMaterialConsumptionSummary` aynı birleşik Part listesinden masa quantity, net alan/hacim ve kenar bantlama toplamlarını hesaplamalı; farklı ailelerin malzeme kimliği/kalınlık grupları ayrılmalıdır.
4. Desteklenmeyen aile ve eksik konfigürasyonlar için proje düzeyinde açık `unsupportedFurniture` / hata tanılaması tasarla; bilinmeyen aile hiçbir zaman dolap olarak varsayılmamalıdır.
5. Frontend sahibi domain agregatörünü JSON v1/CSV adapter'ına bağlarken masa sonuçlarını aynı Part listesinden kullanmalı; bu domain dalı `frontend/**` dosyalarını değiştirmez.

Bu sıra masa motorunun mevcut durumunu supersede eder; motor tek başına üretim koordinatı, bağlantı standardı veya CNC çıktısı sağlamaz.


## 2.8 Açık parametreli gardırop gövdesi ve dikey bölücüler

Kaynak: domain/production/wardrobeConstruction.ts ve domain/production/projectProduction.ts.

Çağrı: calculateWardrobeConstruction({ schemaVersion: 1, family: "wardrobe", furniture, profile, materials, verticalDividers }).

- Gardırop dış ölçüleri, gövde stili, panel kalınlıkları, arkalık, raf ve kapak ayarları mevcut cabinet gövde motorunun açık parametreli sözleşmesini kullanır; legacy dolap hesapları değişmez.
- verticalDividers alanı zorunludur. Boş liste, dikey bölücü olmadığını açıkça belirtir. Her bölücü için benzersiz kimlik, iç sol panel yüzünden sol yüzüne kadar mm ofset, pozitif kalınlık, katalog malzeme kimliği, dört kenar bandı bayrağı ve damar yönü açıkça sağlanır.
- Gardırop `innerDimensionsMm.height`, üst ve alt panel kalınlıkları dış yükseklikten çıkarılarak net iç açıklık olarak döner; bu ailede dikey bölücü de aynı net yüksekliğe göre üretilir. Legacy cabinet/bookshelf sonuçları değiştirilmez. Konumlar 0.1 mm hassasiyetinde doğrulanır; bölücüler birbirleriyle çakışamaz ve iç genişlik sınırını aşamaz. Katalogda bulunmayan malzeme veya eşleşmeyen kalınlık reddedilir.
- Bölücü varken `profile.shelfCount` ile tam genişlik rafı reddedilir. Açık ölçülü `shelves` alanı ise bölme bazlı rafları destekler; her rafın sol/sağ X ofseti, net iç tabandan Y kotu, ön Z ofseti, derinliği, kalınlığı, katalog `materialId`, dört kenar bandı bayrağı ve damar yönü açıkça sağlanır. Raf açıklığı bölücü yüzleri arasında kalmalı; raflar net iç genişlik/yükseklik/derinlik sınırlarını aşmamalı ve birbirleriyle hacimsel olarak çakışmamalıdır. Rafların katalog kalınlığı gerçek malzemede bulunmalıdır.
- Proje agregatörü wardrobe ailesini destekler; sonuç cabinet/bookshelf ile aynı innerDimensionsMm alanını ve ortak Part listesini kullanır. Malzeme tüketim özeti bölücü satırlarını aynı quantity/alan/hacim/kenar bantlama hesabına dahil eder.
- Bu dilim askı borusu, çekmece yerleşimi, kısmi bölücü, raf taşıma kapasitesi, menteşe/delik, bağlantı elemanı, nesting, CNC veya montaj güvenliği hesaplamaz. Fiziksel üretimden önce atölye doğrulaması gerekir.
- Frontend JSON v1/CSV adapter'ı bu domain motoruna henüz bağlı değildir; frontend sahibi family=wardrobe için explicit verticalDividers/shelves girdilerini ve ready/blocked tanı durumunu ayrı entegrasyon diliminde bağlamalıdır. Bu otomasyon frontend/** dosyalarını değiştirmez.


### 2.9 Açık ölçülü gardırop bölme rafları

Kaynak: `domain/production/wardrobeConstruction.ts`.

- `WardrobeConstructionRequest.shelves` geriye uyumlu opsiyonel bir alandır. Alanın olmaması veya boş liste, özel raf üretilmeyeceğini belirtir; mevcut v1 wardrobe istekleri geçerli kalır.
- Her raf benzersiz bir `id`, `leftOffsetMm`, `rightOffsetMm`, `heightFromInnerBottomMm`, `frontOffsetMm`, `depthMm`, `thicknessMm`, katalog `materialId`, dört kenar bantlama bayrağı ve `width | length | none` damar yönü ister. Tüm ölçüler mm'dir ve 0.1 mm hassasiyetinde normalize edilir.
- Parça ölçüleri `width = depthMm`, `length = rightOffsetMm - leftOffsetMm`, `thickness = thicknessMm` olarak türetilir. Raf sol/sağ ofsetleri iç sol yan panel yüzüne; yükseklik net iç taban yüzüne; ön ofset iç ön referans düzlemine göredir.
- Net gardırop iç yüksekliği dış yükseklikten gerçek üst/alt panel kalınlıkları çıkarılarak hesaplanır. Bu düzeltme yalnızca wardrobe sonucu ve bölücüler için geçerlidir; legacy cabinet/bookshelf geometri sözleşmesi değişmez.
- Raflar bölücü panel aralıklarının içine tamamen sığmalıdır; bölücü alanına giren, iç sınırları aşan, katalogda bulunmayan malzeme/kalınlık kullanan, yinelenen kimlik taşıyan veya başka rafla 3D hacimde çakışan istek reddedilir. Yüzeylerin yalnızca temas etmesi çakışma sayılmaz.
- Özel raflarla `profile.shelfCount` tam genişlik rafları aynı istekte birleştirilemez. Bu, çift sayım ve çakışan üretim satırlarını engeller.
- Proje agregatörü ve malzeme tüketim özeti rafları ortak Part listesi üzerinden taşır; her raf quantity 1 olarak ayrı izlenir. Frontend JSON v1/CSV adapter entegrasyonu bu domain diliminin kapsamında değildir.
- Bu model raf panel geometrisi ve yerleşim zarfını doğrular; raf taşıma kapasitesi, bağlantı elemanı, delik, ray/donanım, CNC, nesting, fire veya montaj güvenliği hesaplamaz. Fiziksel üretim öncesi atölye doğrulaması gerekir.


## 2.10 Floor-standing TV ünitesi v1

Kaynak: `domain/production/tvUnitConstruction.ts` ve `domain/production/projectProduction.ts`.

Çağrı: `calculateTvUnitConstruction({ schemaVersion: 1, family: "tv-unit", mounting: "floor-standing", furniture, profile, materials, panelMaterialOverrides? })`.

- V1 sözleşmesi `family: "tv-unit"` ve `mounting: "floor-standing"` alanlarını açıkça ister. Gövde dış ölçüleri, panel kalınlıkları, gövde stili, arkalık, raf/kapak, panel malzeme override'ları ve kenar bantlama mevcut cabinet motorunun aynı doğrulanmış parametrelerini kullanır.
- Çıktı `family: "tv-unit"`, `mounting: "floor-standing"`, `innerDimensionsMm` ve ortak Part satırlarını taşır. Proje agregatörü TV ünitesini ayrı bir desteklenen aile olarak tanır; kaynak mobilya/parça kimlikleri, mm ölçüleri, quantity, katalog malzeme kimliği ve kenar bayrakları korunur. Malzeme tüketimi aynı Part listesinden hesaplanır.
- Bu dilim yalnızca açıkça tanımlanmış, zemine oturan gövde parçalarını kapsar. Ayak, baza/plinth, duvar braketi, ankraj, duvar taşıma kapasitesi, TV yükü, bağlantı/delik, donanım, CNC, nesting, fire veya fiyat hesabı üretmez.
- `mounting: "wall-mounted"` ve diğer montaj biçimleri reddedilir; gerçek üretici/duvar/ankraj standardı doğrulanmadan duvara montajlı üretim verisi sunulmaz.
- Frontend JSON v1/CSV adapter'ı bu aileyi henüz çağırmaz. Ayrı frontend sahibi, TV ünitesi isteği için açık montaj seçimini, `ready/blocked` raporunu ve ortak Part listesini kendi entegrasyon testleriyle bağlamalıdır. Bu domain dilimi hiçbir `frontend/**` dosyasını değiştirmez.


### 2.11 Açık ölçülü floor-standing TV ünitesi rafları

Kaynak: domain/production/tvUnitConstruction.ts ve domain/production/projectProduction.ts.

- TvUnitConstructionRequest.shelves geriye uyumlu opsiyonel bir alandır. Alanın bulunmaması veya boş liste mevcut TV ünitesi v1 davranışını korur; profile.shelfCount ile üretilen tam genişlik raflar aynı şekilde çalışmaya devam eder.
- Özel raflar için benzersiz id, iç sol yan panel yüzünden sol/sağ ofset, net iç taban referansından alt yüzey kotu, iç ön referans düzleminden ön ofset, derinlik, kalınlık, katalog materialId, dört kenar bandı bayrağı ve width | length | none damar yönü açıkça sağlanır. Ölçüler mm ve 0.1 mm hassasiyetinde normalize edilir.
- Raf parçası width = depthMm, length = rightOffsetMm - leftOffsetMm, thickness = thicknessMm, quantity = 1 olarak ortak Part listesine eklenir. Kendi malzeme kimliği ve katalog kalınlığı kullanılır; diğer gövde panellerinin grup override'larından türetilmez.
- Raflar gövde motorunun net iç genişliği/derinliği ve dış yükseklikten üst-alt gerçek panel kalınlıkları çıkarılarak bulunan net iç yüksekliği içinde kalmalıdır. Raflar 3D hacimde çakışamaz; yalnızca yüzey teması kabul edilir. Açık ölçülü raflarla profile.shelfCount birlikte kullanılamaz.
- Proje agregatörü yeni TV raf Part satırlarını aynı listeye taşır; malzeme özeti quantity, alan, hacim ve kenar bantlamayı bu gerçek Part satırlarından hesaplar.
- Bu dilim bölücü/compartment paneli, raf taşıma kapasitesi, ayak/baza, duvar braketi/ankraj, bağlantı/delik, donanım, CNC, nesting, fire veya fiyat hesabı üretmez. Bu sınırlar için üretici/atölye girdisi ve fiziksel doğrulama gerekir.
- Frontend JSON v1/CSV adapter'ı bu alanı henüz çağırmaz; frontend sahibinin family: tv-unit için shelves girdisini ve ready/blocked raporunu ayrı otomatik entegrasyon testleriyle bağlaması gerekir. Bu otomasyon hiçbir frontend/** dosyasını değiştirmez.


## 2.12 Açık ölçülü floor-standing TV ünitesi dikey bölücüleri

Kaynak: `domain/production/tvUnitConstruction.ts` ve mevcut `projectProduction.ts` / `projectMaterialSummary.ts` akışı.

Çağrı: `calculateTvUnitConstruction({ schemaVersion: 1, family: "tv-unit", mounting: "floor-standing", furniture, profile, materials, verticalDividers?, shelves? })`.

- `verticalDividers` geriye uyumlu opsiyonel bir listedir. Alanın bulunmaması veya `[]`, önceki TV ünitesi v1 gövde/raf davranışını korur. Sonuçtaki `innerDimensionsMm.height`, dış yükseklikten gerçek üst/alt panel kalınlıkları çıkarılmış net iç açıklıktır (420 mm dış yükseklik ve 18 mm üst/alt panel için 384 mm).
- Her panel benzersiz `id`, iç sol yan panel yüzünden sol yüz ofseti, net iç tabandan alt yüzey ofseti, açık `heightMm`, iç ön referanstan `frontOffsetMm`, açık `depthMm`, `thicknessMm`, katalog `materialId`, dört kenar bantlama bayrağı ve `width | length | none` damar yönü taşır. Hiçbir bölücünün tam yükseklikte veya tam derinlikte olduğu varsayılmaz.
- Bütün ölçüler mm'dir ve 0.1 mm hassasiyetinde normalize edilir. Panelin sağ yüzü `leftOffsetMm + thicknessMm`; üst yüzü `bottomOffsetMm + heightMm`; arka yüzü `frontOffsetMm + depthMm` olarak doğrulanır. Net iç genişlik/yükseklik/derinlik dışına taşma, yinelenen kimlik, bilinmeyen alan, katalogda bulunmayan malzeme veya gerçek katalog kalınlığıyla uyuşmayan panel reddedilir.
- Dikey bölücüler birbiriyle ve özel raflarla pozitif hacimde çakışamaz. Yüzey teması serbesttir; rafın bölücü yüzünde bitmesi ve diğer bölmede başlaması geçerlidir. Bölücü varken koordinatsız `profile.shelfCount` tam genişlik rafları reddedilir; kullanıcı bölme raflarını açık `shelves` girdileriyle tanımlar.
- Üretilen Part satırı `width = depthMm`, `length = heightMm`, `thickness = thicknessMm`, `quantity = 1` kullanır; konum, malzeme kimliği, damar yönü ve kenar bayrakları korunur. Proje agregatörü yeni Part tipini mevcut TV ünitesi birleşimine taşır; malzeme özeti aynı Part listesinden quantity, net alan/hacim ve kenar bantlama hesabını yapar.
- Kabul testleri: eski istek ve `verticalDividers: []` uyumluluğu; panel sınırları ve katalog kalınlığı; bölücü-bölücü ve raf-bölücü hacim çakışması; yüzey teması; proje `ready/blocked` durumu; MDF 18 / MDF 8 quantity, alan, hacim ve bant uzunluğu uzlaşması.
- Bu dilim bağlantı/vida, taşıma kapasitesi, TV yükü, ayak/baza, duvar braketi/ankraj, delik, donanım, CNC, nesting, fire veya fiyat hesabı sağlamaz. Fiziksel üretim öncesi gerçek atölye ve malzeme standardı doğrulanmalıdır.
- Frontend JSON v1/CSV adapter'ı bu alanı henüz çağırmaz. Ayrı frontend sahibi `verticalDividers` ve bölme `shelves` girdilerini proje dosyasında açıkça saklamalı, aynı domain agregatörünü çağırmalı ve herhangi bir `blocked` raporda export'u kapatmalıdır. Bu otomasyon `frontend/**` dosyalarını değiştirmez.
## 17 Kasım 2026 — dikdörtgen iç açıklıklı panel geometri öncülü

- domain/production/panelCutoutGeometry.ts, bir dikdörtgen panel üzerinde kullanıcı tarafından açıkça tanımlanan, eksenlere paralel dikdörtgen geçiş açıklıklarını doğrular ve tek panel için geometri tüketimini hesaplar.
- Panel dış ölçüleri, kalınlık, her dış kenarın bant durumu ve her açıklığın X/Y ofseti, genişliği, uzunluğu ve dört iç kenar bant bayrağı zorunludur. Ölçüler 0.1 mm'ye normalize edilir; açıklık dış sınıra temas edemez, panel dışına taşamaz, başka bir açıklıkla kesişemez veya temas edemez.
- Sonuç dış alan, açıklık alanı, net yüzey alanı, net hacim, dış/iç çevre ve dış/iç kenar bantlama uzunluklarını ayrı verir. Alan ve hacim tek panel içindir; quantity, fire, levha verimi, kerf, malzeme, işçilik ve fiyat hesaplanmaz.
- Kabul testleri: net alan/hacim ve iç çevre; dış/iç bantlama toplamı; 0.1 mm normalizasyon; çoklu ayrık açıklık; sınır, kesişim/temas, yinelenen kimlik, eksik/yanlış kenar bayrağı, bilinmeyen alan, şema ve taşma reddi; kaynak isteğin değişmezliği.
- Bu modül henüz ProjectProductionPart, proje agregatörü veya calculateProjectMaterialConsumptionSummary ile birleştirilmez. Mevcut dikdörtgen Part ve CSV/JSON tüketicilerine kesitli parça gönderilmez; bu nedenle henüz üretim kesim listesi, CNC veya banyo dolabı desteği değildir.
- Fiziksel lavabo/armatür ölçüsü, köşe yarıçapı, pah, iç yüzey işlemi, bağlantı ve makine standardı varsayılmaz. Bu dilim yalnızca dikdörtgen geçiş açıklığı geometri öncülüdür; atölye/operatör doğrulaması olmadan üretim onayı vermez.


## 2.13 Proje üretim Part'larında kesitli panel geometrisi

Kaynak: `domain/production/panelCutoutGeometry.ts`, `domain/production/projectProduction.ts` ve `domain/production/projectMaterialSummary.ts`.

Çağrı: `calculateCabinetProjectProduction({ schemaVersion: 1, furniture, drawerBoxes?, panelCutouts? })`.

- `panelCutouts` geriye uyumlu opsiyonel bir listedir. Her kayıt yalnızca mevcut üretim Part kimliğini (`partId`) ve açık geometri isteğini (`geometry`) taşır. Aynı Part için ikinci profil, bilinmeyen Part kimliği veya bilinmeyen alan reddedilir.
- Geometri şema sürümü 1'dir; panelin normalize edilmiş genişlik/uzunluk/kalınlığı ve dış kenar bant bayrakları hedef Part ile eşleşmelidir. İç açıklıklar panelin içinde kalmalı, birbirleriyle kesişmemeli/temas etmemeli ve iç kenar bant bayrakları açıkça verilmelidir.
- Doğrulanan geometri, yalnızca ilgili Part üzerinde opsiyonel `panelGeometry` alanı olarak saklanır. Profil alanı olmayan legacy dikdörtgen Part satırları ve mevcut proje isteği v1 davranışı değişmez.
- `calculateProjectMaterialConsumptionSummary` kesitli Part için dış alan yerine net yüzey alanını, dış hacim yerine net hacmi kullanır. Dış ve iç kenar bantlama uzunlukları yönlerine göre ayrılır ve Part `quantity` değeriyle çarpılır. Geometri özetindeki türetilmiş sayılar doğrudan güvenilmez; tüketim sırasında geometri yeniden doğrulanıp hesaplanır.
- Geçerli kesit geometrisi domain sonucu içinde `status: "ready"` kalır; ancak mevcut JSON v1/CSV adapter'ı `panelGeometry` alanını kayıpsız taşımadığı için `canExport: false` ve açık bir `exportBlockers` mesajı döner. Adapter destek eklediğinde bu blokaj kaldırılmalıdır.
- Herhangi bir kesit kaydı geçersizse proje raporu `blocked`, `canExport: false` ve `result: null` olur; kısmi Part listesi verilmez. Eski isteklerde `panelCutouts` alanının bulunmaması geçerlidir.
- Bu domain sonucu henüz frontend JSON v1/CSV adapter'ına bağlanmamıştır. Bu dilim CNC operasyonu, lavabo ölçüsü/armatür standardı, köşe yarıçapı, pah, fire, levha verimi veya makine postprocessor'ı üretmez; fiziksel üretim öncesi atölye doğrulaması gerekir.


## 2.14 Açık ölçülü banyo dolabı üst panel açıklığı v1

Kaynak: `domain/production/projectProduction.ts` ve `domain/production/panelCutoutGeometry.ts`.

Proje isteğinde `family: "bathroom-vanity"` kullanılır. Diğer gövde ölçüleri, panel kalınlıkları, arkalık, kapak, raf, malzeme kataloğu ve kenar bantlama alanları mevcut `CabinetConstructionRequest` sözleşmesiyle açıkça sağlanır.

- Banyo dolabı ailesi mevcut doğrulanmış cabinet carcass motorunu kullanır; sonuç `innerDimensionsMm` ve ortak Part listesini korur.
- Üst panel Part kimliği `<furniture.id>-top` olmalıdır. `panelCutouts` içinde bu Part'a bağlanan geometri ve en az bir açıklık zorunludur. Geometri panelin gerçek genişlik/uzunluk/kalınlık ve dış kenar bant bayraklarıyla eşleşmelidir.
- Bir üst panel geometrisinde birden fazla, birbirine temas etmeyen dikdörtgen geçiş açıklığı tanımlanabilir. Her açıklığın konumu (sol/üst kenardan X/Y), ölçüsü ve dört iç kenar bant bayrağı açıkça girilir. Net alan/hacim ve iç kenar bantlama aynı Part satırından quantity ağırlıklı malzeme özetine taşınır.
- Açıklık eksikse veya yalnızca yan panel gibi başka bir Part'a bağlanmışsa proje `blocked`, `result: null` olur; kısmi parça listesi verilmez.
- Kesitli Part için mevcut JSON v1/CSV adapter desteği henüz bulunmadığından geçerli geometri `ready` hesap sonucu üretse bile `canExport: false` kalır.
- Bu ilk aile dilimi yalnızca eksenlere paralel dikdörtgen geçiş açıklıklarını kapsar. Oval/özel lavabo şablonu, musluk/drenaj deliği, sifon/tesisat boşluğu, köşe yarıçapı, pah, tezgâh bindirmesi, ayak/baza, duvar montajı, ankraj, yük, bağlantı, donanım veya CNC koordinatı üretmez. Gerçek lavabo/armatür ölçüsü ve fiziksel uygunluk üretici/atölye tarafından ayrıca doğrulanmalıdır.
- Frontend JSON v1/CSV adapter'ı ayrı frontend sahibinin kapsamındadır; bu domain değişikliği hiçbir `frontend/**` dosyasını değiştirmez.

Çoklu açıklıkların kesişme/temas kontrolü X sweep-line ve koordinat sıkıştırmalı Y aralık maksimum ağacıyla O(n log n) çalışır. Koordinatlar mevcut 0.1 mm normalizasyonundan sonra karşılaştırılır; kenar veya köşe teması da geçersizdir. Bu algoritma yalnızca panel açıklıklarının kendi aralarındaki geometri doğrulamasıdır. `createProjectSheetNestingInput`, `panelGeometry` içeren parçaları hâlâ blocked/`result: null` ile reddeder; açıklık içi parça yerleşimi, kerf açıklığı, kesim sırası veya CNC toolpath üretmez.



## 2.15 Karışık aile projelerinde kesitli panel tüketimi

`panelCutouts` her desteklenen mobilya ailesinin mevcut `ProjectProductionPart` kimliğine bağlanabilir; yalnızca banyo dolabı üst paneline özgü değildir. Domain kabul testi, aynı projede `bathroom-vanity` üst panelinde iki dikdörtgen açıklığı ve `bookshelf` rafında bir açıklığı birlikte doğrular.

- Banyo üst paneli 18 mm `mdf-18`; kitaplık rafı 8 mm `mdf-8` katalog malzemesi ve üç adet olarak hesaplanır. Diğer kitaplık gövde parçaları kendi malzeme/kalınlık gruplarında kalır.
- Kesit geometri eklemek Part satır sayısını veya `quantity` değerini değiştirmez. Malzeme özeti net alan/hacim ve iç kenar bantlamasını her malzeme + kalınlık grubu için aynı Part listesinden, quantity ile ağırlıklandırarak hesaplar.
- Test, kesit öncesi ve sonrası özet farkını karşılaştırır: 18 mm grupta 0.08 m² / 0.00144 m³ ve 600 mm iç bant; 8 mm grupta raf adedi üç olduğu için 0.06 m² / 0.00048 m³ ve 900 mm iç bant farkı beklenir.
- Birden fazla ailede geçerli kesit bulunması yine `status: "ready"` üretir; ancak JSON v1/CSV adapter'ı `panelGeometry` alanını kayıpsız taşımadığından `canExport: false` kalır. Bu test, dışa aktarımın üretime hazır olduğu anlamına gelmez.
- Bu kapsam geometriyi yalnız dikdörtgen geçiş açıklıklarıyla sınırlar; CNC, lavabo/armatür standardı, yük, bağlantı, fire, levha optimizasyonu veya fiyat hesabı eklemez. Fiziksel üretim öncesi atölye doğrulaması gerekir.


## Açık donanım BOM satırları — domain sözleşmesi v1

Proje agregatörü, `hardwareItems` alanında kullanıcı/katalog tarafından açıkça sağlanan donanım kalemlerini panel `Part[]` listesinden ayrı taşır. Her satır `id`, `furnitureId`, `hardwareId`, `name`, `quantity`, `unit` ve isteğe bağlı `sourceReference` alanlarını içerir. Donanım kimliği harici katalogda doğrulanmaz; kaynak referansı yalnızca izlenebilir kullanıcı metnidir.

Miktar pozitif, sonlu ve güvenli sayısal aralıkta olmalıdır. Birim kullanıcı tarafından açıkça verilir; adet/takım/metre arasında dönüşüm yapılmaz ve kesirli miktar korunur. Satır kimliği proje içindeki donanım satırları arasında benzersizdir. Yinelenen kimlik, bozuk alan veya proje dışında/hesaplanmamış mobilya ilişkisi projeyi `blocked` yapar; kısmi sonuç döndürülmez.

Geçerli satırlar `result.hardwareItems` içinde kaynak sırası ve miktarı korunarak taşınır; panel `Part[]`, alan/hacim ve kenar bantlama özetine karıştırılmaz. Mevcut JSON v1/CSV adapter'ı bu alanı kayıpsız taşımadığı için donanım satırı bulunan hazır sonuçta `canExport: false` ve açık `exportBlockers` döner. Frontend entegrasyonu tüm alanları kayıpsız saklamalı ve adapter desteği gelene kadar dışa aktarımı engellemelidir.

Bu sözleşme üretici/model standardı, montaj reçetesi, vida/menteşe ölçüsü, delik koordinatı, bağlantı, fiyat, stok, CNC operasyonu veya güvenlik payı üretmez.


## Donanım BOM tüketim özeti — domain v1

Kaynak: `calculateProjectHardwareConsumptionSummary` in `domain/production/projectMaterialSummary.ts`.

- Fonksiyon, proje agregatörünün doğruladığı `hardwareItems` satırlarını `hardwareId + unit` anahtarıyla gruplar. Aynı kimlik/birim grubundaki adlar tutarlı olmalıdır; farklı birimler ayrı satırlardır.
- Her özet; donanım kimliği, ad, özgün birim, kaynak BOM satır sayısı, toplam miktar, ilişkili mobilya sayısı/kimlikleri ve varsa benzersiz kullanıcı kaynak referanslarını taşır.
- Kesirli miktarlar korunur. Toplam, giriş sayıların ondalık metinsel gösterimlerinden tam ondalık aritmetik ile hesaplanır; JavaScript sayı türüne güvenli ve kayıpsız dönüştürülemeyen toplam reddedilir. Birimler arasında dönüşüm yapılmaz.
- Donanım özeti panel Part listesine, panel alan/hacim hesabına veya kenar bantlama özetine karıştırılmaz. Donanım olmayan eski v1 proje sonuçları boş özet döndürür.
- Bu çıktı yalnızca miktar/BOM özetidir; fiyat, stok, tedarik, montaj reçetesi, donanım ölçüsü, delik koordinatı veya CNC operasyonu üretmez. Teklif katmanı fiyatları ancak kullanıcı/katalog girdisi sağlandığında ekleyebilir.
- Donanım satırı bulunan sonuçlarda JSON v1/CSV adapter desteği doğrulanana kadar proje agregatörünün `canExport: false` ve `exportBlockers` davranışı değişmez.


## Proje maliyet özeti — domain v1

Kaynak: domain/production/projectCostSummary.ts, calculateProjectCostSummary.

- Girdi, açıkça sağlanan maliyet satırlarının listesidir. Her satırda benzersiz id, category, description, quantity, unit, unitPriceMinor ve currencyCode bulunur; sourceReference isteğe bağlıdır.
- Desteklenen kategoriler: material, hardware, labor, operation, waste ve profit. Fire ve kâr yalnızca açık tutarlı satır olarak girilir; yüzde veya oran otomatik uygulanmaz.
- unitPriceMinor, verilen para biriminin en küçük birimindeki negatif olmayan güvenli tam sayıdır. Para birimi kodu üç büyük harfli etikettir; ISO kataloğundan doğrulama veya kur dönüşümü yapılmaz. Aynı özet içindeki bütün satırlar aynı kodu kullanmalıdır.
- quantity pozitif, sonlu ve güvenli aralıkta olmalı; en fazla altı anlamlı ondalık basamak desteklenir. Her satır ayrı ayrı en yakın küçük para birimine yarım-yukarı yuvarlanır. BigInt ara hesapları kullanılır; satır, kategori veya proje toplamı Number.MAX_SAFE_INTEGER sınırını aşarsa sonuç reddedilir.
- Boş liste status=empty ve sıfır toplamlar üretir; bu, ücretsiz teklif veya fiyatı doğrulanmış proje anlamına gelmez. Geçerli satırlar status=ready döndürür. Herhangi bir geçersiz satır veya para birimi uyuşmazlığı tüm hesabı reddeder; kısmi toplam sunulmaz.
- Bu ilk dilim maliyet satırlarını henüz ProjectMaterialConsumptionSummary veya ProjectHardwareConsumptionSummary ile otomatik eşlemez. Kullanıcı/katalog fiyatı eksikse varsayılan fiyat üretmez.
- Vergi, kur, iskonto, işçilik süresi, operasyon tarifi, levha fire oranı, kâr yüzdesi, teklif revizyonu ve geçerlilik tarihi bu sürümde yoktur. Bunlar ayrı kullanıcı/ticari sözleşme girdileri gerektirir.


## Üretim tüketiminden fiyatlı maliyet özeti — domain v1

Kaynak: `domain/production/projectPricedConsumption.ts`, `calculateProjectPricedConsumptionSummary`.

- Girdi, `calculateCabinetProjectProductionWithDiagnostics` tarafından üretilen v1 proje raporu ve kullanıcı/katalog tarafından sağlanan fiyat satırlarıdır. `blocked` üretim raporu veya bozuk Part/BOM sonucu fiyatlandırılmaz; kısmi üretim verisinden toplam çıkarılmaz.
- Fiyat anahtarı `resourceType + resourceId + unit` bileşimidir. Malzeme için `materialId + m2` kullanılır; `panelAreaM2` net tüketimidir. Donanım için `hardwareId + BOM satırındaki özgün unit` kullanılır. Adet/takım/metre/m² arasında dönüşüm yapılmaz.
- Her fiyat satırı negatif olmayan güvenli tam sayı `unitPriceMinor` ve üç büyük harfli `currencyCode` taşır. Sıfır fiyat yalnızca açık satırla geçerlidir. Yinelenen anahtar, geçersiz alan/fiyat veya farklı para birimiyle karışık toplam reddedilir.
- Fiyatı olmayan kaynak, malzeme katalog kimliği olmayan legacy Part veya birim uyuşmazlığı `missingPrices` içinde gösterilir. Bu durumda `status: "incomplete"`, `costSummary: null`; kısmi parasal toplam verilmez.
- Kenar bantlama uzunluğu mevcut Part özetinde mm cinsinden bulunur ancak ayrı kenar bandı katalog kimliği henüz taşınmadığı için `unpriced-edge-banding` kapsam engeli üretir. Panel fiyatı kenar bandı fiyatı yerine kullanılamaz.
- `status: "ready"` ve `costSummary` yalnızca tüm panel/donanım/kenar bandı tüketim gereksinimleri fiyatla karşılandığında ve tek para birimi kullanıldığında döner. `requiredLineCount` / `pricedLineCount` kapsama durumunu verir.
- Üretim raporunun `canExport: false` olması (ör. mevcut JSON v1/CSV adapter'ının `hardwareItems` veya `panelGeometry` alanını taşımaması) domain içi fiyat hesabını tek başına engellemez; bu sonuç CNC/atölye dışa aktarım onayı değildir.
- Vergi, kur, iskonto, fire yüzdesi, rulo payı, levha verimi, stok ve tedarik varsayılmaz. Fiyat kaynağı/versiyonu kullanıcı girdisidir; bu dilim fiyat geçerlilik tarihi veya teklif revizyonu üretmez.
- Frontend entegrasyon sözleşmesi: UI `ready` dışında `grandTotalMinor` göstermemeli; `incomplete` durumunda `missingPrices` satırlarını, `blocked` durumunda `diagnostics` alanını açıklamalıdır. Bu domain diliminde `frontend/**` değiştirilmez.


## 2.16 Kenar bandı katalog kimliği ve fiyat birimi v1

Kaynak: `domain/production/projectProduction.ts`, `domain/production/projectMaterialSummary.ts` ve `domain/production/projectPricedConsumption.ts`.

Proje isteği, opsiyonel `edgeBandingAssignments` listesinde her üretim Part'ı için açık bir atama alır:

```ts
{
  partId: "cabinet-1-left-side",
  edgeBandingId: "pvc-white-1",
  unit: "m" // veya "mm"
}
```

- Bir Part için en fazla bir atama bulunabilir. Atama, Part üzerindeki bütün bantlı dış kenarları ve varsa bantlanmış dikdörtgen açıklık iç kenarlarını aynı katalog kaynağına bağlar. Farklı kenarlarda farklı bant türleri v1 kapsamı dışındadır.
- `edgeBandingId`, boş olmayan ve küçük harf/rakam/nokta/alt çizgi/tire biçimindeki kararlı kullanıcı/katalog kimliğidir. Domain harici katalogda kimliğin gerçekten var olduğunu iddia etmez; ad, renk, kalınlık, yapışkan ve tedarikçi bilgisi uydurulmaz.
- `unit` açıkça `mm` veya `m` seçilir. Geometri mm olarak hesaplanır; yalnızca atama `m` seçtiğinde tam metrik dönüşümle 1000'e bölünür. Fiyat tablosu `resourceType: "edge-banding"`, aynı `edgeBandingId` ve aynı birimle eşleşmelidir. Birim otomatik tahmin edilmez.
- Atama bilinmeyen Part'a, bantlanmamış Part'a, yinelenen Part'a veya geçersiz kimlik/birime bağlanırsa proje `blocked`, `result: null` olur. Kısmi parça listesi döndürülmez.
- Bantlı bir Part için atama bulunmuyorsa tüketim özeti `edgeBandingId: null` ve `unit: "mm"` döndürür; fiyatlı maliyet `incomplete` kalır ve parasal toplam üretmez.
- `calculateProjectEdgeBandingConsumptionSummary`, Part quantity değerini her dış/iç bant uzunluğuna uygular ve tüketimi `edgeBandingId + unit` anahtarıyla toplar. Aynı ID'nin mm ve m satırları ayrı kalır; farklı kaynaklar birleştirilmez.
- Atama bulunan Part'lar `edgeBandingMaterialId` ve `edgeBandingUnit` alanlarını taşır. Mevcut JSON v1/CSV adapter'ı bu alanları kayıpsız taşımadığı için proje `canExport: false` ve açık `exportBlockers` üretir; adapter desteği gelmeden dışa aktarım onayı verilmez.
- Kenar bandı fiyatı maliyet özetinde malzeme kategorisine eklenir. Eksik fiyat veya aynı ID için farklı fiyat birimi `incomplete` olur; farklı para birimleri `blocked` kalır. Sıfır fiyat yalnızca açık fiyat satırıyla geçerlidir.
- Rulo payı, fire, bant kalınlığı, yapıştırıcı, işçilik, tedarik ve CNC işlemi hesaplanmaz. Fiziksel üretim öncesi gerçek katalog ve atölye koşulları ayrıca doğrulanmalıdır.


## Kullanıcı girdili işçilik ve operasyon tarifesi — domain v1

Kaynak: `domain/production/projectLaborOperationPricing.ts`, `calculateProjectLaborOperationPricingSummary`.

- İş kullanım satırı `id`, `category: "labor" | "operation"`, açıklama, pozitif `duration`, açık süre birimi (`min` veya `h`) ve `tariffId` taşır.
- Tarife tablosu `tariffId`, aynı kategori, açık birim, negatif olmayan güvenli tam sayı `unitPriceMinor`, üç büyük harfli `currencyCode` ve zorunlu `sourceReference` taşır. Sıfır fiyat yalnızca açık tarife satırıyla geçerlidir.
- Kullanım ve tarife birimleri birebir eşleşmelidir. Dakika-saat dönüşümü, varsayılan süre, varsayılan tarife veya katalog fiyatı üretilmez. Dönüşüm gerekiyorsa çağıran taraf doğrulanmış süreyi tarife biriminde açıkça sağlamalıdır.
- Tarife kimliği benzersiz olmalıdır; aynı tarife birden fazla iş satırında kullanılabilir. İş satırı kimlikleri de benzersiz olmalıdır. Tarife kategorisi iş satırı kategorisiyle eşleşmelidir.
- Eksik tarife veya birim uyuşmazlığı `status: "incomplete"` ve `missingTariffs` üretir; `costSummary: null` kalır. Kategori/para birimi/şema uyuşmazlığı veya geçersiz satır `blocked` döndürür. Kısmi parasal toplam gösterilmez.
- Hazır maliyet satırında `lines[].tariffId` ve `lines[].sourceReference` korunur. Kaynak referansı kullanıcının sağladığı tarife belgesine işaret eder; domain kaynağın gerçekliğini veya güncelliğini doğruladığını iddia etmez.
- Süreler mevcut maliyet motoruyla tutarlı olarak en fazla altı ondalık basamakta işlenir ve her satır küçük para birimine yarım-yukarı yuvarlanır. Farklı para birimleri birleştirilmez.
- Bu dilim yalnızca işçilik/operasyon maliyet özetidir; üretim tüketim fiyatlarıyla tek teklif toplamında birleştirme, tarife geçerlilik tarihi, vergi, kur, indirim ve teklif revizyonu sonraki ayrı görevlerdir.
- Frontend entegrasyon sözleşmesi: `ready` durumunda tarife kimliği, kaynak referansı, süre, birim ve satır toplamı gösterilebilir; `incomplete` durumunda `missingTariffs`, `blocked` durumunda `diagnostics` açıklanmalıdır. `costSummary` yalnızca `ready` durumunda gösterilir. Bu dilimde `frontend/**` değiştirilmez.


## Birleşik teklif toplamı — domain v1

Kaynak: `domain/production/projectQuoteSummary.ts`.

Çağrı: `calculateProjectQuoteSummary(productionReport, consumptionPriceTable, workItems, tariffTable)`.

- Fonksiyon mevcut `calculateProjectPricedConsumptionSummary` ve `calculateProjectLaborOperationPricingSummary` hesaplarını çağırır; yeni fiyat, süre, katalog kaydı veya varsayılan tarife üretmez.
- Malzeme, donanım ve kenar bandı tüketim fiyatları ilk alt kapsamdan; kullanıcı girdili işçilik ve operasyon süreleri ikinci alt kapsamdan gelir. Her iki alt kapsam aynı `calculateProjectCostSummary` motoruna aktarılır.
- Herhangi bir alt kapsam `blocked` ise birleşik durum `blocked`; herhangi biri `incomplete` ise ve blocked yoksa `incomplete` olur. Her iki durumda `costSummary: null` ve `lineSources: []`; kısmi parasal toplam sunulmaz.
- Her iki alt kapsam empty ise sonuç empty olur. Bir alt kapsam empty, diğeri ready ise yalnızca ready kapsamın açık satırlarıyla toplam hesaplanabilir.
- Alt kapsamlar ayrı ayrı ready olsa bile para birimleri farklıysa ortak maliyet motoru hesabı reddeder ve birleşik durum blocked olur. Kur dönüşümü yapılmaz.
- Birleşik maliyet satırları kaynak tipine göre `consumption-0001` / `work-0001` kimlikleri alır. `lineSources`, her yeni maliyet kimliğini özgün üretim veya işçilik satırı kimliğine bağlar; işçilik/operasyon satırlarında tarife kimliği de korunur.
- Miktar hassasiyeti ve satır bazlı küçük para birimi yuvarlaması mevcut `projectCostSummary.ts` sözleşmesini izler. Güvenli tam sayı taşması ve yinelenen kimlik kontrolü aynı motor tarafından uygulanır.
- Bu dilim vergi, kur, indirim, fire/kâr yüzdesi, katalog geçerlilik tarihi, teklif revizyonu veya dışa aktarım sağlamaz. Fiziksel üretim/CNC onayı değildir.


## Fiyat ve tarife sürüm snapshot'ı — domain v1

Kaynak: domain/production/projectQuotePricingSnapshot.ts, createProjectQuotePricingSnapshot.

- Girdi, teklif takvim günü (quotedOn), üretim fiyat tablosu ve işçilik/operasyon tarife tablosuna ait kullanıcı kaynaklı katalog kimliği, sürümü, effectiveFrom ve isteğe bağlı effectiveTo alanlarını taşır.
- Tarihler katı YYYY-MM-DD takvim günüdür. effectiveTo dahil olmak üzere teklif günü başlangıç/bitiş aralığında olmalıdır. Saat dilimi veya sistem saati kullanılmaz.
- Snapshot yalnızca birleşik teklif ready durumundaysa oluşturulur. Fiyatlı üretim tüketimi varsa consumptionPriceList; işçilik/operasyon satırı varsa laborOperationTariffList zorunludur. İlgili kapsam boşsa metadata null kalabilir.
- Snapshot, teklif maliyet satırları ve lineSources eşlemesini mevcut quote summary üzerinden saklar. Kaynak metadata ve maliyet ağacı runtime'da derin dondurulur; snapshot sonradan fiyat tablosu değişse de eski teklifi yeniden fiyatlandırmaz.
- Incomplete, blocked veya empty teklif için snapshot oluşturulmaz. Eksik metadata, geçersiz tarih, teklif gününün geçerlilik aralığı dışında kalması veya bilinmeyen alan blocked döndürür; kısmi snapshot sunulmaz.
- Katalog kimliği/sürümü/geçerlilik tarihi kullanıcı girdisidir. Domain kaynağın gerçekliğini, fiyatın geçmişte gerçekten yürürlükte olduğunu veya üretici fiyatını doğruladığını iddia etmez.
- Frontend entegrasyon sözleşmesi: ready snapshot için schemaVersion, quotedOn, consumptionPriceList, laborOperationTariffList ve quoteSummary alanları; boş/eksik/blok durumları için status ve diagnostics kullanılır. Bu dilimde frontend, JSON v1 ve CSV adapter dosyaları değiştirilmemiştir.


## Teklif revizyon zarfı — domain v1

Kaynak: domain/production/projectQuoteRevision.ts, createProjectQuoteRevision.

- Girdi, proje kimliği, revizyon kimliği, pozitif sıra numarası, saat dilimi içeren ISO 8601 oluşturulma tarihi, önceki revizyon referansı ve hazır ProjectQuotePricingSnapshot taşır.
- İlk revizyon için previousRevision açıkça null ve revisionNumber tam olarak 1 olmalıdır. Sonraki revizyon aynı projectId değerini korur; önceki revisionId değerine bağlanır, sıra numarasını tam bir artırır ve daha yeni bir createdAt zamanı taşır.
- Revizyon kimlikleri, proje kimlikleri, tarih-saat, katalog sürümü ve teklif snapshot yapısı runtime'da doğrulanır. Saat dilimsiz veya takvimde bulunmayan tarih kabul edilmez.
- Yalnızca status ready olan ve satır toplamı, kategori toplamı, para birimi, lineSources eşlemesi tutarlı bir maliyet snapshot'ı revizyona alınır. Eksik, boş, blocked veya incomplete teklif için kısmi revizyon üretilmez.
- Pricing snapshot, JSON uyumlu derin kopyaya alınır ve zarfla birlikte runtime'da derin dondurulur. Sonradan fiyat tablosu veya çağıran nesne değişse bile geçmiş revizyonun maliyet satırları değişmez.
- Bu domain zarfı ayrı bir revizyon kaydıdır; mevcut proje JSON v1 şeması, serializer ve parser değiştirilmez. Kalıcı revizyon geçmişi için çağıran depolama katmanı bu zarfı ayrı kayıt olarak saklamalıdır.
- Bu dilim yalnızca önceki revizyon referansını, proje kimliğini, ardışık sıra numarasını ve kronolojiyi doğrular. Tüm geçmiş boyunca revisionId tekilliği ve kalıcı sıralama, ilerideki depolama/adapter katmanında ayrıca garanti edilmelidir.
- Frontend entegrasyon sözleşmesi: ready sonucunda schemaVersion, projectId, revisionId, revisionNumber, createdAt, previousRevisionId ve pricingSnapshot alanları salt okunur geçmiş girdisi olarak gösterilebilir. blocked sonucunda diagnostics açıklanır; ready olmayan maliyet snapshot'ı revizyon geçmişine eklenmez.
- Bu modül teklif fiyatının, katalog kaynağının veya üretici standardının gerçekliğini doğrulamaz; vergi, kur dönüşümü, iskonto, fiyat tahmini veya CNC/atölye üretim onayı eklemez.


## Açık fire ve kâr maliyet satırları — domain v1

Kaynak: `domain/production/projectQuoteSummary.ts`, `domain/production/projectQuotePricingSnapshot.ts` ve `domain/production/projectQuoteRevision.ts`.

Çağrı: `calculateProjectQuoteSummary(productionReport, consumptionPriceTable, workItems, tariffTable, quoteAdjustments?)`. Teklif fiyat snapshot'ı oluşturulurken aynı opsiyonel `quoteAdjustments` alanı `createProjectQuotePricingSnapshot` girdisine eklenebilir.

- `quoteAdjustments` yalnızca açık kullanıcı girdili `waste` veya `profit` maliyet satırlarını kabul eder. Her satır `id`, `category`, `description`, pozitif `quantity`, açık `unit`, negatif olmayan güvenli tam sayı `unitPriceMinor`, üç büyük harfli `currencyCode` ve zorunlu `sourceReference` taşır.
- Miktar, birim fiyat, para birimi ve kaynak referansı kullanıcı tarafından sağlanır. Yüzde, marj, vergi, varsayılan fire oranı, varsayılan kâr veya katalog fiyatı hesaplanmaz. Bilinmeyen alanlar reddedilir.
- Ek satırlar mevcut `calculateProjectCostSummary` motoruyla hesaplanır; satır bazında küçük para birimine yarım-yukarı yuvarlama, altı ondalık miktar hassasiyeti, güvenli tam sayı ve tek para birimi kuralları korunur.
- Ek satırlar `adjustment-0001` gibi ayrı maliyet kimlikleriyle birleşik teklife eklenir. `lineSources` içinde `sourceType: "quote-adjustment"` ve kullanıcının özgün satır kimliği korunur; maliyet satırında `sourceReference` kaybolmaz.
- Geçersiz kategori, eksik kaynak referansı, bozuk miktar/fiyat veya para birimi uyuşmazlığı tüm teklifi blocked yapar; kısmi toplam döndürülmez. Üretim ve işçilik kapsamları boş olsa bile en az bir geçerli açık ek satır ready teklif oluşturabilir.
- Fiyat snapshot'ı ek satırları, kaynak referanslarını ve toplamları mevcut `quoteSummary` ağacında derin dondurur. Revizyon doğrulaması, fire/kâr kategorisini yalnızca `quote-adjustment` kaynağıyla kabul eder; tarife kimliği kabul etmez.
- Bu dilim JSON v1 proje dosyasını, CSV adapter'ını veya frontend'i değiştirmez. Frontend entegrasyonu `quoteAdjustments` girdisini ve ready/blocked teklif durumunu kullanmalı; satır açıklaması, miktar, birim, kullanıcı fiyatı, para birimi ve kaynak referansını göstermelidir. Fiziksel fire verimi, levha nesting, kerf, vergi ve ticari marj varsayımı yapılmaz.

## Teklif revizyon geçmişi aggregate'ı — domain v1

Kaynak: domain/production/projectQuoteRevision.ts, validateProjectQuoteRevisionHistory.

- Girdi projectId ve kronolojik sırada revisions dizisidir. Dizi sıralanmaz, eksik kayıt tamamlanmaz veya zincir otomatik onarılmaz.
- Boş dizi empty, doğrulanmış geçmiş ready, bozuk kayıt veya zincir blocked döndürür. Blocked sonucunda kısmi geçmiş sunulmaz.
- Her kayıt schemaVersion 1, aynı projectId, benzersiz revisionId, 1'den başlayan kesintisiz revisionNumber ve önceki kayda tam eşit previousRevisionId taşımalıdır.
- Her revizyonun oluşturulma zamanı önceki revizyondan kesin olarak sonra olmalıdır. Önceki snapshot doğrulaması createProjectQuoteRevision ile yeniden yapılır; yalnızca hazır ve tutarlı maliyet snapshot'ları kabul edilir.
- Başarılı geçmiş ve içindeki snapshot'lar runtime'da derin dondurulur. Kalıcı depolama, eşzamanlı yazma kilidi veya cihazlar arası ID üretimi bu fonksiyonun kapsamı dışındadır.
- Frontend sözleşmesi: status, history.projectId, history.revisions[] ve diagnostics; empty boş liste, blocked ise kısmi kayıt içermez.


## Doğrulanmış teklif revizyon geçmişine immutable append — domain v1

Kaynak: `domain/production/projectQuoteRevision.ts`, `appendProjectQuoteRevision(history, revisionInput)`.

- Önce mevcut geçmiş `validateProjectQuoteRevisionHistory` ile doğrulanır. Bozuk geçmişe ekleme yapılmaz; blocked sonucu `history: null` döndürür, hiçbir kayıt onarılmaz veya sıralanmaz. Fonksiyonun ürettiği `schemaVersion: 1` geçmiş aynı doğrulayıcıya ve sonraki append çağrısına yeniden girdi olarak verilebilir; eski girdilerde schemaVersion alanının bulunmaması geriye uyumludur, sağlanmışsa yalnızca 1 kabul edilir.
- Yeni girdi yalnızca `revisionId`, saat dilimli ISO 8601 `createdAt` ve hazır `pricingSnapshot` alanlarını kabul eder. `projectId`, sıra numarası ve önceki revizyon bağlantısı çağıran tarafından override edilemez.
- Proje kimliği doğrulanmış geçmişten alınır; yeni sıra numarası mevcut kayıt adedi + 1, `previousRevisionId` ise son doğrulanmış kaydın kimliğidir. Boş geçmişe ekleme ilk revizyonu 1 numarasıyla oluşturur.
- `revisionId` tüm mevcut geçmiş boyunca benzersiz olmalıdır. Tarih son revizyondan kesin olarak sonra gelmeli; snapshot hazır, tutarlı ve desteklenen şemada olmalıdır.
- Bilinmeyen alan, duplicate ID, kopuk/bozuk geçmiş, geriye giden tarih veya geçersiz snapshot blocked döndürür. Kısmi geçmiş sunulmaz; girdi geçmişi değiştirilmez.
- Başarılı append sonucu tüm geçmişi yeniden doğrular ve revizyon/snapshot nesnelerini runtime'da derin dondurur.
- Bu saf domain işlemi kalıcı depolama, transaction, eşzamanlı yazma kilidi veya cihazlar arası ID üretimi sağlamaz. Çağıran depolama katmanı append işlemini atomik biçimde kaydetmeli ve eşzamanlı güncellemeleri ayrıca koordine etmelidir.
- Frontend, JSON v1 ve CSV adapter entegrasyonu bu dilimin dışındadır. Frontend sözleşmesi: `ready` durumunda yeni immutable history; `empty` yalnızca append öncesi boş geçmiş doğrulamasında; `blocked` durumunda `history: null` ve `diagnostics`.


## Teklif revizyon snapshot satır aritmetiği — domain v1

Kaynak: `domain/production/projectCostSummary.ts`, `calculateProjectCostLineTotalMinor` ve `domain/production/projectQuoteRevision.ts`.

- Her teklif satırının `lineTotalMinor` değeri, aynı domain yardımcı fonksiyonuyla `quantity × unitPriceMinor` üzerinden doğrulanır. Miktar en fazla altı anlamlı ondalık basamakla mikro-birim tam sayısına çevrilir; sonuç küçük para birimine satır bazında yarım-yukarı yuvarlanır.
- Miktar/fiyat çarpımı güvenli tam sayı aralığını aşarsa, miktar altı basamak kuralını ihlal ederse veya saklanan satır toplamı hesaplanan değerle uyuşmazsa teklif snapshot'ı revizyona alınmaz. Kategori ve genel toplamlar birlikte değiştirilmiş olsa bile satır aritmetiği ayrıca denetlenir.
- Teklif maliyet hesaplayıcısı ve revizyon doğrulayıcısı aynı `calculateProjectCostLineTotalMinor` fonksiyonunu kullanır; yuvarlama mantığı iki yerde kopyalanmaz. Geçerli mevcut snapshot'ların sayısal sonucu değişmez; yalnızca aritmetik olarak tutarsız girdiler artık blocked olur.
- Bu doğrulama JSON v1 proje şemasını veya frontend'i değiştirmez. Para birimi dönüşümü, vergi, iskonto, otomatik fire/kâr oranı ve fiziksel üretim onayı eklemez.


## DOM-016 — Teklif revizyon karşılaştırma sözleşmesi

Kaynak: `domain/production/projectQuoteRevision.ts`.

API: `compareProjectQuoteRevisions(history, fromRevisionId, toRevisionId)`.

- Girdi geçmişi önce `validateProjectQuoteRevisionHistory` ile bütünüyle doğrulanır. Bozuk/boş geçmiş, bulunmayan kimlik, aynı veya daha eski hedef revizyon karşılaştırma üretmez.
- Başlangıç ve hedef revizyon aynı proje geçmişinde olmalıdır; hedefin sıra numarası başlangıçtan büyük olmalıdır. Aradaki revizyonlar atlanabilir, fakat geçmişin tamamı yine de zincir ve snapshot doğrulamasından geçer.
- İki snapshot aynı para birimini kullanmalıdır. Sonuç minor currency unit cinsinden `fromGrandTotalMinor`, `toGrandTotalMinor`, `grandTotalDeltaMinor` ve altı maliyet kategorisi için `categoryDeltasMinor` döndürür. Pozitif fark artışı, negatif fark azalışı belirtir.
- Çıktı immutable'dır. Kısmi/blocked geçmişte, para birimi farklılığında veya eksik toplamda karşılaştırma yoktur; kur, vergi, iskonto, fiyat veya kategori eşlemesi tahmin edilmez.
- Bu ilk dilim yalnızca kategori ve genel toplam farkı verir; satır bazlı değişim, açıklama/ürün kapsamı farkı, PDF/teklif görünümü veya kalıcı depolama sağlamaz. UI entegrasyonu ayrı frontend sahibinin sorumluluğundadır.


## Teklif revizyon geçmişi JSON dosyası — domain v1

Kaynak: domain/production/projectQuoteRevisionFile.ts.

- serializeProjectQuoteRevisionHistoryFile(history) önce mevcut aggregate doğrulayıcısını çalıştırır. Yalnızca ready veya empty geçmiş için fileType "mobilyacad-quote-revision-history", schemaVersion 1 zarfı üretir; blocked geçmişte JSON metni ve kısmi kayıt döndürmez.
- parseProjectQuoteRevisionHistoryFile(json) yalnızca JSON metni kabul eder. Dosya türü, dosya sürümü ve zarf alanları kapalı şemayla doğrulanır; bilinmeyen alan veya desteklenmeyen sürüm reddedilir.
- Zarf içindeki geçmiş yeniden validateProjectQuoteRevisionHistory üzerinden doğrulanır. Proje kimliği, revizyon ID tekilliği, kesintisiz sıra, previousRevisionId zinciri, kronoloji ve her maliyet snapshot'ının satır/kategori/genel toplam tutarlılığı korunur.
- Eski v1 geçmişlerinde iç history.schemaVersion alanının bulunmaması mevcut doğrulayıcıyla geriye uyumludur; serializer yeniden dışa aktarırken sürüm 1 alanını kanonik biçimde yazar. Boş geçmiş empty durumuyla round-trip eder.
- Bu, mevcut proje JSON v1 dosyasına gömülü bir alan değildir; teklif geçmişi için ayrı ve taşınabilir bir JSON zarfıdır. Frontend, mevcut proje dosyası entegrasyonu, otomatik kayıt, atomik disk yazımı, eşzamanlılık kilidi ve yedekleme bu dilimin kapsamı dışındadır.
- CNC, fiziksel üretim, fiyat kaynağının gerçekliği, kur dönüşümü veya ticari varsayım üretmez.


## 7. Gelecekteki proje JSON v2 teklif geçmişi uzantısı

Kaynak: `domain/production/projectQuoteRevisionProjectFile.ts`.

Mevcut frontend proje dosyası `format: "MobilyaCAD", formatVersion: 1` biçimindedir ve kararlı bir `projectId` taşımaz. Bu nedenle teklif revizyon geçmişi mevcut v1 dosyasına eklenmemelidir. V1 parser'ı bilmediği alanları normalize edilmiş dönüş nesnesine taşımaz; uzantıyı v1 içine yazmak sessiz veri kaybına yol açabilir.

V2 için domain uzantı sözleşmesi:

- Host proje zarfı `format: "MobilyaCAD"`, `formatVersion: 2` ve kullanıcı/uygulama tarafından kalıcı biçimde sağlanan `projectId` içermelidir. Domain adapter kimlik üretmez.
- Opsiyonel `quoteRevisionHistory` alanı, `ProjectQuoteRevisionHistory` v1 nesnesidir: `schemaVersion`, `projectId`, `revisions`. Uzantı yoksa boş geçmiş kabul edilir; varsa bütün revizyon zinciri doğrulanır ve `history.projectId === project.projectId` olmalıdır.
- V1 uzantı alanı olmadan `legacy` olarak okunur. V1 üzerinde `quoteRevisionHistory` alanı varsa adapter işlemi blocked döndürür; bu, v1 parser'ının alanı atması nedeniyle oluşabilecek sessiz veri kaybını önler.
- `appendProjectQuoteRevisionToProjectFile` yalnızca v2 zarfında çalışır. Sıra ve önceki revizyon bağlantısı doğrulanmış geçmişten türetilir; yalnızca hazır snapshot kabul edilir. Başarılı sonuç yeni bir üst seviye proje nesnesi döndürür, girdiyi değiştirmez. Hata durumunda proje/history kısmi olarak döndürülmez.
- Bu helper yalnızca proje zarfı kimliğini ve teklif uzantısını doğrular; oda, mobilya, malzeme ve diğer v2 alanlarının tam şema doğrulaması çağıran proje parser'ının sorumluluğundadır. Disk yazımı, atomik transaction, eşzamanlı yazma kilidi, otomatik kayıt veya backup sağlamaz.
- Bu bir v2 entegrasyon sözleşmesidir; mevcut v1 serializer/parser veya UI entegrasyonunun tamamlandığı anlamına gelmez. Frontend sahibi v2 dosya migrasyonu ve kalıcı `projectId` atamasını ayrı akışta ele almalıdır.


## DOM-019 — Levha nesting girdisi ön doğrulaması v1

Kaynak: domain/production/sheetNestingInput.ts, validateSheetNestingInput.

- Girdi schemaVersion 1, kullanıcı tarafından sağlanan tek bir levha (materialId, widthMm, lengthMm, thicknessMm, grainDirection), açık kerfMm ve parça listesidir. Malzeme kimliği, ölçüler, kalınlık, quantity ve damar yönü her parça için açıkça verilmelidir; varsayılan levha ölçüsü, kerf veya damar yönü üretilmez.
- Tüm mm ölçüleri 0.1 mm hassasiyetinde normalize edilir. Kerf sıfır veya pozitif, sonlu mm değeri olabilir. Parça quantity değeri pozitif güvenli tam sayı olmalı; batch toplamı da güvenli tam sayı sınırını aşmamalıdır.
- Tek batch yalnızca aynı materialId ve normalize edilmiş kalınlıktaki parçaları kabul eder. Parça kimlikleri benzersiz olmalıdır. İlk dilimde yalnızca geometry: rectangular desteklenir; kesit/açıklık geometrisi açıkça blocked olur.
- Damar yönü length, width veya none değeridir. Levha ve parça yönleri birlikte değerlendirilerek yalnızca damar hizasını bozmayan 0/90 derece dönüşler listelenir; listede yalnızca levha zarfına sığan yönler kalır. Hiçbir izinli yön sığmıyorsa tüm batch blocked olur.
- Sonuç ready, empty veya blocked durumudur. Blocked durumda result null'dır; geçerli görünen önceki parçalar kısmi liste olarak sunulmaz. Çıktı yalnızca doğrulanmış batch girdisi ve izinli dönüş adaylarını taşır.
- Kerf bu aşamada yalnızca doğrulanıp saklanır; levha kenar payı, kesim sırası, parça yerleşimi, nesting optimizasyonu, fire/yield veya CNC koordinatı hesaplanmaz. 0/90 adayları fiziksel kesim ya da üretim güvenliği onayı değildir.
- Frontend entegrasyonu levha ölçüsü, kerf, levha damar yönü ve her parçanın malzeme/kalınlık/quantity/parça damar yönü girdilerini açıkça sağlamalı; ready/empty/blocked durumunu ve diagnostics alanını göstermelidir. Bu modül mevcut JSON v1/CSV adapter'ını veya frontend dosyalarını değiştirmez.


## 5. Proje Part listesinden levha nesting girdisi

Kaynak: `domain/production/projectSheetNestingInput.ts`

Çağrı: `createProjectSheetNestingInput({ schemaVersion: 1, productionReport, sheet, kerfMm, partIds?, grainDirectionsByPartId? })`.

- Yalnızca `status: "ready"` ve v1 `result.parts` içeren proje üretim raporu kabul edilir. `partIds` verilmezse bütün Part satırları tek batch'e adaydır; verilirse yalnızca benzersiz ve projede bulunan seçili ID'ler alınır.
- Sonuç `sourcePartIds` ile batch'e alınan Part kimliklerini, `excludedPartIds` ile açıkça seçilmeyenleri bildirir. Malzeme/kalınlık otomatik gruplandırılmaz; seçilen Part'lardan biri levha materialId veya thicknessMm ile uyuşmazsa tüm batch blocked olur.
- Part `id`, `quantity`, `width`, `length`, `thickness` ve `materialId` alanları sırasıyla nesting ID, adet, genişlik/uzunluk/kalınlık mm ve katalog kimliği olarak taşınır. Serbest metin `material` alanından katalog kimliği türetilmez.
- Açık Part `grainDirection` değeri varsa kullanılır. Bu alanı taşımayan legacy gövde parçaları için `grainDirectionsByPartId` üzerinden kullanıcı girdisi zorunludur; varsayılan damar yönü oluşturulmaz. Override yalnızca seçili Part ID'lerine uygulanabilir.
- Seçili Part satırında `panelGeometry` veya rectangular dışı açık geometri bulunursa batch blocked olur; açık seçim dışında kalan Part satırları (kesitli olanlar dahil) `excludedPartIds` ile korunur ve seçili batch'i etkilemez.
- Batch, mevcut `validateSheetNestingInput` üzerinden 0.1 mm normalizasyonu, pozitif güvenli integer quantity, tek malzeme/kalınlık ve grain uyumlu 0/90 derece zarf sığması denetiminden geçer. Bir hata tüm sonucu blocked ve `result: null` yapar.
- Bu API yerleşim algoritması değildir: kerf doğrulanıp saklanır ama yerleşimde tüketilmez; koordinat, levha verimi/fire, kesim sırası, CNC/postprocessor veya makine standardı üretmez. Donanım ve kenar bandı BOM'u bu batch sözleşmesinin dışındadır.


## DOM-021 — Proje Part listesini malzeme/kalınlık levha batch gruplarına ayırma

Kaynak: domain/production/projectSheetNestingBatches.ts, createProjectSheetNestingBatches.

İstek sözleşmesi v1:
- productionReport, hazır v1 proje üretim raporudur.
- partIds verilmezse bütün Part satırları seçilir; verilirse boş olmayan, benzersiz ve raporda bulunan ID listesi gerekir. Çıktı seçili ve hariç tutulan ID'leri proje kaynak sırasıyla korur.
- stockSheets, her seçili materialId + 0.1 mm'ye normalize edilmiş thicknessMm grubu için tam bir kullanıcı tanımlı kayıt içermelidir. Her kayıt kendi sheet ve kerfMm değerini taşır; opsiyonel grainDirectionsByPartId yalnızca o grubun Part kimliklerine uygulanabilir.
- Parçalar otomatik olarak katalog materialId ve aynı 0.1 mm kalınlık anahtarına göre gruplanır. Malzeme metninden katalog kimliği türetilmez; fiyat, levha ölçüsü, kerf veya damar yönü varsayılmaz.
- Eksik, yinelenen veya seçili gruba karşılık gelmeyen levha tanımı; başka gruba ait grain override; geçersiz geometri, ölçü, adet veya tek levha doğrulama hatası aggregate sonucu blocked yapar. Herhangi bir hata varsa result null'dır; geçerli görünen diğer gruplar kısmi sonuç olarak döndürülmez.
- Grup sırası, seçili Part listesindeki ilk kaynak görünümüne göre deterministiktir. Her grup mevcut createProjectSheetNestingInput ve validateSheetNestingInput doğrulayıcılarından geçer; ID, quantity, mm ölçüleri, malzeme ve kalınlık doğrulaması tekrar yazılmaz.
- Bu dilim yalnızca çoklu levha batch girdisini doğrular. Kerf doğrulanıp her batch içinde saklanır ancak yerleşimde tüketilmez; koordinat, nesting optimizasyonu, fire/yield, kesim sırası, CNC/postprocessor veya makine standardı üretmez.
- Frontend entegrasyonu her malzeme/kalınlık grubu için kullanıcıdan ayrı levha en-boy/kalınlık, kerf ve levha damar yönü istemeli; eksik grup tanımında tüm nesting hazırlığını blocked göstermeli ve seçili/hariç tutulan Part ID'lerini korumalıdır. UI, tek bir grubun ready olmasını tüm projenin hazır olduğu şeklinde sunmamalıdır.


## 7. DOM-022 — deterministik 2D levha yerleşimi

Kaynak: `domain/production/sheetNestingLayout.ts`; API: `calculateSheetNestingLayout(validatedBatch)`.

- Girdi, `validateSheetNestingInput` veya `createProjectSheetNestingBatches` tarafından üretilmiş v1 batch sonucudur. Layout motoru girdiyi tekrar doğrular; `allowedRotationsDeg` güvenilir kabul edilmez, yeniden hesaplanır.
- Çıktı `strategy: "deterministic-shelf-v1"` taşır. Parçalar en uzun kenar, kısa kenar, kaynak ID ve parça sıra numarasına göre kararlı sıralanır; mevcut sıralar, yeni sıra ve yeni levha sırasıyla değerlendirilir.
- Koordinat başlangıcı levhanın sol üst köşesidir: X levha genişliği, Y levha uzunluğu yönünde mm cinsindedir. Placement kaynak Part ID, 1 tabanlı fiziksel parça numarası, yerleşmiş genişlik/uzunluk ve 0/90 derece dönüşü taşır.
- Kerf yalnızca aynı sıradaki komşu parçalar ve ardışık sıralar arasında tüketilir. Opsiyonel edgeTrimMm dört kenarı kullanıcı girdisi olarak alır; alan verilmezse legacy davranış korunur ve kenar payı uydurulmaz. Dönüşler yalnızca doğrulanmış damar uyumlu yönlerden seçilir.
- Quantity fiziksel placement kayıtlarına açılır. Tek batch en fazla 50.000 fiziksel parçadır; üstü blocked olur. Hata veya tutarsızlıkta `result: null`; boş batch `empty` döner.
- Bu algoritma deterministik raf (shelf) sezgisidir; küresel optimum, fire/yield, kesim sırası/yolu, CNC koordinatı veya makineye özel çıktı iddia etmez. Fiziksel kesim güvenliği operatör/atölye doğrulaması gerektirir.
- Frontend: `ready` durumunda levha/placement koordinatlarını mm göster; `empty` boş durum, `blocked` ise tüm yerleşimi engelleyen tanılama olarak sunulmalıdır. `strategy` optimizasyon garantisi değildir.


## DOM-023 — Makine bağımsız levha kesim planı v1

Kaynak: domain/production/sheetCutPlan.ts  
API: createSheetCutPlan({ schemaVersion: 1, batch, layout })

- Girdi, doğrulanmış tek malzeme/kalınlık batch'i ve calculateSheetNestingLayout tarafından üretilen ready/empty yerleşim raporudur. Batch, mevcut validateSheetNestingInput üzerinden yeniden doğrulanır; türetilmiş 0/90 dönüş izinleri güvenilir kabul edilmez, tekrar hesaplanır.
- Çıktı; kullanıcı levha stoğunu, açık kerf değerini, kaynak Part kimliği/ölçüsü/malzeme/kalınlık/quantity/damar yönünü ve her fiziksel placement için kaynak ID, parça numarası, 1 tabanlı levha indeksi, X/Y koordinatı, döndürülmüş ölçüler ve dönüş açısını korur.
- Her placement kaynak Part ve quantity ile eşleşmeli; her fiziksel adet tam bir kez bulunmalı; ölçü/dönüş grain kısıtıyla uyumlu ve levha sınırları içinde olmalıdır. Sheet index kesintisiz, pieceCount placement adediyle eşit olmalıdır. Batch ile yerleşim raporunun stock sheet ve kerf değerleri aynı olmalıdır.
- Herhangi bir hata, upstream blocked rapor veya eksik/çift adet tüm kesim planını blocked ve result=null yapar. Boş batch yalnızca boş levha/placement listesiyle empty döner.
- Bu sözleşme makine bağımsız veri modelidir; kesim sırası, testere yolu, fire/yield, ortak kesim hattı, CNC operasyonu, postprocessor, makine kodu veya üretim güvenliği iddiası taşımaz. Kullanıcı trim payı DOM-025 ile açıkça taşınır.
- Bu dilimde kerf değeri batch'ten aynen korunur ve eşitliği doğrulanır; placement çiftleri arasındaki geometrik çakışma ve kerf mesafesinin bağımsız doğrulaması DOM-024 kapsamındadır. Fiziksel kesim güvenliği atölye doğrulaması gerektirir.
- Frontend JSON v1/CSV adapter'ı ve tüm frontend/** dosyaları değişmemiştir. Gelecekteki entegrasyon, blocked tanıları göstermeli ve doğrulanmamış planı üretim emri/CNC çıktısı olarak sunmamalıdır.


## 5. Makine bağımsız kesim planı geometri doğrulaması ve JSON dosyası

Kaynak: `domain/production/sheetCutPlan.ts`.

- `createSheetCutPlan({ schemaVersion: 1, batch, layout })`, kaynak Part/adet kimliği, 1 tabanlı levha indeksi, mm koordinatı, döndürülmüş ölçü ve kerf ilişkisini doğrular.
- Her levhadaki placement çifti için bağımsız çakışma/kerf denetimi yapılır. Her dikdörtgen, kerf değerinin yarısı kadar dört yönde genişletilir; pozitif alan kesişimi, gerçek parça aralığının kerf değerinden küçük olduğunu veya parçaların çakıştığını gösterir. Tam kerf boşluğu ve sıfır kerf ile kenar teması geçerlidir.
- Geometri denetimi X başlangıç/bitiş sıralı sweep-line ve koordinat sıkıştırmalı Y aralık maksimum ağacı kullanır; placement başına çift taraması yapmaz ve `MAX_SHEET_NESTING_LAYOUT_PIECES = 50_000` sınırını korur. Farklı levhalardaki koordinatlar birbirinden bağımsızdır.
- Koordinat/ölçü değerleri güvenli tam sayı 0.1 mm tick aralığında olmalıdır; güvenli integer hassasiyetini aşan değerler kesim planına alınmaz.
- `serializeSheetCutPlanJson(report)` yalnızca ready/empty planı tam geometri doğrulamasından sonra `MobilyaCADSheetCutPlan` / formatVersion 1 zarfında serileştirir; blocked rapor JSON üretmez.
- `parseSheetCutPlanJson(json)` kapalı zarf/plan şemasını, kaynak adetleri, levha sınırını, dönüş/grain ilişkisini, kerf mesafesini ve bütün geometriyi yeniden doğrular. Round-trip sonucu aynı plan verisini korumalıdır.
- JSON biçimi makine bağımsız veri taşıma biçimidir; kesim sırası, testere yolu, takım/koordinat sistemi, CNC G-code veya üretici standardı içermez. Fiziksel üretim öncesi levha/kerf ve atölye güvenliği operatör tarafından doğrulanmalıdır.

## DOM-025 — Kullanıcı tanımlı levha kenar trim payları

Kaynak: domain/production/sheetNestingLayout.ts ve domain/production/sheetCutPlan.ts.

- calculateSheetNestingLayout({ ...validatedBatch, edgeTrimMm }) isteğinde edgeTrimMm, fiziksel levhanın sol/sağ/üst/alt kenarından ayrılacak payı mm cinsinden taşır. Dört alan da açıkça verilmelidir.
- Her pay sonlu, sıfır veya pozitif ve 0.1 mm hassasiyetinde olmalıdır. Yatay/düşey toplam pay, levhada pozitif kullanılabilir genişlik ve uzunluk bırakmalıdır; aksi durumda tüm yerleşim blocked ve result: null olur.
- Koordinat başlangıcı fiziksel levhanın sol üst köşesidir. Yerleşim sol/üst paydan başlar; sağ/alt sınırlar karşılık gelen kullanıcı payı kadar içeri alınır. Kerf davranışı ve damar uyumlu dönüşler değişmez.
- Alan verilmezse eski v1 davranışı korunur: sıfır kenar payı uygulanır, herhangi bir güvenlik payı veya fire yüzdesi tahmin edilmez. Açıkça verilen sıfır değerleri de round-trip içinde korunur.
- SheetNestingLayoutResult.edgeTrimMm ve SheetCutPlanResult.edgeTrimMm opsiyoneldir. Kesim planı JSON formatVersion 1'e eklenen alan geriye dönük uyumlu ve opsiyoneldir; parser trim geometrisini tekrar doğrular. Yerleşim trim sınırını ihlal ederse kesim planı blocked olur.
- Bu model fire/yield yüzdesi, gerçek kesim kaybı, optimizasyon verimi veya CNC/makine standardı üretmez. Kullanıcı girdisi olmayan trim payı uydurulmaz; fiziksel kesim öncesi operatör/atölye doğrulaması gerekir.
- Frontend entegrasyonu dört kenarı ayrı mm alanlarıyla isteğe bağlı toplamalı; net kullanılabilir dikdörtgeni ve fiziksel levha sınırını ayrı göstermeli, JSON round-trip'te alanı korumalı ve blocked tanısını görünür kılmalıdır.


## DOM-026 — geometrik levha ve yerleşen parça alanı özeti

Kaynak: `domain/production/sheetCutPlan.ts`; API: `calculateSheetCutPlanAreaSummary(sheetCutPlanReport)`.

- API, ready/empty `SheetCutPlanReport` girdisini yeniden doğrular; blocked raporun tanılarını korur. Değiştirilmiş kaynak ölçüsü, adet, trim, levha sınırı veya geometri alan özeti üretmez.
- Her kullanılan levha için brüt levha alanı, kullanıcı trim paylarıyla ayrılan alan, net kullanılabilir levha alanı, dikdörtgen placement ölçülerinin toplamı olan yerleşen net parça alanı ve kullanılabilir alanda kalan geometrik alan ayrı hesaplanır. Aynı değerler proje/plan toplamında da verilir.
- Alanlar mm² cinsindedir. 0.1 mm ölçüler integer tick'e çevrilerek 0.01 mm² çözünürlükte BigInt aritmetiğiyle toplanır; güvenli Number aralığını aşan sonuç blocked olur. Doluluk yüzdesi `placedPartAreaMm2 / usableSheetAreaMm2 × 100` olarak iki ondalık basamağa yuvarlanır.
- `unoccupiedUsableAreaMm2`, kerf aralıklarını, kullanılmayan levha bölgelerini ve olası offcut alanlarını birlikte içerir. Bu değer fire, malzeme verimi, kesim kaybı veya optimizasyon sonucu değildir. Kesim yolu ve CNC operasyonu hesaplanmaz.
- Empty plan hiç levha kullanmadığı için tüm toplam alanlar sıfır, geometrik doluluk yüzdesi `null` olur. Trim verilmemişse sıfır trim davranışı korunur; varsayılan pay veya verim yüzdesi üretilmez.
- Frontend entegrasyonu ready/empty raporunu toplam ve levha bazında gösterebilir; empty durumda yüzde göstermemeli, blocked tanısını korumalı ve kalan geometrik alanı fire/yield etiketiyle sunmamalıdır.


## DOM-027 — proje geneli malzeme/kalınlık bazlı kesim planı alan özeti

Kaynak: domain/production/projectSheetCutPlanAreaSummary.ts; API: calculateProjectSheetCutPlanAreaSummary({ schemaVersion: 1, sourcePartIds, groups }).

- Girdi, createProjectSheetNestingBatches tarafından seçilen proje Part ID listesi ile her malzeme/0.1 mm kalınlık grubu için ayrı SheetCutPlanReport içerir. Her grup kendi kullanıcı levha ölçüsü, kerf ve trim girdileriyle hazırlanmış olmalıdır.
- Grup kimliği, katalog materialId ve normalize edilmiş 0.1 mm kalınlık tick'inden deterministik bir JSON tuple anahtarı olarak türetilir. Aynı malzeme/kalınlık grubu iki kez verilemez.
- Her kesim planı calculateSheetCutPlanAreaSummary üzerinden yeniden doğrulanır. Levha malzemesi/kalınlığı, tüm kaynak Part kimlikleri ve sırası grup tanımıyla eşleşmelidir. Seçili her Part ID tam bir kez bulunmalı; farklı gruplar aynı Part ID'yi paylaşamaz.
- Çıktı grup sırasını, grup kimliğini, malzeme/kalınlığı, kaynak Part ID'lerini ve grup içindeki levha bazlı alan toplamlarını korur. Proje toplamları mm² cinsinden BigInt tabanlı 0.01 mm² alt birimlerinde birleştirilir; güvenli Number sınırı aşılırsa sonuç blocked olur.
- Proje geometrik doluluk yüzdesi toplam yerleşen dikdörtgen parça alanının toplam net kullanılabilir levha alanına ağırlıklı oranıdır. Grup yüzdeleri ayrıca korunur. Bu değer fire/yield, malzeme verimi, kesim kaybı veya optimal nesting değildir.
- Herhangi bir blocked/empty grup, eksik/çift Part ID, grup/plan uyuşmazlığı veya geçersiz alan toplamı tüm proje raporunu blocked ve result: null yapar; kısmi proje toplamı sunulmaz. Boş seçili proje listesi yalnızca boş grup listesiyle empty döner.
- Frontend entegrasyonu her grup için kendi alan özetini ve yerel levha indekslerini göstermeli; proje toplamının farklı malzeme/kalınlık gruplarının ağırlıklı geometrik özeti olduğunu açıkça ayırmalıdır. Kalan alan fire/yield etiketiyle sunulmamalıdır.


## DOM-028 — Çoklu grup kesim planı JSON zarfı v1

Kaynak: `domain/production/projectSheetCutPlanFile.ts`. API'ler: `serializeProjectSheetCutPlanJson(report)` ve `parseProjectSheetCutPlanJson(json)`.

- Zarf biçimi `format: "MobilyaCADProjectSheetCutPlan"`, `formatVersion: 1` ve `result` alanlarından oluşur. Result, proje kaynak sırasındaki `sourcePartIds` listesini ve `groups` listesini taşır.
- Her grup `groupId`, katalog `materialId`, 0.1 mm'ye normalize edilmiş `thicknessMm`, kaynak `sourcePartIds` ve tek grup `SheetCutPlanResult` nesnesini `cutPlan` alanında taşır. Tek grup planı kendi `stockSheet`, `kerfMm`, opsiyonel dört kenar `edgeTrimMm`, `sourceParts`, levha indeksleri ve placement koordinatlarını korur.
- Her iç plan mevcut `serializeSheetCutPlanJson` / `parseSheetCutPlanJson` üzerinden tam geometri doğrulamasından geçirilir. Proje kapsamı `calculateProjectSheetCutPlanAreaSummary` ile tekrar doğrulanır; her seçili Part ID tam bir kez bulunmalı, grup malzeme/kalınlık anahtarı ve kaynak sırası planla eşleşmelidir.
- Parser kapalı zarf/grup şeması kullanır. Bilinmeyen alan, bozuk JSON, farklı format/sürüm, eksik/çift grup, duplicate/missing/unknown Part ID, yanlış groupId, blocked/empty iç grup veya bozuk placement/trim/kerf/levha indeksi tüm dosyayı blocked yapar; kısmi grup listesi dönmez.
- Empty yalnızca `sourcePartIds: []` ve `groups: []` birlikte verildiğinde kabul edilir. Ready dosyada her grup tam doğrulanmış ready kesim planı taşımalıdır.
- Mevcut `MobilyaCADSheetCutPlan` / formatVersion 1 tek grup JSON sözleşmesi değişmez. Yeni zarf makine bağımsız veri taşıma biçimidir; kesim sırası, testere yolu, CNC, postprocessor veya makine standardı üretmez.
- Frontend entegrasyonu bu yeni proje zarfını ayrı dosya türü/iş akışı olarak tüketebilir; tek grup JSON v1 parser'ını değiştirmemeli ve tüm gruplar doğrulanmadan dışa aktarımı hazır göstermemelidir.


## DOM-029 — Proje nesting batch ve layout raporlarının atomik kesim planına bağlanması

Kaynak: domain/production/projectSheetCutPlan.ts

API: createProjectSheetCutPlan({ schemaVersion: 1, batchReport, layoutReports }).

- batchReport, createProjectSheetNestingBatches çıktısıdır. Her layout eşlemesi groupId ve layoutReport taşır; layout eşlemeleri farklı sırada gelse bile çıktı grupları batch raporunun proje kaynak sırasını izler.
- groupId, katalog materialId ve normalize 0.1 mm kalınlıktan JSON anahtarı olarak türetilir. Her grubun kaynak Part ID listesi, batch parça listesi, levha malzemesi ve kalınlığı ile tekrar karşılaştırılır.
- Her layout, createSheetCutPlan üzerinden yeniden doğrulanır. Yerleşim koordinatı, dönüş, levha/trim sınırı, kerf aralığı ve quantity tamlığı mevcut tek-grup motorunun kurallarıyla korunur.
- Proje kaynak Part ID'leri gruplarda tam bir kez bulunmalıdır. Eksik, yinelenen, fazla veya yanlış gruba ait layout; blocked batch/layout; kaynak kimliği, grup sırası, malzeme ya da kalınlık uyuşmazlığı tüm sonucu blocked yapar. Blocked sonuç result:null ve json:null taşır; kısmi grup listesi üretilmez.
- Ready sonuç, mevcut MobilyaCADProjectSheetCutPlan formatVersion 1 serializer/parser'ından geçirilir. Grup sırası, kaynak kimlikleri, her grubun yerel 1 tabanlı levha indeksleri ve opsiyonel trim/kerf round-trip içinde korunur. Seçim dışında kalan excludedPartIds rapor metadata'sında tutulur; JSON dosyasına seçilmemiş parça eklenmez.
- Bu rapor makine bağımsız dikdörtgen yerleşimidir. Kesim sırası/testere yolu, fire/yield, CNC/postprocessor, makine standardı veya fiziksel üretim onayı üretmez; atölye doğrulaması gerekir.
- Frontend entegrasyon sözleşmesi: status, result, json, sourcePartIds, excludedPartIds ve diagnostics alanları; ready/blocked durumları atomik tüketilmelidir. Frontend dosyaları bu teslimatta değiştirilmemiştir.


### DOM-030 — Kaydedilmiş proje kesim planı güncellik doğrulaması

Kaynak: `domain/production/projectSheetCutPlanFreshness.ts`.

Çağrı: `validateProjectSheetCutPlanFreshness({ schemaVersion: 1, savedPlanJson, productionReport, grainDirectionsByPartId? })`.

- Kaydedilmiş çoklu grup JSON v1 önce mevcut strict parser ile doğrulanır; güncel `CabinetProjectProductionReport` her grup için kayıtlı stock sheet ve kerf kullanılarak yeniden batch doğrulamasından geçirilir.
- Seçili kaynak Part ID, proje sırası, mm genişlik/uzunluk, quantity, materialId, 0.1 mm normalize kalınlık, etkin damar yönü ve rectangular geometri karşılaştırılır.
- Değişen, silinen veya artık aynı batch'e sığmayan kaynak Part varsa `stale`; bozuk/blocked üretim raporu veya karşılaştırılamayan eksik damar yönü varsa `blocked` döner. Her iki durumda da `result` ve `json` null'dır; kısmi plan dışarı verilmez.
- `fresh` yalnızca bütün seçili Part snapshot'ı eşleştiğinde kayıtlı JSON'u ve doğrulanmış sonucu döndürür. Yerleşim koordinatları yeniden hesaplanmaz.
- Legacy Part satırında `grainDirection` yoksa veya kayıtlı etkin yön güncel Part yönünden farklı bir override ile belirlenmişse aynı `grainDirectionsByPartId` girdisi tekrar verilmelidir; varsayılan damar yönü üretilmez.
- v1 plan dosyası yalnızca seçili `sourcePartIds` listesini saklar. Bu API seçilmemiş Part'ların eklenmesini/değişmesini planın kapsamı dışında tutar; tüm proje snapshot kapsamı gelecekteki zarf sürümünde ayrıca saklanmalıdır.

UI sözleşmesi: `fresh` dışa aktarılabilir plan durumu; `stale` ve `blocked` durumlarında JSON/CSV/CNC dışa aktarımı kapalı kalmalı, tanılar kullanıcıya gösterilmelidir. Bu domain commit'i hiçbir `frontend/**` dosyasını değiştirmez.

Bu doğrulama makine bağımsız dikdörtgen kesim planı tazeliğidir; CNC, testere yolu/sırası, fire/yield, makine standardı veya fiziksel üretim onayı değildir.

## DOM-031 — Tam proje Part snapshot'ı ve kesim planı JSON v2

Kaynaklar: `domain/production/projectPartSnapshot.ts`, `projectSheetNestingBatches.ts`, `projectSheetCutPlanFile.ts` ve `projectSheetCutPlanFreshness.ts`.

- `createProjectSheetNestingBatches` seçilen parçaların yanında üretim raporundaki bütün Part kayıtlarını proje sırasıyla kanonik JSON snapshot'ında taşır. Snapshot seçilmemiş, kesitli veya farklı malzemeli Part kayıtlarını da kapsar; her Part kimliği benzersiz olmalıdır.
- `createProjectSheetCutPlan` seçili + hariç tutulan Part ID kümelerinin tam snapshot kapsamıyla eşleşmesini doğrular. Yeni planlar `MobilyaCADProjectSheetCutPlan` formatVersion 2 üretir; v2 tam proje Part snapshot'ını içerir.
- Parser/serializer legacy formatVersion 1 dosyalarını okumaya devam eder. v1 snapshot alanı taşıyamaz; v2 dosyalarında snapshot zorunludur. İç kesim planı geometrisi ve grup/Part doğrulamaları korunur.
- `validateProjectSheetCutPlanFreshness` v2 için güncel `currentSelectedPartIds` listesini proje sırasıyla zorunlu ister. Seçim kapsamı farklıysa `stale`; liste verilmezse `blocked`; tam proje snapshot'ında Part ekleme, silme, sıra veya herhangi bir Part alanı değişikliği varsa `stale` ve `result/json: null` döner.
- Snapshot kriptografik imza değildir; canonical JSON eşitliğiyle veri değişimini tespit eder. Kaydedilmiş v1 planlar geriye uyumlu biçimde parse edilir ve eski seçili-Part freshness davranışını korur.
- Bu model kesim sırası, testere yolu, fire/yield, CNC/postprocessor, makine standardı veya fiziksel üretim onayı üretmez; fiziksel kesim öncesi operatör/atölye doğrulaması gerekir.


## DOM-032 — Freshness doğrulamalı proje kesim planı v2 export kapısı

Kaynak: domain/production/projectSheetCutPlanExport.ts
API: createFreshProjectSheetCutPlanExport({ schemaVersion: 1, freshness }).

- Bu API, kaydedilmiş çoklu grup planını dışa aktarmak için tek domain kapısıdır. freshness girdisi zorunludur; doğrudan serializer çağrısı yeni UI export akışında ready kabul edilmemelidir.
- Güncel productionReport yalnızca status ready, canExport true, result mevcut ve exportBlockers boş olduğunda freshness kontrolüne geçer. Boş/blocked rapor, adapter blocker veya eksik/bozuk blocker listesi export'u engeller.
- Kayıtlı plan MobilyaCADProjectSheetCutPlan formatVersion 2 ve tam projectPartSnapshot taşımalıdır. Legacy v1 dosyaları parse edilebilir fakat bu yeni export kapısından geçmez.
- v2 freshness için güncel currentSelectedPartIds proje sırasıyla zorunludur. Tam proje snapshot'ında seçili/hariç Part ekleme, silme, sıralama veya herhangi bir alan değişikliği; ayrıca kullanıcı seçim kapsamı değişikliği stale üretir. Eksik/bozuk girdiler blocked olur.
- Yalnızca status ready ve freshnessStatus fresh sonucu result ve JSON verir. stale/blocked her durumda result null, json null döner; kısmi dışa aktarım yoktur.
- Bu kapı plan koordinatlarını yeniden hesaplamaz. Snapshot canonical JSON eşitliğidir, kriptografik imza değildir. JSON CNC, kesim sırası/yolu, fire/yield veya makine standardı iddiası taşımaz.
- Frontend entegrasyonu ready/json çıktısını indirebilir; blocked durumunda tanılar gösterilir ve JSON indirme kapalı kalır. Bu teslimat hiçbir frontend/** veya adapter dosyasını değiştirmez.


## DOM-033 — Levha kaynağı/revizyon provenance metadata'sı (JSON v3)

Kaynak: `domain/production/projectSheetCutPlanFile.ts`  
API: `serializeProjectSheetCutPlanJson` / `parseProjectSheetCutPlanJson`  
Alan: `groups[].stockSheetSource = { sourceId, revision }`.

- Metadata her malzeme/kalınlık grubunda opsiyoneldir; kullanılıyorsa `sourceId` ve `revision` birlikte, boş olmayan ve kenar boşluğu içermeyen metin olmalıdır. Bilinmeyen alanlar reddedilir.
- Değerler kullanıcı/atölye tarafından sağlanır. Otomatik tedarikçi, levha kataloğu, fiyat, stok, sertifika veya üretici standardı doğrulaması yapılmaz; varsayılan kimlik/revizyon üretilmez.
- En az bir grupta provenance varsa ve tam `projectPartSnapshot` mevcutsa serializer JSON `formatVersion: 3` üretir. v3 tam proje snapshot'ı ve en az bir provenance kaydı gerektirir; diğer gruplarda metadata bulunmayabilir.
- v1 ve v2 biçimleri değişmeden parse edilir. v1 snapshot/provenance taşıyamaz; v2 tam snapshot taşır fakat provenance alanı taşıyamaz.
- Freshness v3'ü v2 ile aynı tam proje snapshot kurallarıyla kontrol eder; export kapısı fresh v2/v3 dosyasını kabul eder ve metadata'yı JSON'da korur. stale/blocked durumda JSON null kalır.
- Metadata fiziksel levha ölçüsünü/kalitesini veya tedarik zincirini kanıtlamaz; fiziksel atölye doğrulaması gerekir.

Frontend entegrasyon notu: v3 arayüzü `stockSheetSource` alanını grup bazında opsiyonel form girdisi olarak taşımalı ve JSON aç/kaydet sırasında korumalıdır. Kullanıcı vermediyse değer uydurulmamalı; CSV/CNC çıktısına destekleniyormuş gibi eklenmemelidir. Bu teslimat `frontend/**` ve adapter dosyalarına dokunmaz.

## DOM-034 — Kesim planı provenance kapsam özeti

Kaynak: `domain/production/projectSheetCutPlanProvenanceSummary.ts`  
API: `summarizeProjectSheetCutPlanProvenance(savedPlanJson)`.

- Girdi, `parseProjectSheetCutPlanJson` strict parser'ından geçirilir; JSON v1/v2/v3 aynı grup doğrulama kurallarını kullanır.
- Ready/empty sonuç her grubu proje sırasıyla `groupId`, `materialId`, `thicknessMm`, `sourcePartIds`, `provenanceStatus` ve opsiyonel `stockSheetSource` bilgisiyle özetler.
- `groupsWithProvenance` ve `groupsMissingProvenance` yalnızca `sourceId + revision` alanlarının birlikte bulunmasını sayar. v1/v2 planlarda tüm gruplar eksik; v3 planlarda provenance bulunmayan gruplar eksik olarak görünür.
- Empty plan empty ve sıfır grup/sayaçla kalır. Bozuk/uyumsuz JSON blocked döner; sayaçlar sıfır, grup listesi boş ve tanılar doludur. Kısmi özet üretilmez.
- Özet kullanıcı girdisini değiştirmez ve kaynak/revizyon değerlerinin tedarikçi, katalog, fiziksel levha, sertifika veya makine standardı tarafından doğrulandığını iddia etmez.
- Frontend sözleşmesi: kapsam sayaçlarını ve grup bazlı provided/missing durumunu gösterebilir; blocked durumda kısmi satır gösterilmemeli, tanılar sunulmalıdır. Bu domain dilimi `frontend/**` ve adapter dosyalarına dokunmaz.


## 7. DOM-035 — proje kesim planı export tanılarını kayıpsız taşıma

Kaynak: `domain/production/projectSheetCutPlanExport.ts`.

- `createFreshProjectSheetCutPlanExport` güncel üretim raporundaki `unsupportedFurniture`, `blockedFurniture`, `projectErrors`, `exportBlockers` ve ayrıca temsil edilmeyen `firstError` bilgisini okur.
- Blocked rapor tanıları `productionDiagnostics` alanında kaynak türü, `furnitureId`, `family`, `code` ve özgün `message` ile korunur. Mevcut `diagnostics: string[]` alanı geriye uyumlu, insan tarafından okunabilir bağlamlı metinleri sunmaya devam eder.
- Desteklenmeyen aile, geçersiz panel açıklığı geometrisi veya adapter'ın henüz taşıyamadığı geçerli kesitli panel geometrisi varsa export `blocked`; `result` ve `json` kesinlikle `null` kalır. Kısmi kesim planı üretilmez.
- `ready` raporunda bile herhangi bir domain tanısı veya export blocker bulunması JSON dışa aktarımını engeller. Eski consumer'lar yeni `productionDiagnostics` alanını yok sayabilir; mevcut alanlar ve JSON v1/v2/v3 dosya biçimleri değişmez.
- Bu kapı panel açıklığını nesting algoritmasına dönüştürmez, CNC/işleme koordinatı üretmez ve fiziksel üretim onayı değildir. Dikdörtgen nesting, gerçek kesit geometrisini destekleyene kadar bu parçalar export dışında kalır.


## DOM-037 — Gövde panel override'larının aileler arası veri sözleşmesi

`panelMaterialOverrides` ve `panelThicknessMmByGroup`, mevcut ortak cabinet carcass motorundan geçen beş ailede aynı ana gövde parça kimliklerine uygulanır: `cabinet`, `bookshelf`, `wardrobe`, `tv-unit` (yalnızca `floor-standing`) ve `bathroom-vanity`.

Her override yalnızca katalog `materialId` seçer. Parçanın gerçek `thickness` değeri konstrüksiyon profilinden gelir ve seçilen katalog kaydının `thicknessesMm` listesinde aynen bulunmalıdır. Bir grup için override verilmemişse mevcut parça materialId'si korunur; legacy ID'siz serbest metin malzeme için katalog kimliği veya varsayılan değer üretilmez. Bilinmeyen grup/kimlik veya kalınlık uyuşmazlığı proje raporunu blocked yapar ve kısmi `result` döndürmez.

Ana gövde parça ID son ekleri `left-side`, `right-side`, `top`, `bottom`, `shelf`, `back`, `door` olarak kalır. Özel gardırop/TV rafları (`shelf-<id>`) ve dikey bölücüler (`vertical-divider-<id>`) bu grup eşlemesine dahil değildir; bunların `materialId`, kalınlık ve yerleşimi açık spec alanlarından gelir. Grup override'ı bu özel parçalara uygulanmaz.

`createProjectPartSnapshot` her Part kaydının tüm JSON alanlarını canonical olarak saklar. Çözülmüş `materialId`, malzeme adı, `thickness` (mm), `quantity`, ölçüler ve aileye özgü yerleşim alanları snapshot karşılaştırmasına dahildir. `calculateProjectMaterialConsumptionSummary` gruplamayı `materialId + material + thickness` anahtarıyla yapar ve alan/hacim/kenar bantlama toplamlarını Part quantity değeriyle ağırlıklandırır.

Otomatik kabul testi: `domain/production/bodyPanelMaterialsFamilies.test.mjs`. Banyo dolabı geçerli kesit geometrisi taşısa da mevcut JSON/CSV adapter'ı `panelGeometry` alanını kayıpsız taşımadığından `canExport: false` kalır; bu blocker bu görevde kaldırılmaz. CNC, kesim yolu veya fiziksel üretim uygunluğu iddiası yoktur.


### DOM-038 — gövde panel override değişiminde kesim planı güncelliği

Kesim planı JSON v2, nesting seçiminden bağımsız olarak projedeki tüm üretim Part kayıtlarının canonical snapshot'ını taşır. Bu nedenle seçili olmayan veya farklı malzeme grubundaki bir gövde panelinin `materialId` ya da gerçek `thickness` (mm) değeri değiştiğinde kayıtlı plan güncel kabul edilmez.

`domain/production/bodyPanelMaterialsFreshness.test.mjs` beş desteklenen aileyi (dolap, kitaplık, gardırop, TV ünitesi ve banyo dolabı) gerçek proje üretim agregatörü üzerinden çalıştırır. Sabit üst panel Part kimlikleri ve seçim kapsamı korunurken malzeme kimliği veya kalınlık değişimi `stale` üretmeli; `result` ve `json` null kalmalıdır. Başlangıç snapshot'ı değişmediyse aynı kayıt `fresh` kalır. Legacy Part satırları stored grainDirection taşımadığında, freshness isteği plan oluşturulurken kullanılan aynı açık `grainDirectionsByPartId` eşlemesini tekrar vermelidir; eksik override `blocked` durumudur.

Kesim planı yalnızca dört ailenin dikdörtgen üst panellerini seçer. Banyo dolabının açıklıklı üst paneli (`panelGeometry`) nesting seçimine alınmaz; buna rağmen tam proje snapshot'ında kalır ve değişikliği freshness kontrolünde yakalanır. Testteki 5000 mm levha, sıfır kerf ve `none` damar girdileri yalnızca deterministik fixture değerleridir; atölye/üretici standardı veya fiziksel kesim onayı değildir. Kesit geometrisi için mevcut nesting/export blocker'ı kaldırılmaz.


## DOM-039 — Kalınlık duyarlı malzeme fiyatlandırması

Kaynak: `domain/production/projectPricedConsumption.ts`  
API: `calculateProjectPricedConsumptionSummary(productionReport, priceTable)`  
Fiyat girdisi: `ProjectConsumptionPriceInput.thicknessMm` (opsiyonel, yalnızca `resourceType: "material"` için).

- Malzeme fiyatı anahtarı katalog kimliği + `m2` birimi + gerçek parça kalınlığı (mm) bileşimidir. Aynı görünen malzeme adı farklı `materialId` değerlerini birleştirmez; aynı katalog kimliğinin farklı kalınlıkları da ayrı fiyat ve maliyet satırlarıdır.
- `thicknessMm` pozitif, sonlu ve en fazla 0.1 mm hassasiyetinde olmalıdır. Donanım ve kenar bandı fiyat satırlarında kalınlık alanı reddedilir.
- Tam `materialId + m2 + thicknessMm` fiyatı varsa önceliklidir. Kalınlık alanı olmayan legacy fiyat, yalnızca proje içinde o `materialId` için tek bir farklı kalınlık bulunuyorsa geriye uyumlu biçimde kullanılabilir.
- Aynı `materialId` birden fazla kalınlıkta tüketiliyorsa kalınlık belirtmeyen legacy fiyat hiçbir gruba uygulanmaz. Eksik satırlar `missingPrices` içinde `thicknessMm` ve varsa `legacyPriceAvailable` bilgisiyle raporlanır; sonuç `incomplete`, `costSummary: null` olur. Kısmi parasal toplam verilmez.
- Maliyet satırı açıklaması malzeme adı, mm kalınlığı ve katalog kimliğini korur. Donanım/kenar bandı anahtarları ve özgün birimleri değişmez; otomatik fiyat, kur veya birim dönüşümü yapılmaz.
- Otomatik kabul testleri: `projectPricedConsumption.test.mjs` aynı adı taşıyan farklı kimlikleri, aynı kimliğin farklı kalınlıklarını, legacy fiyat belirsizliğini ve fiyat anahtarı doğrulamasını; `projectQuoteSummary.test.mjs` birleşik teklif satırları ile eksik kalınlık fiyatında toplamın gizlenmesini doğrular.

Bu değişiklik fiyat girdisinin şemasını geriye uyumlu genişletir; fiyatlar hâlâ kullanıcı/atölye tarafından sağlanmalıdır. Üretici fiyatı, stok, fire/yield veya fiziksel üretim onayı değildir.


## DOM-040 — Gardırop ve TV ünitesi özel raf/bölücü snapshot sadakati

Kaynaklar: `domain/production/wardrobeConstruction.ts`, `domain/production/tvUnitConstruction.ts`, `domain/production/projectPartSnapshot.ts`, `domain/production/projectSheetCutPlanFile.ts`.

- Gardırop özel rafları `leftOffsetMm`, `rightOffsetMm`, `heightFromInnerBottomMm`, `frontOffsetMm`, `grainDirection`; dikey bölücüler `offsetFromInnerLeftMm` ve damar yönünü Part kaydında taşır. TV ünitesi rafları aynı açık raf ofsetlerini; dikey bölücüler `leftOffsetMm`, `bottomOffsetMm`, `heightMm`, `frontOffsetMm` ve `depthMm` alanlarını taşır.
- Özel raf/bölücü Part satırlarının ortak üretim alanları `materialId`, katalogdan çözülen `material`, gerçek `thickness` (mm), `quantity`, ölçüler ve `edgeBanding` alanlarıdır. Bu aileye özgü alanlar ana gövde panel override eşlemesine dahil değildir; kendi açık konstrüksiyon spec'lerinden gelir.
- `createProjectPartSnapshot` tüm Part nesnesini canonical JSON olarak saklar. Proje kesim planı JSON v2/v3 `projectPartSnapshot` tam proje listesini içerir; nesting seçiminden hariç tutulan özel bölücüler de snapshot kapsamındadır.
- `domain/production/projectSpecialPartSnapshot.test.mjs` gerçek proje üretim agregatöründen iki aileyi hesaplar, yalnızca özel rafları nesting'e seçer, JSON v2 planını serialize/parse eder ve hem seçili rafların hem hariç bölücülerin malzeme, kalınlık, adet, damar, kenar bantlama ve yerleşim alanlarını karşılaştırır.
- Bu dilim generic snapshot runtime kodunu değiştirmez; test, mevcut veri sözleşmesinin aileye özgü alanları kaybetmemesini güvence altına alır. Snapshot kriptografik imza değildir ve CNC/atölye fiziksel doğrulaması sağlamaz.


## DOM-041 — gardırop/TV özel Part tüketimi ve kalınlık duyarlı teklif doğrulaması

Kaynak test: `domain/production/projectSpecialPartPricing.test.mjs`.

- Test, `calculateCabinetProjectProductionWithDiagnostics` üzerinden gerçek gardırop ve floor-standing TV ünitesi konstrüksiyonlarını hesaplar; doğrudan fixture Part listesi üretmez.
- Özel raflar (`wardrobe-1-shelf-lower`, `tv-1-shelf-middle`) ve dikey bölücüler (`wardrobe-1-vertical-divider-center`, `tv-1-vertical-divider-center`) aynı proje `result.parts` listesinde kalır. Test tüm Part satırlarından bağımsız beklenen `materialId + material + thickness` gruplarını ve quantity ağırlıklı net alanı hesaplayıp `calculateProjectMaterialConsumptionSummary` ile karşılaştırır.
- 18 mm MDF ve 8 mm MDF aynı projede ayrı malzeme tüketim/fiyat satırlarıdır. `calculateProjectPricedConsumptionSummary` yalnızca `materialId + m2 + thicknessMm` fiyat anahtarını kullanır; özel parça kalınlığı fiyat açıklamasına ve satır miktarına yansır.
- Aynı kullanıcı girdili fiyat tablosu `calculateProjectQuoteSummary(report, prices, [], [])` üzerinden birleşik teklif katmanına da bağlanır; hazır durumda tüm tüketim satırlarının kaynak eşlemesi korunur.
- 8 mm özel rafın fiyatı kaldırıldığında tüketim fiyatlandırması ve birleşik teklif `incomplete` döner; eksik `mdf-8 / 8 mm` satırı görünür, `costSummary: null` kalır ve kısmi toplam sunulmaz.
- Özel raf/bölücü kenar bantları yalnızca test fixture'ında açık `edgeBandingAssignments` ve `pvc-white-1 / m` fiyatıyla karşılanır. Bu fiyatlar gerçek piyasa/tedarikçi fiyatı değildir; ürün varsayılanı veya kullanıcı kataloğu olarak kullanılmaz.
- Testteki fiyat/ölçü girdileri deterministik kabul fixture'larıdır. Fire, vergi, kur, levha verimi, CNC, makine standardı veya fiziksel üretim uygunluğu iddiası yoktur. Runtime üretim hesap motoru değiştirilmez.


## DOM-042 — Gardırop/TV özel Part kesim planı freshness doğrulaması

Kaynak test: domain/production/projectSpecialPartFreshness.test.mjs. Kullanıcı akışı: gardırop ve floor-standing TV ünitesi üretiminden seçili özel raflarla JSON v2 kesim planı oluştur; kaydedilmiş planı aynı proje üretim raporuna karşı yeniden doğrula.

- Test, doğrudan Part fixture'ı yerine calculateCabinetProjectProductionWithDiagnostics gerçek proje agregatörünü kullanır. İki özel raf nesting için seçilir; gardırop ve TV dikey bölücüleri seçilmemiş olsa da JSON v2 tam projectPartSnapshot kapsamındadır.
- Değişmeyen proje/Part verisi fresh kalır. Dört özel Part türünün (gardırop rafı, gardırop dikey bölücüsü, TV rafı, TV dikey bölücüsü) her biri için materialId, gerçek thicknessMm veya aileye özgü yerleşim alanı değiştirildiğinde freshness stale olmalıdır.
- Her stale sonuç result ve json alanlarını null tutar; tanı değişen özel Part kimliğini içerir. Böylece seçilmemiş bölücü değişikliği de eski kesim planının sessizce kullanılmasını engeller.
- Runtime üretim/freshness kodu değiştirilmez; mevcut canonical tam proje snapshot sözleşmesi doğrulanır. Snapshot kriptografik imza değildir.
- Frontend entegrasyon sözleşmesi değişmez: yalnızca fresh sonucu export edilebilir; stale/blocked durumda kısmi JSON veya CSV indirme açılmamalı ve tanılar gösterilmelidir. CNC, kesim sırası, makine standardı veya fiziksel üretim onayı sağlanmaz.

## DOM-043 — Özel Part teklif snapshot ve revizyon kaynak izi

- `projectSpecialPartQuoteRevision.test.mjs`, gerçek gardırop + floor-standing TV üretim agregatöründen gelen özel raf/bölücü Part'larını fiyat snapshot ve revizyon dosyası akışına taşır.
- Malzeme fiyat eşleşmesi `materialId + m2 + thicknessMm` anahtarıyla doğrulanır. 18 mm ve 8 mm özel Part grupları ayrı teklif satırları üretir; satır açıklaması malzeme kimliği/kalınlığı, `sourceReference` atölye fiyat kaynağını, `lineSources` ise costLineId → üretim-tüketim satır kimliği eşlemesini korur.
- İki ayrı fiyat listesi sürümüyle oluşturulan teklif snapshot'ları proje JSON v2 `quoteRevisionHistory` alanına ardışık revizyon olarak eklenir; proje dosyasından okunur ve standalone revision-history JSON v1 serializer/parser round-trip sonrasında katalog sürümü, maliyet satırları, fiyat kaynağı ve lineSources alanları karşılaştırılır.
- Exact 8 mm fiyatı eksik olduğunda snapshot `incomplete`, `costSummary: null` ve `snapshot: null` olur; revizyon append engellenir. `lineSources.costLineId` ile maliyet satırı uyuşmazsa append ve JSON serialization blocked/null kalır.
- Sınır: teklif satırları `materialId + kalınlık` bazında gruplanır. `lineSources.sourceId`, tekil Part ID'si değil, doğrulanmış üretim-tüketim özet satırının kimliğidir. Orijinal Part kimlikleri üretim raporu/snapshot katmanında kalır; teklif satırı her Part'ı ayrı fiyatlandırdığı iddiasında değildir. Fiyatlar yalnızca test fixture'ıdır; gerçek tedarikçi fiyatı veya fiziksel üretim onayı değildir.


## DOM-044 — açıklıklı banyo üst paneli net tüketim ve exact kalınlık fiyatı

Kaynak test: domain/production/projectBathroomVanityPanelPricing.test.mjs.

- Test, doğrudan Part fixture'ı yerine calculateCabinetProjectProductionWithDiagnostics gerçek proje agregatörünü kullanır. bathroom-vanity üst paneline 200 × 150 mm dikdörtgen geçiş açıklığı eklenir; test panelin dış alanından açıklık alanını çıkarır ve net hacmi net alan × gerçek panel kalınlığı olarak doğrular.
- calculateProjectMaterialConsumptionSummary, panelGeometry.netFaceAreaMm2 ve netVolumeMm3 değerlerini 8 mm malzeme/kalınlık grubunun panelAreaM2 ve volumeM3 alanlarına taşır. Açıklık geometrisi Part quantity değerini değiştirmez.
- Aynı katalog materialId hem 8 mm üst panelde hem 18 mm diğer gövde panellerinde kullanılır. Fiyatlandırma yalnızca materialId + m2 + exact thicknessMm anahtarıyla iki ayrı satır üretir; 8 mm satırının miktarı açıklık düşülmüş net m² alanıdır.
- 8 mm fiyatı kaldırıldığında mevcut 18 mm fiyatı 8 mm üst paneli karşılamaz. Üretim tüketim fiyatı ve birleşik teklif incomplete, costSummary null döner; kısmi parasal toplam gösterilmez.
- Geçerli panelGeometry, JSON v1/CSV adapter'ı geometriyi kayıpsız taşımadığı için canExport false durumunu korur. Bu test dışa aktarım, nesting, CNC veya fiziksel üretim onayı sağlamaz.
- Fiyatlar yalnızca deterministik test fixture'larıdır; gerçek tedarikçi fiyatı, vergi, kur, fire/yield veya stok varsayımı değildir. Lavabo/armatür standardı ve fiziksel uygunluk atölye/üretici tarafından doğrulanmalıdır.


## DOM-045 — JSON v3 levha kaynağı provenance ve freshness

- projectSheetCutPlanFreshness.test.mjs, JSON v3 planındaki kullanıcı/atölye stockSheetSource.sourceId ve revision metadata'sını doğrulama akışına taşır.
- Part snapshot değişmediğinde freshness sonucu fresh kalır, exact kayıtlı JSON stringini döndürür ve doğrulanmış result.groups[].stockSheetSource alanını korur.
- Part snapshot değiştiğinde (örnekte quantity), sonuç stale; result/json null, tanı kaynak Part ID'sini içerir. Kısmi/eskimiş export açılmaz; orijinal kaydedilmiş JSON v3 metadata'sı değiştirilmez.
- Mevcut runtime davranışı zaten parse edilmiş doğrulanmış planı fresh sonuçta döndürdüğünden değişmedi; test bu sözleşmeyi sabitler. Metadata gerçek tedarikçi/levha doğrulaması değildir.


## DOM-046 — grouped consumption quote Part provenance

- `calculateProjectMaterialConsumptionSummary` her malzeme/kalınlık grubuna katkı veren üretim Part ID'lerini sorted unique `partIds` alanıyla taşır. Bu alan adet/alan/hacim hesabını değiştirmez.
- `calculateProjectPricedConsumptionSummary` fiyatlanmış malzeme ve kenar-bant tüketim satırlarını `linePartSources` içinde cost-line ID → sorted unique Part ID listesiyle eşler. Donanım BOM satırları mobilya kaynaklıdır; Part bağlantısı uydurulmaz.
- `ProjectQuoteSummary.lineSources` üretim tüketim satırlarında isteğe bağlı `sourcePartIds` alanını içerir. `projectQuoteRevision` doğrulaması yeni alanı yalnızca üretim tüketiminde kabul eder, boş/tekrarlı/sırasız ID'leri reddeder.
- Snapshot ve quote revision JSON v1 şeması değişmez. Eski snapshot'larda `sourcePartIds` bulunmaması geriye uyumlu kabul edilir; yeni alan varsa round-trip sırasında korunur.
- Bu kaynak izi hesaplanan tüketim satırının hangi Part kayıtlarından geldiğini gösterir; fiziksel malzeme/atölye doğrulaması değildir.


## DOM-048 — explicit edge-band assignment regression coverage

- `domain/production/projectEdgeBandingAssignments.test.mjs` mevcut project-production doğrulamasını gerçek domain agregatörüyle sınar.
- Geçerli atama yalnızca hedef Part'a `edgeBandingMaterialId` ve açık `edgeBandingUnit` taşır; JSON v1/CSV alanları kayıpsız desteklenmediğinden export blocker korunur.
- Unknown Part, duplicate Part assignment, banded edge olmayan Part, syntax-invalid katalog ID, unsupported unit ve unknown assignment field projeyi blocked yapar. Geçerli atama ile hatalı atama birlikte olduğunda da partial `result` verilmez.
- Bu testler katalogda ID varlığını, bant kalınlığını, rulo/fire payını veya fiziksel üretim güvenliğini doğrulamaz.


## DOM-049 — project edge-band consumption summary acceptance

- `domain/production/projectEdgeBandingConsumption.test.mjs` verifies `calculateProjectEdgeBandingConsumptionSummary` with mixed cabinet/bookshelf/table source IDs. Same catalogue ID + `mm` aggregates cabinet and table Parts; same ID + `m` remains a distinct group.
- `totalLengthMm` is quantity-weighted measured length in millimetres. `totalQuantity` expresses that length in the selected unit: mm rounded to 0.1, or m rounded to 0.0001; it is not Part count. `edgeCount` is quantity-weighted, `partLineCount` counts source Part rows, and sorted `partIds`/`furnitureIds` preserve provenance.
- Legacy Parts without an explicit edge-band ID or unit stay in `edgeBandingId: null, unit: "mm"`; Parts with no banded edges are omitted. Duplicate Part IDs are rejected.
- The test proves summary arithmetic only; it does not verify catalogue existence, band thickness, waste/roll allowance, pricing, CNC, or physical manufacturing.

## DOM-050 — edge-band exact pricing and quote Part provenance round-trip

- domain/production/projectEdgeBandingQuoteRevision.test.mjs uses a real project production report with an explicit edge-band assignment. The same catalogue ID is priced separately in m and mm; only the required m key is applied, with its source reference preserved.
- The priced consumption line maps to sorted source Part IDs. The quote snapshot and revision history v1 JSON serializer/parser round-trip preserve sourcePartIds, cost-line unit, unit price and sourceReference.
- When the only price uses the wrong unit (mm for an m requirement), the quote stays incomplete, lists the available unit and returns no pricing snapshot. No unit conversion, partial total or fallback price is inferred.
- Price values are deterministic test fixtures only; catalogue availability, supplier pricing, waste/roll allowance, CNC and physical manufacturing are not validated.


## DOM-052 — Kenar bandı ataması değişince kesim planı freshness ve export blocker

- Proje JSON v2/v3 cut-plan `projectPartSnapshot` her üretim Part kaydının kanonik JSON snapshot'ını taşır. `edgeBandingMaterialId` ve `edgeBandingUnit` alanları bu snapshot'a dahildir; assignment ID/unit değişimi veya atamanın kaldırılması snapshot farkıdır.
- `validateProjectSheetCutPlanFreshness` aynı edge-band assignment ile fresh döner; assignment ID, `mm`/`m` unit veya assignment presence değiştiğinde `stale`, `result: null`, `json: null` ve kaynak Part ID tanısı döndürür. v3 `stockSheetSource.sourceId/revision` orijinal kayıtta korunur; stale validation kaydedilmiş JSON'u mutate etmez.
- Mevcut `calculateCabinetProjectProductionWithDiagnostics` explicit Part-level edge-band assignment'ı doğrular fakat JSON v1/CSV adapter bu alanları kayıpsız taşımadığı için `canExport: false` ve açık `exportBlockers` verir. `createFreshProjectSheetCutPlanExport` blocker'ı `productionDiagnostics` içinde tutar, kısmi sonuç veya JSON döndürmez.
- Kabul testleri `domain/production/projectSheetCutPlanEdgeBandingFreshness.test.mjs` dosyasında gerçek proje agregatörüyle çalışır; v3 round-trip, unchanged freshness, ID/unit/removal stale ve export fail-closed davranışını doğrular.
- Bu test dilimi runtime geometri veya adapter değiştirmez. Gerçek edge-band katalog/fiyat, rulo/fire payı, makine standardı veya fiziksel üretim doğrulaması sağlamaz.


## 2.17 Per-edge kenar bandı atamaları — DOM-053

- edgeBandingAssignments kayıtlarında edge alanı opsiyoneldir. Alan yoksa mevcut v1 Part-level atama davranışı aynen korunur (edgeBandingMaterialId + edgeBandingUnit); bu değer, aynı Part'taki per-edge override'ların bulunmadığı kenarlar için fallback'tir.
- edge yalnızca top, bottom, left veya right olabilir. Her yön, Part'ın dış kenarında veya açık panelGeometry cutout kenarında gerçekten bantlı olmalıdır; bantlanmayan yön atanamaz.
- Bir Part bir legacy Part-level atama ve birden çok yönsel atama taşıyabilir. Part-level atama tekil kalır; aynı Part+edge yönüne ikinci atama bloklanır. Farklı yönler için ayrı katalog kimliği ve birim geçerlidir.
- Yönsel atamalar parts[].edgeBandingByEdge üzerinde { edgeBandingId, unit } olarak korunur. Map yalnızca açık override yönlerini içerir; legacy fallback edgeBandingMaterialId/edgeBandingUnit alanlarında korunur. Per-edge tüketim/fiyat gruplaması DOM-054'te eklenecektir.
- Legacy edgeBandingAssignments v1 ve mevcut JSON/CSV export alanları yönsel atamaları kayıpsız taşımadığı için bütün kenar bandı atamalarında export blocker sürer. Per-edge alanı tüketim özeti ve export tarafından desteklenene kadar üretim raporu atama verisini gösterir, fakat export onaylamaz.
- Test kapsamı: dört yön ayrı ID/unit, legacy fallback + override, duplicate edge, unknown edge, banded olmayan yön ve mevcut legacy Part-level regresyonları.


## DOM-055 — Per-edge kenar bandı proje JSON uzantısı

- Domain API: `readProjectEdgeBandingAssignmentsFromProjectFile` ve `updateProjectEdgeBandingAssignmentsInProjectFile`; `edgeBandingAssignments` alanını MobilyaCAD proje zarfında okur/yazar, diğer proje alanlarını korur ve kaynak nesneyi mutate etmez.
- JSON v1 yalnızca legacy Part-level `partId/edgeBandingId/unit` atamalarını round-trip yapar. Yönsel `edge` alanı v1'de desteklenmez ve unknown-field blocker ile reddedilir; otomatik migrasyon yapılmaz.
- JSON v2, kararlı `projectId` zorunluluğu ile legacy default atama ve `top/bottom/left/right` override'larını birlikte korur. Atama anahtarı Part+edge (legacy default için Part) olup duplicate kayıtlar blocked/null döner.
- Unknown alan, invalid Part ID/katalog ID/unit/direction, bozuk envelope, unsupported version ve 10000 kayıt sınırı fail-closed doğrulanır. Geometri, Part existence ve gerçekten bantlı edge kontrolü hâlâ `calculateCabinetProjectProductionWithDiagnostics` sorumluluğundadır.
- Kabul testleri v1/v2 JSON round-trip, v1 directional blocker, v2 default+override, empty extension, duplicate/invalid/unknown fields, projectId/version ve input immutability koşullarını kapsar. Frontend proje parser/adapter entegrasyonu ayrı sahiplikte; bu domain API tek başına UI/CSV export blocker'ını kaldırmaz.


## DOM-058 — Directional quote revision project-file persistence

- appendProjectQuoteRevisionToProjectFile and readProjectQuoteRevisionHistoryFromProjectFile support the versioned MobilyaCAD project JSON v2 envelope with a stable projectId; quoteRevisionHistory is a v1 history extension. DOM-058 adds a regression proving per-edge quote line data survives project-object JSON stringify/parse and domain read validation.
- Persisted lines keep direction in the existing description, exact unit (m or mm), quantity, unit price, sourceReference, and lineSources.sourcePartIds. No unit conversion or pricing inference is introduced.
- Legacy project JSON v1 is read as legacy and revision append is blocked. Unsupported history versions and unknown pricing-snapshot fields are blocked with null history/project; no partial data is returned.
- The test is domain-level only. Frontend project parser/import/export integration is not implied, and per-edge direction is still not a structured quote-line field. CNC or physical workshop validation is not provided.


## DOM-059 — Yönsel teklif revizyon satır karşılaştırması

- `compareProjectQuoteRevisions` artık `lineChanges` alanını döndürür; satır kimliği cost-line ID'sine bağlı değildir. Eşleşme yalnızca tam kaynak türü/kimliği, kategori, açıklama (kenar yön etiketi dahil), birim, tarife kimliği ve sıralı kaynak Part ID'leriyle yapılır.
- Aynı eşleşen satırın miktar, birim fiyat, satır toplamı veya `sourceReference` değişirse `changed` olarak iki snapshot'ı birlikte verir. Yön, birim, kaynak kimliği veya Part provenance değişirse eski/yeni satır ayrı `removed`/`added` olarak kalır; mm↔m dönüşümü, fiyat veya kaynak tahmini yapılmaz.
- Her satır snapshot'ı immutable comparison sonucuna dahil edilir. Bozuk history veya farklı para birimleri önceki fail-closed karşılaştırma kapısını kullanır.
- UI entegrasyon sözleşmesi: `lineChanges` yalnızca doğrulanmış quote snapshot'lardan gelen delta listesidir; frontend'in bunu revision paneline bağlaması ayrı frontend sahipliğindedir. Direction hâlâ description text'te; DOM-061 structured field işi ayrı.


## DOM-060 — Quote revision source integrity
- `createProjectQuoteRevision` accepts the additive `sourceIntegrityVersion: 1` input marker for strict source validation; callers creating new revisions should supply it. `appendProjectQuoteRevision` always adds the marker. Quote-history and pricing-snapshot schema versions remain unchanged.
- Marked revisions enforce ordered one-to-one `costLineId` mapping, unique `sourceType/sourceId` identity, source-type/category alignment, and non-empty sorted unique Part provenance for `material` consumption rows (including edge-band lines). Hardware consumption may be furniture-scoped; labor/operation rows require their tariff ID; explicit waste/profit rows keep their source reference.
- Older revision v1 records and direct create calls without the marker retain the previous validation rules for backward compatibility. Unsupported integrity marker versions fail closed.
- Missing/duplicate source mapping or material Part IDs never produce a partial strict revision; quote amounts, currency, source references and exact units are not inferred or converted.
- The domain-only tests cover the strict new path and legacy read compatibility. UI, project-import/export adapter, CNC and physical workshop validation remain separate.



## DOM-061 — Structured quote edge direction

- Cost line `edgeDirection` is an optional enum (`top`, `bottom`, `left`, `right`) for explicit edge-banding material rows. It is carried from the per-edge consumption summary through priced consumption, quote summary, immutable revision snapshots, and JSON history round-trip.
- Direction metadata is validated as a material / production-consumption line and requires non-empty source Part IDs. Unknown direction values and metadata on non-material or non-consumption lines fail closed. No unit conversion or cost changes are implied.
- Revision comparisons use structured direction as identity when present; display description is still retained and compared as a value. Legacy v1 lines without the field remain valid and continue to use their description-based identity, so no migration is required.
- The field is additive in the existing JSON v1 quote-history envelope. Frontend/export integration and physical workshop/CNC verification remain separate.


## DOM-062 — Teklif revizyon karşılaştırması JSON dışa aktarım sözleşmesi

- Yeni `domain/production/projectQuoteRevisionComparisonFile.ts`, yalnızca `compareProjectQuoteRevisions` tarafından hazır olarak dönen karşılaştırmayı sürümlü `mobilyacad-quote-revision-comparison` JSON zarfına serileştirir; parser zarfı ve karşılaştırma alanlarını strict doğrular.
- Satır farkları `added/removed/changed` biçiminde, kategori, açıklama, mikt, exact unit, birim fiyat, satır toplamı, currency, sourceType/sourceId, sourceReference, tariffId, kaynak Part ID'leri ve edgeDirection (varsa) ile korunur. mm↔m dönüşümü veya kur/fiyat tahmini yapılmaz.
- Genel toplam farkı revizyon toplamlarıyla; kategori farkları satır değişimlerinin kategori bazlı toplamıyla; tüm kategori delta'ları genel delta ile tutarlı olmalıdır. Satır toplamı quantity × unitPriceMinor hesaplamasıyla doğrulanır.
- Bilinmeyen alan/sürüm, bozuk JSON, tutarsız toplam, eksik satır uçları, geçersiz metadata veya blocked karşılaştırma export/parse için fail-closed: `json/file/comparison=null`.
- Otomatik kabul: round-trip, TRY/currency, kaynak Part/tarife/edgeDirection, mm ve m'yi ayrı satır farkı olarak koruma, bozuk totals, unsupported fields/version ve blocked input. UI adapter ve gerçek dosya indirme entegrasyonu bu domain sözleşmesinin dışında.


### DOM-062 QA düzeltme notu
- İlk QA #44632666298, comparison line snapshot'larında optional `sourceReference`, `tariffId`, `sourcePartIds` ve `edgeDirection` alanlarının zorunlu sanılması nedeniyle dört export testini düşürdü. Satır doğrulaması optional alanları kabul ederken yalnızca temel satır alanlarını zorunlu kılacak şekilde ayrıldı.
- Delta regresyon fixture'ı kategori farkları toplamını genel farkla eşit tutup satır/kategori tutarsızlığını doğrudan sınar. Testler zayıflatılmadı; export fail-closed kalır.


### DOM-062 final QA (20 Kasım 2026)
- Implementation `c5491e4` and optional-field correction `e4dcc985` verified by [CI #44632874056](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874056), [QA #44632874051](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874051), [Pages #44632874042](https://github.com/Taylan789/MobilyaCAD/actions/runs/44632874042).
- Final QA: 124/124 frontend tests and 451/451 domain tests, strict domain TypeScript, lint, production build and production dependency audit (0 vulnerabilities) passed. Initial four export tests failed because optional source metadata was incorrectly required; allowed/required validation was separated and the corrected SHA passed.


## DOM-063 — Teklif revizyon karşılaştırması CSV v1

- `domain/production/projectQuoteRevisionComparisonCsv.ts` sabit kolon sıralı CSV v1 serializer/parser sağlar. Proje/revizyon/para birimi/toplam metadata, genel toplam satırı, altı kategori delta satırı ve satır farkları ayrı rowType değerleriyle taşınır; metadata tüm satırlarda aynı karşılaştırmaya bağlıdır.
- Satır farkları added/removed/changed için from/to alanlarıyla açıklama, quantity, exact unit, unitPriceMinor, lineTotalMinor, currency, sourceReference, sourceType/sourceId, tariffId, sorted sourcePartIds ve edgeDirection (varsa) saklar. mm↔m dönüşümü veya fiyat/kur tahmini yapılmaz.
- Bütün hücreler çift tırnaklanır, iç tırnaklar ikiye katlanır, CRLF ve UTF-8 BOM kullanılır. Parser sabit header/version, satır sırası, metadata tutarlılığı, kategori tamlığı ve mevcut strict JSON domain validation kapısını kullanır; 5 MB ve 10.000 satır fark sınırı vardır.
- Round-trip, Türkçe metin, comma/quote/multiline, mm/m, optional metadata, empty comparison, malformed quoting, unknown header ve inconsistent delta testleri. Final QA 124/124 frontend + 457/457 domain; strict TS/lint/build/audit geçti (0 production vulnerability).
- UI download adapter ve gerçek dosya indirme entegrasyonu ayrı frontend sahipliğinde; CNC veya fiziksel atölye doğrulaması bu sözleşmeye dahil değildir.



## DOM-064 — Explicit waste/profit adjustment provenance in project quote history

- Quote adjustments remain explicit cost lines in the existing `waste` or `profit` category. Quantity, unit, unit price, currency and a non-empty user-supplied source reference are required; percentage-based defaults or inferred pricing are not added.
- Each revision snapshot keeps the generated cost-line ID and the `quote-adjustment` source type with the adjustment's original line ID as `sourceId`; the cost line retains its exact `sourceReference`. Strict revision validation rejects adjustment categories outside waste/profit, duplicate source identities, missing references and partial totals.
- JSON v2 project-history append/read must preserve both adjustment categories, their source IDs/references, units, prices, line totals and reconciled category/grand totals. This is domain persistence only; frontend import/export adapters and physical workshop/CNC verification are separate.


## DOM-065 — Revision-comparison adjustment-line provenance

- Quote comparison JSON v1 and CSV v1 round-trip added, removed, and changed `quote-adjustment` lines for both `waste` and `profit`, retaining the exact source ID/reference, quantity, unit, unit price, line total and currency on each side.
- Comparison validation reconciles line deltas to the waste/profit category delta and category deltas to the grand-total delta. The tests also verify the revision comparator emits all six adjustment change shapes; JSON/CSV use the same strict validation gate and reject partial results.
- No inferred waste percentage, profit rate, currency conversion, or unit conversion is introduced. This is a domain serialization contract; frontend download wiring and physical workshop/CNC validation remain separate.
- DOM-065 verification: [test commit 58cd6aa](https://github.com/Taylan789/MobilyaCAD/commit/58cd6aa1588341a9a9df124c6dd81627c93e8b90), CI [#44661291150](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291150), QA [#44661291069](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291069), Pages [#44661291112](https://github.com/Taylan789/MobilyaCAD/actions/runs/44661291112) successful; 459/459 domain tests.


## 8. Malzeme tüketim özeti JSON v1

Kaynak: `domain/production/projectMaterialSummaryFile.ts`.

- `serializeProjectMaterialConsumptionSummaryFile` ve `parseProjectMaterialConsumptionSummaryFile`, hesaplanmış malzeme gruplarını `mobilyacad-material-consumption-summary` JSON v1 zarfında taşır.
- Birimler açık ve sabittir: panel kalınlığı mm, net alan m², net hacim m³, kenar bant uzunluğu mm. Material ID (varsa), kalınlık, grup Part kimlikleri, Part satır sayısı, quantity, alan/hacim ve yönsel bant alt toplamları korunur.
- Parser/serializer unknown key, unsupported schema/unit, duplicate grup/Part ID, sırasız kimlik, Part sayısı/adet tutarsızlığı, alan-kalınlık-hacim uyuşmazlığı veya bant uzunluğu/edgeCount tutarsızlığında fail-closed çalışır; kısmi JSON üretmez. JSON 5 MB, grup 1.000 ve Part ID toplamı 10.000 ile sınırlandırılır.
- Boş özet ve katalog kimliği olmayan legacy material groups geçerlidir. Bu dosya yalnızca net tüketimi taşır; fire, levha verimi, fiyat, kerf, CNC veya atölye standardı eklemez.
- Kabul: gerçek domain hesap çıktısı JSON round-trip; boş/legacy; invalid totals, unknown fields, duplicate IDs ve oversized input otomatik testlerle kapsanır. Frontend indirme entegrasyonu ayrıca yapılmalıdır.

\n## DOM-070C phase 2 — Birleşik teklif içinde rulo fiyatlama modu

`calculateProjectQuoteSummary(..., quoteAdjustments, options)` altıncı parametre olarak açık fiyatlama modu kabul eder. Varsayılan `length` mevcut davranışı korur. `roll` modunda malzeme fiyat tablosu kenar bandı uzunluk fiyatı gerektirmez; rulo ölçü tanımları ve `rulo` birimli fiyat tablosu üretim rapundaki aynı Part tüketiminden türetilen planı hesaplar. Rulo satın alım satırları metre/mm satırlarının yerine geçer; katalog kimliği, rulo ölçüsü, satın alınan uzunluk, Part/mobilya kaynakları ve plan/fiyat referansları metadata olarak korunur. Eksik ölçü/fiyat veya para birimi uyuşmazlığı kısmi toplamı kapatır.

DOM-070C phase 3 — Snapshot/revision JSON v2 round-trip (Actions verified)

`createProjectQuotePricingSnapshot` açık `edgeBandingPricingMode`, `edgeBandingRollSpecs` ve `edgeBandingRollPriceTable` seçeneklerini kabul eder; aynı üretim raporundan hesaplanan rulo satın alım satırları ve kaynak metadata immutable fiyat snapshot'ına taşınır. Strict revision validator `rulo` birimini yalnızca edge-banding kaynaklı material satırlarında kabul eder; roll count, quantity, roll length, purchased length, sorted unique Part/furniture ID'leri ve opsiyonel plan/fiyat referanslarını doğrular. JSON v2 project-file append/read round-trip bu metadata'yı kayıpsız korur. Kod SHA `023156bb`; CI #44738166332, QA #44738166417 (502/502), Pages #44738166308 başarılı.

**Sınır:** Roll specs ve fiyat girdileri proje JSON v2'de ayrı, düzenlenebilir girişler olarak henüz saklanmaz; DOM-071 bunu strict validation ve legacy-safe persistence ile ele alır. Revision comparison roll provenance (DOM-072) sonraki iştir. UI/frontend, adapter ve fiziksel CNC üretim doğrulaması bu domain diliminde yapılmamıştır.

## DOM-071 — Editable roll inputs in project JSON v2

The domain-only project-file extension `edgeBandingRollPricing` schema v1 stores `rollSpecs` and `rollPriceTable` independently. Roll specs retain catalog ID, explicit roll length (0.1 mm precision), fixed waste allowance (0.1 mm precision; omitted means zero), and optional source reference. Price rows retain catalog ID, `rulo` unit, non-negative safe-integer price in minor currency units, uppercase three-letter currency code, and optional source reference.

Each table is limited to 1,000 rows, rejects duplicate catalog IDs and unknown fields, and is canonicalized by catalog ID. Price-only inputs can be saved for later configuration; quote calculation still rejects missing or unused data. Empty inputs remove the extension. The writer is immutable and refuses to replace an invalid saved extension.

Project JSON v1 remains legacy/read-only for this extension; an extension on v1 is blocked rather than silently discarded. v2 requires a stable projectId. This stores user inputs only: no prices, roll lengths, waste rates, currency conversion, yield, CNC standard, or workshop approval is inferred. Frontend controls/download wiring remain UI-owned.

## Structured material identity conflict provenance

The diagnostic report adds the optional `blockedFurniture[].materialIdentityConflict` field for `invalid-material` identity-name conflicts. It carries the catalogue `materialId` and a deterministic `sources` list of every material-bearing Part in that conflicting ID group, including `furnitureId`, `partId`, and the original `materialLabel`. Sources are sorted by furniture ID then Part ID. Every blocked contributor receives the same complete provenance; legacy diagnostic `message`, ordering, atomic blocking, and strict aggregator behavior remain unchanged. Other diagnostic codes omit this field.


## DOM-113 — Structured material conflict provenance through cut-plan export diagnostics

- The cut-plan export gate preserves the optional `materialIdentityConflict` metadata on blocked `invalid-material` diagnostics, alongside the legacy source, furniture ID, family, code and message fields.
- Metadata is accepted only when the catalog ID and source identifiers/labels are non-empty, sources are sorted and unique by furniture ID then Part ID, normalized labels genuinely conflict, and the blocked diagnostic's furniture ID is present in the source set. The source furniture set must be covered by diagnostics carrying the same conflict metadata; mismatched or incomplete provenance blocks the export gate.
- Invalid metadata is fail-closed: the export report is blocked with `result=null` and `json=null`. No schema or CNC output is changed. Frontend diagnostic presentation remains UI-owned and may consume the additive optional field; it must continue to honor blocked exports and preserve the legacy message.

## DOM-114 — Nesting-batch blocked diagnostic provenance

- When the source project-production report is blocked, the nesting-batch report keeps the existing human-readable `diagnostics` and adds `productionDiagnostics` only when the shared production-diagnostic parser returns validated records.
- The additive structured diagnostics preserve source, furniture/family/code/message, and validated material-conflict catalog/source provenance. They are ordered exactly as the source report.
- Any malformed or incomplete conflict source coverage/order fails closed: no structured diagnostics are emitted and the nesting batch remains blocked with a diagnostic message. Batch result remains null; no partial layouts are produced.


## DOM-115 — Blocked material-conflict reconciliation across consumers

- For a mixed-family production report blocked by conflicting labels for one catalogue ID, the structured conflict source set must match the Part IDs and furniture IDs surfaced by material-consumption summaries from each isolated, valid source furniture report.
- The same conflict source IDs must be present in a validated full Part snapshot built from those isolated results. This is test evidence for provenance completeness only; isolated results must not be merged into a valid production project.
- The blocked nesting-batch report must retain validated source diagnostics while keeping `result: null` and omitting `projectPartSnapshot`. It must not construct a misleading complete project snapshot from partial/isolated source data.
- Regression coverage also verifies distinct conflicting labels and input immutability. No material totals are emitted for the blocked combined project and no partial nesting layout is allowed.
- VERIFIED by test commit [d04b156](https://github.com/Taylan789/MobilyaCAD/commit/d04b156fdb49ff742659194cda3938df4c607fa1): exact-SHA CI [#45056168193](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168193), QA [#45056168306](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168306) and Pages [#45056168182](https://github.com/Taylan789/MobilyaCAD/actions/runs/45056168182) succeeded (165 frontend + 641 domain tests; strict TS, lint 32 warnings/0 errors, build and audit 0 vulnerabilities).
- Previous QA [#45051528277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528277) found only an assertion-message mismatch (640 domain tests passed, one assertion failed); the test regex now matches the existing production diagnostic.
- QA [#45055923801](https://github.com/Taylan789/MobilyaCAD/actions/runs/45055923801) next found duplicate source IDs only because the test flattened identical full source sets repeated across furniture diagnostics; the corrected assertion checks the unique set plus complete coverage in each diagnostic. Exact-SHA rerun is pending.
- Previous QA [#45051528277](https://github.com/Taylan789/MobilyaCAD/actions/runs/45051528277) found only an assertion-message mismatch (640 domain tests passed, one assertion failed); the test regex now matches the existing production diagnostic. Reverification on the correction SHA is pending.

## DOM-118 — Levha tanımı ve grup tanılarının deterministik sırası

- Batch üretiminde levha tanımı listesi (stockSheets) sırası, hazır batch içeriğini veya grup sırasını değiştirmez. Batch grup sırası seçili proje Part'larının ilk kaynak sırasını korur.
- Eksik/invalid grup ve kullanılmayan levha tanımı tanıları katalog materialId ve normalize edilmiş 0.1 mm kalınlık (sayısal) sırasıyla üretilir. Tanı sırası proje Part veya levha tanımı giriş sırasından bağımsızdır.
- Yinelenen normalize malzeme/kalınlık tanımları fail-closed olarak blocked kalır; kullanılmayan tanımlar açık tanı üretir ve sessizce yok olmaz.
- Bu slice levha seçimini/ölçülerini değiştirmez, nesting algoritmasını optimize etmez, fire/yield veya CNC üretim onayı sağlamaz.

## DOM-122 — Combined quote cross-consumer reconciliation

The combined quote must reconcile the ready priced-consumption summary, labor/operation tariff summary, and explicit waste/profit adjustments before it exposes monetary totals. A regression fixture independently derives panel area from Part dimensions and quantities, hardware quantity from the supplied BOM rows, and top-edge banding length from the source Part; it then independently computes minor-unit line totals using the documented six-decimal quantity scale and half-up rounding. Component rows and combined quote rows are compared for category, quantity, unit, price, currency, source reference and total. Category/grand totals and line-source mappings must reconcile, and no partial monetary output is accepted.

This is test evidence only; it does not add pricing defaults, unit conversions, taxes, waste rates, profit percentages, hardware-to-Part links, CNC operations or workshop assumptions. The test is domain/production/projectQuoteSummary.test.mjs (DOM-122).

Verification for DOM-122: code/test commit [467627bd](https://github.com/Taylan789/MobilyaCAD/commit/467627bd1ca85e5d70ed21c451a6cecfbd1633ce); exact-SHA CI [#45097364302](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364302), QA [#45097364273](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364273), and Pages [#45097364279](https://github.com/Taylan789/MobilyaCAD/actions/runs/45097364279) succeeded. QA recorded 175 frontend + 651 domain tests, 0 failures, strict shared-domain TypeScript, lint 32 warnings/0 errors, production build and audit 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-123 — Priced hardware BOM source mapping

A ready `calculateProjectPricedConsumptionSummary` result exposes `lineHardwareSources` as a separate, furniture-scoped mapping for each priced hardware cost line. Each mapping uses the exact hardware cost-line `costLineId`, hardware catalogue `hardwareId`, original `unit`, sorted unique `furnitureIds`, and optional sorted unique BOM `sourceReferences`. BOM references are kept distinct from the hardware price-list `sourceReference`, which remains on the corresponding cost-summary line. Hardware mappings intentionally do not contain `sourcePartIds`: no hardware-to-panel-Part relationship is inferred. Empty, blocked, and incomplete summaries expose no partial hardware-source mapping. DOM-124 will carry this mapping into quote line sources; snapshot/JSON/CSV validation remains a separate compatibility slice.


## DOM-124 — Hardware BOM provenance in combined quote line sources
A ready `calculateProjectQuoteSummary` maps each priced hardware consumption cost line to the same `hardwareId`, original BOM unit, sorted unique furniture IDs and optional sorted unique BOM source references from `lineHardwareSources`. The additive quote source fields are `hardwareId`, `hardwareUnit`, `hardwareFurnitureIds` and `hardwareSourceReferences`; `sourceId` remains the priced-consumption cost-line ID and `costLineId` is the combined quote line ID. The cost line's `sourceReference` remains the hardware price-list reference and is separate from BOM source references. Hardware mappings do not carry `sourcePartIds`.
The quote refuses to expose ready source mappings if a priced hardware line lacks exactly one source map. DOM-124 exact-SHA verification: commit [2621c51c](https://github.com/Taylan789/MobilyaCAD/commit/2621c51cfc507627f5b5b929f7a71e0995d38449), CI [#45111962178](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111962178), QA [#45111961982](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961982), Pages [#45111961983](https://github.com/Taylan789/MobilyaCAD/actions/runs/45111961983) passed. DOM-125 adds strict optional hardware metadata validation and JSON/CSV v1 round-trip compatibility while preserving legacy snapshots; code [6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456), assertion fix [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e), CI [#45118738218](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738218), QA [#45118738120](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738120) and Pages [#45118738144](https://github.com/Taylan789/MobilyaCAD/actions/runs/45118738144) all passed. Test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-125 — Hardware BOM provenance persistence

Quote-summary JSON v1 now accepts the additive fields `hardwareId`, `hardwareUnit`, `hardwareFurnitureIds` and optional `hardwareSourceReferences` only on production-consumption hardware cost lines. Hardware ID/unit/furniture provenance is required as a complete set; furniture IDs and BOM source references must be sorted, unique and bounded. Partial or misplaced metadata fails closed, and no hardware-to-Part relationship is fabricated.

Quote-summary CSV v1 writes the four fields as additive trailing columns. The parser accepts both the new strict header and the prior v1 header: legacy rows are normalized with blank metadata fields, so existing snapshots remain readable and do not gain invented provenance. Both formats recompute cost totals through the same JSON validator. Exact-SHA verification: code/test commit [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e), CI #45118738218, QA #45118738120 and Pages #45118738144 all succeeded; the test site is https://taylan789.github.io/MobilyaCAD/.
