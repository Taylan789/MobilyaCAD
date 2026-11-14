# MobilyaCAD — AI Geliştirme Takipi

## Misyon
MobilyaCAD'i profesyonel, ücretsiz, açık kaynaklı bir mobilya CAD/CAM platformuna dönüştürmek:
oda → parametrik mobilya → 3D düzenleme → üretim hesabı → kesim listesi → kesim optimizasyonu →
teknik çizim → proje yönetimi → geri al/tekrarle → (gelecekte) doğrulanmış CNC çıktısı.

## Başlangıç durumu (bu çalıştırma)
- Dal: `opencode/dispatch-037836-20261114082254` (işaretlendi: `dev/github-work` ile aynı commit).
- Başlangıç commit: `0d6d45b` (Configure OpenCode workspace permissions).
- Frontend: React 19 + TypeScript + Vite 8 + Three.js/R3F + Tailwind 4 + Oxlint. Node 22.
- Test altyapısı yoktu. Build: BAŞARILI. Lint: BAŞARILI (yalnızca önceden var olan
  `PlacedFurniture3D.tsx` react/immutability uyarıları).

## Audit bulguları (şiddet / dosya)
1. **Kritik — Birim karışıklığı**: `PlacedFurniture` boyutlar mm, parça konumlar metre
   (`/1000`, `/2000`). `placedFurniture.ts:45-130` ile `PlacedFurniture3D.tsx` arasında
   kararsız dönüşümler. → Tek kaynak doğrusu (mm) kurulacak.
2. **Kritik — Hayalet/eksik parçalar**: `createFurnitureParts` katalog `doorCount` vb.
   varsayımlarından parça üretir; `hasDoors` kontrolü `PlacedFurniture3D.tsx:194` tip bazlı
   hardcode ile çelişir; raf/kapak konumları boyut değişince güncellenmez.
3. **Kritik — Oda/mobilya senkronizasyonu**: Oda ölçüsü küçüldüğünde mobilyalar clamp
   edilmiyor (`App.tsx` room setter'ları direkt state).
4. **Kritik — Üretim motoru sadece mutfak**: `cabinetParts.ts` kitchen'a özel;
   `furnitureCalculator.ts` boş şablon geri veriyor.
5. **Uyarı — `App.tsx:231-242` boyut sınır formülleri** boyutsuz olarak tutarsız;
   `resizeFurniture` içinde mm/metre karışımı yok ama formüller odaklı test gerektiriyor.
6. **Eksik**: malzeme kütüphanesi, kenar bantlama hesabı, hardware hesabı, kesim listesi
   gruplama, kesim optimizasyonu, undo/redo, proje şema sürümü/migrisyon, otomatik kaydetme,
   testler, teknik çizim.
7. **Boş/ölü kod**: `Furniture3D.tsx` (kullanılmıyor), `.hardwareCatalog.ts` (noktalı isim,
   hiç import edilmiyor), `furnitureCalculator.ts` (şablon).

## Tamamlanan kilometre taşları
- (Bu dosya oluşturuldu; audit kaydedildi.)

## Devam eden work
- P0+P1+P2: Parametrik mobilya motoru + üretim hesaplama motoru + test altyapısı.

## Sıradaki adımlar
1. vitest kurulumı (`npm i -D vitest`).
2. `src/engine/` altına: `furnitureModel.ts`, `componentGenerator.ts`, `manufacturingEngine.ts`,
   `cutList.ts`, `materials.ts`, `hardware.ts`, `nesting.ts`, `projectSchema.ts`, `history.ts`.
3. Her motor için birim testleri; beklenen değerler motordan bağımsız hesaplanacak.
4. `App.tsx` + `PlacedFurniture3D.tsx` entegrasyonu; P0 düzeltmeleri.
5. README güncellemesi; build/lint/test; commit + push.

## Kurtarma talimatı
- `cd frontend && npm ci && npm run build && npm run lint && npm test` ile durumu doğrula.
- Testler: `npm test` (vitest, node ortamı, globals off).
- Son push edilen commit bu dosyanın "Commit" satırında kayıtlıdır.
