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

1. Her desteklenen mobilya için mevcut `PlacedFurniture`, katalog kaydı, mobilyaya çözülmüş konstrüksiyon kuralları ve malzeme kataloğundan aile ayrımlı bir istek üret: legacy/dolap için `CabinetConstructionRequest`, açık kitaplık için `BookshelfConstructionRequest`.
2. mm ölçülerini dönüştürmeden taşı; mm dışı bir kaynaktan dönüşüm gerekiyorsa tek adapter noktasında yap ve test et.
3. `materialId` ve panel override referanslarını katalogda doğrula; gerçek parça kalınlığı `thicknessesMm` listesinde yoksa sonucu hatalı/engelli göster.
4. Her mobilyanın stabil ID'sini ve agregatörün ürettiği parça ID'sini aynen koru. Dolap ve kitaplık isteklerini `furniture` listesinde, bu mobilyalara ait açık çekmece isteklerini `drawerBoxes` alanında aynı agregatör çağrısına ver.
5. Domain `ProjectProductionPart` birleşiminde gövde ve çekmece satırlarını ayırt et. Çekmece satırlarının `drawerGroupId` ve `grainDirection` alanlarını koru; gövde satırlarına uydurma damar yönü veya CNC operasyonu ekleme.
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
2. [x] Kitaplık panel grubu bazlı kalınlık girdileri: opsiyonel `panelThicknessMmByGroup`; legacy ortak kalınlık fallback'i; her override için katalog kimliği ve gerçek `thicknessesMm` doğrulaması.
3. İlk farklı konstrüksiyon ailesi olarak masa motorunu açık tabla, ayak ve varsa kayıt/apron ölçüleriyle tasarla; bağlantı standardı uydurma.
4. Proje agregatörüne aile bazlı destek/engelleme tanılaması ekle; desteklenmeyen mobilyalar sessizce kesim listesine girmesin.
5. Frontend sahibi domain agregatörünü JSON v1/CSV adapter'ına bağladıktan sonra aynı Part listesinin export ile birebir uzlaştığını otomatik test et.


### 2.6 Açık parametreli masa konstrüksiyon domain motoru

Kaynak: `domain/production/tableConstruction.ts`

Çağrı: `calculateTableConstruction({ schemaVersion: 1, family: "table", furniture, profile, materials })`.

- Mobilya ölçülerinde `widthMm` ve `lengthMm` tabla plan ölçüleridir; `heightMm` zeminden tabla üst yüzeyine toplam yüksekliği belirtir.
- Profil tabla kalınlığını, ayak en/derinlik kesitini ve ayak adedini açıkça ister. Ayak yüksekliği yalnızca `heightMm - topThicknessMm` olarak hesaplanır; sonuç 0.1 mm hassasiyetinde pozitif olmalıdır.
- Kayıtlar `enabled: false` ile kapatılabilir. Etkin kayıtta uzun/kısa kayıt uzunlukları ve adetleri ayrı ayrı verilir; kullanılmayan yönün uzunluğu ve adedi sıfır olmalıdır. Kayıt yüksekliği ve kalınlığı açıkça sağlanır.
- Parça grupları `top`, `legs`, `longApron`, `shortApron` şeklindedir. Her grup için dört kenar bantlama bayrağı ve `length | width | none` damar yönü açıkça verilir. Grup malzeme override'ı katalog kimliği ve gerçek `thicknessesMm` değeriyle doğrulanır.
- Çıktı tabla, ayak ve etkin kayıtları ayrı satırlar olarak verir; stabil parça kimliği, kaynak mobilya kimliği, mm ölçüleri, quantity, malzeme kimliği, kenar bantlama ve damar yönü korunur.
- Bu ilk dilim bir kesim-parça hesabıdır; ayak/kayıt konumları, tabla taşması, birleşim/vida standardı, delik, donanım, CNC, nesting, fire veya montaj güvenliği üretmez. Fiziksel yerleşim ve bağlantı seçimi atölye tarafından doğrulanmalıdır.
