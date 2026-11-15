<div align="center">

# 🪵 MobilyaCAD

### Mobilya tasarımından üretim hazırlığına uzanan açık kaynak CAD/CAM projesi

**Tasarla · Yerleştir · Ölçülendir · Üretime hazırla**

<p>
  <a href="https://taylan789.github.io/MobilyaCAD/"><strong>🚀 CANLI DEMO</strong></a>
  &nbsp; · &nbsp;
  <a href="https://github.com/Taylan789/MobilyaCAD"><strong>GITHUB DEPOSU</strong></a>
  &nbsp; · &nbsp;
  <a href="https://github.com/Taylan789/MobilyaCAD/actions"><strong>OTOMATİK TESTLER</strong></a>
</p>

<img src="https://img.shields.io/badge/MobilyaCAD-Aktif%20Geli%C5%9Ftirme-0f9d8a?style=for-the-badge" alt="Aktif geliştirme">
<img src="https://img.shields.io/badge/Aray%C3%BCz-T%C3%BCrk%C3%A7e-2563eb?style=for-the-badge" alt="Türkçe">
<img src="https://img.shields.io/badge/A%C3%A7%C4%B1k%20Kaynak-CAD%2FCAM-475569?style=for-the-badge" alt="Açık kaynak CAD CAM">

</div>

---

## ✨ MobilyaCAD nedir?

MobilyaCAD; oda planlama, mobilya yerleşimi, 3D düzenleme, parametrik mobilya verileri ve üretim hazırlığı süreçlerini tek bir çalışma alanında birleştirmeyi hedefleyen tarayıcı tabanlı bir projedir.

Amacımız yalnızca üç boyutlu modeller oluşturmak değil; tasarımda kullanılan ölçüleri, malzemeleri ve parça bilgilerini tutarlı bir veri akışıyla üretim hazırlığına taşımaktır.

> **Geliştirme notu:** MobilyaCAD aktif olarak geliştirilmektedir. Her dalın içeriği farklı olabilir; bu README ilgili dalın mevcut koduyla birlikte değerlendirilmelidir. Doğrulanmamış CNC veya atölye çıktıları üretime hazır kabul edilmemelidir.

## 🧭 Proje alanları

| 🏠 3D tasarım | 🧱 Malzeme ve parçalar | ⚙️ Üretim hazırlığı |
|---|---|---|
| Oda sahnesi ve mobilya yerleşimi | Malzeme/dekor kataloğu | Parça ölçüleri ve kesim verileri |
| Taşıma, döndürme, boyutlandırma | Kalınlık ve malzeme kimliği | CSV gibi veri dışa aktarımları |
| Yerleşim ve çakışma kontrolleri | Mobilya-parça veri ilişkileri | Genişletilebilir üretim altyapısı |

## 🖥️ Canlı demo

**[MobilyaCAD'i tarayıcıda dene →](https://taylan789.github.io/MobilyaCAD/)**

Canlı test sitesi, geliştirme dalına alınan ve yayınlama kontrollerini geçen sürümlerle güncellenir. Özelliklerin en güncel durumu için [geliştirme dalını](https://github.com/Taylan789/MobilyaCAD/tree/dev/github-work) ve [iş akışlarını](https://github.com/Taylan789/MobilyaCAD/actions) inceleyebilirsin.

## 🛠️ Teknoloji altyapısı

- **React 19 ve TypeScript** — bileşen tabanlı, tip güvenli uygulama
- **Vite** — geliştirme sunucusu ve üretim derlemesi
- **Three.js, React Three Fiber ve Drei** — 3D sahne ve etkileşim
- **Tailwind CSS 4** — arayüz stilleri
- **Oxlint** — kod kalite kontrolleri
- **GitHub Actions** — otomatik derleme, test ve dağıtım

## 🚀 Yerel kurulum

Gereksinimler: **Node.js 22** ve **npm**.

```bash
git clone https://github.com/Taylan789/MobilyaCAD.git
cd MobilyaCAD/frontend
npm ci
npm run dev
```

Üretim derlemesi ve kod kontrolü:

```bash
npm run build
npm run lint
```

## 🧪 Kalite yaklaşımı

Her anlamlı geliştirmede otomatik testler ve kalite kontrolleri kullanılmaya çalışılır. Sonuçlar [GitHub Actions](https://github.com/Taylan789/MobilyaCAD/actions) üzerinden takip edilebilir.

- Ölçü ve geometri hesaplarında milimetre tutarlılığı gözetilir.
- Proje verilerinde geriye dönük uyumluluk korunmaya çalışılır.
- Tamamlanmamış özellikler tamamlanmış gibi sunulmaz.
- CNC ve gerçek üretim süreçleri için makine standardı ve atölye doğrulaması gerekir.

## 🗺️ Yol haritası

Uzun vadeli hedeflerimiz:

- 3D oda ve mobilya tasarım iş akışlarını geliştirmek
- Parametrik dolap, gardırop, kitaplık ve farklı mobilya ailelerini genişletmek
- Parça bazında malzeme, kalınlık ve kenar bandı yönetimi
- Kesim listesi ve levha yerleşim optimizasyonu
- Proje kaydetme, sürümleme, otomatik kayıt ve geri al/yinele
- Doğrulanabilir üretim hazırlığı ve genişletilebilir CNC çıktı altyapısı

Ayrıntılı plan ve tamamlanan işler:
- [Ürün yol haritası](./PRODUCT_ROADMAP.md)
- [Geliştirme günlüğü](./AI_PROGRESS.md)

## 🤝 Katkıda bulun

Hata bildirmek veya özellik önermek için [GitHub Issues](https://github.com/Taylan789/MobilyaCAD/issues) sayfasını kullanabilirsin. Kod katkıları için ayrı bir dal açıp değişikliklerini açıklayan bir Pull Request gönderebilirsin.

## 📁 Proje yapısı

```text
MobilyaCAD/
├── .github/workflows/   # CI, QA ve yayınlama iş akışları
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/ # Arayüz, mobilya ve 3D görünüm
│       ├── data/       # Katalog ve uygulama verileri
│       ├── engine/     # Geometri ve üretim hesapları
│       ├── hooks/
│       └── types/      # Veri modelleri
├── PRODUCT_ROADMAP.md
├── AI_PROGRESS.md
└── README.md
```

---

<div align="center">

### 🪵 Tasarımdan üretim hazırlığına — MobilyaCAD

**Açık kaynak · Türkçe · Sürekli geliştirme**

[🚀 Canlı Demo](https://taylan789.github.io/MobilyaCAD/) · [⭐ GitHub](https://github.com/Taylan789/MobilyaCAD) · [💬 Geri Bildirim](https://github.com/Taylan789/MobilyaCAD/issues)

</div>
