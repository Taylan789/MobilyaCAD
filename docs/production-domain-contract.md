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

### 2.6 Kitaplık dikey bölücüleri

Kaynak: `domain/production/bookshelfConstruction.ts`

- Sürüm 1 kitaplık isteği, geriye uyumluluk için opsiyonel root `verticalDividers` listesi kabul eder; alanın olmaması veya `[]` verilmesi mevcut kitaplık parça listesini değiştirmez.
- Her bölücü açık `id`, iç sol yüzden `offsetFromInnerLeftMm`, `thicknessMm`, katalog `materialId`, dört kenar için `edgeBanding` bayrakları ve `grainDirection` taşır. Varsayılan kalınlık, malzeme, bağlantı veya konum üretilmez.
- Bölücü, doğrulanmış kitaplık iç derinliği boyunca ve net iç yüksekliği boyunca tek bir tam yükseklik Part satırı olarak üretilir. Yalnızca yatay ofset ve kalınlık aralığı doğrulanır; bağlantı/delik, montaj payı veya CNC koordinatı hesaplanmaz.
- Bölücü listesi en fazla 100 kayıt içerir; kimlikler benzersizdir; bölücüler 0.1 mm hassasiyetinde normalize edilir, iç genişlik sınırını aşamaz ve birbirleriyle çakışamaz. Seçilen katalog malzemesi gerçek bölücü kalınlığını içermelidir.
- Tam genişlik `shelfCount` ile dikey bölücü aynı anda kullanılamaz; bu kombinasyon sessizce kesişen parçalara dönüştürülmez. Bölme bazlı raf yerleşimi sonraki ayrı dilimdir.
- Proje agregatörü bu satırları aynı `parts` listesine taşır; malzeme özeti quantity, net alan/hacim ve açık kenar bayraklarını aynı kaynak Part listesi üzerinden hesaplar.
- Bu opsiyonel istek alanı mevcut JSON v1 dosya biçimini veya frontend adapter'ını kendiliğinden değiştirmez. UI entegrasyonu, kitaplık isteğine açık `verticalDividers` listesi göndermeli; bölücü varken tam genişlik raf sayısını sıfır tutmalı ve domain blocked tanılarını göstermelidir.

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
- Kaynak zinciri en fazla `PROJECT_QUOTE_REVISION_HISTORY_MAX_REVISIONS = 2.000` kayıt kabul eder. Sınır aşıldığında geçmiş bütünüyle blocked ve `history: null` olur; kayıt kırpılmaz veya kısmi sonuç üretilmez. Bu bir arşivleme/retention özelliği değildir.
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
- Serializer ve parser UTF-8 byte uzunluğunu ölçerek `PROJECT_QUOTE_REVISION_HISTORY_FILE_MAX_BYTES = 1.048.576` (1 MiB) sınırını uygular. Parser bu kontrolü `JSON.parse` öncesinde yapar; serializer sınırı aşan çıktıda `json: null`, parser ise `history: null` ile blocked döndürür. UTF-16 string uzunluğu byte sayısı yerine kullanılmaz.
- Bu kaynak sınırları schemaVersion 1'i değiştirmez ve veriyi sessizce kırpmaz; 2.000 revizyondan veya 1 MiB dosya boyutundan büyük geçmişler açık hata ile reddedilir.
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
- `importProjectQuoteRevisionHistoryFileIntoProject` önce hedef zarfın kendi `quoteRevisionHistory` data descriptor alanını güvenli biçimde inceler ve mevcut geçmişi `projectId` ile doğrular. Dolu geçmiş varsa import dosyasını parse etmeden ve hedef zarfın geri kalanını kopyalamadan `blocked` döner; accessor/non-enumerable alan getter çalıştırılmadan reddedilir. Alan yoksa veya geçerli geçmiş boşsa import devam eder; v1 dosyaları hâlâ blocked kalır. Başarılı yolda kopya sonrası boşluk kontrolü de korunur; Proxy reflection trap'leri garanti kapsamı dışındadır.
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

Quote-summary CSV v1 writes the four fields as additive trailing columns. The parser accepts both the new strict header and the prior v1 header: legacy rows are normalized with blank metadata fields, so existing snapshots remain readable and do not gain invented provenance. Both formats recompute cost totals through the same JSON validator. Exact-SHA verification: feature commit [6025de0](https://github.com/Taylan789/MobilyaCAD/commit/6025de0a9e5612ff7ac67deab45a6df10a94b456), test correction [332299f](https://github.com/Taylan789/MobilyaCAD/commit/332299fbb852d690031d376fe82a9f390436c55e), CI #45118738218, QA #45118738120 and Pages #45118738144 all succeeded; the test site is https://taylan789.github.io/MobilyaCAD/.


## Quote revision hardware BOM provenance (DOM-126a, verified)

- Revision snapshot source validation accepts additive hardware BOM fields hardwareId, hardwareUnit, hardwareFurnitureIds and optional hardwareSourceReferences only on production-consumption hardware cost lines.
- Identity, unit and sorted unique furniture IDs are all-or-nothing; hardware unit matches the cost-line unit. Optional BOM references are sorted, unique and bounded. Hardware price-list sourceReference remains distinct from BOM provenance.
- Legacy revision snapshots without these optional fields remain valid; no hardware-to-Part IDs are fabricated. Regression coverage preserves provenance through standalone history JSON and project-v2 embedded history and rejects partial/misplaced metadata.
- Verified code/test [53c72cbd](https://github.com/Taylan789/MobilyaCAD/commit/53c72cbdf8e04c9df46d2ab13b7d499fe7fae5b4); CI [#45132439080](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439080), QA [#45132439155](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439155) and Pages [#45132439031](https://github.com/Taylan789/MobilyaCAD/actions/runs/45132439031) all succeeded. Comparison projection and comparison JSON/CSV remain DOM-126b.


## DOM-126b — Hardware BOM provenance in revision comparison value (verified)
- Revision comparison line snapshots preserve the hardware BOM `hardwareId`, original `hardwareUnit`, sorted `hardwareFurnitureIds` and `hardwareSourceReferences` as additive fields. BOM source-reference changes are compared as line-value changes; stable hardware line identity is retained and category/grand-total money deltas remain zero when only BOM provenance changes. BOM source references are not price-list `sourceReference` values; hardware furniture IDs do not imply panel Part links.
- Regression uses two real quote revisions from the same production/pricing fixture, changes only the hardware BOM source references, and asserts one `changed` line with unchanged hardware category/grand total.
- Verified commit/test [ec937609](https://github.com/Taylan789/MobilyaCAD/commit/ec9376091721bee90605caf292b5e88af3f2748d), CI [#45144318230](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144318230), QA [#45144317923](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317923) and Pages [#45144317913](https://github.com/Taylan789/MobilyaCAD/actions/runs/45144317913) all successful. Test site: https://taylan789.github.io/MobilyaCAD/.
- Comparison JSON/CSV still omit hardware BOM fields; their versioned adapters are separate DOM-126c/d. No frontend or machine-specific output was added.


## DOM-126c — Hardware BOM provenance in revision-comparison JSON v3

- Comparison JSON export stays at v2 when no hardware BOM metadata is present, preserving existing cross-format consumers. When hardware BOM fields are present, the serializer emits v3; v1 and v2 readers remain supported.
- JSON v3 accepts both existing catalog resource identity and the hardware-only fields `hardwareId`, `hardwareUnit`, `hardwareFurnitureIds`, and optional `hardwareSourceReferences`. Identity, unit and furniture IDs are all-or-nothing; unit must equal the cost-line unit; identifier arrays must be sorted, unique and bounded. BOM fields are only valid on `hardware` / `production-consumption` lines.
- Partial, misplaced, mismatched-unit, empty/unsorted metadata and BOM fields in legacy v1/v2 envelopes are rejected atomically with no partial file/comparison. BOM furniture references do not infer Part IDs; hardware `sourcePartIds` remains absent unless separately supplied by a validated source.
- Acceptance is covered by JSON v3 round-trip and fail-closed regression tests, while legacy JSON v1/v2 fixtures remain valid. Exact-SHA CI [#45148425243], QA [#45148425227] and Pages [#45148425478] succeeded (178 frontend + 664 domain tests; strict TS, production build, lint 32 warnings/0 errors, audit 0); test site: https://taylan789.github.io/MobilyaCAD/. CSV v4 hardware fields are a separate DOM-126d slice.


## DOM-126d — Quote revision comparison CSV v4 hardware BOM provenance
- CSV v4 appends paired `hardwareId`, `hardwareUnit`, `hardwareFurnitureIds` and optional `hardwareSourceReferences` fields for each comparison side; v3 resource/catalog columns are preserved.
- Exact-header parser supports v1/v2/v3/v4. Hardware BOM data round-trips through CSV v4 and validated JSON v3; partial and unsorted BOM metadata is rejected atomically. CSV v3 resource identity remains readable.
- BOM furniture IDs are provenance only: this does not create panel Part links, drilling coordinates, CNC operations, or machine-specific output. Frontend export integration remains separately owned.
- Verification: CI run 45157106818 success; QA run 45157106928 success (184 unit tests + 666 shared-domain tests; type-check, lint, build, dependency audit); Pages deployment run 45157106790 success. Published test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-127a — Explicit hardware BOM-to-Part traceability

- A user-supplied project `hardwareItems` row may include optional `sourcePartIds`. It must be a non-empty, sorted, unique list of exact generated Part IDs (maximum 10,000 IDs).
- Every referenced Part must exist in the same production project and belong to the hardware row's `furnitureId`. Unknown IDs, cross-furniture IDs, malformed, duplicate or unsorted lists block the project atomically; partial production results are not returned.
- Omitted `sourcePartIds` means the BOM row has no Part-level link. The engine does not infer links from names, hardware catalog IDs, BOM references, dimensions or furniture IDs.
- Hardware consumption summaries expose a sorted union of explicit Part IDs for each hardware identity/unit group. This is traceability only: the aggregate summary does not allocate each hardware row's quantity to individual Parts. Preserve the original BOM rows for that finer allocation.
- Quote source snapshots and revision JSON/CSV already carry the generic `sourcePartIds` field; the explicit mapping is passed through those existing contracts. Physical assembly suitability remains operator-verified.


## Hardware BOM satır traceability — DOM-127b

Kaynak: `domain/production/projectMaterialSummary.ts`, `calculateProjectHardwareBomTrace(projectProduction)`.

- Her kullanıcı BOM satırı ayrı `bomRowId`, mobilya/hardware kimliği, açıklama, özgün `bomQuantity`, birim ve isteğe bağlı kaynak referansıyla; kaynak satır sırası korunarak döndürülür.
- Yalnızca kullanıcı tarafından açıkça verilen `sourcePartIds` bağları sunulur. Bağlı Part snapshot'ları Part kimliği, adı, kendi üretim quantity değeri, malzeme/katalog kimliği ve mm ölçülerini içerir. Part quantity, donanım BOM miktarının o parçaya dağıtıldığı anlamına gelmez.
- Satır kimliği, quantity, unit, katalog/hardware kimliği, aynı mobilya kapsamı, Part ID varlığı ve Part ölçü/adet doğrulamaları mevcut domain kontrolleriyle fail-closed uygulanır. Eksik bağlantı tahmin edilmez.
- `calculateProjectHardwareConsumptionSummary` gruplu costing kaynağı olarak değişmeden kalır; bu API maliyet toplamlarını veya birim dönüşümlerini değiştirmez.
- Frontend/export entegrasyonu henüz yapılmamıştır. JSON/CSV export hardwareItems alanını kayıpsız desteklemeden dışa aktarım blokajı korunmalıdır. CNC, bağlantı/kurulum, Part başına hardware miktar dağıtımı veya fiziksel üretim standardı hesaplanmaz.


## DOM-128 — Hardware identity in quote revision comparison

Hardware comparison line identity now includes the hardware catalog ID, original hardware unit, sorted furniture scope and explicit source Part IDs. A change in any of these identity fields is represented as separate removed/added lines, not a single changed line that could obscure the source mapping. BOM source references remain value-only: reference changes can still appear as one changed line when the hardware identity and source scope are unchanged. Comparison JSON and CSV validators enforce the same changed-line identity boundary; hardware units must still equal the cost line unit. This is quote/revision provenance only and does not claim per-Part hardware quantity allocation or machine-ready output.


## DOM-131 — Immutable quote revision source-map audit

`calculateProjectQuoteRevisionSourceMapAudit(historyValue)` accepts a project quote revision history and validates the complete history before producing an audit. The result is revision-ordered and deeply immutable. Each revision reports source-map lines and aggregate counts for cost/source rows, explicit Part links, unique Part IDs, resource identities, hardware BOM references/furniture scope, labor-operation mappings, adjustment mappings, price-reference rows, source types and cost categories.

- Ready histories return the full audit; a valid empty history returns an empty audit with zero counts.
- Invalid history returns `status: blocked`, `audit: null`, and diagnostics—no partial revision is emitted.
- The audit copies only validated source metadata. It does not infer missing Part links, normalize hardware quantities, calculate costs, or add any JSON/CSV persistence schema.
- Cost-line `sourceReference` remains separate from hardware BOM `hardwareSourceReferences` and edge-band plan/price references. Legacy revisions with no `sourceIntegrityVersion` remain visible as `null`; no strict source integrity is retroactively claimed.
- Acceptance: two-revision mixed-source fixture, exact metadata separation, count reconciliation, deterministic output, deep-freeze and input-immutability; empty and invalid histories fail safely.


## DOM-132 — Legacy source identity duplicate audit

Quote source identity is the pair (sourceType, sourceId) within one revision. The immutable source-map audit now surfaces repeated identity groups without changing or rejecting a valid legacy revision: counts.duplicateSourceIdentityCount counts repeated groups, counts.duplicateSourceIdentityLineReferenceCount counts every cost-line reference participating in those groups, and duplicateSourceIdentities provides the exact identity and sorted costLineIds. Group order is deterministic by source type and source ID; line references are sorted lexically, so the report remains stable when source lines are reordered. Duplicate groups are revision-scoped; totals sum per-revision groups and participating references. Strict sourceIntegrityVersion: 1 history continues to reject repeated source identities, while legacy histories remain readable and audit-ready. This is diagnostic-only and does not infer or repair source mappings, alter cost totals, or persist a new export schema.


## DOM-133 — Provenance-only quote revision comparison

`compareProjectQuoteRevisionSourceMaps(history, fromRevisionId, toRevisionId)` compares validated quote source maps without mixing price arithmetic into the result. It matches lines by validated `costLineId` and reports only added, removed or changed source metadata; unchanged lines are counted but omitted from the change list. Output is deterministic by cost-line ID and deeply immutable.

- Provenance fields include source identity/type/reference, tariff, Part links, resource identity/unit, edge direction, roll-plan and price references, hardware identity/scope and hardware BOM references.
- Cost, quantity, unit-price, line-total, category/unit/currency changes are not included in this API; monetary/category deltas remain in `compareProjectQuoteRevisions`.
- Different source metadata on a stable cost-line ID is a `changed` provenance row. New/removed cost-line IDs are `added`/`removed` rows. No source mapping is inferred.
- Acceptance: source-only change with zero monetary delta; added/removed/unchanged reconciliation; stable order when source and cost rows are reordered together; immutable result and input; invalid/missing revision fail closed.
- This is a domain API only. No frontend, comparison JSON/CSV schema, adapter, CNC output or machine standard is changed.


## DOM-134 — Three-revision source-map audit reconciliation

The source-map audit is checked across three consecutive quote revisions with repeated legacy (sourceType, sourceId) identities. Duplicate groups remain revision-local and ordered by source type/identity; each group's cost-line IDs are lexically sorted. Additive project counts reconcile with the sum of revision counts, while unique Part, hardware-furniture and BOM-reference identities are deduplicated across the full project history rather than added per revision.

- Acceptance: three valid revisions with two duplicate identity groups each; exact revision-local group/reference counts; project additive totals and unique-ID totals reconcile; reversing paired cost/source rows leaves the audit summary stable; input remains unchanged and duplicate-group arrays are immutable.
- Test-only contract guard for the existing audit API; no schema, export, monetary calculation, CNC output or machine standard is changed.


## DOM-135 — Explicit legacy/strict source-integrity marker disclosure

Source-map revision comparisons now expose revision-level `fromSourceIntegrityVersion` and `toSourceIntegrityVersion` values from the validated source-map audit. A value of `1` means the strict source-integrity marker is present; `null` explicitly means the legacy revision has no marker. The comparison does not infer strict integrity from a well-formed legacy revision, does not rewrite history, and does not treat marker presence as a line-provenance delta. Strict v1 validation rules are unchanged.

- Acceptance: a legacy → strict v1 → legacy chain reports `null / 1 / null`; both comparisons retain unchanged line counts and zero provenance changes; history is immutable and valid.
- Additive domain comparison contract only. No project/revision schema, export adapter, frontend, CNC output or machine standard is changed.


## DOM-136 — Project strict/legacy source-integrity coverage audit

- API: `calculateProjectQuoteRevisionSourceIntegrityAudit(historyValue)`, built from the validated immutable source-map audit snapshots.
- Returns project-wide `revisionCount`, `strictRevisionCount` (marker `1`), `legacyRevisionCount` (missing marker represented as `null`) and an ordered per-revision marker snapshot.
- Acceptance: per-revision markers are preserved; strict + legacy counts reconcile to `revisionCount`; empty histories remain `empty`; invalid histories or unsupported markers return `blocked` with no partial audit; input and output are immutable.
- This audit does not upgrade legacy records, infer integrity, or alter quote arithmetic/export formats.


## DOM-137 — Project-file append/read source-integrity reconciliation

The project JSON v2 quote-history wrapper is tested as an end-to-end consumer of the strict/legacy source-integrity audit. A pre-existing legacy revision without `sourceIntegrityVersion` remains unchanged when strict v1 revisions are appended; readback and audit must agree on ordered markers and counts. Repeated appends preserve revision numbering/previous links and the original project snapshots.
- Acceptance: legacy → strict → strict readback reports `[null, 1, 1]`, `legacyRevisionCount = 1`, `strictRevisionCount = 2`, and `revisionCount = 3`; both prior project snapshots are immutable.
- Domain integration regression only; no frontend, export adapter, machine/CNC output or pricing arithmetic changes.


## DOM-139 — Explicit stock-sheet purchase cost summary

`calculateProjectSheetNestingStockCostSummary` accepts a raw project cut-plan area-summary request and a `sheetPrices` list. It revalidates the area request before calculating costs. Each price definition identifies one stable material/thickness `groupId`, matching `materialId` and normalized `thicknessMm`, an explicit non-negative safe-integer `pricePerSheetMinor`, a three-letter uppercase `currencyCode`, and an optional `sourceReference`.

- Every validated nesting group requires exactly one price definition; duplicate, unused, missing, mismatched or malformed prices block the entire result.
- Currency is homogeneous across the project summary. Per-group and project totals use safe minor-unit arithmetic and block overflow; partial costs are never returned.
- Group results preserve source Part IDs and validated sheet counts. Output is deterministic and deeply immutable; input remains unchanged.
- Empty plans return zero totals. This purchase-cost summary is separate from net-area material consumption and is not automatically added to quote totals, preventing double counting.
- Supplier prices, waste/yield, machine/CNC standards or production-ready output are not inferred.


## DOM-140 — Explicit material-cost basis selection

`calculateProjectMaterialCostBasisSummary` is a version-1, fail-closed selection contract. Request fields are exactly `schemaVersion`, `basis` (`net-consumption` or `stock-sheet-purchase`) and `sourceReport`. It intentionally accepts only the selected report; it does not require the alternate source or add the two costs together.
- Net-consumption basis extracts only the material category from a complete, homogeneous-currency `ProjectCostSummary`; all six category totals, line totals and grand total must reconcile, and the report must be fully priced.
- Stock-sheet-purchase basis extracts only validated group purchase totals from the stock-cost summary. Group currency, sheet count × explicit price, source Part IDs, and group/project totals are reconciled.
- Empty selected source returns zero; incomplete/blocked sources return no monetary amount. Unknown request fields, invalid schema/basis, inconsistent or unsafe totals fail closed.
- VERIFIED code/test commit [207df9aa](https://github.com/Taylan789/MobilyaCAD/commit/207df9aa51548ab1156aed8327173f4cfc6dbc52): exact-SHA CI [#45315954884](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954884), QA [#45315954813](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954813) and Pages [#45315954792](https://github.com/Taylan789/MobilyaCAD/actions/runs/45315954792) passed; 204 frontend + 693 domain tests, strict TS, build, lint 34 warnings/0 errors, audit 0 vulnerabilities; test site deployed https://taylan789.github.io/MobilyaCAD/. Initial commit 92f361b9 had 2 QA failures, corrected by 207df9aa.
- This is a selector contract, not quote integration. DOM-141 must carry the chosen basis into the quote contract and must never double-count net area and stock-sheet purchase.


## DOM-141 — Teklifte tek panel malzeme maliyet temeli v1

Kaynaklar: `projectPricedConsumption.ts`, `projectMaterialCostBasis.ts`, `projectQuoteSummary.ts`.

- Çağrı: `calculateProjectQuoteWithMaterialCostBasis({ schemaVersion: 1, basis, productionReport, consumptionPriceTable, workItems, tariffTable, ... })`.
- `basis: "net-consumption"`: panel Part net alan fiyatları mevcut tüketim motorundan gelir. Her material satırının Part kaynak eşlemesi zorunludur; `resourceType: "material"` panel maliyetine, `resourceType: "edge-banding"` ayrı kenar bandı maliyetine gider.
- `basis: "stock-sheet-purchase"`: `stockSheetPurchaseReport` zorunludur. Panel net alan fiyat satırları hesap dışında bırakılır; donanım, kenar bandı, işçilik ve operasyon satırları normal şekilde fiyatlanır. Levha gruplarının Part kimlikleri proje Part snapshot'ını eksiksiz ve tekrarsız kapsamalı; her grubun `materialId` ve 0.1 mm normalize kalınlığı gerçek Part değerleriyle eşleşmelidir.
- Çıktı şema v1'dir: panel maliyeti, kenar bandı maliyeti, kategori toplamları ve genel toplam aynı para biriminde güvenli tam sayılarla döner. Stock-sheet modunda temel `quoteSummary` yalnızca panel dışı satırları içerir; nihai panel toplamı wrapper'da eklenir. Bu henüz teklif revizyon snapshot'ına kalıcı yazma anlamına gelmez.
- Eksik fiyat, kaynak Part kapsamı, malzeme/kalınlık uyuşmazlığı, para birimi farkı veya çift panel fiyatlama birleşik tutarı engeller. Fiyat, fire, levha verimi veya üretim standardı tahmin edilmez.
- UI entegrasyonu: seçili temeli, panel maliyetini, kenar bandı maliyetini, kaynak sayısını ve birleşik toplamı ayrı göster; temel `quoteSummary` satırlarını aggregate panel maliyetiyle tekrar toplama. Frontend yenileme sahibinin alanına dokunulmadı.
- Sonraki dilim: seçilen temel ve kaynak provenance'ını teklif fiyat snapshot/revizyon sözleşmesine geriye uyumlu biçimde eklemek; eski v1 snapshot'ları değiştirmemek.


## Quote pricing snapshot v2 — explicit panel material-cost basis

createProjectQuotePricingSnapshot accepts an optional materialCostBasis object:
- { basis: "net-consumption" } uses validated Part-linked net material consumption and the existing consumption price table.
- { basis: "stock-sheet-purchase", stockSheetPurchaseReport } requires a ready stock-cost report whose groups cover the project Part snapshot exactly and match material IDs and normalized millimetre thickness.

When this input is present, the returned immutable quote pricing snapshot uses schemaVersion 2 and stores materialCostBasis: the selected basis, currency, panel and edge-band costs, combined material/category/grand totals, source count, and stock-sheet group provenance. Each stock group stores its stable group ID, material ID, 0.1 mm-normalized thickness, sorted unique Part IDs, sheet count, explicit per-sheet price, reconciled group cost, currency and optional price source reference. No supplier price, yield or currency conversion is inferred.

Snapshots without materialCostBasis retain the legacy schemaVersion 1 shape and remain readable by the revision validator. Stock-sheet-only quotes may have an empty line-level quoteSummary; the v2 basis snapshot carries the validated panel purchase amount. Stock-sheet revision comparison and source-map audit remain fail-closed until group-aware consumers are implemented in DOM-143.


## DOM-143A — Stock-sheet source-map audit

`calculateProjectQuoteRevisionSourceMapAudit` now audits validated quote snapshot v2 stock-sheet purchase groups without merging them into line-level quote provenance.

- Each revision exposes a separate immutable `stockSheetGroups` list with group ID, material ID, normalized millimetre thickness, source Part IDs, sheet count, explicit per-sheet price, group cost, currency and optional price-source reference.
- Per-revision and project totals separately report `stockSheetGroupCount`, `stockSheetPartReferenceCount`, `stockSheetUniquePartIdCount` and `stockSheetPriceSourceReferenceCount`. The unique Part count is deduplicated across revisions; line-level Part counts retain their existing meaning.
- A valid stock-only quote whose base `quoteSummary` is empty and has no cost lines can still be audited. It contributes zero quote lines and its stored stock-sheet group provenance is reported separately.
- The audit copies only provenance already present in the validated v2 snapshot. It does not infer missing Part IDs, sheet counts, prices, currencies or machine operations.
- Stock-sheet revision comparison and JSON/CSV group-delta export remain fail-closed until the next DOM-143 slice; no UI or adapter behavior is claimed by this change.

Acceptance tests cover a mixed base quote with stock-sheet purchase groups, a stock-only empty base quote, per-revision counts, project-wide Part de-duplication and immutable results. The project-file round-trip test also verifies the stock-sheet audit after JSON persistence while keeping revision comparison blocked. The first exact-SHA QA run found one outdated assertion that still expected the audit to be blocked; the follow-up updates it to assert the new ready result. The correction passed exact-SHA CI, 211/211 unit tests, 708/708 domain tests, type-check, lint, production build, production dependency audit and Pages deployment on commit 12687c9b.


## DOM-143B — Stock-sheet group revision comparison core

compareProjectQuoteRevisionStockSheetGroups(history, fromRevisionId, toRevisionId) compares explicit stock-sheet purchase groups from two validated quote revisions without mixing those groups into line-level quote provenance.

- At least one compared revision must use the explicit stock-sheet-purchase basis. The other side may be a legacy v1 or net-consumption revision; it contributes zero stock-sheet groups while its validated quote totals remain part of the comparison.
- Groups match by their persisted stable groupId (material identity plus normalized 0.1 mm thickness). A material or thickness identity change is represented as a removed group and an added group, never as an inferred in-place replacement.
- A matched group becomes changed when its source Part IDs, sheet count, explicit per-sheet price, reconciled group cost, currency or optional price-source reference changes. Added, removed and changed records retain complete before/after group snapshots.
- The result reports stock-sheet purchase-cost and sheet-count deltas separately from material-category and grand-total deltas. Group-cost changes must reconcile exactly to the stored panel purchase-cost delta; all category deltas must reconcile to the grand-total delta using safe integer arithmetic and one currency.
- A stock-only revision with an empty line-level quote summary remains comparable from its validated v2 material-cost-basis snapshot. No synthetic quote line is created.
- Invalid histories, unsupported cost bases, currency mismatches, missing totals or arithmetic inconsistencies return a blocked result with no partial comparison. Results and nested Part ID arrays are immutable.

This is the domain comparison primitive only. The existing full quote-comparison envelope and JSON/CSV adapters remain fail-closed for stock-sheet groups until DOM-143C and DOM-143D integrate and round-trip the new group-change data. No frontend or machine-specific CNC behavior is claimed by this slice.


## DOM-143B1 — Levha grubu fark sayacı

`compareProjectQuoteRevisionStockSheetGroups` sonucu artık `groupCounts` alanında `addedGroupCount`, `removedGroupCount`, `changedGroupCount` ve `unchangedGroupCount` sayaçlarını döndürür.

- Sayaçlar iki doğrulanmış revizyondaki kararlı grup kimliklerinin birleşimi üzerinden, sıralı ve deterministik biçimde hesaplanır.
- Değişmeyen gruplar `groupChanges` listesine gereksiz kayıt olarak eklenmez; buna rağmen `unchangedGroupCount` içinde sayılır.
- Eklenen, kaldırılan ve değişen sayaçları listelenen fark kayıtlarıyla bire bir uzlaşır. Sonuç ve sayaç nesnesi deep-freeze ile değiştirilemez kalır.
- Sayaçlar yalnızca snapshot'ta doğrulanmış grupları sayar; eksik malzeme/Part/fiyat bilgisi tamamlanmış gibi tahmin edilmez.
- Bu, frontend ve JSON/CSV adapter'larından bağımsız domain sözleşmesidir. JSON karşılaştırma zarfı ve CSV grup satırları adapter sahibi entegrasyon/performance rolünün ayrı teslimatlarıdır; o dosyalara bu domain diliminde dokunulmaz.


Verification: code/test commit [511796f](https://github.com/Taylan789/MobilyaCAD/commit/511796f60b5274ee8cacf93a85f5ef1944f8df66), exact-SHA CI [#45352730741](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730741), QA [#45352730704](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730704) and Pages [#45352730829](https://github.com/Taylan789/MobilyaCAD/actions/runs/45352730829) succeeded. QA: 218/218 unit tests, 713/713 domain tests, strict domain type-check, lint 34 warnings/0 errors, production build and production dependency audit with 0 vulnerabilities. Test site: https://taylan789.github.io/MobilyaCAD/.


## DOM-143B2 — Levha grubu alan bazlı fark nedenleri

compareProjectQuoteRevisionStockSheetGroups artık her grup fark kaydında changedFields alanını döndürür.

- Eşleşen grup için alan anahtarları sabit sırayla raporlanır: sourcePartIds, sheetCount, pricePerSheetMinor, stockSheetCostMinor ve sourceReference.
- Malzeme veya normalize kalınlık değişimi aynı grup içinde alan farkı sayılmaz; kararlı grup kimliği değiştiğinden kaldırılan + eklenen grup olarak kalır.
- Eklenen ve kaldırılan gruplarda changedFields: [] kullanılır; karşılaştırılamayan bir alan değişikliği uydurulmaz.
- Kaynak Part kimlikleri snapshot doğrulamasında sıralandığından alan karşılaştırması giriş sırasından bağımsızdır. Eksik ve undefined kaynak referansı aynı yokluk değerine normalize edilir.
- Alan anahtarları ve sonuç iç içe dizileri deep-freeze ile değiştirilemez; bu alan domain API'sidir, JSON/CSV adapter çıktısı olarak sunulmaz.

Bu dilim yalnızca karşılaştırma nedenlerini açıklar. JSON/CSV adapter entegrasyonu, makine postprocessor'ı ve fiziksel üretim doğrulaması kapsam dışıdır.


## DOM-143C-domain — Tam revizyon karşılaştırma zarfında levha grubu desteği

`compareProjectQuoteRevisions`, iki revizyondan en az biri açık `stock-sheet-purchase` maliyet temeli kullandığında doğrulanmış `compareProjectQuoteRevisionStockSheetGroups` sonucunu `stockSheetGroupComparison` alanında taşır.

- Üst karşılaştırmanın para birimi, başlangıç/hedef genel toplamları, genel toplam farkı ve kategori farkları aynı doğrulanmış stok-grubu karşılaştırmasından alınır; kategori farkları genel toplam farkına tekrar uzlaştırılır.
- Mevcut `lineChanges` alanı korunur. Normal teklif satırları kendi kaynak kimlikleriyle karşılaştırılmaya devam eder; stok levha grupları sentetik maliyet satırına dönüştürülmez.
- Doğrulanmış boş teklif özeti (`status: empty`, sıfır kaynak ve `costSummary: null`) stok-temelli revizyonlarda boş satır farkı olarak kabul edilir. Bu durum yalnızca history validator tarafından kabul edilen boş snapshot için geçerlidir.
- Eski net-tüketim/legacy karşılaştırmalarının alan şekli değişmez; `stockSheetGroupComparison` yalnızca en az bir tarafta stok levha satın alma temeli olduğunda eklenir.
- Grup kimliği, para birimi, güvenli tam sayı aritmetiği, kategori/genel toplam veya grup maliyeti uzlaşmazsa tam karşılaştırma `blocked` döner ve kısmi zarf üretmez.
- JSON karşılaştırma dosyası ve CSV adaptörleri bu ek alanı henüz serialize etmez. Mevcut katı anahtar doğrulaması nedeniyle bu zarfı dışa aktarma girişimi fail-closed kalır; adapter schema/round-trip işi entegrasyon-performans sahibinin kapsamındadır.

Otomatik kabul: stok grubu değişimi ile aynı anda değişen hardware quote line farkının birlikte korunması; stok-only boş quote karşılaştırmasında sıfır sentetik line change; üst ve alt toplamların bire bir uzlaşması; deep-freeze ve input immutability. Fiziksel levha verimi, CNC makine çıktısı ve atölye uygunluğu bu domain testleriyle onaylanmış sayılmaz.


## DOM-144 — Cross-revision stock-sheet Part ownership

The domain stock-sheet comparison now exposes Part-level ownership transitions in addition to group-level cost and field deltas.

- `stockSheetPartCounts` reports unique stock-sheet source Part counts on both revisions plus added, removed, moved and unchanged counts.
- `stockSheetPartChanges` emits only added/removed/moved Part IDs in deterministic Part-ID order. A moved Part retains its identity and reports both `fromGroupId` and `toGroupId`; absent sides are `null`.
- Counts reconcile independently against the from/to unique Part sets: from = removed + moved + unchanged; to = added + moved + unchanged.
- Snapshot validation already rejects a Part assigned to multiple stock-sheet groups in one revision; the comparison rechecks that invariant before building ownership maps.
- A three-revision regression audits each revision and compares consecutive transitions, covering group moves, additions, removals, stable Parts, deterministic ordering, immutability and input preservation.

This is source-group ownership evidence only; it does not claim that the saved group IDs cover every current project Part. JSON/CSV comparison adapters remain specialist-owned and fail-closed until their schema and round-trip work is verified. No frontend behavior, machine-specific CNC output or physical workshop validation is implied.


## DOM-146 — Teklif revizyon zinciri import ve proje geri yükleme doğrulaması

- Standalone geçmiş import'u `parseProjectQuoteRevisionHistoryFile` üzerinden, proje JSON v2 geri yüklemesi ise `readProjectQuoteRevisionHistoryFromProjectFile` üzerinden aynı `validateProjectQuoteRevisionHistory` zincir doğrulamasını kullanır.
- Her revizyonun `previousRevisionId` alanı tam olarak önceki kaydın `revisionId` değerine eşit olmalıdır; sıra numarası, proje kimliği ve kronoloji de kesintisiz kalmalıdır.
- Maliyet snapshot'ındaki `lineSources[].costLineId` alanı aynı snapshot içindeki maliyet satırı kimliğiyle eşleşmelidir. Import ve restore sırasında bozuk kaynak bağlantısı veya kopuk önceki-revizyon bağlantısı kısmi geçmiş üretmeden `blocked` döndürür.
- Başarısız import hedef proje nesnesini değiştirmez; başarısız restore `history: null` döndürür. Bu kontroller teklif snapshot'ının kendi kaynak izini doğrular; kaynak Part'ların güncel 3D geometriyle veya fiziksel CNC operasyonlarıyla eşleştiğini kanıtlamaz.

## DOM-147 — JSON v2 proje append zarfı için derin kopya ve değişmezlik

- `appendProjectQuoteRevisionToProjectFile` başarılı sonuç üretmeden önce proje zarfının tamamını mevcut JSON-uyumluluk kurallarıyla derin kopyalar ve dondurur; yalnızca üst seviye nesneyi kopyalayıp iç içe `room`, `furniture`, `materials` veya özel metadata referanslarını paylaşmaz.
- Bilinmeyen ama geçerli JSON alanları korunur. Yeni `quoteRevisionHistory` aynı sonuç içindeki doğrulanmış, derin dondurulmuş geçmiş nesnesine bağlanır.
- Döngüsel veya JSON dışı değer içeren proje zarfı `blocked`, `project: null` ve `history: null` döndürür; kısmi proje üretilmez ve giriş nesnesi değiştirilmez.
- Kabul: nested object/array referansları girişten ayrıdır; çıktıdaki iç içe nesneler ve diziler frozen durumdadır; değişiklik girişe yayılmaz; geçersiz zarf fail-closed kalır.
- Bu değişiklik proje JSON v2 şemasını, mm/adet hesaplarını, teklif aritmetiğini, geometriyi, export adapter'larını veya CNC/makine uyumluluğunu değiştirmez. Derin kopya maliyeti proje zarfı boyutuyla doğrusal orantılıdır.


## DOM-148 — JSON v2 append zarfı descriptor sınırı

appendProjectQuoteRevisionToProjectFile yalnızca JSON olarak temsil edilebilen veri ağacını yeni immutable proje snapshot'ına alır.

- Düz kayıtlar hem Object.prototype hem de null prototype ile kabul edilir; çıktı kayıtları güvenli normal JSON nesneleridir.
- Own __proto__ alanı prototype değiştiricisi değil, korunması gereken sıradan bir veri anahtarıdır.
- Diziler yoğun olmalıdır; sparse index, accessor, symbol veya enumerable olmayan ek alan içeren dizi reddedilir.
- Nesnelerde accessor, symbol ve enumerable olmayan own alan reddedilir; getter çalıştırılarak değer okunmaz.
- Reddedilen append status: blocked, project: null, history: null döndürür; kaynak proje ve özel zarf referansları değiştirilmez.
- Bu sözleşme JSON şema sürümünü değiştirmez, alanları otomatik düzeltmez ve kısmi snapshot üretmez. Fiziksel üretim veya CNC uyumluluğu iddiası taşımaz.


## DOM-149 — JSON v2 proje zarfı kaynak sınırları

- appendProjectQuoteRevisionToProjectFile ve importProjectQuoteRevisionHistoryFileIntoProject yalnızca v2 proje zarfında tam JSON ağacını güvenli biçimde kopyalar; giriş zarfı 16 MiB UTF-8 JSON boyutunu veya 64 iç içe nesne/dizi seviyesini aşarsa işlem bloklanır.
- Boyut hesabı JSON string kaçışlarını, anahtarları, ayraçları ve UTF-8 çok baytlı karakterleri kapsar; JavaScript UTF-16 string.length ölçüsü kullanılmaz.
- Yeni revizyon eklendikten veya standalone geçmiş içe aktarıldıktan sonra oluşan son proje zarfı aynı limitlerle yeniden doğrulanır. Aşımda status: blocked, project: null, history: null döner; giriş proje nesnesi değişmez ve kısmi çıktı üretilmez.
- Standalone revizyon geçmişi JSON dosyasının 1 MiB sınırı ve geçmiş doğrulayıcısının 2.000 revizyon sınırı ayrıdır; proje zarfına 1 MiB sınırı uygulanmaz.
- JSON v1 legacy okuma, v2 şema alanları, ölçü/miktar/teklif hesapları ve CNC/adapter sözleşmeleri değişmez.


## DOM-150 — JSON v2 teklif geçmişi doğrudan okuma sınırları

- `readProjectQuoteRevisionHistoryFromProjectFile`, v2 geçmişini doğrulamadan önce tüm proje zarfına DOM-149 ile aynı 16 MiB UTF-8 JSON boyut ve 64 nesne/dizi derinliği sınırını uygular.
- Tam 16 MiB ve 64 seviye kabul edilir; bir byte veya bir seviye aşımı `blocked`, `projectId: null`, `history: null` ile sonuçlanır. Kaynak proje değiştirilmez ve kısmi geçmiş dönmez.
- Okuma yolu da JSON olmayan descriptor'ları (accessor, sparse array, symbol ve gizli own alanlar) reddeder; getter çalıştırmaz.
- JSON v1, `quoteRevisionHistory` alanı yoksa mevcut `legacy` sonucunu korur; v1 içine bu alan yazılmışsa mevcut fail-closed davranış sürer.
- `importProjectQuoteRevisionHistoryFileIntoProject` zaten hedef zarfı güvenli derin kopyalayıp aynı sınırları uygular ve birleştirilmiş sonucu yeniden denetler; ayrı bir restore API veya şema sürümü eklenmez.
- Bu sınır yalnızca teklif geçmişi uzantısının güvenli okuma/kopyalama maliyetini kapsar. Tam oda/mobilya/malzeme şema doğrulaması ana proje parser'ının sorumluluğundadır; CNC/makine uyumluluğu iddiası yoktur.


## DOM-151 — JSON v2 proje zarfı teklif geçmişi JSON round-trip

- İki revizyon içeren v2 proje zarfı gerçek JSON metnine serileştirilip yeniden parse edildiğinde quoteRevisionHistory aynı doğrulanmış snapshot ve previousRevisionId zinciriyle okunabilmelidir.
- Bilinmeyen top-level ve nested metadata, own __proto__ dahil, JSON veri alanı olarak korunur; normal object prototype değiştirilmez.
- Reparse edilmiş projeye üçüncü revizyon eklenmesi ve ikinci stringify/parse turu da geçmiş zincirini korumalıdır.
- JSON v1, geçmiş alanı yokken legacy okuma sonucunu korur; v1 içine quote-history alanı eklenmesi engellenir.
- Bu sözleşme yalnızca domain/production/projectQuoteRevisionProjectFile.ts teklif-geçmişi uzantısını doğrular. Tam oda/mobilya/malzeme şema doğrulaması veya editörün ana save/open parser'ı değildir.
- UI entegrasyon handoff'u: frontend/src/engine/projectFile.ts şu anda yalnızca JSON v1'i kabul eder ve bilinen alanlardan yeni sonuç nesnesi kurar; v2 quote history ve bilinmeyen üst seviye metadata uygulamanın kaydet/aç akışına henüz bağlı değildir. UI ajanı frontend/** sahibi olduğundan domain akışı bu dosyayı değiştirmez. INT-003 bu entegrasyon için ayrılmıştır.
- **Doğrulama:** implementation [748d9aa4](https://github.com/Taylan789/MobilyaCAD/commit/748d9aa4c2101d62fb137532b4d2408ec9193900), fixture correction [640dbf51](https://github.com/Taylan789/MobilyaCAD/commit/640dbf51c225b5595fa7c706901f4749bc8cc138); exact-SHA CI [#45457153776](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153776), QA [#45457153728](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153728), Pages [#45457153747](https://github.com/Taylan789/MobilyaCAD/actions/runs/45457153747) başarılı. QA 242 frontend + 735 domain test; strict TypeScript, lint 36 warnings/0 errors, production build and production audit 0 vulnerabilities.
- İlk QA denemesinde test fixture snapshot'ı empty üretti; fixture'a açık quote adjustment eklendi. Test silinmedi veya zayıflatılmadı.

## DOM-152 — JSON v2 zarf ayırt edici alanlarında getter güvenliği

- Teklif geçmişi uzantısının zarf incelemesi `format`, `formatVersion` ve v2 `projectId` alanlarını doğrudan property access ile okumaz; yalnızca own, enumerable data descriptor kabul edilir.
- Own accessor, inherited accessor, eksik veya enumerable olmayan discriminator alanı `blocked` döndürür. Getter çalıştırılmaz; read sonucu geçmiş içermez, append sonucu `project: null` ve `history: null` kalır.
- Normal JSON v1 legacy okuma ve normal JSON v2 history okuma/append davranışı korunur. Tam oda/mobilya/malzeme doğrulaması ana proje parser'ına aittir.
- Bu koruma domain envelope giriş sınırıdır; UI parser/save/open entegrasyonunun tamamlandığı anlamına gelmez. INT-003 UI sahipliğinde kalır.


## DOM-154 — Direct quote revision API input descriptor safety

The public domain APIs validate unknown JavaScript values. Before reading any field, the history validator, revision creator and append entry point now copy input through own enumerable data descriptors only.

- Own accessors, inherited/custom prototypes, symbol keys, non-enumerable properties, sparse/extended arrays, cycles, non-finite numbers and non-JSON values are rejected without invoking accessor getters.
- Copied object records use a null prototype, so an inherited getter on Object.prototype cannot supply a missing optional field during later validation.
- Optional own data properties whose value is undefined remain preserved for compatibility; ordinary JSON-parsed objects and previously validated immutable histories retain their accepted behavior.
- The copy is bounded to 64 total object/array levels, including the root. Project-v2 envelope byte limits and standalone history-file byte limits remain independently enforced by their existing entry points.
- This is domain API hardening, not a project-file schema migration or editor save/open integration. UI-owned INT-003 and its later DOM-153 editor round-trip remain separate.


### DOM-154 implementation clarification

The direct revision API input copy counts the root as level 1, matching the project-v2 envelope guard: 64 total object/array levels are accepted by the copy phase, and the 65th is blocked. The normalized revision object always carries its optional source-integrity marker as an own data property (including an own undefined value), preventing Object.prototype from supplying it through an inherited accessor.


### DOM-155 — Quote revision count preflight

`validateProjectQuoteRevisionHistory` inspects the own enumerable data descriptor for `revisions` and the array's own length descriptor before recursively copying revision payloads. Histories above the existing 2,000-revision limit are rejected before nested revision descriptors are traversed; accessor-backed `revisions` properties are never invoked. The existing post-copy schema/count validation remains as defense in depth. This is a count guard, not a byte-size replacement: project-v2 and standalone-file byte limits remain enforced by their existing entry points. Proxy reflection traps remain outside this guarantee.


## DOM-156 — Append-capacity preflight

`appendProjectQuoteRevision` now checks the own enumerable data descriptor for `revisions` and its array length before validating/copying the existing history or reading the incoming revision. If the existing count is already 2,000, the append is rejected immediately with a blocked result and no partial history. This prevents an impossible 2,001st append from traversing up to 2,000 nested snapshots and copying the incoming snapshot first.

The check is intentionally append-specific: `validateProjectQuoteRevisionHistory` still accepts a valid history containing exactly 2,000 revisions for reading/export. A history at that limit cannot accept another revision. Below-limit appends continue through the existing full validation and immutable-copy path. Accessor-backed history fields are not invoked; proxy reflection traps remain outside this guarantee.


**DOM-156 doğrulaması:** [CI #45510837681](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837681), [QA #45510837534](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837534) ve [Pages #45510837542](https://github.com/Taylan789/MobilyaCAD/actions/runs/45510837542) aynı commit `e4daf7fad89aa5ef15ee2f85f3f00e14ce42894e` için başarılıdır. QA 245 frontend + 741 domain testi, strict TypeScript, lint 36 uyarı/0 hata, production build ve production-only audit 0 bulgu verdi. `npm ci` tam bağımlılık ağacında ayrıca 4 orta seviye bulgu raporladı; bu turda bağımlılık yükseltmesi yapılmadı.


## DOM-157 — Project-v2 append capacity preflight

`appendProjectQuoteRevisionToProjectFile` now inspects the project's own enumerable data descriptor for `quoteRevisionHistory` and uses the shared append-capacity guard on its own `revisions` array length before cloning the full project envelope. If 2,000 revisions already exist, the append returns `blocked` before traversing nested revision entries, reading the incoming revision, or measuring/copying the potentially 16 MiB project envelope.

This is append-only preflight: the normal history validator continues to accept a valid 2,000-revision history for read/export, while a further append is rejected. Missing history and below-capacity histories continue through the existing immutable clone, schema validation and final 16 MiB/64-level resource checks. JSON v1 behavior is unchanged. Accessor-backed or non-enumerable project history fields fail closed without invoking getters; JavaScript Proxy reflection traps remain outside this guarantee.

The DOM-157 regression uses an envelope already over the 16 MiB limit together with a full sparse revision array whose first entry and incoming revision identifier are accessor-backed. The result must report the revision-cap blocker first, return no partial project/history, and leave both getter counters at zero.

## JSON v1 zarfı reflection hata sınırı — DOM-159

- Teklif geçmişi read, append ve standalone import API'leri legacy JSON v1 zarfında `quoteRevisionHistory` alanının own-property varlığını kontrol eder. Bu kontrol sırasında Proxy descriptor reflection trap'i hata fırlatırsa hata public API dışına sızdırılmaz; sonuç `blocked`, proje/geçmiş payload'ları ise null olur.
- Bu koruma Proxy trap'lerinin çalışmasını engellemez ve Proxy nesnelerini güvenilir JSON verisi olarak kabul etmez. Yalnızca v1 discriminator kontrolündeki reflection hatasını fail-closed sonuca dönüştürür.
- Normal v1 dosyaları `legacy` olarak okunmaya devam eder; v1 içinde `quoteRevisionHistory` bulunması yine blocked kalır. JSON v2, dosya şeması, mm/adet/maliyet hesapları ve CNC/adapter sözleşmeleri değişmez.


## DOM-160 — JSON v2 kenar bandı rulo girdilerinde güvenli zarf sınırı

- `readProjectEdgeBandingRollPricingFromProjectFile`, `format`, `formatVersion`, `projectId` ve `edgeBandingRollPricing` alanlarını own enumerable data descriptor üzerinden okur; own/inherited getter çalıştırmaz. JSON v1, bu uzantı için legacy/read-only kalır; v1 üzerinde uzantı varsa blocked döner.
- v2 yazımı tüm proje zarfını derin kopyalar ve dondurur. Yalnızca düz JSON nesneleri, dense diziler ve own enumerable data alanları kabul edilir; accessor, symbol, non-enumerable alan, özel prototype, sparse array, cycle, sonlu olmayan sayı ve JSON dışı değerler fail-closed reddedilir.
- Proje zarfı sınırı quote-history v2 ile tutarlıdır: en fazla 16 MiB UTF-8 ve 64 iç içe nesne/dizi seviyesi. Bilinmeyen JSON metadata ve own `__proto__` veri anahtarı kayıpsız korunur.
- Yazma sonucu kaynak projedeki nested oda/mobilya/malzeme/metadata nesneleriyle referans paylaşmaz; proje ve pricing snapshot derin biçimde immutable döner.
- Proxy reflection trap'lerinin çalıştırılmasını engellediği iddia edilmez; descriptor/ownKeys/prototype trap'leri hata fırlatırsa public read/write API'leri exception sızdırmadan blocked döner.
- Fiyat, rulo uzunluğu ve sabit ek pay kullanıcı girdisidir. Yüzde fire, rulo standardı, verim, makine veya fiziksel atölye onayı tahmin edilmez. Frontend kontrol ve indirme entegrasyonu UI sahibindedir.


## DOM-161 — Persisted JSON v2 edge-band roll pricing in quote snapshots

- `ProjectQuotePricingSnapshotInput.projectFile` may supply the actual project envelope to the quote snapshot domain API. It is accepted only together with the explicit `edgeBandingPricingMode: "roll"`; the mode is never inferred from the presence of saved roll data.
- The quote snapshot reads `edgeBandingRollPricing` through `readProjectEdgeBandingRollPricingFromProjectFile`. A malformed/blocked extension or legacy JSON v1 project blocks the complete snapshot; no partial quote or cost lines are returned.
- When the v2 extension is empty, its validated empty roll lists are passed to the existing quote calculator. If measured edge-band consumption needs roll definitions/prices, the quote remains incomplete rather than falling back to length pricing.
- Supplying `projectFile` together with explicit `edgeBandingRollSpecs` or `edgeBandingRollPriceTable` is rejected to avoid ambiguous pricing sources. Existing explicit-array callers remain backward compatible.
- The same resolved options are used with both the normal quote path and the material-cost-basis path. Roll count, roll length, Part IDs, furniture IDs and plan/price source references remain in the immutable quote snapshot.
- Frontend handoff: after INT-003 editor JSON v2 integration, pass the current project envelope and explicit roll mode; do not duplicate the persisted roll arrays in UI state. Length pricing remains an explicit independent mode. This API does not infer roll standards, prices, waste percentages or CNC operations.

## DOM-162 — Quote pricing snapshot request-envelope descriptor safety

- `createProjectQuotePricingSnapshot` copies the top-level request, catalog-version records and material-cost-basis record using own enumerable data descriptors before reading their fields. Copies, resolved roll options and the internal material-basis request use null prototypes, so inherited optional getters cannot supply a missing pricing mode or metadata value.
- Own accessors, symbol keys, non-enumerable properties and custom prototypes are rejected. Prototype/ownKeys/property-descriptor reflection failures return a `blocked` result with null quote/snapshot payloads; getter calls are not used to validate request metadata.
- Ordinary JSON objects and null-prototype records remain supported. Existing input keys, quote arithmetic, mm units, currency rules, JSON v1/v2 formats and explicit roll-vs-length selection do not change.
- Scope boundary: production reports, price tables, work-item arrays, roll arrays and stock-sheet reports remain validated by their respective downstream domain calculators; this slice does not claim to recursively sanitize every nested payload or suppress Proxy traps. It converts reflection failures encountered while inspecting the request/metadata records into fail-closed results.
- Automatic acceptance: own/inherited getter counters remain zero; prototype/ownKeys/descriptor trap failures do not escape; malformed metadata yields no partial quote/snapshot; ordinary and null-prototype requests retain the existing ready behavior.
- No frontend, adapter, CNC/postprocessor, price source, machine standard or physical workshop behavior is introduced.


## DOM-163 — Quote snapshot levha satın alma raporu için güvenli nested input

- createProjectQuotePricingSnapshot, materialCostBasis.basis açıkça stock-sheet-purchase olduğunda raporu herhangi bir maliyet hesaplayıcısına vermeden önce own enumerable data descriptor üzerinden kopyalar.
- Rapor ve tüm nested nesne/dizilerde accessor, inherited alan, symbol, non-enumerable alan, özel prototype, sparse/ek özellikli dizi, cycle, JSON dışı değer ve reflection trap hatası fail-closed reddedilir; getter çalıştırılmaz.
- Kopya null-prototype nesneler ve yoğun dizilerden oluşur. Sınırlar root dahil 64 seviye, 250.000 ziyaret edilen değer ve 16 MiB UTF-8 payload'dır. Bu sınırlar yalnızca stock-sheet quote snapshot rapor girdisine uygulanır; proje JSON v1/v2 şeması değiştirilmez.
- Aynı güvenli kopya hem material-cost-basis hesaplayıcısına hem snapshot grup/provenance çıkarımına gider; ikinci kez ham kullanıcı nesnesi okunmaz.
- Proxy trap'lerinin çalıştırılmasını engellediği iddia edilmez; hata fırlatan reflection trap'leri public snapshot API dışına exception sızdırmadan blocked döner.
- Net-consumption akışı, quote aritmetiği, mm/adet/para birimi kuralları ve mevcut geçerli stock-sheet snapshot çıktısı değişmez. CNC, makine veya fiziksel üretim doğrulaması değildir.
## DOM-164 — Quote adjustment and public quote-request input safety

- `calculateProjectCostSummary` snapshots its line array before reading line fields. The array must be a standard dense array with no extra own properties and at most 10,000 entries. Each line must be a plain or null-prototype record containing only allowed own enumerable data properties.
- Accessors, inherited values, symbol keys, non-enumerable/unknown fields, custom prototypes, sparse or extended arrays, oversized lists and reflection-trap failures are rejected. Accessor getters are not invoked; invalid input throws a controlled validation error and no partial cost summary is returned.
- `calculateProjectQuoteSummary` checks quote-specific waste/profit category and mandatory source reference only on normalized cost-summary lines. The caller's original adjustment objects are never read again.
- Quote option envelopes and `calculateProjectQuoteWithMaterialCostBasis` top-level request envelopes use the same own-data-descriptor boundary and accept ordinary JSON and null-prototype records. Own/inherited getters and reflection failures fail closed.
- Nested roll-spec/roll-price arrays and production/price/work-item source payloads remain delegated to their domain validators; this slice does not claim to deep-clone every nested quote source. Explicit prices, currencies, mm units, six-decimal quantity precision and half-up minor-unit rounding are unchanged.
- Acceptance: direct cost-summary, direct quote, material-basis quote and quote-snapshot paths reject accessor/proxy inputs without getter calls or partial totals; normal JSON/null-prototype requests retain their previous arithmetic and provenance.
- This is quote-domain input hardening only; no frontend, adapter, CNC/postprocessor, machine standard or physical-production behavior is introduced.


## 2.11 Teklifte kenar bandı rulo girdilerinin güven sınırı

Kaynaklar: `domain/production/projectEdgeBandingRollPlan.ts`, `projectEdgeBandingRollCostSummary.ts` ve ortak `descriptorSafeInput.ts` yardımcı modülü.

- `calculateProjectQuoteSummary` içindeki açık `edgeBandingPricingMode: "roll"` akışı, rulo ölçü ve fiyat tablolarını iki ayrı public domain sınırından geçirir: rulo planı ve rulo maliyet özeti.
- Her iki sınır da en fazla 1.000 satırlık standart, yoğun ve ek özelliksiz dizileri; yalnızca plain veya null-prototype satır nesnelerini kabul eder. Satır alanları ilgili API'nin whitelist'iyle sınırlıdır.
- Dizi indeksleri ve satır alanları `Object.getOwnPropertyDescriptor` üzerinden okunur. Accessor, inherited/custom prototype, symbol/unknown/non-enumerable alan, sparse/extended array veya Proxy reflection hatası getter çalıştırmadan blocked sonuç üretir.
- Rulo ölçüsü 0.1 mm hassasiyetini, açık kullanıcı ek payını ve pozitif uzunluğu korur. Fiyat yalnızca kullanıcının sağladığı güvenli minor-unit tutarı ve üç büyük harfli para birimi koduyla hesaplanır.
- Geçersiz nested girdi kısmi teklif, rulo planı veya maliyet toplamı üretmez. Bu doğrulama fire yüzdesi, fiyat, rulo standardı, CNC koordinatı veya fiziksel üretim uygunluğu tahmin etmez.
- JSON v2 proje zarfındaki kayıtlı rulo uzantısı kendi descriptor-safe okuyucusunu kullanmaya devam eder; normal ve null-prototype JSON kayıtları geriye uyumludur.


## Public quote source input boundary (DOM-166)

`createProjectQuotePricingSnapshot` copies `productionReport`, `consumptionPriceTable`, `workItems` and `tariffTable` before passing them to quote calculators. The four sources share a bounded JSON-copy budget: maximum depth 64, 250,000 visited nodes and 16 MiB serialized UTF-8. Only finite JSON-like primitives, plain/null-prototype records with own enumerable data properties, and dense standard arrays are accepted. Accessors, inherited-only values, symbols, custom prototypes, sparse/extended arrays, cycles and Proxy reflection failures block the entire quote before any partial monetary summary or snapshot is exposed. The downstream domain validators remain responsible for business rules, units, currencies, price/tariff matching and catalog semantics; this boundary does not infer prices or machine standards.

## DOM-167 — Saved JSON v2 / direct roll quote parity

The quote snapshot boundary accepts exactly one roll-pricing source: either direct edgeBandingRollSpecs + edgeBandingRollPriceTable inputs, or the saved edgeBandingRollPricing extension inside a validated MobilyaCAD JSON v2 project envelope. With explicit edgeBandingPricingMode: "roll", both paths must normalize to the same quote result.

Regression coverage compares the complete quoteSummary and immutable snapshot for direct versus saved inputs in both the line-only quote path and the net-consumption material-cost-basis path. Equality covers cost totals, roll quantities and line amounts, Part/furniture source IDs, roll-plan source references and price-list source references. Prices, currency, roll length and allowance remain explicit user inputs; no roll standard, price or CNC operation is inferred. The editor's persistent JSON v2 save/open wiring remains UI-owned and is not claimed by this domain test.



## DOM-168 — Saved/direct roll parity with stock-sheet-purchase basis

With explicit `edgeBandingPricingMode: "roll"`, the quote snapshot API must produce the same immutable result when roll specifications/prices are supplied directly or read from the validated JSON v2 `edgeBandingRollPricing` envelope, including when the selected panel-material basis is `stock-sheet-purchase`.

The stock-sheet purchase amount remains derived only from the validated nesting purchase report and is preserved in `materialCostBasis.stockSheetGroups` with stable group identity, normalized millimetre thickness, source Part IDs, sheet count, explicit per-sheet price, group cost, currency and price-source reference. Panel net-consumption lines remain excluded from the base quote in this mode. The edge-band roll remains an independent quote line whose Part/furniture IDs, roll count, purchased length and plan/price references are preserved. The combined material and grand totals reconcile the stock-sheet panel cost plus the edge-band roll cost without adding a synthetic panel line or double-counting either source.

The regression compares the complete `quoteSummary` and v2 snapshot for direct and saved inputs, then independently checks stock-group Part/cost coverage and roll-line provenance. Because the roll line remains a `production-consumption` source, the quote still requires explicit dated `consumptionPriceList` identity/version metadata even though panel purchase cost comes from the stock-sheet report; this metadata is not a substitute for, or inference of, a roll price. This is a domain snapshot contract only: it does not complete the UI-owned editor save/open integration, infer prices or roll standards, or validate physical workshop/CNC output.


## DOM-169 — Stock-sheet + roll + labor/operation + quote-adjustment reconciliation

The stock-sheet-purchase quote path must keep the purchased panel-sheet amount separate from line-level quote costs while still combining explicit edge-band roll, labor, operation, waste and profit inputs into one category/grand-total snapshot. Direct roll arrays and the saved JSON v2 roll-pricing envelope must produce identical quote and immutable snapshot values when all other user inputs are equal.

The regression independently reconciles the line-only quote totals and source mappings: labor and operation lines retain their tariff IDs and original quantities; quote adjustments retain their waste / profit categories and explicit source references; the roll line retains its Part/furniture IDs, roll count, purchased millimetres and plan/price references. A half-minor-unit operation fixture verifies the existing half-up rounding rule. The stock-sheet group costs sum to the panel purchase amount, which is added once to the material category and grand total without creating a duplicate panel consumption line.

All prices, currencies, durations, tariffs and adjustments in the test are explicit synthetic fixture inputs, not defaults or workshop price recommendations. The dated consumption/tariff catalogue metadata remains mandatory where source types require it. This contract does not complete the UI-owned JSON v2 editor save/open flow and does not certify physical production, CNC coordinates or machine output.


## DOM-170 — v2 stock-sheet basis through revision persistence

The domain persistence path must preserve a schema-version-2 quote pricing snapshot when it is appended to a project JSON v2 envelope, serialized as a standalone quote-history file, imported into an empty project with the same `projectId`, restored through project JSON stringify/parse, and followed by another append.

The regression verifies that the selected `stock-sheet-purchase` basis, stock-sheet group identity and Part/source references, panel/edge-band/material category totals, grand total, and line-level quote provenance survive every boundary. The base quote's waste/profit lines keep their original category and explicit `sourceReference`; their `costLineId` mapping remains aligned with the cost lines. A subsequent revision keeps the ordered `previousRevisionId` chain and remains comparable/auditable without synthesizing stock-sheet cost lines.

The test uses explicit synthetic fixture amounts only. It does not infer supplier prices, currencies, yield, CNC operations or physical production standards. JSON v1 legacy history behavior remains unchanged. This domain regression does not claim the UI-owned editor startup/save/open wiring is complete; INT-003 remains with the frontend owner.


## DOM-171 — Stock-sheet snapshot Part-coverage manifest

New stock-sheet-purchase material-cost-basis snapshots use inner `schemaVersion: 2` and persist a sorted, unique `sourcePartIds` manifest equal to the union of every group's `sourcePartIds`. The revision validator checks the manifest against the group union in addition to the existing group-cost, currency, category-total and grand-total reconciliation. A one-sided edit to a group Part list or the aggregate category totals therefore blocks revision creation, standalone history serialization/import and JSON v2 project restore without returning a partial history/project.

Net-consumption snapshots continue to use material-cost-basis schema v1. Previously saved stock-sheet material-basis schema v1 revisions remain readable for backward compatibility; they do not contain the new aggregate manifest and therefore retain only their existing per-group validation. The manifest is an internal consistency check, not a cryptographic signature: coordinated edits to both the group list and manifest cannot establish authenticity without a separately trusted signature or external source record. This contract does not certify physical stock usage, workshop yield or CNC output.


## DOM-172 — Stock-sheet v2 Part-manifest coverage

`calculateProjectQuoteRevisionSourceMapAudit` now reports the material-cost basis kind and schema version for every revision, plus the stock-sheet manifest version and Part count when present. Aggregate counters distinguish all stock-sheet purchase revisions, schema-v2 manifest revisions, legacy schema-v1 stock-sheet revisions, manifest Part references across revisions and project-wide unique manifest Part IDs.

`compareProjectQuoteRevisionStockSheetGroups` and `compareProjectQuoteRevisionSourceMaps` expose `stockSheetManifestComparison`. Exact added/removed Part IDs are calculated only when both revisions contain a validated schema-v2 manifest. If either side is legacy schema v1 or has no stock-sheet purchase basis, the comparison reports which side lacks manifest coverage and returns null counts/changes; it does not infer a manifest or fabricate additions/removals from legacy group data.

The output is additive to the existing domain result schema. Existing group-level Part ownership comparisons remain available for legacy snapshots. No JSON/CSV comparison adapter, frontend, CNC postprocessor or machine output was changed; adapter serialization remains with the designated Integration/Performance owner and requires its own versioned round-trip work.


## DOM-173 — Cross-revision stock-sheet manifest audit reconciliation

The source-map audit distinguishes two different project-history measures: manifest Part references are additive across schema-v2 stock-sheet revisions, while project-wide unique manifest Part IDs are deduplicated across those revisions. Each revision's unique count remains local to that revision. Legacy schema-v1 stock-sheet groups continue to contribute to the existing stock-sheet group/Part audit, but never to schema-v2 manifest reference or unique-ID totals; revisions without a stock-sheet purchase basis contribute to neither measure.

The regression covers two v2 revisions with one shared Part ID, a legacy v1 stock-sheet revision, and a revision with no stock-sheet basis. It reconciles per-revision and project totals, verifies that legacy group Part IDs do not leak into manifest totals, checks the downstream source-integrity audit, and confirms that paired cost/source-line reordering does not change the aggregate audit. This is audit-only behavior: it does not alter pricing, Part geometry, JSON/CSV adapters, frontend wiring, CNC operations or physical production claims.


## DOM-174 — Non-adjacent stock-sheet manifest comparison reconciliation

The existing revision comparison APIs accept any later revision pair, not only adjacent revisions. The regression now checks every non-adjacent pair in a six-revision history containing schema-v2 stock-sheet manifests, legacy schema-v1 stock-sheet purchase snapshots, and a revision without a stock-sheet basis.

- compareProjectQuoteRevisionStockSheetGroups, compareProjectQuoteRevisions and compareProjectQuoteRevisionSourceMaps must expose the same manifest comparison for each pair (the full quote comparison carries it under stockSheetGroupComparison).
- Each comparison endpoint's from/to coverage must exactly match the corresponding source-map audit revision: basis, material-cost-basis schema version, manifest version and Part count.
- For v2→v2 pairs, from/to Part counts, added/removed/unchanged counts and deterministic Part-ID changes reconcile with the two validated manifests and per-revision audit counters. Any pair with a legacy/no-basis side explicitly reports unavailable coverage and keeps counts/changes null; no legacy Part delta is inferred.
- The six-revision fixture checks all 10 non-adjacent pairs, project totals (3 v2 revisions, 2 legacy revisions, 6 manifest references, 4 project-wide unique manifest Part IDs), deep-freeze and input immutability.
- This is domain comparison/audit regression coverage only. JSON/CSV adapters remain specialist-owned; UI editor wiring, physical stock usage, CNC output and workshop certification are not implied.


## DOM-175 — Immutable append sonrası mixed manifest uzlaştırması

Kaynak test: \`domain/production/projectQuoteRevision.test.mjs\`.

- Beş kayıtlı geçmişe sırasıyla manifest v2, legacy v1, manifest v2, legacy v1 ve manifest v2 revizyonları eklenir; \`appendProjectQuoteRevision\` ile önce bir manifest v2, ardından levha maliyet temeli olmayan bir strict revizyon eklenir.
- Her append yeni immutable geçmiş üretir; önceki geçmiş ve ilk append sonucu sonraki append sırasında değişmez. Yeni sıra numarası ve \`previousRevisionId\` yalnızca doğrulanmış zincirden türetilir; yeni kayıt \`sourceIntegrityVersion: 1\` taşır.
- Son geçmişin proje geneli audit toplamları 6 levha satın alma revizyonu, 4 manifest v2, 2 legacy, 8 manifest Part referansı / 5 benzersiz manifest Part kimliği ve tüm levha gruplarında 10 referans / 7 benzersiz Part kimliği olarak uzlaştırılır. Strict/legacy kaynak bütünlüğü denetimi 2 strict + 5 legacy revizyonu korur.
- Manifest v2 ↔ v2, legacy v1 ↔ v2, v2 ↔ no-basis ve legacy ↔ no-basis çiftlerinde grup karşılaştırması, tam maliyet karşılaştırması ve kaynak haritası karşılaştırması aynı manifest kapsam sonucunu verir. Legacy veya no-basis tarafta Part listesi yoksa eklenen/çıkarılan Part uydurulmaz.
- Yinelenen revisionId ile yapılan geçersiz append \`blocked\` + \`history: null\` döndürür; mevcut geçmişte kısmi değişiklik oluşmaz.
- Bu test domain append/audit davranışını doğrular; kalıcı depolama transaction'ı, UI entegrasyonu, proje JSON v2 editör akışı veya fiziksel CNC doğrulaması iddia etmez. JSON v2 save/open entegrasyonu ayrı UI sahibi INT-003 kapsamındadır.


## DOM-176 — Standalone teklif revizyon geçmişi JSON dosyası

Kaynak: `domain/production/projectQuoteRevisionFile.ts`.

- `serializeProjectQuoteRevisionHistoryFile(history)` önce tüm geçmişi `validateProjectQuoteRevisionHistory` ile doğrular; yalnızca geçerli ve tam geçmişi `fileType: "mobilyacad-quote-revision-history"`, `schemaVersion: 1` ve `history` alanlarından oluşan standalone JSON zarfına yazar.
- `parseProjectQuoteRevisionHistoryFile(json)` metin olmayan girdiyi, bozuk JSON'u, yanlış dosya türünü, bilinmeyen zarf alanlarını, desteklenmeyen sürümü ve geçersiz revizyon zincirini `blocked` + `history: null` ile reddeder. Dosya boyutu UTF-8 byte olarak en fazla 1 MiB'dir; serializer ve parser aynı sınırı uygular.
- Başarılı parse sonucu domain validator tarafından yeniden doğrulanmış, immutable geçmiş döndürür. `appendProjectQuoteRevision` parse edilmiş bu geçmiş üzerinde güvenle kullanılabilir; sıra numarası ve `previousRevisionId` doğrulanmış son revizyondan türetilir.
- Legacy revizyonlarda bulunmayan `sourceIntegrityVersion` alanı import sırasında uydurulmaz. Yeni append edilen revizyonlar `sourceIntegrityVersion: 1` taşır. Material-basis schema v1, manifest-v2 ve basis bulunmayan snapshot'lar kendi açık kapsamlarıyla korunur.
- DOM-176 regresyonu, beş karışık revizyonu standalone JSON üzerinden round-trip eder, parse sonrası iki revizyon ekler, son geçmişi yeniden round-trip eder ve source-map/source-integrity audit ile beş non-adjacent comparison sonucunu uzlaştırır.
- Bu domain API'si tek başına frontend editörünün startup/new/save/open akışına bağlı değildir. UI-owned INT-003 envelope state entegrasyonu ve DOM-153 gerçek editör save/reopen doğrulaması ayrı kabul kapılarıdır.


## DOM-177 — Mixed standalone history import into a JSON v2 project

- The regression imports a seven-revision standalone history into an empty MobilyaCAD project-v2 envelope with the same stable projectId. The source contains manifest-v2, legacy material-cost-basis-v1 and no-basis snapshots; the first five revisions retain the absent legacy source-integrity marker, while the final two carry strict marker v1.
- Import is atomic and non-mutating: the empty target remains unchanged, the imported project identity and seven-revision order/previousRevisionId chain are preserved, and the project envelope is deeply immutable.
- JSON stringify/parse followed by project-history restore must reproduce the exact source-map and source-integrity audits. Expected source-map totals: 6 stock-sheet purchase revisions, 4 manifest-v2, 2 legacy, 8 manifest Part references / 5 unique manifest Parts, and 10 total stock-sheet Part references / 7 unique Parts. Source-integrity totals: 2 strict + 5 legacy.
- Manifest availability remains explicit across five representative pairs: v2→v2 comparable; legacy→v2 from-unavailable; v2→no-basis to-unavailable; legacy→no-basis both-unavailable; v2→no-basis to-unavailable. Group, full-quote and source-map comparison APIs must agree with the audit coverage.
- After restore, a strict no-basis eighth revision is appended, the project is stringified/parsed again, and the standalone history is re-exported and parsed without changing the seven imported revisions or their audit totals. The final integrity audit is 3 strict + 5 legacy.
- This is domain regression coverage for the existing project-envelope API. It does not complete the UI-owned editor startup/new/save/open integration, JSON/CSV adapter work, CNC output, or physical workshop validation.


## DOM-178 — Safe project-envelope metadata preservation during standalone import

- The standalone-history import path preserves unrelated top-level and nested JSON v2 project metadata while adding the validated quoteRevisionHistory extension. Own enumerable __proto__ properties are treated as JSON data, not as prototype mutations, and remain present after import plus JSON stringify/parse and project-history restore.
- The regression checks the root and nested own-property descriptors, verifies that their prototypes remain Object.prototype, and confirms that no prototype pollution occurs. The original target project remains unchanged.
- Nested own accessors and Proxy reflection failures must return blocked with project: null and history: null; accessors are never invoked and no partial history is written.
- The existing envelope clone limits remain explicit: at most 16 MiB UTF-8 and 64 nested object/array levels. The import regression checks that both over-limit cases fail closed without mutating the target.
- This slice adds end-to-end domain contract coverage for the existing descriptor-safe clone/import implementation; it does not introduce a new project format or complete UI editor startup/new/save/open integration, JSON/CSV adapter round-trip, CNC output or physical workshop validation.



## DOM-179 — Restored project envelope and immutable quote-history append

- User flow: import a standalone quote-revision history into an empty JSON v2 project, persist it through JSON stringify/parse, reopen the restored envelope, append the next revision, save/reopen again and export the resulting history.
- Acceptance: unrelated top-level/nested metadata and own `__proto__` JSON data keys remain own enumerable data properties through import, restore and append; object prototypes remain unchanged; the original target/restored input is not mutated; the appended revision sequence and previous-revision link are valid; project-history read and standalone JSON export/parser return the same two-revision history.
- This is a domain contract regression, not editor startup/new/save/open integration. UI-owned INT-003 remains separate; no frontend or CSV adapter file is changed.

## DOM-180 — Inclusive JSON v2 project-envelope resource boundaries

- The project envelope depth budget counts the root object as level 1. Exactly 64 total object/array levels are accepted; level 65 is blocked.
- The 16 MiB budget is measured in serialized UTF-8 JSON bytes, not JavaScript UTF-16 code units. Boundary regressions use multi-byte UTF-8 text and compare against Buffer.byteLength(JSON.stringify(project), "utf8").
- readProjectQuoteRevisionHistoryFromProjectFile accepts exactly 16 MiB and blocks at 16 MiB + 1 byte. appendProjectQuoteRevisionToProjectFile and importProjectQuoteRevisionHistoryFileIntoProject are checked against the final envelope after adding the history extension: an exactly 16 MiB result is accepted, while a final result one byte larger returns blocked, project: null, and history: null.
- The same exact-depth / depth-plus-one checks cover read, append and standalone import. Blocked append/import leave their input envelopes unchanged and do not add a partial quoteRevisionHistory property.
- These are domain boundary regressions for the existing JSON v2 extension; no new schema version, frontend wiring, adapter round-trip, CNC output or physical production validation is implied.

## DOM-181 — Escaped JSON string byte accounting

- The existing project-envelope resource budget measures the serialized JSON representation in UTF-8 bytes. The boundary fixture includes U+0000 and U+001F control characters (escaped as \u0000 / \u001f), LF/TAB short escapes, lone high and low surrogates (well-formed JSON.stringify escapes as \ud800 / \udc00), and a valid astral character (four UTF-8 bytes).
- The regression uses Buffer.byteLength(JSON.stringify(project), "utf8") as the byte-count oracle. Read, append and standalone import accept a final envelope of exactly 16 MiB and block a final envelope at 16 MiB + 1 byte.
- Append/import overflow is tested while the input envelope itself remains below 16 MiB; blocked results contain no project/history payload, do not add a partial quoteRevisionHistory field, and do not mutate the input.
- This is test-only evidence for the existing serializer contract. No production source/API, schema version, frontend wiring, adapter round-trip, CNC output or physical production validation is changed or claimed.


## DOM-183 — Explicit bookshelf compartment shelves

- The optional `shelves` array adds individually positioned bookshelf shelves without changing legacy `profile.shelfCount` requests. Omitted or empty `shelves` retains the existing behavior.
- Each shelf records a stable ID, left/right cavity offsets, bottom-face elevation, front offset, depth, thickness, catalog material ID, four edge-band flags and grain direction. Dimensions are normalized to 0.1 mm before geometry checks.
- A custom-shelf request must set `profile.shelfCount` to zero; the engine does not silently mix counted full-width shelves with explicit shelf geometry.
- Every shelf must fit inside the calculated inner width, height and depth, use a catalog-supported thickness, avoid every full-height divider interval, and avoid 3D volume overlap with other shelves. Touching faces are allowed.
- Each accepted shelf becomes a quantity-one Part with its measured span/depth, material identity, edge-band flags and placement metadata. The existing project Part aggregator and material-consumption summary consume these Parts without a new export or CNC claim.
- This contract describes geometric placement and material accounting only. It does not infer shelf supports, fasteners, load capacity, drilling coordinates or machine-specific operations; workshop and physical-load validation remain human responsibilities.


## DOM-184 — Manufacturer-referenced bookshelf shelf-support BOM

- Each explicit shelves[] row may optionally contain supportHardware[]. Every row requires a stable local ID, exact user-supplied manufacturer catalogue hardwareId, catalogue name, positive finite quantity, explicit unit and non-empty sourceReference (catalogue URL, document/page or part-number reference).
- The engine preserves the supplied quantity and unit verbatim. It does not derive support count from shelf width/depth, select a fitting, convert units, infer a manufacturer, or generate screw, drilling, mounting or load values.
- A nested row is linked to exactly the shelf Part that contains it. Its project BOM ID is deterministically scoped by furniture ID, shelf ID and local BOM row ID; sourcePartIds contains that exact generated shelf Part ID. The shared project hardware validator and calculateProjectHardwareBomTrace then validate and expose the same provenance.
- The source reference is recorded as user-supplied catalogue evidence; the application does not fetch or certify a manufacturer's catalogue. Unknown/empty references and invalid quantities fail closed. Omitted or empty supportHardware preserves the existing bookshelf result.
- Any resulting hardwareItems still blocks project JSON v1/CSV export until the separately owned adapters preserve the complete BOM row and Part provenance. No frontend files or adapter code are changed by this domain slice.
- Physical shelf-support selection, screw/fastener compatibility, mounting geometry, drilling coordinates, load rating and workshop validation remain human/manufacturer responsibilities.


## DOM-185 — Shelf-support hardware price provenance in quote snapshots

- A ready hardware cost line keeps two separate evidence channels: `hardwareSourceReferences` are the manufacturer/catalogue references supplied with the shelf BOM row; the user-supplied hardware price-table reference remains on the exact `ProjectCostLine.sourceReference`.
- The existing quote-summary cost line already carries that `sourceReference`; immutable quote revisions and revision comparisons copy it to `ProjectQuoteRevisionCostLineSnapshot.sourceReference`. This is intentionally separate from the BOM source map and from `ProjectQuoteLineSource.priceSourceReference`, which remains the existing roll-purchase metadata field.
- No hardware price, currency, unit conversion or source reference is inferred. If the explicit hardware price is missing, the quote remains incomplete and no quote snapshot or partial source map is returned. A hardware price row without a source reference remains compatible with the existing optional price-table contract.
- Existing quote-summary JSON/CSV, standalone revision-history JSON and revision-comparison CSV already preserve the cost-line `sourceReference`; no new source-map property, schema version or adapter implementation change is introduced.
- Regression coverage uses a real bookshelf shelf-support BOM row linked to its exact generated shelf Part, distinguishes manufacturer BOM evidence from price-list evidence, checks price-source-only revision comparison and CSV round-trip without a monetary delta, validates standalone revision-history JSON round-trip and verifies missing-price no-snapshot behavior.
- This is a quote/audit contract only. It does not certify supplier prices, manufacturer catalogue authenticity, fitting compatibility, mounting, drilling, load capacity or physical workshop safety.


## Material ve kenar bandı fiyat kaynağı revizyon karşılaştırması — DOM-187

- Malzeme tüketim satırının kullanıcı girdili fiyat kaynağı `ProjectCostLine.sourceReference` alanında korunur; revizyon source-map audit ve comparison bu alanı maliyet satırı kimliğiyle eşleştirir.
- Kenar bandı rulo satırında fiyat listesi referansı `ProjectCostLine.sourceReference` ve `ProjectQuoteLineSource.priceSourceReference` alanlarında taşınır. Kesim/rulo planının `planSourceReference` alanı ayrı kalır ve fiyat listesi revizyonuyla değişmez.
- Yalnızca fiyat kaynağı değiştiğinde source-map comparison birer material ve edge-banding provenance değişikliği raporlar; satır ekleme/silme, Part/furniture kimliği değişimi veya kısmi geçmiş üretmez.
- Bu karşılaştırma fiyatı yeniden hesaplamaz, birim/para birimi dönüştürmez ve fiyatın üretici tarafından doğrulandığını iddia etmez. Miktar, birim, currencyCode, unitPriceMinor, lineTotalMinor ve toplamlar mevcut snapshot değerlerinde kalır.
- Kaynak referansları kullanıcı girdisidir; fiziksel rulo ölçüsü, bant uyumluluğu, uygulama toleransı ve atölye standardı ayrıca doğrulanmalıdır. CNC/makine çıktısı bu sözleşmenin kapsamında değildir.


## DOM-188 — Stock-sheet purchase price-source provenance comparison

- The revision source-map audit exposes each stock-sheet purchase group's stable groupId, material/thickness identity, Part references and optional user-supplied sourceReference; stock-sheet purchase groups remain separate from quote cost lines.
- compareProjectQuoteRevisionSourceMaps now includes stockSheetGroupProvenanceComparison. It matches groups by stable groupId and reports added, removed or changed provenance, with changed fields limited to sourcePartIds and sourceReference. Price, quantity, sheet count, currency and monetary totals remain the responsibility of the existing stock-sheet group / quote comparison APIs.
- A price-source-only change is represented as one changed group with changedFields containing only sourceReference; the v2 aggregate Part-manifest comparison remains independently available and unchanged when Part membership is unchanged.
- No FX conversion, price inference, catalogue verification or production-machine data is performed. Legacy v1 snapshots retain group-level Part provenance, while aggregate manifest comparison remains explicitly unavailable unless both revisions carry schema v2.
- Physical sheet yield, saw kerf, nesting quality, supplier price authenticity and CNC/workshop suitability remain outside this domain contract and require separately supplied standards or human validation.

## DOM-189 — Standalone revision-history JSON stock-sheet provenance round-trip

The standalone quote-revision history file remains the existing v1 envelope; no schema or adapter format change is required. A validated stock-sheet purchase group's optional `sourceReference` must survive serialize → parse → restore exactly. After restore, source-map audit, source-integrity audit, source-map comparison and stock-sheet group comparison must equal their pre-export results.

The regression uses two schema-v2 stock-sheet snapshots that differ only in the user-supplied price-source reference. The restored comparison must report exactly one changed group with `changedFields: ["sourceReference"]`; the aggregate Part manifest remains comparable with no Part additions/removals, TRY currency and all material/group/grand totals remain unchanged, and the original history is not mutated. This proves provenance persistence only; it does not validate supplier authenticity, physical sheet yield, CNC output or workshop production.

## DOM-190 — Legacy stock-sheet v1 optional price provenance

Legacy quote revisions may contain a stock-sheet purchase material-cost-basis v1 group without the optional `sourceReference`. The standalone revision-history JSON v1 serializer/parser must preserve that absence exactly: do not add `null`, an empty string, a placeholder, or a guessed supplier reference. The restored group remains schema v1, and its source-map audit must report zero stock-sheet price-source references. If both compared revisions omit the field, provenance comparison reports the group as unchanged rather than inventing a source change.

This is a backward-compatibility and provenance-preservation contract only. It does not certify supplier identity, sheet yield, kerf, nesting, CNC compatibility, or physical workshop suitability.

## DOM-191 — Legacy v1 stock-sheet provenance transition

A legacy revision may have a schema-v1 stock-sheet purchase group with no sourceReference, while a later revision has an explicit user-supplied price-source reference for the same stable group. The old group must remain property-absent; the later value is reported as new provenance, not as evidence about the historical supplier.

The source-map audit reports zero stock-sheet price-source references on the legacy revision and one on the later revision. Source-map provenance comparison reports exactly one changed group with changedFields containing only sourceReference; the from snapshot must not own a sourceReference property. The stock-sheet group comparison may reconcile existing group-level Part IDs and costs, but the aggregate manifest comparison remains both-unavailable with null counts and changes because neither schema-v1 basis carries the schema-v2 aggregate Part manifest. Group-level IDs must never be promoted to an aggregate manifest.

The standalone revision-history JSON v1 round-trip preserves the missing legacy property and the later explicit value. When no other pricing input changes, stock-sheet cost, sheet count, TRY currency, category totals and grand total remain unchanged. No supplier, price, currency conversion, sheet yield, kerf, nesting or CNC data is inferred or certified.


## DOM-192 — Legacy stock-sheet provenance transition after immutable append

A validated legacy history may end with a schema-v1 stock-sheet purchase group that has no own `sourceReference` property. When `appendProjectQuoteRevision` adds a later revision carrying an explicit user-supplied source for the same group, the append must not rewrite or backfill the prior revision. The previous revision remains legacy (`sourceIntegrityVersion` absent) and the appended revision receives the existing strict marker (`sourceIntegrityVersion: 1`); both pricing snapshots may retain material-cost-basis schema v1.

The source-map audit must continue to report zero stock-sheet price-source references on the legacy revision and one on the appended revision. Source-map provenance comparison reports exactly one changed group with `changedFields: ["sourceReference"]`, while the aggregate Part-manifest comparison remains `both-unavailable` because neither basis carries the schema-v2 aggregate manifest. Group-level Part IDs, sheet count, TRY currency, stock-sheet cost and quote grand total remain unchanged. The original input history and already validated history are immutable.

The standalone revision-history JSON v1 round-trip preserves both the absent legacy property and the later explicit source, along with each revision's legacy/strict marker. This is a history-append and backward-compatibility contract only; it does not certify supplier identity, price authenticity, sheet yield, kerf, nesting, CNC compatibility or physical workshop suitability.

## DOM-193 — Multiple immutable appends preserve legacy and explicit stock-sheet provenance

A validated quote history may begin with a schema-v1 stock-sheet group that has no own `sourceReference`. A first immutable append may add an explicit user-supplied source for that group; a second append may replace it with a different explicit source. Neither append may backfill the legacy revision or rewrite the first explicit revision.

The three-revision history must preserve the original property absence, the first appended source, and the second appended source independently. The source-map audit reports per-revision source-reference counts `[0, 1, 1]` and a project total of two; the integrity audit reports one legacy and two strict revisions. Adjacent and non-adjacent source-map comparisons report exactly one changed group with `changedFields: ["sourceReference"]`. The aggregate Part-manifest comparison remains `both-unavailable` for schema-v1 material-cost bases.

The two appends must preserve revision numbers and previous-revision links, group Part identities, sheet quantity, user-entered price/currency and all monetary totals. The original history, validated history and first append remain immutable. Standalone quote-revision JSON v1 serialize/parse must preserve all three source states and reproduce the same audit and comparison results. This verifies data integrity only; it does not certify supplier identity, sheet yield, kerf, nesting quality, CNC compatibility or physical workshop suitability.



## DOM-194 — JSON v2 project-envelope append / restore / export

- A MobilyaCAD JSON v2 envelope may already contain a validated quote history whose first stock-sheet purchase group uses material-cost-basis schema v1 and has no own sourceReference property. Two appendProjectQuoteRevisionToProjectFile calls must preserve that legacy absence and the two later user-supplied source values independently; the second append is performed after a JSON stringify/parse restore.
- After the final project JSON export/parse, readProjectQuoteRevisionHistoryFromProjectFile must return the same three-revision chain. The source-map audit remains [0, 1, 1] with total two; integrity audit remains one legacy and two strict revisions; adjacent and non-adjacent comparisons report only sourceReference; schema-v1 aggregate Part-manifest comparison remains both-unavailable.
- Part IDs, sheet count, TRY currency, stock-sheet cost and quote grand total remain unchanged. The original project envelope and the first restored envelope are not mutated.
- Unknown top-level and nested metadata, including own __proto__ JSON data keys, must survive both appends and the final export/restore. Object prototypes remain unchanged and prototype pollution does not occur.
- This is a domain regression for the existing JSON v2 envelope API. It does not implement UI-owned editor startup/new/save/open integration (INT-003), adapter download wiring, CNC output, supplier verification, or physical workshop validation.


## DOM-195 — Standalone history import into an empty JSON v2 project envelope

- A validated standalone quote-history JSON v1 file containing a mixed legacy/strict revision chain may be imported only into an empty JSON v2 project envelope with the same stable projectId.
- Import preserves revision IDs, numbers, previous-revision links and each revision's own integrity-marker presence. A legacy revision must remain marker-absent; import must not backfill or upgrade it.
- After the imported project is serialized as project JSON and restored, a new immutable revision append must extend the imported chain without mutating the original target, imported result or restored input.
- Unknown top-level and nested project metadata, including own __proto__ JSON data keys, must survive import, project JSON stringify/parse, append and final restore without prototype mutation or pollution.
- Final project-history read and standalone JSON v1 export/parse must return the same full revision chain.
- Attempting to import another standalone history into the now non-empty project must return blocked, with null partial output and no mutation of the existing project.
- This verifies the existing domain import/append contract only; it does not complete UI-owned INT-003 editor startup/new/save/open integration or certify supplier, CNC or physical workshop data.


## DOM-196 — Imported mixed-version source-map and integrity audit reconciliation

A standalone quote-history JSON v1 file may contain both a legacy material-cost-basis v1 revision without an aggregate Part manifest and a strict v2 revision with an explicit aggregate Part manifest. Import into an empty matching JSON v2 project, project JSON stringify/parse restore, immutable append and final standalone export/parse must preserve source-map and source-integrity audit results.

The regression checks that the legacy revision remains manifest-unavailable while the strict revision retains its v2 Part manifest. Comparing legacy to strict must report from-unavailable; comparing strict to a later revision with no material-cost basis must report to-unavailable. Group-level Part provenance is not promoted to an aggregate manifest. After append, project-wide additive counters must reconcile with the appended revision, while unique Part/furniture/BOM totals remain set-deduplicated. The imported envelope's own __proto__ JSON data keys remain ordinary data without prototype mutation or pollution.

This is a domain persistence/audit regression only. It does not alter the project-file schema, frontend startup/save/open integration, adapters, supplier evidence, CNC output, sheet yield, kerf or physical workshop validation.


## 26 Kasım 2026 — DOM-197: Bağımsız özel panel ailesi

Kaynak: `domain/production/panelConstruction.ts`

Çağrı: `calculatePanelConstruction({ schemaVersion: 1, family: "panel", furniture, profile, materials })`.

- `furniture` açıkça `id`, `name`, `widthMm`, `lengthMm`, `thicknessMm`, `quantity`, `material` ve isteğe bağlı `materialId` taşır.
- `profile`, dört dış kenar için boolean `edgeBanding` ve `length | width | none` damar yönünü zorunlu kılar.
- Ölçüler mm'dir ve 0.1 mm'ye normalize edilir. Adet pozitif güvenli tam sayıdır; varsayılan adet, ölçü, konum veya birleştirme yöntemi üretilmez.
- Her istek tek bir `<furnitureId>-panel` Part satırı üretir; `quantity` aynı Part satırında korunur. Parça `group: "panel"`, malzeme kimliği, kenar bantlama ve damar yönünü taşır.
- `materialId` verilirse katalogda aynı kimlik ve gerçek kalınlık bulunmalıdır; yoksa istek bloklanır. Kimlik verilmeyen legacy serbest metin malzeme adı aynen korunur.
- Aile, proje üretim agregatöründe `family: "panel"` olarak desteklenir. Part satırı mevcut net alan/hacim, kenar bantlama, Part snapshot ve nesting domain akışlarına temel veri sağlar.
- Açık dikdörtgen geçiş açıklıkları mevcut `panelCutouts` isteğiyle tam Part kimliğine bağlanabilir. Kesit geometrisi net tüketimde hesaplanır; mevcut export adapter'ı bu geometriyi kayıpsız taşıdığı kanıtlanana kadar `canExport` kapalı kalır.
- Bu modül yerleşim, bağlantı, ayak/taşıyıcı, kenar profili, fire, levha yerleşimi, delik, CNC koordinatı veya makine postprocessor'ı üretmez. Tezgâh/raf gibi gerçek kullanım için destek ve montaj güvenliği ayrıca tasarımcı/atölye tarafından doğrulanmalıdır.

**Frontend entegrasyon sözleşmesi (UI-owned):** Özel panel oluşturma akışı `family: "panel"` ve yukarıdaki açık ölçü/adet/malzeme/kenar/damar alanlarını gönderir; sonuçta `parts[0]` ve `overallDimensionsMm` tüketilir. `panelGeometry` mevcut adapter'larda desteklenmiyorsa kesitli Part için dışa aktarma engeli kullanıcıya görünür olmalıdır. Bu turda `frontend/**` değiştirilmemiştir.

## Özel panel Part snapshot ve nesting sözleşmesi

- `panel` ailesi üretim raporunda tek kararlı Part kimliği (`<furnitureId>-panel`), mm ölçüleri, açık adet, katalog malzeme kimliği, kalınlık, damar yönü ve dört kenar bantlama bayrağı üretir.
- `createProjectSheetNestingBatches`, seçilen dikdörtgen özel paneli yalnızca aynı `materialId` + normalize kalınlık için kullanıcı tarafından tanımlanmış levha grubuna aktarır. Part kimliği, genişlik/uzunluk/kalınlık, quantity ve grain yönü nesting girdisinde korunur.
- Proje Part snapshot'ı seçilen ve seçilmeyen tüm Part kayıtlarını kaynak sırasıyla saklar. Böylece seçilmeyen panelin malzeme, ölçü, adet, damar ve kenar bantlama verileri de snapshot karşılaştırmasında görünür kalır.
- Bu sözleşme yalnızca doğrulanmış dikdörtgen nesting girdisini kapsar; yerleşim optimizasyonu, kesitli panel nesting'i, adapter round-trip veya CNC/postprocessor uyumluluğu iddiası değildir. Kesit geometrisi mevcut fail-closed kapısında kalır.


### 2.7 Özel panel değişiklikleri ve kayıtlı kesim planı freshness

Kaynaklar: `domain/production/panelConstruction.ts`, `projectProduction.ts`, `projectSheetCutPlan.ts` ve `projectSheetCutPlanFreshness.ts`.

- `family: "panel"` isteği açık mm genişlik/uzunluk/kalınlık, pozitif adet, malzeme kimliği/etiketi, dört kenar bandı ve damar yönüyle tek `<furnitureId>-panel` Part satırı üretir. Katalog kimliği verilmişse gerçek kalınlık katalogda bulunmalıdır.
- `createProjectSheetNestingBatches` tam proje Part snapshot'ını (seçilen ve hariç tutulan kayıtlar) üretir; bu snapshot JSON v2/v3 kesim planı zarfında saklanır.
- `validateProjectSheetCutPlanFreshness` JSON v2/v3 için güncel tam proje snapshot'ını kayıtlı snapshot ile kanonik olarak karşılaştırır. Özel panelin ölçüsü, adedi, malzeme adı/kimliği, kalınlığı, damar yönü, kenar bantlama bayrakları veya başka bir Part alanı değişirse plan `stale` olur; `result` ve `json` null kalır. Hariç tutulan özel paneldeki değişiklik de aynı şekilde stale üretir.
- JSON v2/v3 freshness çağrısında mevcut kullanıcı seçimi `currentSelectedPartIds` zorunludur. Seçim sırası/kapsamı değişirse yine stale döner. JSON v1 legacy planlarında tam proje snapshot'ı bulunmadığından yalnızca kayıtlı seçili kaynak Part'lar karşılaştırılır.
- Bu doğrulama yalnızca kaydedilmiş makine-bağımsız kesim planının mevcut domain Part verisiyle eşleşmesini sağlar. Kesitli geometri nesting/export adapter'ında desteklenmiyorsa export fail-closed kalır; CNC koordinatı, makine standardı veya fiziksel üretim güvenliği doğrulaması değildir.


## DOM-200 — özel panelden kullanıcı fiyatlı teklif revizyonuna domain sözleşmesi

**Kaynak akışı:** calculateCabinetProjectProductionWithDiagnostics içindeki açık family panel isteği tek kararlı furnitureId-panel Part üretir. calculateProjectPricedConsumptionSummary bu Part'ı katalog materialId + gerçek thicknessMm + m2 anahtarıyla fiyatlar; miktar, projectMaterialSummary tarafından quantity ağırlıklı net yüz alanıdır. Fiyat girdisi kullanıcıya aittir: unitPriceMinor, currencyCode, sourceReference ve fiyat listesi kimliği/sürümü/geçerlilik tarihleri açıkça sağlanmalıdır.

**Teklif/revizyon sözleşmesi:**
- Teklif satırı quantity net m² tüketimini, unitPriceMinor kullanıcı fiyatını ve lineTotalMinor yuvarlanmış satır tutarını taşır; lineSources aynı maliyet satırını resourceType material, resourceId, unit m2 ve kaynak Part ID listesiyle eşleştirir.
- materialCostBasis: { basis: net-consumption } kullanıldığında panel maliyet temeli ile teklif material kategori/genel toplamı aynı kaynaktan uzlaştırılır. Hazır snapshot v2 zarfında bu temel, fiyat para birimi ve kaynak sayısıyla immutable saklanır.
- Yeni ölçü/adet/katalog malzeme değişikliği yeni üretim raporu ve yeni kullanıcı fiyat tablosu/sürümüyle yeni teklif snapshot'ı üretir. Önceki revizyonun fiyatı, miktarı, toplamı ve kaynak Part ID'si sonradan değiştirilmez.
- Aynı materialId için yanlış kalınlık fiyatı legacy fiyat olarak otomatik seçilmez; eksik/eşleşmeyen fiyat incomplete döndürür, costSummary ve revizyon snapshot'ı üretmez. Partial monetary total sunulmaz.
- Proje JSON v2 quote revision append ve standalone history JSON serialize/parse akışı, revision ID/number/previous link ve kaynak satırı eşlemesini korur.

**Otomatik kabul testi:** domain/production/projectCustomPanelQuoteRevision.test.mjs iki gerçek özel panel raporunu 2.4 m² × 1,250 = 3,000 minor TRY ve 3.78 m² × 1,400 = 5,292 minor TRY olarak karşılaştırır; aynı Part ID kaynağını, farklı katalog sürümlerini, immutable ilk snapshot'ı ve iki revizyon JSON round-trip'ini denetler. 36 mm fiyatın 38 mm panele uygulanmasını ve eksik fiyatla revizyon oluşmasını reddeder. VERIFIED for implementation [2a226df4108f6d8233b93b78839a65e07ce8ffd0](https://github.com/Taylan789/MobilyaCAD/commit/2a226df4108f6d8233b93b78839a65e07ce8ffd0): CI [#45906549744](https://github.com/Taylan789/MobilyaCAD/actions/runs/45906549744) SUCCESS; QA [#45906549666](https://github.com/Taylan789/MobilyaCAD/actions/runs/45906549666) SUCCESS (389 frontend + 841 domain; DOM-200 tests #107–108); Pages [#45906549742](https://github.com/Taylan789/MobilyaCAD/actions/runs/45906549742) SUCCESS and deployment log confirms pages_build_version=2a226df4108f6d8233b93b78839a65e07ce8ffd0 at https://taylan789.github.io/MobilyaCAD/.

**Sınırlar:** Bu test UI save/open, adapter JSON v1/CSV, cutout-aware fiyat, nesting yerleşim optimizasyonu, CNC/postprocessor veya fiziksel atölye uygunluğu sağlamaz. Kesitli panelin export blocker'ı kaldırılmaz; gerçek makine/atölye doğrulaması yapılmış sayılmaz.


## Kesitli özel panelin teklif alanı — DOM-201

- `calculateCabinetProjectProductionWithDiagnostics` içindeki özel panel Part'ına bağlanan `panelCutouts` geometrisi, `panelGeometry.netFaceAreaMm2` değerini dış yüz alanından yalnızca açıkça tanımlanmış dikdörtgen açıklık alanlarını çıkararak hesaplar.
- `calculateProjectMaterialConsumptionSummary`, `panelGeometry` bulunduğunda dikdörtgen bounding area yerine doğrulanmış net yüz alanını kullanır; Part `quantity` değeri bu net alanı ağırlıklandırır. Ölçüler mm, fiyat miktarı m² olarak kalır.
- Teklif fiyatı yalnızca kullanıcı tarafından sağlanan exact `materialId` + gerçek panel kalınlığı + `m2` birim fiyatından gelir. Teklif `lineSources` kaydı maliyet satırını aynı kararlı Part ID'sine bağlar; fiyat, para birimi veya kesit boşluğu varsayılmaz.
- Kabul regresyonu: 2000 × 600 × 38 mm, açık 400 × 300 mm açıklık, Part quantity 2 ve açık 1,250 minor TRY/m² fiyatı için net tüketim 2.16 m², toplam 2,700 minor TRY olmalıdır. Kaynak `custom-worktop-panel` olarak kalır.
- Kesitli panel `panelGeometry` taşıdığı sürece `canExport` false ve JSON v1/CSV export blocker korunur. Bu test nesting/CSV/JSON adapter desteği, CNC işlemi veya fiziksel üretim onayı sağlamaz.