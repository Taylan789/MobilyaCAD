# MobilyaCAD

Açık kaynaklı, tarayıcı tabanlı mobilya tasarım ve üretim hazırlık uygulaması.

MobilyaCAD; oda içinde mobilya yerleşimi, parametrik katalog, 3D düzenleme ve temel dolap parça ölçülendirmesini tek çalışma alanında birleştirmeyi hedefler.

## Mevcut teknoloji

- React 19 + TypeScript
- Vite
- Three.js, React Three Fiber ve Drei
- Tailwind CSS 4
- Oxlint

## Depo yapısı

```text
MobilyaCAD/
├── .github/workflows/ci.yml
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       │   ├── furniture/
│       │   ├── ui/
│       │   └── viewport/
│       ├── data/
│       ├── engine/
│       ├── hooks/
│       └── types/
└── README.md
```

## Geliştirme ortamını çalıştırma

Gereksinimler: Node.js 22 ve npm.

```bash
cd frontend
npm ci
npm run dev
```

Vite terminalde yerel geliştirme adresini gösterir.

## Kontroller

```bash
cd frontend
npm run build
npm run lint
```

GitHub Actions, `main` ve `dev/**` dallarına gönderimlerde ve `main` hedefli pull request'lerde aynı build/lint kontrollerini çalıştırır.

## Şu anki işlevler

- 3D oda sahnesi ve perspektif kamera
- Mobilya kataloğunda arama ve kategori filtreleme
- Katalogdan odaya mobilya ekleme ve sahneden seçme
- Mobilyayı taşıma, döndürme ve 3 eksende boyutlandırma
- Oda sınırları içinde konum ve ölçü sınırlaması
- Mobilya ve parça özelliklerini düzenleme
- Mutfak tipi modüller için temel dolap parça ölçüsü hesaplama
- Küçük ekranlar için mobil araç çubuğu ve açılır katalog/özellik panelleri

## Henüz tamamlanmamış alanlar

Aşağıdakiler mevcut arayüzde tamamlanmış ürün özellikleri olarak kabul edilmemelidir:

- Bulut/hesap tabanlı kalıcı proje kaydetme/yükleme
- Geri al / yinele geçmişi
- Tüm mobilya türleri ve tüm konstrüksiyon seçenekleri için eksiksiz/üretim onaylı kesim listesi
- Tüm mobilya türleri için üretim hesaplama
- CNC operasyonlarının doğrulanmış üretim çıktısı
- Kapsamlı otomatik birim ve uçtan uca testler

## Geliştirme düzeni

- Günlük geliştirme `dev/github-work` dalında yürütülür.
- `main` dalı kararlı temel olarak korunur.
- Her anlamlı değişiklikten sonra GitHub Actions build ve lint sonuçları kontrol edilir.
- Gerçek üretim ölçüleri, bağlantı detayları ve CNC parametreleri atölye/üretim doğrulaması olmadan kesin kabul edilmez.

## Günlük çalışma kaydı

### 14 Kasım 2026
- GitHub Actions CI iş akışı eklendi.
- Node.js 22 ile bağımlılık kurulumu, TypeScript/Vite production build ve Oxlint kontrolü otomatikleştirildi.
- İlk CI çalışması başarıyla tamamlandı.
- Depo yapısı ve mevcut özellikler incelendi; eksik alanlar belgelendi.\n- Proje JSON dosyasını yerel olarak indirme ve tekrar içe aktarma akışı eklendi; yüklenen oda, mobilya ve parça alanlarına doğrulama eklendi.\n- Seçili mutfak modülünün temel kesim listesi, Türkçe Excel uyumlu CSV olarak dışa aktarılabilir hâle getirildi.\n- Masaüstü ve mobil kabul kontrolleri için `TEST_PLANI_KABUL.md` hazırlandı.\n- Son CSV geliştirmesi için CI build/lint sonucu ayrıca doğrulanıyor.

## Sonraki geliştirme adımları

1. Kritik CAD hesaplama fonksiyonları için otomatik test altyapısı kurmak.
2. Oda ölçüsü değiştiğinde sahnedeki mobilyaların geçerliliğini korumak.
3. Dolap üretim hesaplarını konstrüksiyon kurallarıyla tutarlı hâle getirmek.
4. Kesim listesi hesaplarını diğer mobilya türleri ve gerçek konstrüksiyon seçenekleri için genişletmek.
5. Bulut kaydetme ve undo/redo akışlarını tamamlamak.
6. Masaüstü ve mobil kullanım için uçtan uca kontroller yapmak.
