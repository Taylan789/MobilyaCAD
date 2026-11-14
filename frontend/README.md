# MobilyaCAD Frontend

React + TypeScript + Vite tabanlı MobilyaCAD istemcisi.

## Gereksinimler

- Node.js 22
- npm

## Kurulum

```bash
npm ci
```

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Vite geliştirme sunucusunu başlatır |
| `npm run build` | TypeScript proje kontrollerini ve production build'i çalıştırır |
| `npm run lint` | Oxlint statik kod kontrolünü çalıştırır |
| `npm run preview` | Production çıktısını yerel olarak önizler |

## Kaynak klasörleri

- `src/components/furniture`: 3D mobilya bileşenleri
- `src/components/viewport`: oda ve 3D sahne
- `src/components/ui`: arayüz bileşenleri
- `src/data`: mobilya kataloğu
- `src/engine`: ölçü ve üretim hesaplama mantığı
- `src/types`: proje, mobilya ve konstrüksiyon tipleri

## Kontrol

Değişiklik göndermeden önce:

```bash
npm run build
npm run lint
```

GitHub Actions bu iki komutu her push ve pull request kontrolünde otomatik çalıştırır. Uygulamanın gerçek 3D etkileşimleri, farklı ekran boyutları ve üretim çıktıları ayrıca kullanıcı kabul testi gerektirir.
