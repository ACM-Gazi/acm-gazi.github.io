---
title: Genel Bilgisayar Bilimleri Yol Haritası
date: 2025-01-01T11:27:00
logo: "/roadmaps/genel-bilgisayar-bilimleri.png"
preparers:
  - ACM Gazi AR-GE Birimi
---

**Hazırlayan:** ACM Gazi AR-GE Birimi

---

## 1. Genel Tanıtım

- Bilgisayar bilimi nedir?
  
  Bilgisayar bilimi, bilgi işlemenin kuramsal temellerini ve bu bilgiyi pratiğe döken algoritma, yazılım ve donanım tasarımını inceler. Matematiksel düşünme, soyutlama ve problem çözme becerileri merkezde yer alır.

- Hangi temel probleme çözüm üretir?
  
  Karmaşık problemleri parçalara ayırıp doğru veri yapıları, algoritmalar ve mimarilerle çözmeyi hedefler. Verimli saklama, işleme ve iletim; güvenilirlik; ölçeklenebilirlik; kullanıcı deneyimi gibi boyutları kapsar.

- Günümüzdeki önemi ve kullanım alanları:
  
  Bulut bilişim, web ve mobil uygulamalar, yapay zekâ, veri bilimi, siber güvenlik, oyun, gömülü sistemler, blokzincir, HPC ve daha fazlası. Üretkenlik, otomasyon ve inovasyonun temel sürücüsü konumundadır.

---

## 2. Alt Dallar ve Uzmanlık Alanları

| Alt Alan              | Kısa Açıklama                                                          | Uygulama Örneği                               |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| Algoritmalar & Veri Yapıları | Verimli çözüm ve bellek kullanımını sağlayan temel yapı taşları      | Arama, sıralama, pathfinding                  |
| Yazılım Mimarisi      | Büyük sistemlerde katmanlı, modüler ve ölçeklenebilir tasarım          | Mikroservis, event-driven mimari              |
| Web & Mobil           | İstemci/sunucu uygulamaları ve kullanıcı arayüzleri                   | React/Next.js, Flutter                       |
| Veri Bilimi & ML      | Veriden öngörü çıkarma ve modelleri üretim ortamına alma               | Tahmin, öneri sistemleri                      |
| Sistem Programlama    | İşletim sistemleri, ağ, düşük seviye performans optimizasyonu          | Linux, ağ protokolleri, C/C++                 |
| Siber Güvenlik        | Sistem ve veriyi tehditlere karşı koruma                               | Güvenli kodlama, test, olay müdahalesi        |
| Bulut & DevOps        | Sürekli teslim, otomasyon, gözlemlenebilirlik                          | CI/CD, konteyner, Kubernetes                  |

---

## 3. Temel Konular ve Kavramlar

| Temel Konu                        | Neden Önemli?                                                                | Öğrenme Sırası |
| --------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| Programlama Temelleri (Python/JavaScript) | Temel akış kontrolü, fonksiyonel düşünme, hata ayıklama                        | 1              |
| Veri Yapıları & Algoritmalar      | Verimli ve doğru çözümler için gereklidir                                    | 2              |
| Yazılım Tasarım İlkeleri (SOLID, DRY) | Kod kalitesini ve bakımını iyileştirir                                        | 3              |
| Versiyon Kontrol (Git)            | Ekip çalışması, geri dönüş, sürümleme                                         | 4              |
| Web Temelleri (HTTP, HTML/CSS/JS) | Modern uygulamaların iskeleti                                                 | 5              |
| Veritabanları (SQL/NoSQL)         | Veriyi güvenli ve performanslı saklama                                        | 6              |
| Test & Kalite (Unit/Integration)  | Güvenilir ve sürdürülebilir ürün geliştirme                                   | 7              |
| Dağıtım & DevOps Temelleri        | Ürünün kullanıcıya güvenli ve hızlı ulaşması                                  | 8              |
| Güvenlik Temelleri                | Kimlik, yetkilendirme, veri koruma                                            | 9              |
| Ölçeklenebilirlik ve Performans   | Artan yükte sistemi sağlam tutmak                                             | 10             |

---

## 4. Ücretsiz Kaynaklar

| Tür      | Link                                                          | Not / Öneri                                       |
| -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Kitap    | https://cses.fi/book/book.pdf                                 | Algoritma ve veri yapıları temelleri              |
| Kurs     | https://www.coursera.org/learn/cs-fundamentals                | Bilgisayar bilimi giriş dersi                     |
| Kurs     | https://missing.csail.mit.edu/                                | Pratik CS araçları (CLI, Git, Shell)              |
| Video    | https://www.youtube.com/c/BenEater                           | Donanım ve düşük seviye konular                   |
| Video    | https://www.youtube.com/c/Computerphile                      | Çeşitli CS kavramlarının kısa açıklamaları        |
| Makale   | https://developer.mozilla.org/en-US/docs/Learn                | Web temelleri                                    |
| Kurs     | https://www.freecodecamp.org/learn                            | Web, JS, API, QA geniş kapsamlı                   |

---

## 5. Popüler Teknolojiler, Programlama Dilleri ve Kütüphaneler

| Araç / Dil / Kütüphane | Kullanım Amacı                     |
| ---------------------- | ---------------------------------- |
| Python                 | Hızlı prototipleme, veri/ML        |
| JavaScript/TypeScript  | Web, mobil (React Native), backend |
| SQL (PostgreSQL)       | İlişkisel veritabanı               |
| Docker                 | Paketleme, taşınabilirlik          |
| Git & GitHub/GitLab    | Sürüm kontrolü, işbirliği          |
| Linux Shell            | Otomasyon, sistem yönetimi         |
| Node.js/Express        | API geliştirme                     |
| React/Next.js          | Web arayüzleri                     |

---

## 6. Örnek Projeler

| Seviye   | Proje                           | Kapsam                                                | Neden Önemli?                                |
| -------- | -------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| 🟢 Başlangıç | Komut satırı “To-Do”            | CRUD, dosya okuma/yazma                               | CLI, dosya işlemleri, temel akış kontrolü    |
| 🟡 Kolay   | RESTful Notlar API              | CRUD, JWT auth, SQL                                  | API tasarımı, auth, DB etkileşimi            |
| 🔵 Orta    | Blog + Admin Panel (Fullstack)  | SSR/CSR, auth, rol yönetimi, test                    | Uçtan uca web uygulaması deneyimi            |
| 🔴 Zor     | Mikroservis “E-ticaret çekirdeği” | Ürün/ödeme servisleri, mesaj kuyrukları, gözlemlenebilirlik | Dağıtık mimari, ölçek, DevOps pratikleri     |
