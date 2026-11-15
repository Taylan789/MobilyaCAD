<!--
  MobilyaCAD — Türkçe proje vitrini
  Durum ve özellikler, depodaki gerçek uygulamaya göre güncellenir.
-->

<div align="center">

# 🪵 MobilyaCAD

### Mobilya tasarımından üretim hazırlığına, tek bir çalışma alanında.

**Odanı planla · Mobilyanı yerleştir · Ölçülerini düzenle · Üretim verini hazırla**

<p>
  <a href="https://taylan789.github.io/MobilyaCAD/"><strong>🚀 CANLI DEMO</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Taylan789/MobilyaCAD"><strong>KAYNAK KOD</strong></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Taylan789/MobilyaCAD/actions"><strong>TEST VE GELİŞTİRME DURUMU</strong></a>
</p>

<p>
  <img src="https://img.shields.io/badge/Durum-Aktif%20Geli%C5%9Ftirme-14b8a6?style=for-the-badge" alt="Aktif geliştirme">
  <img src="https://img.shields.io/badge/Lisans-A%C3%A7%C4%B1k%20Kaynak-64748b?style=for-the-badge" alt="Açık kaynak">
  <img src="https://img.shields.io/badge/Aray%C3%BCz-T%C3%BCrk%C3%A7e-0f766e?style=for-the-badge" alt="Türkçe arayüz">
</p>

<p>
  <img src="https://img.shields.io/github/actions/workflow/status/Taylan789/MobilyaCAD/ci.yml?branch=dev%2Fgithub-work&label=CI&logo=github&style=flat-square" alt="CI durumu">
  <img src="https://img.shields.io/github/actions/workflow/status/Taylan789/MobilyaCAD/qa-test.yml?branch=dev%2Fgithub-work&label=Otomatik%20Testler&logo=github&style=flat-square" alt="Otomatik test durumu">
  <img src="https://img.shields.io/github/last-commit/Taylan789/MobilyaCAD/dev/github-work?label=Son%20Geli%C5%9Ftirme&style=flat-square" alt="Son geliştirme">
</p>

---

### 🧭 MobilyaCAD'i keşfet

<table>
  <tr>
    <td align="center" width="33%">
      <h3>📐 3D Tasarım</h3>
      Oda içinde mobilya yerleşimi, seçme, taşıma, döndürme ve ölçülendirme.
    </td>
    <td align="center" width="33%">
      <h3>🧰 Malzeme Yönetimi</h3>
      Malzeme kataloğu, dekor ve kalınlık bilgileriyle üretim verisini ilişkilendirme.
    </td>
    <td align="center" width="33%">
      <h3>⚙️ Üretim Hazırlığı</h3>
      Parça ölçüleri, temel kesim listesi ve CSV dışa aktarımı.
    </td>
  </tr>
</table>

</div>

## ✨ Proje hakkında

MobilyaCAD; mobilya tasarımını, oda yerleşimini ve üretim hazırlığını aynı dijital ortamda buluşturmayı amaçlayan açık kaynaklı bir CAD/CAM projesidir.

Hedefimiz yalnızca ekranda 3D mobilya göstermek değil. Tasarım sırasında girilen ölçülerin, malzeme bilgilerinin ve parça verilerinin üretim sürecine kadar tutarlı biçimde ilerlemesini sağlayan modüler bir sistem geliştirmek.

> **Önemli:** MobilyaCAD aktif geliştirme aşamasındadır. Aşağıdaki özellik listesinde mevcut olanlarla yol haritasında bulunanlar özellikle ayrılmıştır. CNC veya atölye üretimi için doğrulanmamış çıktılar, üretime hazır veri olarak değerlendirilmemelidir.

## 🖥️ Canlı deneme

<div align="center">

### [MobilyaCAD'i tarayıcıda aç →](https://taylan789.github.io/MobilyaCAD/)

Kurulum yapmadan test sürümünü deneyebilirsin. Test sitesi, `dev/github-work` dalına alınan ve dağıtım kontrollerini geçen değişikliklerle güncellenir.

</div>

## 🧩 Mevcut özellikler

| Alan | Şu anki kabiliyetler |
|---|---|
| 🏠 Oda ve sahne | 3D oda sahnesi, perspektif kamera ve oda sınırları |
| 🪑 Mobilya yerleşimi | Katalogda arama/filtreleme, sahneye ekleme ve seçme |
| 🎛️ 3D düzenleme | Taşıma, döndürme ve üç eksende boyutlandırma |
| 📏 Yerleşim kontrolü | Oda dışına taşma ve mobilya çakışması uyarıları |
| 🧱 Dolap parçaları | Temel mutfak modülleri için parça ölçüsü hesaplama |
| 🎨 Malzeme kataloğu | Malzeme, dekor ve kalınlık bilgilerinin yönetimi |
| 🔗 Malzeme bağlantısı | Mobilya ve üretim parçalarında malzeme kimliğini takip etme |
| 📦 Proje verisi | JSON proje dosyası içe/dışa aktarma ve eski kayıtlarla uyumluluk |
| 📄 Üretim verisi | Desteklenen temel modüller için CSV kesim listesi |
| 📱 Arayüz | Masaüstü ve küçük ekranlara uyumlu çalışma alanı |

## 🛠️ Teknoloji altyapısı

<p>
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-G%C3%BC%C3%A7l%C3%BC%20Tip-3178c6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-H%C4%B1zl%C4%B1%20Geli%C5%9Ftirme-646cff?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Three.js-3D%20Motor-000000?logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-06b6d4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
</p>

- **React 19 + TypeScript** — bileşen tabanlı ve tip güvenli arayüz
- **Vite** — hızlı geliştirme ve üretim derlemesi
- **Three.js, React Three Fiber ve Drei** — 3D sahne ve etkileşim
- **Tailwind CSS 4** — arayüz stilleri
- **Oxlint** — kod kalite kontrolü
- **GitHub Actions** — otomatik derleme, test ve yayınlama süreçleri

## 🚀 Yerel ortamda çalıştırma

### Gereksinimler

- Node.js 22
- npm

### Kurulum

```bash
git clone https://github.com/Taylan789/MobilyaCAD.git
cd MobilyaCAD/frontend
npm ci
npm run dev
```

Vite, terminalde yerel geliştirme adresini gösterecektir.

### Kontroller

```bash
npm run build
npm run lint
```

Otomatik test ve kalite kontrollerinin sonuçlarını [GitHub Actions sayfasından](https://github.com/Taylan789/MobilyaCAD/actions) takip edebilirsin.

## 🗺️ Yol haritası

MobilyaCAD'i adım adım daha kapsamlı bir mobilya CAD/CAM platformuna dönüştürüyoruz.

- [x] 3D oda ve mobilya yerleşiminin temel akışı
- [x] Mobilya taşıma, döndürme ve boyutlandırma
- [x] Yerleşim çakışması ve oda sınırı kontrolleri
- [x] Malzeme kataloğu ve mobilya-malzemesi bağlantısı
- [x] Temel üretim parçalarında malzeme kimliğini izleme
- [ ] Çekmece grupları için bağımsız malzeme seçimi
- [ ] Parça bazında malzeme, kalınlık ve kenar bandı yönetimi
- [ ] Daha fazla mobilya ailesi için parametrik konstrüksiyon
- [ ] Gelişmiş kesim listesi ve levha yerleşim optimizasyonu
- [ ] Proje geçmişi, geri al/yinele ve otomatik kayıt
- [ ] Doğrulanmış üretim iş akışları ve genişletilebilir CNC çıktı altyapısı

Ayrıntılı ve güncel teknik plan: **[PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md)**  
Son geliştirmelerin kaydı: **[AI_PROGRESS.md](./AI_PROGRESS.md)**

## 🧪 Kalite ve doğrulama yaklaşımı

Her geliştirmede mümkün olduğunda otomatik test eklenir veya mevcut testler genişletilir. Derleme, lint ve QA sonuçları GitHub Actions üzerinden izlenir.

- Ölçü ve geometri hesaplarında milimetre tutarlılığı önemlidir.
- Proje dosyalarında eski sürümlerle uyumluluk gözetilir.
- Üretim ve CNC verileri, ilgili makine standardı ve atölye koşulları doğrulanmadan kesin kabul edilmez.
- Tamamlanmamış özellikler tamamlanmış gibi gösterilmez.

## 🤝 Katkı ve geri bildirim

Hata bildirimi, özellik önerisi ve katkılar değerlidir.

1. Depoyu forklayın.
2. Değişikliğiniz için ayrı bir dal oluşturun.
3. Açıklayıcı bir commit hazırlayın.
4. Değişikliğinizi anlatan bir Pull Request gönderin.

Öneri ve hata bildirimlerini [GitHub Issues](https://github.com/Taylan789/MobilyaCAD/issues) üzerinden paylaşabilirsiniz.

## 📁 Depo yapısı

```text
MobilyaCAD/
├── .github/
│   └── workflows/       # CI, QA ve Pages iş akışları
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/  # Arayüz, mobilya ve 3D görünüm bileşenleri
│       ├── data/        # Katalog ve uygulama verileri
│       ├── engine/      # Geometri ve üretim hesaplama mantığı
│       ├── hooks/
│       └── types/       # TypeScript veri modelleri
├── PRODUCT_ROADMAP.md
├── AI_PROGRESS.md
└── README.md
```

---

<div align="center">

### 🪵 Mobilya tasarımının geleceğini birlikte şekillendirelim.

**MobilyaCAD** · Açık kaynak · Sürekli geliştirme

<sub>Bir fikirle başladı. Hedefimiz, tasarımdan üretim hazırlığına uzanan güçlü bir araç seti oluşturmak.</sub>

<br>

<a href="https://taylan789.github.io/MobilyaCAD/">🚀 Canlı Demo</a>
&nbsp; · &nbsp;
<a href="https://github.com/Taylan789/MobilyaCAD">⭐ GitHub Deposu</a>
&nbsp; · &nbsp;
<a href="https://github.com/Taylan789/MobilyaCAD/issues">💬 Geri Bildirim</a>

</div>
