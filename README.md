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

- Projeyi kalıcı kaydetme/yükleme
- Geri al / yinele geçmişi
- Üretim kesim listesi dışa aktarma
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
- Depo yapısı ve mevcut özellikler incelendi; kaydetme, undo/redo ve üretim dışa aktarma gibi eksik alanlar belgelendi.

## Sonraki geliştirme adımları

1. Kritik CAD hesaplama fonksiyonları için otomatik test altyapısı kurmak.
2. Oda ölçüsü değiştiğinde sahnedeki mobilyaların geçerliliğini korumak.
3. Dolap üretim hesaplarını konstrüksiyon kurallarıyla tutarlı hâle getirmek.
4. Kesim listesi ve proje verisi dışa aktarma eklemek.
5. Kaydetme/yükleme ve undo/redo akışlarını tamamlamak.
6. Masaüstü ve mobil kullanım için uçtan uca kontroller yapmak.
