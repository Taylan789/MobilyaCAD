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
- [ ] P1: Parametrik mobilya motoru
- [ ] P2: Tam üretim hesaplama motoru (kısmen başlandı)
- [ ] P3: Malzeme / kenar bant / donanım yönetimi
- [ ] P4: Profesyonel 3D CAD ortamı
- [ ] P5: Teknik çizim ve ölçülendirme
- [ ] P6: Kesim listesi, malzeme optimizasyonu, üretim raporları
- [ ] P7: Proje yönetimi, kaydetme ve kurtarma
- [ ] P8: Geri al / yinele geçmişi
- [ ] P9: UX ve ürün kalitesi
- [ ] P10: Test, güvenlik ve güvenilirlik
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
   çekmeceli / raflı kasalar için hata veriyordu.
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
- CI: `npm test` adımı eklendi (`.github/workflows/ci.yml`).

## Değiştirilen Dosyalar (M1)
- `frontend/src/engine/cabinetGeometry.ts`
- `frontend/src/engine/cabinetParts.ts`
- `frontend/src/engine/furnitureCalculator.ts`
- `frontend/src/types/placedFurniture.ts`
- `frontend/src/types/construction/cabinetRules.ts`
- `frontend/src/App.tsx`
- `.github/workflows/ci.yml`
- Yeni: `frontend/src/engine/measurement.test.ts`
- Yeni: `frontend/src/engine/cabinetGeometry.test.ts`
- Yeni: `frontend/src/engine/cabinetParts.test.ts`
- Yeni: `frontend/src/engine/furnitureCalculator.test.ts`
- Yeni: `frontend/src/types/placedFurniture.test.ts`

## Test Sonuçları
`npx vitest run` → **5 dosya, 33 test, hepsi geçti** (0 başarısız).

## Build Sonucu
`npm run build` (tsc -b && vite build) → **başarılı**.

## Lint Sonucu
`npm run lint` → **çıkış kodu 0** (önceden var olan 15 uyarı, hata yok;
uyarılar `react/immutability` ve `only-export-components` — shadcn kalıp
bileşenlerinden kaynaklanır, bu değişle ilgili değildir).

## Bilinen Kısıtlamalar
- Üretim hesaplamaları kurallara göre teorik ölçüler üretir; gerçek
  atölye doğrulaması (kerf, pres kuvveti, bağlantı detayları) yoktur.
- CNC operasyonları (`cncOperations`) henüz doldurulmadı.
- Geri al / yinele (undo/redo) hâlâ uygulanmadı.
- Proje kaydetme yerel indirme/yeükleme ile sınırlı; schema sürümüleme yok.
- `frontend/src/data/.hardwareCatalog.ts` hâlâ kullanım dışı.

## Sonraki Adım
1. P1 parametrik mobilya mimarisi: katalog kalıplarını `FurnitureConfig`
   üzerinden türetmek, kopya mantığı kaldırmak.
2. P2 malzeme kütüphanesi ve kenar bantlama hesapları.
3. P7 proje şeması sürümüleme ve doğrulama.
