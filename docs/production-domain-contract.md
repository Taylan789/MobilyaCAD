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


## 2.15 Karışık aile projelerinde kesitli panel tüketimi

\`panelCutouts\` her desteklenen mobilya ailesinin mevcut \`ProjectProductionPart\` kimliğine bağlanabilir; yalnızca banyo dolabı üst paneline özgü değildir. Domain kabul testi, aynı projede \`bathroom-vanity\` üst panelinde iki dikdörtgen açıklığı ve \`bookshelf\` rafında bir açıklığı birlikte doğrular.

- Banyo üst paneli 18 mm \`mdf-18\`; kitaplık rafı 8 mm \`mdf-8\` katalog malzemesi ve üç adet olarak hesaplanır. Diğer kitaplık gövde parçaları kendi malzeme/kalınlık gruplarında kalır.
- Kesit geometri eklemek Part satır sayısını veya \`quantity\` değerini değiştirmez. Malzeme özeti net alan/hacim ve iç kenar bantlamasını her malzeme + kalınlık grubu için aynı Part listesinden, quantity ile ağırlıklandırarak hesaplar.
- Test, kesit öncesi ve sonrası özet farkını karşılaştırır: 18 mm grupta 0.08 m² / 0.00144 m³ ve 600 mm iç bant; 8 mm grupta raf adedi üç olduğu için 0.06 m² / 0.00048 m³ ve 900 mm iç bant farkı beklenir.
- Birden fazla ailede geçerli kesit bulunması yine \`status: "ready"\` üretir; ancak JSON v1/CSV adapter'ı \`panelGeometry\` alanını kayıpsız taşımadığından \`canExport: false\` kalır. Bu test, dışa aktarımın üretime hazır olduğu anlamına gelmez.
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
