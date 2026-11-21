# MobilyaCAD — Son Kullanıcı Test Planı

Bu belge, `dev/github-work` dalındaki geliştirmeler için masaüstü ve mobil kabul testlerini içerir. Testleri uygulamayı tarayıcıda açarak yapın. Her adımı **Geçti / Kaldı / Test edilemedi** olarak işaretleyin.

## 1. Başlangıç

- [ ] GitHub'da `dev/github-work` dalını açın.
- [ ] Codespaces veya yerel ortamda `cd frontend && npm ci && npm run dev` komutlarını çalıştırın.
- [ ] Uygulamanın hatasız açıldığını ve 3D oda sahnesinin göründüğünü doğrulayın.
- [ ] Tarayıcı geliştirici konsolunda başlangıçta kırmızı hata olmadığını kontrol edin.

## 2. Katalog ve mobilya ekleme

- [ ] Katalog aramasında bir ürün adı arayın; sonuçlar arama metnine göre filtrelenmeli.
- [ ] Kategori filtresini değiştirin; yalnızca seçilen kategori görünmeli.
- [ ] Bir mutfak dolabı, gardırop, masa ve kitaplık ekleyin.
- [ ] Eklenen her mobilya odada görünmeli ve seçilebilir olmalı.
- [ ] Bir mobilyayı seçip silin; yalnızca seçilen mobilya kaldırılmalı.

## 3. 3D taşıma, döndürme ve boyutlandırma

- [ ] Taşıma modunda mobilyayı sürükleyin; konumu sahnede ve özellik panelinde güncellenmeli.
- [ ] Mobilyayı oda dışına sürüklemeyi deneyin; oda sınırlarının dışına çıkmamalı.
- [ ] Döndürme modunda mobilyayı döndürün; açı değeri güncellenmeli.
- [ ] 15 derece yakalama davranışını kontrol edin.
- [ ] Boyutlandırma modunda X, Y ve Z eksenlerini ayrı ayrı değiştirin.
- [ ] Boyut değişince sağ panelde genişlik, yükseklik ve derinlik değerleri güncellenmeli.
- [ ] Döndürülmüş mobilyada boyutlandırmayı tekrarlayın; nesne oda sınırlarında kalmalı.
- [ ] Çok küçük veya oda ölçüsünü aşan değerlerde arayüzün bozulmadığını kontrol edin.

## 4. Oda ölçüleri

- [ ] Oda genişliği, uzunluğu ve yüksekliğini değiştirin.
- [ ] 100 mm altındaki, boş ve geçersiz değerleri deneyin.
- [ ] Oda küçültüldüğünde mevcut mobilyaların oda içinde kalıp kalmadığını kontrol edin.
- [ ] Oda ölçülerinin sahne bilgi alanı ve durum çubuğunda aynı göründüğünü doğrulayın.

## 5. Mobilya ve parça özellikleri

- [ ] Mobilya ölçülerini sağ panelden değiştirin.
- [ ] Bir kapak/raf/çekmece parçasını seçin.
- [ ] Parça adı, ölçüsü ve malzeme alanlarını düzenleyin.
- [ ] Seçili parça vurgusunun doğru nesnede göründüğünü kontrol edin.

## 6. Üretim ve kesim listesi CSV

- [ ] Bir mutfak tipi dolap seçin ve Üretim sekmesini açın.
- [ ] Sol/sağ yan panel, üst/alt tabla, raf, kapak ve arkalık satırlarını kontrol edin.
- [ ] **Kesim Listesini CSV İndir** düğmesine basın.
- [ ] CSV dosyasını Excel veya LibreOffice ile açın; Türkçe karakterler doğru görünmeli.
- [ ] Genişlik, uzunluk, kalınlık, adet, malzeme ve kenar bantlama sütunlarını kontrol edin.
- [ ] Başka türde mobilya seçildiğinde üretim hesaplarının mevcut destek sınırını aşmadığını doğrulayın.

**Önemli:** Bu kesim listesi mevcut temel mutfak dolabı hesaplama kurallarına dayanır. Atölye üretimi veya CNC kesimi öncesinde konstrüksiyon, bağlantı, malzeme ve makine parametreleri ayrıca doğrulanmalıdır.

## 7. Proje JSON kaydetme ve açma

- [ ] Odaya birkaç mobilya ekleyin ve bir mobilyanın ölçüsünü/konumunu değiştirin.
- [ ] **Projeyi İndir** düğmesiyle JSON dosyası indirin.
- [ ] **Proje Aç** düğmesiyle aynı dosyayı yeniden yükleyin.
- [ ] Oda ölçülerinin, mobilya adedinin, ölçülerinin ve konumlarının korunduğunu doğrulayın.
- [ ] Geçersiz JSON dosyası yükleyin; uygulama anlaşılır hata vermeli ve çökmeden çalışmaya devam etmeli.
- [ ] Farklı format sürümü veya eksik mobilya/parça alanları içeren dosya deneyin; yükleme reddedilmeli.

## 8. Mobil görünüm

- [ ] Tarayıcıyı yaklaşık 390 × 844 çözünürlüğe alın veya gerçek telefonda açın.
- [ ] Üst araç çubuğundaki katalog ve özellik paneli düğmelerini deneyin.
- [ ] Katalog açılıp kapanmalı; bir mobilya seçilebilmeli.
- [ ] Özellik paneli açılıp kapanmalı; giriş alanları ekrana sığmalı.
- [ ] 3D sahne dokunmatik hareketlerle döndürülebilmeli ve yakınlaştırılabilmeli.
- [ ] Taşıma, döndürme ve boyutlandırma kontrollerini dokunmatik ekranda deneyin.
- [ ] Yatay/dikey ekran yönlerinde taşma veya erişilemeyen düğme olmadığını kontrol edin.

## 9. Tarayıcı ve kararlılık

- [ ] Sayfayı yenileyin; uygulamanın başlangıç durumuna döndüğünü not edin.
- [ ] Uzun süre sahnede hareket ettirin; takılma veya kontrol kaybı olup olmadığını gözlemleyin.
- [ ] Birkaç mobilya ekleyip seçin, taşıyın, döndürün ve silin.
- [ ] Konsolda yeni hata oluşup oluşmadığını kontrol edin.

## 10. Sonuç

| Alan | Sonuç | Not / ekran görüntüsü |
|---|---|---|
| Başlangıç |  |  |
| Katalog |  |  |
| 3D taşıma |  |  |
| Döndürme |  |  |
| Boyutlandırma |  |  |
| Oda ölçüleri |  |  |
| Parça özellikleri |  |  |
| Üretim CSV |  |  |
| JSON kaydet/aç |  |  |
| Mobil görünüm |  |  |
| Kararlılık |  |  |

**Kabul kararı:** Tüm kritik adımlar geçmeden `main` dalına birleştirme yapmayın. Kalan hataları adım numarası, beklenen sonuç, gerçekleşen sonuç ve mümkünse ekran görüntüsüyle kaydedin.
