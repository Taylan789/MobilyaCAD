# MobilyaCAD Ürün Yol Haritası

> Kapsam: yalnızca `Taylan789/MobilyaCAD` deposunun `dev/github-work` dalı. Bu belge ürün hedefini ve doğrulanabilir geliştirme sırasını tanımlar; tamamlanmamış veya üretim onayı almamış özellikleri tamamlanmış gibi göstermez.

## Ürün hedefi

MobilyaCAD'i tarayıcıda çalışan bir 3D mobilya yerleşim aracından; parametrik mobilya tasarımı, ölçü ve parça mühendisliği, malzeme/aksesuar yönetimi, teklif hazırlığı ve makineye özel üretim verisi hazırlığını kapsayan modüler bir CAD/CAM platformuna dönüştürmek.

Temel ilke: ekrandaki model, hesaplama motoru, kesim listesi ve dışa aktarılan veriler aynı kaynak parametreleri kullanmalı. Fiziksel üretime giden ölçüler, bağlantılar ve CNC işlemleri ancak gerçek üretici/atölye standardı doğrulandığında onaylı kabul edilebilir.

## Doğrulanmış mevcut temel — 15 Kasım 2026

| Alan | Mevcut durum | Sınır |
|---|---|---|
| Teknoloji | React 19, TypeScript, Vite, Three.js / React Three Fiber | Tarayıcı istemcisi; ayrı backend yok |
| Oda ve 3D sahne | Ölçülü oda ve perspektif sahne | Tam 2D teknik çizim, kesit ve görünüş araçları yok |
| Yerleşim | Katalogdan ekleme, seçme, taşıma, döndürme ve boyutlandırma | Gelişmiş snap, çoklu seçim ve tam undo/redo akışı doğrulanmış değil |
| Katalog | Mutfak, gardırop, banyo, masa, kitaplık ve diğer ailelerden 100 varyasyon | Şablonlar tam parametrik konstrüksiyon aileleri değil |
| Parçalar | Görsel kapak/çekmece/raf parçaları; açık ölçülü çekmece kutusu motoru; proje v1'de saklanan çekmece grupları ve Üretim panelinde açık parametre formu | Çekmece kutusu parçaları henüz üretim önizlemesi/CSV'ye bağlanmadı; tüm aileler için üretim parça ağacı yok |
| Hesap motoru | Mutfak tipi gövdeler için yan, üst, alt, raf, kapak ve arkalık hesabı | Çekmece kutusu, tüm aileler ve üreticiye özel konstrüksiyonlar eksik |
| Kesim listesi | Seçili mutfak modülü için temel CSV | Şu an çekmeceli modüllerin CSV dışa aktarımı güvenlik amacıyla engellenir; CNC/optimizasyon çıktısı değildir |
| Kenar bantlama | Seçili mutfak modülünde parça kenar işaretlerinden adet çarpanlı doğrusal uzunluk özeti | Çoklu mobilya ve malzeme/dekor bazlı toplamlar yok; fire veya rulo payı hesaplanmaz |
| Proje dosyası | Yerel JSON indirme/yükleme, format sürümü 1 ve temel doğrulama | Şema migrasyonu, otomatik kayıt ve kurtarma yok |
| Test/CI | GitHub Actions CI ve QA; 15 Kasım 2026 QA #15'te 35/35 test geçti | Fiziksel üretim doğrulaması otomatik testle yapılamaz |

### Bilinen mimari ve veri boşlukları

- `frontend/src/engine/furnitureCalculator.ts` ölçü kontrolünden sonra boş liste döndüren bir altyapı stub'ıdır; üretim hesaplayıcısı olarak kullanılmamalıdır.
- Konstrüksiyon kurallarının bir kısmı `App.tsx` içinde sabit başlangıç değerleriyle tutuluyor; proje ve mobilya bazında yapılandırılabilir hale getirilmeli.
- Çekmece görsel sayısı ile gerçek çekmece kutusu/önü parça ağacı aynı şey değildir; Üretim paneli artık ölçü, malzeme, kenar bantlama ve damar yönü girdilerini proje v1'e kaydeder. Hesaplanan çekmece parçaları henüz üretim önizlemesi/CSV'ye bağlanmadığından çekmeceli CSV dışa aktarımı kapalı kalmalıdır.
- Malzeme kataloğu, donanım tüketimi, nesting ve CNC postprocessor katmanları tamamlanmış değildir.
- Kenar bantlama uzunluğu artık seçili mutfak modülünün açık kenar bayraklarından hesaplanır; çoklu mobilya/malzeme toplamı, fire ve rulo payı henüz yoktur.

## Geliştirme aşamaları

### Aşama 0 — Veri doğruluğu ve otomatik kalite kapısı **Durum: sürekli**

**Hedef:** UI, domain modeli, hesap motoru ve export arasında tekil ve test edilebilir kurallar.

- Kabul kriterleri: mm birimi açık; adetler ve sıfır değerleri korunur; geçersiz ölçüler reddedilir; hesaplar için regresyon testleri vardır; her commit CI/QA'dan geçer.
- Bağımlılıklar: mevcut TypeScript domain modelleri ve Node test altyapısı.
- Risk: gerçek konstrüksiyon varsayımlarını kodda sessizce sabitlemek.

### Aşama 1 — Parametrik gövde ve parça mühendisliği

**Hedef:** mutfak, gardırop, banyo ve kitaplık ailelerinde kuralları açık olan gövde/raf/kapak/çekmece/arkalık parçaları.

- Kabul kriterleri: her aile için ölçü tablosu ve parça adedi testleri; panel kalınlığı, arkalık montajı, kapak boşluğu ve kenar bantlama açık parametreler; desteklenmeyen konfigürasyon hata/uyarı verir.
- Bağımlılıklar: sürümlenebilir konstrüksiyon kuralı modeli.
- Risk: üreticiye göre değişen birleşim ve donanım detaylarını evrenselmiş gibi varsaymak.

### Aşama 2 — Kesim listesi ve üretim hazırlığı

**Hedef:** birden fazla mobilya örneğinin parça ağacını birleştiren kesim listesi, malzeme/kenar bantlama özeti ve doğrulanmış dışa aktarma.
- Kabul kriterleri: quantity çarpanları doğru; ölçüler mm; CSV/JSON alanları kararlı; desteklenmeyen özellikler dışa aktarımı engeller; örnek projelerde toplamlar test edilir.
- Bağımlılıklar: Aşama 1 parça ağacı ve malzeme kimlikleri.
- Risk: nesting, fire ve CNC sonuçlarının makine/levha standardı olmadan kesin gösterilmesi.

### Aşama 3 — CAD düzenleme araçları

**Hedef:** 2D plan, snap/grid, ölçülendirme, hizalama, çoklu seçim, gruplama, kopyalama ve güvenilir undo/redo.
- Kabul kriterleri: klavye/fare ve mobil akışlar; oda sınırı ve çakışma testleri; undo/redo tüm ilgili domain değişikliklerini geri alır.
- Bağımlılıklar: tutarlı proje durumu ve komut/işlem modeli.
- Risk: görsel transform ile gerçek mm ölçülerinin ayrışması.

### Aşama 4 — Malzeme, donanım ve CNC mimarisi

**Hedef:** malzeme/dekor kataloğu, donanım reçetesi, delik/işlem modeli ve makineye özel postprocessor arayüzleri.
- Kabul kriterleri: üretici verisi kaynağı ve birimi kayıtlı; CNC çıktısı makine profili seçilmeden üretilmez; postprocessor fixture dosyalarıyla test edilir.
- Bağımlılıklar: Aşama 1 parça ağacı ve yapılandırılabilir donanım kuralları.
- Risk: gerçek makine koordinatları, takım çapları ve güvenlik mesafeleri tahmin edilemez.

### Aşama 5 — Proje yönetimi, teklif ve maliyet

**Hedef:** sürümlü proje dosyaları, otomatik kayıt/kurtarma, şablonlar, malzeme/işçilik/donanım/operasyon maliyeti ve teklif revizyonları.
- Kabul kriterleri: JSON şema migrasyonu ve round-trip testleri; fiyatlar yalnızca kullanıcı kataloğundan; teklif kalemleri izlenebilir.
- Bağımlılıklar: güvenilir parça/malzeme miktarları.
- Risk: bulut/hesap/ekip altyapısı gereksinimi ve kullanıcı verisi güvenliği.

## Öncelik sırası

1. **P0:** UI-hesap-export tutarlılığı, ölçü/adet doğruluğu ve eksik üretim verisinin dışa aktarılmasını engelleme.
2. **P1:** parametrik konstrüksiyon kuralları ve gerçek parça ağacı (özellikle çekmeceler).
3. **P1:** kesim listesi, malzeme ve kenar bantlama toplamlarının doğruluğu.
4. **P2:** CAD düzenleme araçları ve proje durumu/undo-redo.
5. **P3:** CNC postprocessor, nesting ve maliyet/teklif; yalnızca kaynak verisi ve standartlar doğrulandığında.

### Son tamamlanan dikey dilim — kenar bantlama uzunluk özeti

- calculateEdgeBandingSummary mevcut parça kenar bayraklarından genişlik ve uzunluk yönündeki bantlı kenarları ayrı, toplam uzunluğu birlikte hesaplar.
- Parça adet değeri her kenar uzunluğuna uygulanır; boş liste sıfır döndürür, geçersiz ölçü/adet reddedilir.
- Üretim paneli toplamı ve iki yönlü alt toplamı mm cinsinden gösterir.
- Hesap yalnızca tanımlı kenar bayraklarını toplar; bant kalınlığı, fire, rulo payı veya fiziksel üretim standardı tahmin etmez.
- Kod commit'i `bc36978a9ab34da0413f743710e944938050f2cb` için QA #13 ve #14, CI #38 ve #39 başarılı; son QA 26/26 test.

### Son tamamlanan dikey dilim — çekmece kutusu hesaplama motoru (domain temeli)

- `calculateDrawerBoxParts` dört parça grubunu üretir: iki yan panel, ön/arka kutu panelleri, taban ve görünür ön panel.
- Kutu dış ölçüleri, panel kalınlıkları, görünür ön panel ölçüleri, adet, malzeme, kenar bantlama ve damar yönü açıkça sağlanır; görünür ön panel boşluğu veya ray payı tahmin edilmez.
- Desteklenen tek taban kurgusu açıkça `between-sides-and-front-back` olarak belirtilir; başka konstrüksiyon seçimi reddedilir.
- Quantity çarpanı yan ve ön/arka panellerde iki kat uygulanır; taban ve görünür ön panelde çekmece adedi kullanılır.
- Ray, bağlantı elemanı, CNC operasyonu ve makine koordinatı üretilmez.
- Bu dilim yalnızca domain motoru ve otomatik test altyapısıdır; henüz App arayüzü, proje JSON kaydı veya CSV dışa aktarımıyla bağlı değildir. Çekmeceli CSV engeli aynen korunur.
- Kod commit'i: `e8d8d2de37b981675075bdb84d57c909cab46014`.
- Otomatik doğrulama: QA Run #15 başarılı, 35/35 test; CI Run #40 başarılı; TypeScript ve production build başarılı; lint 15 uyarı / 0 hata; Pages deploy Run #21 başarılı.
- Güvenlik denetimi: `npm audit --omit=dev --audit-level=high` adımı başarılı; raporda 6 bulgu (2 düşük, 4 orta) sürüyor. `deepmerge` / `shadcn` ve `minimatch` / `ts-morph` zincirleri incelenmeli; kırıcı `--force` güncellemesi yapılmadı.

## Son tamamlanan dikey dilim — çekmece yapılandırmasının proje v1 sözleşmesi

- `PlacedFurniture.drawerBoxSpecs` opsiyonel alanı eklendi; eski v1 dosyalarında alanın bulunmaması geçerliliğini korur.
- Proje yükleyicisi sağlanan yapılandırmaları ölçü, adet, malzeme, taban konstrüksiyonu, dört kenar bayrağı ve damar yönü bakımından doğrular. Bozuk alan sessizce atılmaz; proje reddedilir.
- JSON kaydetme mobilya nesnelerini doğrudan serileştirdiği için yeni opsiyonel alan aynı format sürümünde korunur.
- Bu dilim henüz UI formu veya kesim listesi entegrasyonu sağlamaz; çekmeceli CSV engeli korunur.
- Kabul kriterleri: eski v1 dosyaları yüklenebilir; geçerli yeni alan korunur; geçersiz alan yüklemeyi engeller.

## 15 Kasım 2026 — çekmece yapılandırma editörü (tamamlandı)

- Üretim panelinde çekmeceli mutfak modülleri için birden fazla ölçü grubu ekleme, düzenleme ve silme akışı eklendi.
- Kullanıcı dokuz konstrüksiyon ölçüsünü, çekmece adedini, malzemeyi, dört panel grubunun dört kenar bantlama durumunu ve her grubun damar yönünü açıkça seçer. Varsayılan üretim ölçüsü veya gizli bant/ damar varsayımı yapılmaz.
- Grup adedi mobilyanın katalogdan gelen çekmece adedini aşamaz; kaydetmeden önce hesaplayıcıyla türetilen iç genişlik ve taban uzunluğu doğrulanır. Grup kimlikleri benzersizdir.
- `drawerBoxSpecs` mevcut proje JSON v1 içinde saklanır; eski v1 dosyalarında opsiyonel alanın olmaması geriye uyumlu kalır.
- Kod commit'leri: `d714ee00a86c3ed00499394c1a263deee92d6873`, doğrulama düzeltmesi `a5d73cf64663a0e05d7381b00ed4a68a876c09fd`.
- Otomatik doğrulama: CI #46, QA #21 (44/44 test), Pages deploy #27 başarılı; lint 15 uyarı / 0 hata; TypeScript ve production build başarılı.
- Sınır: çekmece parçaları henüz üretim önizlemesi/CSV'ye bağlı değildir; çekmeceli CSV engeli korunur. Ray, bağlantı elemanı, donanım ve CNC standardı tahmin edilmez.

## Son tamamlanan dikey dilim — çekmece parçalarının üretim önizlemesi ve CSV kapısı

- Kaydedilmiş çekmece grupları `calculateDrawerBoxParts` ile mevcut mutfak gövde parçalarına eklenir; parça önizlemesi, adet ve kenar bantlama toplamı aynı birleşik listeden beslenir.
- Çekmece gruplarının adet toplamı katalogdaki çekmece adedine eşit değilse CSV kilitli kalır. Eksik, yinelenen kimlikli, bozuk veya türetilmiş ölçüleri geçersiz konfigürasyonlar da dışa aktarılamaz.
- Bütün çekmeceler açık ölçü/malzeme/kenar/damar girdileriyle tanımlandığında çekmece parçaları mevcut CSV şemasına dahil edilir; ray ve CNC operasyonu uydurulmaz.
- Kabul kriterleri: çekmecesiz modüllerin mevcut akışı değişmez; kısmi tanım CSV'yi engeller; tam tanım dört çekmece parça grubunu üretim listesi ve CSV'ye ekler.

## Sıradaki 5 küçük görev

1. Birleşik üretim parça listesi için CSV satırlarının ve quantity toplamlarının uçtan uca testlerini ekle.
2. Malzeme bazında çekmece/gövde parça toplamlarını ve kenar bantlama tüketimini tek seçili mobilya görünümünde raporla.
3. Proje JSON v1 için kaydet/yükle round-trip ve eski dosya geriye uyumluluk testleri ekle.
4. Birden fazla mobilyanın kesim/bantlama toplamlarını quantity ve malzeme bazında birleştir.
5. Çekmece dışındaki gardırop, banyo ve kitaplık aileleri için ayrı konstrüksiyon hesaplayıcıları planla ve bir aileyi uçtan uca tamamla.

## Üretim güvenliği ve karar sınırları

- Makine, takım, delik koordinatı, minifix/dübel, menteşe ve kenar mesafesi standardı uydurulmaz.
- Fiyat, fire ve kâr oranları varsayılan gerçek değer gibi sunulmaz; kullanıcı/üretici kataloğundan alınır.
- Fiziksel CNC denemesi, bağlantı dayanımı ve gerçek malzeme davranışı atölye/operatör doğrulaması gerektirir.
- Her küçük aşama otomatik test edilebilir tutulur; kullanıcıdan manuel yazılım testi istenmez.
