# AI_PROGRESS.md — MobilyaCAD Geliştirme Kayıtı

## Misyon Hedefi
Mevcut MobilyaCAD projesini profesyonel, güvenilir, genişletilebilir bir mobilya
tasarım / mühendislik / üretim ve CAD/CAM platformuna dönüştürmek.
Gerçek bir tasarım-üretim (design-to-manufacturing) akışı sağlamak.

## Güncel Dal
`opencode/dispatch-8ea49f-20261114045749` (hedef: `dev/github-work`)

## Genel İlerleme
- [x] Safha 1: Tam proje denetimi ve geri kazanım
- [x] P0: Kritik veri ve geometri doğruluk düzeltmeleri (ilk kısm)
- [x] P2/P3 temeli: Kesim listesi, malzeme tüketimi, donanım hesapları
- [x] P8: Geri al / yinele geçmişi
- [x] P7: Proje yönetimi, sürümleme, otomatik kaydetme ve kurtarma
- [ ] P1: Parametrik mobilya motoru (kısmen: parçalar yapılandırmadan türetiliyor)
- [ ] P2: Tam üretim hesaplama motoru (temel bina yapıldı)
- [ ] P3: Malzeme / kenar bant / donanım yönetimi (motor hazır, UI kısmen)
- [ ] P4: Profesyonel 3D CAD ortamı
- [ ] P5: Teknik çizim ve ölçülendirme
- [ ] P6: Kesim optimizasyonu ve üretim raporları
- [ ] P9: UX ve ürün kalitesi
- [ ] P10: Test, güvenlik ve güvenilirlik (kritik hesaplar test ediliyor)
- [ ] P11: Performans ve mimari
- [ ] P12: CNC ve ileri üretim temeli
- [ ] P13: Erişilebilirlik, yerelleştirme ve dokümantasyon

## Safha 1 — Denetim Bulguları (ciddiyet / dosya / öncelik)

### Kritik (P0)
1. **Üretim motoru yapılandırma ile uyumsuzdu** — `engine/cabinetParts.ts`
   `rules.doorCount` / `rules.shelfCount` kullanıyor, mobilyanın kendi
   `doorCount` / `drawerCount` / `shelfCount` alanları göz ardı ediliyordu.
   Sonuç: çekmeceli dolapta "hayalet kapak", rafsız dolapta "hayalet raf".
2. **Kapak sayısı 0 desteklenmiyordu** — `doorCount >= 1` doğrulaması
   çekmeceli / raflı kasalarda hata veriyordu.
3. **İç yükseklik hesabı yanlıştı** — `engine/cabinetGeometry.ts`
   `between-sides` stili için iç yükseklik `H` döndürüyordu; fiziksel doğru
   cevap her iki stilde de `H - 2t` tir.
4. **Parçalar ölçü değişince güncellenmiyordu** — `types/placedFurniture.ts`
   parçalar yalnızca katalog anında üretiliyor, boyutlandırma sonraki
   parçaları eski ölçüde tutuyordu (görsel ve üretim uyumsuzluğu).
5. **Oda ölçüsü değişince mobilyalar sınır dışı kalabiliyordu** —
   `App.tsx` oda girdileri doğrudan setState yapıyor, mobilya konumları
   sınırlandırılmıyordu.
6. **Üretim hesabı yalnızca `kitchen` tipi için çalışıyordu** — diğer
   mobilya tipleri için kesim listesi üretilmiyordu.
7. **Test altyapısı yoktu** — hiçbir otomatik test bulunmuyordu.

### Orta (P1)
- `engine/furnitureCalculator.ts` boş iskelet idi.
- `data/.hardwareCatalog.ts` nokta ile başladığı için gizli dosya idi ve
  hiçbir yerde kullanılmıyordu.
- `types/project.ts`, `types/material.ts`, `types/wall.ts`,
  `types/opening.ts`, `types/hardware.ts` tanımları uygulama tarafından
  kullanılmıyordu.

## Tamamlanan Milestone'lar

### M1 — P0 kritik üretim doğruluk düzeltmeleri + test altyapısı
- Vitest kuruldu (`npm test` / `npm run test:watch`).
- `engine/cabinetGeometry.ts`:
  - `between-sides` iç yükseklik `H - 2t` olarak düzeltildi.
  - Yan panel yüksekliği için `calculateSidePanelHeight` eklendi.
  - `overlay` / `grooved` / `inset` arkalık derinlik kuralları netleştirildi.
- `engine/cabinetParts.ts`:
  - Mobilyanın kendi `doorCount` / `drawerCount` / `shelfCount` alanları
    birincil bilgi kaynağı oldu (kurallar yalnızca varsayılan).
  - Kapak sayısı 0 destekleniyor (çekmeceli/raflı kasalarda hayalet kapak yok).
  - Çekmece ön yüzü, çekmece yan paneli ve çekmece tablası parçaları eklendi.
  - Her parçaya üretim kuralı metni (`productionNote`) ve malzeme eklendi
    (hesap izlenebilirliği).
  - Kapak genişlik formülleri `calculateDoorWidth` / `calculateDoorHeight`
    ile merkezileştirildi; `rules.doorCount` bug düzeltildi.
- `engine/furnitureCalculator.ts`: mobilya tipine göre dağıtım
  (tezgâh slab, masa, dolap) uygulandı.
- `types/placedFurniture.ts`: parçalar artık mevcut ölçülerden türetiliyor;
  `regenerateFurnitureParts` eklendi.
- `App.tsx`:
  - Boyutlandırma sonrası parçalar yeniden üretiliyor (tek bilgi kaynağı).
  - Üretim parçaları tüm mobilya tipleri için hesaplanıyor.
  - Oda ölçüsü değişince mobilyalar `clampFurnitureToRoom` ile sınırlanıyor.

### M2 — Kesim listesi, malzeme tüketimi ve donanım motoru (P2/P3 temeli)
- `engine/cutList.ts`: proje genelinde tüm mobnyalar için kesim listesi;
  mobilya / malzeme / kalınlık / parça tipi bazında gruplama; CSV (BOM,
  Türkçe karakter, noktalı virgül, kaçırma) ve JSON dışa aktarım; özet istatistik.
- `engine/materialCalculator.ts`: parça başına kenar bantlama uzunluğu,
  malzeme bazlı alan/adet/bant uzunluğu tüketimi, stok levha tahmini
  (heuristik; optimum değildir).
- `engine/hardwareCalculator.ts`: konstrüksiyon kurallarına göre menteşe,
  çekmece kaydırıcı, raf pimi, tutamaç ve minifix adedi.
- `App.tsx`: Üretim sekmesinde proje kesim listesi özeti, malzeme tüketimi
  tablosu, CSV/JSON proje dışa aktarma butonları.

### M3 — Geri al / yinele geçmişi (P8)
- `engine/history.ts`: saf geçiş yığını (recordChange/undoChange/redoChange,
  50 kayıt sınırı, sınır doğrulaması).
- `App.tsx`: sahne anlık görüntüleriyle tüm düzenleme işlemleri geçmişe
  kaydediliyor (ekle/sil/taşı/döndür/boyutlandır/oda ölçüsü/proje yükleme);
  Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y kısayolları; üst araç çubuğu butonları etkin.

### M4 — Proje yönetimi, sürümleme ve otomatik kaydetme (P7)
- `engine/project.ts`: proje şeması (format "MobilyaCAD", sürüm 2),
  tek giriş noktası doğrulama, v1→v2 migrasyonu, serileştirme,
  güvenli dosya adı, proje çoğaltma (yeni kimlikler).
- `App.tsx`: v1 içe aktarma desteği korundu; proje adı üst çubukta
  tıklanarak yeniden adlandırılır; Çoğalt ve Yeni proje butonları;
  localStorage otomatik kaydetme + açılışta kurtarma (ilk render atlanır,
  kurtarma önce okunur); otomatik kaydetme zamanı durum çubuğunda gösterilir.

### M5 — Üretim kısıtlama denetimi (P2)
- `engine/manufacturingConstraints.ts`: parça bazlı üretim kısıtları
  (minimum genişlik/uzunluk, kesim payı, minimum kapak genişliği,
  çekmece ön yüzü minimum yüksekliği); `validatePartConstraints` ve
  `validateFurnitureConstraints`; kural ihlallerini `ConstraintViolation`
  listesi olarak döndürür.
- `App.tsx`: Üretim sekmesinde "ÜRETİM UYARILARI" bölümü; seçili mobilya
  için kısıt ihlalleri parçaya göre listelenir, ihlal yoksa "Tamam".

### M6 — SVG teknik çizim üretici (P5)
- `engine/technicalDrawing.ts`: ön yüz elevasyon çizimi (kapaklar,
  çekmece ön yüzleri, rafta çizgileri, genişlik/yükseklik boyut çizgileri,
  başlık); parça konumları üretim motorundan (`calculateCabinetParts`)
  alınır; çizim ayrı bir ölçü kaynağı tutmaz; `isValidSvgDrawing`
  doğrulama yardımcısı; `escapeXmlText` paylaşım helper'ı.
- `App.tsx`: Üretim sekmesinde "TEKNİK ÇİZİM" bölümü; SVG canlı
  önizleme + "Çizim SVG İndir" butonu (`image/svg+xml`).

### M7 — Levha yerleştirme (nesting) optimizasyonu (P6, heuristik)
- `engine/nesting.ts`: first-fit-decreasing + alt-sol (bottom-left)
  heuristiği; kesim payı (kerf) arası boşluk, 90° döndürme seçeneği,
  çok levhalara yayılım, yerleştirilemeyen parça tespiti, kullanım
  oranı (%); `generateNestingSvg` (levha çizimi, "Heuristik
  yerleştirme (optimum değil)" etiketi), `summarizeNesting`.
- `App.tsx`: Üretim sekmesinde "LEVHA YERLEŞTİRME" bölümü; kesim
  listesi malzeme+kalınlık grupları başına levha sayısı, kullanım
  oranı, yerleştirilen/sığmayan parça sayısı, ilk levhanın SVG
  önizlemesi ve SVG indirme. Standart levha 2800×2070 mm,
  kerf = panel kalınlığının 1/4'i.

### M8 — Parametrik katalog mimarisi (P1)
- `data/furnitureCatalog.ts`: katalog tek varsayılan politikanın
  sahibi oldu (`normalizeCatalogItem`: kapak/çekmece 0, raf 2,
  arkalık/bant/material varsayılanları). `FurnitureCatalogItem`
  sayaç alanları artık zorunlu; `RawFurnitureCatalogItem` kalıbı
  ile ayrım netleştirildi.
- `types/placedFurniture.ts`: `createPlacedFurniture` saf kopyalama
  oldu (kendi `??` varsayılanları kaldırıldı); çakışan politikalar
  elimin'e edildi.
- Temel kalıplar açık sayaçlarla tanımlanıyor; tezgâh/masa/
  kitaplık'ta hayalet kapak/raf parçaları kaldırıldı (M1 nitelik
  düzeltmesinin uzantısı).
- `data/furnitureCatalog.test.ts`: tek politika, açık değerlerin
  korunması, saf kopyalama ve hayalet-parça yokluğu testleri.

### M9 — Malzeme kütüphanesi ve kenar bantlama seçimi (P3)
- `data/materialCatalog.ts`: 6 malzeme tanımlı (Suntalam 18/25,
  MDF, MDF Lam, Kontrplak, Masif Ahşap) — levha ölçüsü, kalınlık,
  m² fiyatı (örnek veri), kenar bant kalınlığı; `materialNames`,
  `findMaterialByName`.
- `engine/cabinetParts.ts`: mobilya düzeyindeki `edgeBanding: false`
  artık tüm parçaların bantlamasını kapatır (varsayılan açık).
- `App.tsx`: mobilya özelliklerine Malzeme seçimi (katalogtan,
  parçaları yeniler) ve Kenar Bantlama açma/kapama; parça
  müfettişindeki Malzeme seçimleri katalogtan gelir.
- Fiyatlar örnek veridir; gerçek maliyet için kullanıcı kendi
  fiyatlarını girmelidir.

## Değiştirilen Dosyalar (M1–M9)
- `frontend/src/engine/cabinetGeometry.ts`
- `frontend/src/engine/cabinetParts.ts`
- `frontend/src/engine/furnitureCalculator.ts`
- `frontend/src/engine/cutList.ts` (yeni)
- `frontend/src/engine/materialCalculator.ts` (yeni)
- `frontend/src/engine/hardwareCalculator.ts` (yeni)
- `frontend/src/engine/history.ts` (yeni)
- `frontend/src/engine/project.ts` (yeni)
- `frontend/src/engine/manufacturingConstraints.ts` (yeni)
- `frontend/src/engine/technicalDrawing.ts` (yeni)
- `frontend/src/engine/nesting.ts` (yeni)
- `frontend/src/data/furnitureCatalog.ts`
- `frontend/src/data/materialCatalog.ts` (yeni)
- `frontend/src/types/placedFurniture.ts`
- `frontend/src/types/construction/cabinetRules.ts`
- `frontend/src/App.tsx`
- `frontend/src/App.css`
- Testler: `measurement.test.ts`, `cabinetGeometry.test.ts`,
  `cabinetParts.test.ts`, `furnitureCalculator.test.ts`,
  `placedFurniture.test.ts`, `materialCalculator.test.ts`,
  `hardwareCalculator.test.ts`, `cutList.test.ts`,
  `history.test.ts`, `project.test.ts`,
  `manufacturingConstraints.test.ts` (yeni),
  `technicalDrawing.test.ts` (yeni),
  `nesting.test.ts` (yeni),
  `furnitureCatalog.test.ts` (yeni),
  `materialCatalog.test.ts` (yeni)

## Test Sonuçları
`npx vitest run` → **15 dosya, 108 test, hepsi geçti** (0 başarısız).

## Build Sonucu
`npm run build` (tsc -b && vite build) → **başarılı**.

## Lint Sonucu
`npm run lint` → **çıkış kodu 0** (uyarılar shadcn kalıp bileşenlerinden
kaynaklanan önceden var olan `react/immutability` / `only-export-components`
uyarılarıdır).

## Bilinen Kısıtlamalar
- Üretim hesaplamaları kurallara göre teorik ölçüler üretir; gerçek
  atölye doğrulaması (kerf, pres kuvveti, bağlantı detayları) yoktur.
- CNC operasyonları (`cncOperations`) henüz doldurulmadı.
- Teknik çizim yalnızca ön yüz elevasyonu üretir; yan yüz ve montaj
  çizimleri eklenmemiş.
- Levha yerleştirme (nesting) first-fit-decreasing + alt-sol
  heuristiğidir; optimum değil, gerçek CNC makine sınırları
  (maksimum levha, grip alanı) modellenmemiştir.
- Malzeme fiyatları örnek veridir; gerçek maliyet hesabı için
  kullanıcı fiyatlarını girmelidir.
- `frontend/src/data/.hardwareCatalog.ts` hâlâ kullanım dışı.
- Stok levha tahmini heuristiktir; optimum olduğu iddia edilmez.
- Donanım adetleri kurallara dayalı tahmindir; üretici teknik verisi yok.
- Otomatik kaydetme yerel tarayıcı depolamasına bağlıdır; depolama
  kullanılamıyorsa kurtarma yapılmaz (sessizce atlanır).

## Sonraki Adım
1. P4: 3D düzenleme iyileştirmeleri.
2. P10: güvenilirlik (hata sınırları, kurtarma akışları) ve P12 CNC temelı.
3. P13: i18n ve dokümantasyon.

## Kurtarma Talimatları
Sonraki çalışma akışı en son pushed commit'ten (`opencode/dispatch-8ea49f-20261114045749`)
başlamalı ve bu dosyadaki en güncel kontrol noktasından devam etmelidir.
`cd frontend && npm ci && npm test && npm run build && npm run lint` ile
durum doğrulanmalıdır.