# MobilyaCAD geliştirme ilerlemesi

## Hedef dal

- Depo: `Taylan789/MobilyaCAD`
- Çalışma dalı: `dev/github-work`
- `main` dalına yazma, merge veya PR hedefleme yapılmaz.

## 15 Kasım 2026 — katalog adetleri / parça tutarlılığı

- Başlangıç commit'i: `f676705c1611a5adf3c1db4d47836506080fb349`
- Bulgu: `createPlacedFurniture` içindeki `doorCount` ve `shelfCount` alanları sırasıyla 2 varsayılanını alırken, `createFurnitureParts` aynı katalog kaydındaki eksik değerleri 0 kabul ediyordu. Böylece mobilya özellik panelindeki adetler ile 3D sahnedeki gerçek kapak/raf parçaları ayrışabiliyordu.
- Düzeltme: adetler tek yerde normalize ediliyor ve aynı normalize edilmiş değerler hem mobilya alanlarında hem parça üretiminde kullanılıyor. Açıkça verilen 0 korunuyor; geçersiz/sonlu olmayan adetler varsayılanla güvenli şekilde normalize ediliyor.
- Regresyon testleri: varsayılan adetler, açık sıfır değerleri ve özel adet kombinasyonu.
- Bu değişiklikten önceki son doğrulanmış QA: Run #8, 14/14 test başarılı; lint 15 uyarı / 0 hata; build başarılı; production audit adımı başarılı ancak npm audit 6 bulgu raporladı (2 düşük, 4 orta). Bundle boyutu uyarısı mevcut.
- Commit: `27d402735ae887bf94b4a3653a6ef1a134c1ed38`.
- Doğrulama: QA Run #9 başarılı; 17/17 test geçti, lint 15 uyarı / 0 hata, TypeScript ve production build başarılı, production audit adımı başarılı. CI Run #34 ve Pages deploy Run #15 de başarılı.

## Bilinen riskler ve sıradaki işler

1. CNC operasyonları, donanım adetleri ve kesim listesi için üretim davranışı testlerini genişlet.
2. `calculateFurnitureParts` hâlen tür/konstrüksiyon bazlı üretim hesabı yerine boş liste döndüren bir altyapı stub'ıdır; desteklenen mobilya türleri netleştirilerek parça hesapları aşamalı eklenmeli.
3. `PlacedFurniture3D.tsx` içinde lint tarafından işaretlenen değiştirilebilir değerleri incele.
4. Üretim bundle'ı bölmek için güvenli lazy-loading fırsatlarını değerlendir.
5. npm audit bulgularını breaking dependency update yapmadan incele; `--force` kullanma.
6. CNC koordinatları ve donanım standartları atölye/operatör doğrulaması olmadan üretim onaylı kabul edilmemeli.
