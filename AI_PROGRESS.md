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

## 15 Kasım 2026 — çekmece kutusu hesaplama motoru (domain temeli)

- Başlangıç HEAD: `1af98f68e61e5cc25d99954e122384f4cc13352c`.
- Kod commit'i: `e8d8d2de37b981675075bdb84d57c909cab46014`.
- Geliştirme: `calculateDrawerBoxParts` dört parça grubunu üretir: yan paneller (2/adet), ön/arka kutu panelleri (2/adet), taban (1/adet) ve görünür ön panel (1/adet). Tüm ölçüler mm cinsindendir; parça adetleri çekmece sayısıyla çarpılır.
- Güvenli konstrüksiyon sınırı: kutu dış ölçüleri, panel kalınlıkları, görünür ön panel ölçüleri, malzeme, kenar bantlama ve damar yönü açıkça sağlanır. Yalnızca açıkça seçilen `between-sides-and-front-back` taban oturumu desteklenir; ray boşluğu, bindirme, donanım veya makine standardı tahmin edilmez.
- Değişen dosyalar: `frontend/src/engine/drawerBoxParts.ts`, `frontend/tests/drawerBoxParts.test.mjs`, `PRODUCT_ROADMAP.md`.
- Test kapsamı: 9 yeni test; geometri, quantity çarpanı, görünür ön panelin bağımsız ölçüsü, sıfır adet, geçersiz adet, geçersiz türetilen ölçüler, kenar bantlama, damar yönü, bilinmeyen konstrüksiyon ve boş malzeme.
- Otomatik doğrulama: QA Run #15 başarılı, 35/35 test; CI Run #40 başarılı; TypeScript ve production build başarılı; lint 15 uyarı / 0 hata; Pages deploy Run #21 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; raporda 6 bulgu (2 düşük, 4 orta) sürüyor. `deepmerge` / `shadcn` ve `minimatch` / `ts-morph` bağımlılık zincirleri var; kırıcı `--force` güncellemesi yapılmadı.
- Sınırlar: bu commit domain motoru ve testlerini ekler; henüz UI, `PlacedFurniture`, proje JSON ve CSV akışına bağlı değildir. Çekmeceli modüllerin CSV dışa aktarım engeli korunur. Ray, bağlantı elemanı, CNC operasyonu ve fiziksel üretim doğrulaması dahil değildir.
- Sonraki görev: açık çekmece ölçülerini proje dosyasına geriye uyumlu biçimde kaydetmek ve Üretim paneline ölçü/konstrüksiyon girdilerini eklemek; eksik tanımda CSV engelini korumak.

## Bilinen riskler ve sıradaki işler

1. Çekmece kutusu girdilerini `PlacedFurniture` ve proje JSON v1'e geriye uyumlu, varsayılan üretim ölçüsü uydurmayan biçimde ekle.
2. Üretim paneline çekmece kutusu ve görünür ön panel ölçüleri, malzeme, damar yönü ve kenar bantlama ayarlarını ekle.
3. Çekmece hesaplayıcısını üretim önizlemesi ve CSV'ye bağla; eksik/geçersiz tanımda dışa aktarım engelini koru.
4. Çoklu çekmece ölçü grupları ve çoklu mobilya kesim/bantlama toplamlarını quantity çarpanlarıyla birleştir.
5. `calculateFurnitureParts` stub'ını aile bazlı hesaplayıcılarla değiştir; desteklenmeyen türleri açıkça raporla.
6. npm audit bulgularını breaking dependency update yapmadan incele; CNC koordinatları ve donanım standartlarını atölye doğrulaması olmadan üretim onaylı kabul etme.


## 15 Kasım 2026 — çekmece yapılandırmasının proje JSON v1 sözleşmesi

- Başlangıç HEAD: `7ee9dd419d8172aef6c47637ce0bfb799c0c6a3f`.
- Özellik commit'i: `50751689b825558be69a2442f3edebf6a57e0035`.
- Tip düzeltme commit'i: `49400e3233dad47b2e0cf76a132f1ce10003a59e`.
- Geliştirme: `PlacedFurniture.drawerBoxSpecs` opsiyonel alanı eklendi. Eski proje v1 dosyalarında alanın bulunmaması geçerli; alan sağlanırsa çekmece grubu kimliği, dokuz pozitif ölçü, güvenli tam sayı adet, malzeme, desteklenen taban oturumu, dört kenar bantlama bayrağı ve damar yönü doğrulanır.
- Kaydetme akışı mobilya nesnelerini JSON'a doğrudan serileştirdiği için yeni alanı aynı format sürümünde korur; yükleme akışı bozuk opsiyonel veriyi sessizce atmak yerine projeyi reddeder.
- Test kapsamı: eski v1 uyumluluğu, geçerli birden fazla grup, geçersiz ölçü/adet, bilinmeyen konstrüksiyon, boş malzeme, geçersiz damar yönü ve eksik bantlama bayrakları.
- Değişen dosyalar: `frontend/src/engine/drawerBoxProject.ts`, `frontend/tests/drawerBoxProject.test.mjs`, `frontend/src/types/placedFurniture.ts`, `frontend/src/App.tsx`, `PRODUCT_ROADMAP.md`.
- İlk Actions denemesi TypeScript'in bilinmeyen kayıt alanlarını daraltma hatasıyla başarısız oldu; log incelendi, daraltma yerel sabitler üzerinden düzeltildi. İlk başarısız run: CI #42 / QA #17 / Pages #23.
- Düzeltme sonrası doğrulama: CI #43 başarılı; QA #18 başarılı; Pages #24 dağıtımı başlatıldı. QA testleri 42/42 başarılı, lint 15 uyarı / 0 hata, TypeScript ve production build başarılı, production audit adımı başarılı.
- Sınırlar: bu dilim henüz çekmece ayar formu, üretim önizlemesi veya CSV entegrasyonu sağlamaz; çekmeceli CSV engeli korunur. Ray, bağlantı elemanı, CNC operasyonu ve fiziksel üretim onayı dahil değildir.
- Sonraki görev: üretim panelinde açık ölçüleri, malzeme, damar yönü ve kenar bantlama seçeneklerini kullanıcı girdisiyle düzenlemek; ardından parça önizlemesi ve CSV engel koşulunu doğrulamak.
