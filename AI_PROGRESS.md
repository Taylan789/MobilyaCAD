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

## 15 Kasım 2026 — seçili mobilya ayarları ve kesim listesi tutarlılığı

- Başlangıç HEAD: `1f10822bc02f209c4d2fe424b964eb0e10dcd3bd`.
- Bulgu: mutfak kesim listesi seçili mobilyanın kapak/raf adetleri, arkalık kalınlığı, arkalık varlığı, kenar bantlama ve malzeme ayarları yerine ekrandaki sabit başlangıç kurallarını kullanıyordu. Sıfır kapaklı modüller de hesaplanamıyordu.
- Düzeltme: `resolveCabinetConstructionRules` seçili mobilyanın kapak/raf/arkalık değerlerini hesap kurallarına taşır; sıfır kapak desteklenir; arkalıksız mobilya arkalık payı ayırmaz; malzeme ve kenar bantlama tercihleri parçalara uygulanır.
- Güvenlik: gerçek çekmece kutusu/önü parça hesabı henüz olmadığı için çekmeceli modüllerin CSV dışa aktarımı uyarıyla engellenir. Ekrandaki kısmi parça özeti üretim onaylı kesim listesi olarak sunulmaz.
- Testler: 4 yeni regresyon testi; QA Run #11'de toplam 21/21 başarılı. CI Run #36 ve Pages deploy Run #17 başarılı.
- Commit: `51ad739ccd7f2dbc75b5ea6a15ecfeb200bf918e`.
- Güvenlik denetimi: production audit adımı `--audit-level=high` eşiğinde başarılı; npm kurulum çıktısında toplam 6 bulgu (2 düşük, 4 orta) raporlanıyor. Kırıcı/force bağımlılık güncellemesi yapılmadı.


## 15 Kasım 2026 — kesim listesi kenar bantlama uzunluğu

- Başlangıç HEAD: `c0310ac55649399edbc1b2c63b065e5ef48be966`.
- Geliştirme: `calculateEdgeBandingSummary`, mevcut parça ağacındaki açık kenar bantlama bayraklarından genişlik yönü (üst/alt) ve uzunluk yönü (sol/sağ) toplamlarını hesaplar; her parçanın `quantity` değeri uygulanır. Boş liste sıfır döndürür; geçersiz ölçü ve pozitif tam sayı olmayan adet reddedilir.
- Kullanıcı akışı: seçili mutfak modülünün Üretim panelinde toplam bant uzunluğu ile iki yönlü alt toplam mm cinsinden gösterilir.
- Değişen dosyalar: `frontend/src/engine/edgeBanding.ts`, `frontend/tests/edgeBanding.test.mjs`, `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- Kod commit'i: `bc36978a9ab34da0413f743710e944938050f2cb`.
- Otomatik doğrulama: QA Run #13 başarılı, 26/26 test; lint başarılı; TypeScript ve production build başarılı; CI Run #38 başarılı; Pages deploy Run #19 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; kurulum/audit çıktısında 6 bulgu (2 düşük, 4 orta) sürüyor. Kırıcı veya zorlayıcı bağımlılık güncellemesi yapılmadı.
- Sınırlar: hesap yalnızca mevcut `Part.edgeBanding` işaretlerini ve modelin kenar-yönü konvansiyonunu toplar; bant kalınlığı, fire, rulo payı, malzeme/dekor bazlı tüketim veya üretici standardı tahmin edilmez. Şimdilik yalnızca seçili mutfak modülü gösterilir; fiziksel bant uygulaması atölye doğrulaması gerektirir.
- Sonraki görev: çekmece kutusu ve ön paneli için açık, kullanıcı/atölye tarafından sağlanan konstrüksiyon ölçüleriyle parça modeli kur; bu tamamlanana kadar çekmeceli CSV dışa aktarımını kapalı tut.

## Bilinen riskler ve sıradaki işler

1. Çekmece kutusu/önü için açık konstrüksiyon parametreleri ve üretim parça testleri ekle; bu tamamlanana kadar çekmeceli CSV dışa aktarımını kapalı tut.
2. Sabit `constructionRules` değerlerini proje veya mobilya bazında saklanan, doğrulanan ayarlara taşı.
3. Kesim listesi için damar yönü, kenar bantlama uzunluğu ve malzeme toplamlarını test et.
4. `calculateFurnitureParts` stub'ını aile bazlı gerçek hesaplayıcılarla değiştir; desteklenmeyen türler boş liste döndürmemeli.
5. npm audit bulgularını breaking dependency update yapmadan incele; `--force` kullanma.
6. CNC koordinatları ve donanım standartları atölye/operatör doğrulaması olmadan üretim onaylı kabul edilmemeli.
