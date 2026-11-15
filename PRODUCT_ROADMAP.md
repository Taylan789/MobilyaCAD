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
| Parçalar | Yerleştirilen mobilyada kapak/çekmece/raf görsel parçaları | Her aile için üretim parça ağacı henüz yok |
| Hesap motoru | Mutfak tipi gövdeler için yan, üst, alt, raf, kapak ve arkalık hesabı | Çekmece kutusu, tüm aileler ve üreticiye özel konstrüksiyonlar eksik |
| Kesim listesi | Seçili mutfak modülü için temel CSV | Şu an çekmeceli modüllerin CSV dışa aktarımı güvenlik amacıyla engellenir; CNC/optimizasyon çıktısı değildir |
| Proje dosyası | Yerel JSON indirme/yükleme, format sürümü 1 ve temel doğrulama | Şema migrasyonu, otomatik kayıt ve kurtarma yok |
| Test/CI | GitHub Actions CI ve QA; 15 Kasım 2026 QA #11'de 21/21 test geçti | Fiziksel üretim doğrulaması otomatik testle yapılamaz |

### Bilinen mimari ve veri boşlukları

- `frontend/src/engine/furnitureCalculator.ts` ölçü kontrolünden sonra boş liste döndüren bir altyapı stub'ıdır; üretim hesaplayıcısı olarak kullanılmamalıdır.
- Konstrüksiyon kurallarının bir kısmı `App.tsx` içinde sabit başlangıç değerleriyle tutuluyor; proje ve mobilya bazında yapılandırılabilir hale getirilmeli.
- Çekmece görsel sayısı ile gerçek çekmece kutusu/önü parça ağacı aynı şey değildir; üretim parçası hesaplanmadan kesim listesine eklenmemelidir.
- Malzeme kataloğu, donanım tüketimi, kenar bantlama uzunluğu, nesting ve CNC postprocessor katmanları tamamlanmış değildir.

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

## Sıradaki 5 küçük görev

1. Çekmece kutusu ve ön paneli için açık konstrüksiyon parametreleri ekle; parça ölçüsü/adedi test edilene kadar çekmeceli modül CSV'sini kapalı tut.
2. Sabit `constructionRules` başlangıç değerlerini proje veya mobilya bazında saklanan, doğrulanan ayarlara taşı.
3. Parça ağacında malzeme, damar yönü ve kenar bantlama parametrelerini tek kaynaktan yönet; toplam bant uzunluğu için test ekle.
4. Desteklenen mobilya aileleri için kesim listesi destek matrisini ve çoklu mobilya quantity birleştirmesini ekle.
5. Proje JSON v1 için şema doğrulama, round-trip ve gelecekteki sürüme migrasyon testleri oluştur.

## Üretim güvenliği ve karar sınırları

- Makine, takım, delik koordinatı, minifix/dübel, menteşe ve kenar mesafesi standardı uydurulmaz.
- Fiyat, fire ve kâr oranları varsayılan gerçek değer gibi sunulmaz; kullanıcı/üretici kataloğundan alınır.
- Fiziksel CNC denemesi, bağlantı dayanımı ve gerçek malzeme davranışı atölye/operatör doğrulaması gerektirir.
- Her küçük aşama otomatik test edilebilir tutulur; kullanıcıdan manuel yazılım testi istenmez.
