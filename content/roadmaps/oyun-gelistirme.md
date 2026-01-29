---
title: Oyun Geliştirme Çalışma Grubu Yol Haritası
date: 2025-01-01T11:27:00
logo: "/roadmaps/oyun-geliştirme.png"
preparers:
  - Kayra Orbay
---

## 1. Genel Tanıtım

- **Oyun geliştirme nedir?**  
  Oyun geliştirme, interaktif dijital deneyimler (oyunlar) üretme sürecidir. Bu süreç; tasarım, programlama, sanat, ses, yapay zekâ, kullanıcı deneyimi ve optimizasyon gibi çok sayıda alt disiplini birleştirir. “Oyun geliştirme, teknolojiyi duyguyla birleştiren mühendisliktir.”

- **Hangi temel probleme çözüm üretir?**  
  Oyun geliştirmeci olarak ilk sorumuz: “Bir insan, sanal bir dünyada gerçek hisleri nasıl yaşar?” Bu problem teknik olarak şu alt sorunlara ayrılır:
  - Gerçekçi fizik simülasyonu (nesnelerin doğal tepkisi)
  - Akıcı görsel performans (rendering & optimizasyon)
  - Tutarlı yapay zekâ (NPC davranışı, stratejik karar alma)
  - Oyuncu eylemlerine anlık geri bildirim (input sistemleri)
  - Oyun döngüsünün matematiksel dengesini kurmak

- **Günümüzdeki önemi ve kullanım alanları**  
  Oyun geliştirme bugün sadece eğlence değildir. Dünya çapında 250 milyar dolarlık bir sektör hâline gelmiş, aynı zamanda diğer alanlara da yayılmıştır:

| Alan                                | Uygulama                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------ |
| 🎓 **Eğitim (Game-based learning)** | Simülasyon oyunlarıyla öğrenme (örnek: Kerbal Space Program, CodeCombat) |
| 🧠 **Psikoloji / Terapi**           | Duygu düzenleme ve bilişsel beceri geliştirme oyunları                   |
| 🪖 **Savunma / Simülasyon**         | Askerî veya uçuş eğitiminde kullanılan oyun motorları                    |
| 🏥 **Sağlık**                       | VR/AR destekli rehabilitasyon uygulamaları                               |
| 📱 **Mobil Ekonomi**                | Mobil oyunlar, reklam ve gelir modellerinde en büyük pazar payına sahip  |
| 🤖 **Yapay Zekâ & AR/VR**           | Gerçek zamanlı 3D dünya üretimi ve insan–makine etkileşimi test alanı    |

  Yani bugün oyun motorları (Unity, Unreal, Godot), sadece oyun değil; film, mimari, eğitim ve AR uygulamalarında da çekirdek teknoloji hâline gelmiştir.

- **Sektördeki konumu**  
  Oyun sektörü, teknoloji endüstrisinin en dinamik ve çok disiplinli alanlarından biridir. Yazılım sektöründe en çok istihdam artışı gösteren alt dallardan biridir. Türkiye’de Peak Games, TaleWorlds, Masomo, Axell Studio, Dream Games gibi şirketler globalde aktif. Dünya genelinde Riot Games, Ubisoft, Epic Games, CD Projekt, Supercell gibi devler üretim merkezi. Indie (bağımsız) geliştiriciler için de Steam, itch.io, Epic Store gibi platformlar sayesinde artık yayınlamak erişilebilir.  
  Sektörün şu anki yönelimleri: Yapay zekâ ile içerik üretimi (AI-assisted design), mobil & cross-platform oyunlar, VR/AR deneyimleri, küçük ama derin oyunlara yönelen indie patlaması. Oyun geliştirme artık sadece “oyun yapma” değil; geleceğin sanal dünyalarını inşa etme alanıdır.



## 2. Alt Dallar ve Uzmanlık Alanları

Bu alanın altında yer alan alanlar nelerdir?

| Alt Alan                   | Kısa Açıklama                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| Gameplay Proglama          | Oyunun “oynanabilir” hâle gelmesini sağlayan mantıksal sistemlerin kodlandığı alandır     |
| Engine / Tools Development | Oyun motorlarının kendisini veya geliştirici araçlarını üreten alandır                    |
| Technical Art              | Sanat ile mühendisliğin birleştiği ara disiplindir                                        |
| Game Design                | Oyun deneyiminin beyni; Mekanikleri, görevleri, oyuncu akışını ve zorluk eğrisini kurgular |
| Artificial Intelligence    | NPC’lerin, düşmanların veya müttefiklerin “zekice” davranmasını sağlayan sistemleri üretir |
| Level Design               | Oyun dünyasının fiziksel düzenini planlar.(Haritaların yapısı, bulmacaların yerleşimi vb.) |
| Game Audio / Sound Design  | Oyundaki tüm ses atmosferini kurar: müzik, efekt, diyalog, çevre sesi.                    |
| Game Production            | Oyun geliştirme sürecini yöneten, zaman, bütçe ve ekip koordinasyonunu sağlayan alandır   |
| Network & Multiplayer Development | Çok oyunculu oyunların bağlantı, senkronizasyon ve veri yönetim kısmını üstlenir.  | 


## 3. Temel Konular ve Kavramlar
Öğrenilmesi gereken temel konular ve açıklamaları:

| Temel Konu                                  | Neden Önemli?                                                 |
| ------------------------------------------- | ------------------------------------------------------------- |
| Temel Programlama Mantığı                   | Oyunun mantığını, hareketini ve etkileşimini kodla kurabilmek |
| Oyun Motoru Temelleri                       | Oyun motoru, kodun fiziksel dünyaya yansıdığı yerdir          | 
| Oyun Programlama Mantığı                    | Oyunun nasıl işlediğini, olayların hangi sırayla gerçekleştiğini ve oyuncu etkileşimlerinin sisteme nasıl dönüştüğünü belirleyen temel yapı taşını oluşturur. | 
| Oyun Sanatı ve Görsel Mantık                | Oyuncunun dünyaya duygusal olarak bağlanmasını ve oyunun atmosferini sezgisel biçimde anlamasını sağlayan en güçlü anlatım aracıdır |
| Oyun Mekanikleri ve Sistem Tasarımı         | Oyuncuya anlamlı seçimler sunarak deneyimi eğlenceli, dengeli ve tekrar oynanabilir hâle getiren oyunun temel iskeletidir |
| Fizik, Matematik ve Yapay Zekâ              | Oyundaki hareketlerin, tepkilerin ve düşman davranışlarının gerçekçi ve tutarlı şekilde işlemesini sağlayarak sanal dünyayı inandırıcı kılar |
| Optimizasyon, Performans ve Teknik Derinlik | Oyunun tüm cihazlarda akıcı, hatasız ve istikrarlı çalışmasını sağlayarak oyuncu deneyimini korur |
| Ses, Arayüz ve Atmosfer                     | Oyuncunun duygusal tepkisini yönlendirip dünyaya tam anlamıyla dalmasını sağlayan deneyimin duyusal bütünlüğünü oluşturur |
| Proje Üretimi ve Yayınlama                  | Geliştirilen fikrin somut bir ürüne dönüşüp gerçek oyuncularla buluşmasını sağlayarak sürecin amacına ulaşmasını sağlar |



## 4. Ücretsiz Kaynaklar

Videolar, online kurslar, makaleler vb.

| Kaynak Adı | Tür | Link | Not / Öneri |
| --------- | --- | ---- | ----------- |
| Brackeys – How to make a game (Unity)  | Video | [YouTube playlist](https://www.youtube.com/watch?v=j48LtUkZRjU&list=PLPV2KyIb3jR53Jce9hP7G5xC4O9AgnOuL) |  |
| GDQuest – Godot beginner tutorials     | Video | [YouTube playlist](https://www.youtube.com/watch?v=42HKCFf5Lf4&list=PLhqJJNjsQ7KEcm-iYJ2a8UCRN62bTneKa) |  |
| Unreal Engine Blueprint beginner series| Video | [YouTube playlist](https://www.youtube.com/watch?v=IipvT6aGinM&list=PL2A3wMhmbeAq3WOT7kQ0EGby1YMb0zj5)  |  |
| gdquest.github.io | interaktif internet sitesi | [Godot GDScript dersleri](https://gdquest.github.io/learn-gdscript/?ref=godot-docs#course/lesson-1-what-code-is-like/lesson.tres) |  |



## 5. Popüler Teknolojiler, Programlama Dilleri ve Kütüphaneler

Bu alanda sıklıkla kullanılan teknolojiler:

| Araç / Dil / Kütüphane         | Kullanım Amacı        |
| ------------------------------ | --------------------- |
| Unity (C#)                     | Indie ve mobil odaklı | 
| Godot (GDScript/C#)            | 2D indie oyunlar      |
| Unreal Engine(C++ / Blueprint) | PC/Console            |


## 6. Örnek Projeler

Bu konuyu öğrenirken geliştirilebilecek örnek projeler:

GODOT (Açık Kaynak, 2D ve 3D’ye uygun, hafif motor)

| Seviye           | Proje                                 | Kapsam                                                      | Neden  Önemli?                                                                  |
| ---------------- | ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 🟢 **Başlangıç** | **Toplama Oyunu (2D Coin Collector)** | Küçük bir haritada karakteri yönlendirip nesneleri toplama. | Giriş düzeyinde input, collision ve sinyal (signal) sistemini öğretir.         |
| 🟡 **Kolay**     | **Platformer (2D)**                   | Basit bir Mario tarzı zıplamalı bölüm.                      | Sprite, tilemap, yerçekimi, animasyon ve düşme mekaniğini tanıtır.             |
| 🔵 **Orta**      | **Top-down Dungeon Crawler**          | Haritada düşman ve kapılarla mini zindanlar.                | Oyuncu saldırısı, can sistemi, AI ve sahne geçişlerini öğretir.                |
| 🔴 **Zor**       | **Metroidvania Prototype (2D)**       | Haritalar arası geçiş, yetenek kazanımı, boss dövüşü.       | Komple oyun döngüsü, kayıt sistemi ve seviye tasarımı becerilerini geliştirir. |

UNITY (Endüstri Standardı, Mobil ve Indie için ideal)

| Seviye           | Proje                           | Kapsam                                          | Neden Önemli?                                                               |
| ---------------- | ------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| 🟢 **Başlangıç** | **Küp Zıplatma (Roll-a-Ball)**  | Topu yönlendirip skor toplanan mini oyun.       | Unity arayüzü, Rigidbody ve basit input kullanımını öğretir.                |
| 🟡 **Kolay**     | **2D Endless Runner**           | Sürekli ilerleyen, engellerden kaçmalı oyun.    | Sonsuz sahne döngüsü ve spawn sistemi öğrenilir.                            |
| 🔵 **Orta**      | **3D Third-Person Combat Demo** | Basit karakter, düşman ve saldırı sistemi.      | Animator Controller, state machine ve AI temelini kazandırır.               |
| 🔴 **Zor**       | **Mini RPG (Quest + Envanter)** | NPC görevleri, level sistemi, harita geçişleri. | Nesne tabanlı tasarım, scriptable object ve data management pratiği sağlar. |

UNREAL ENGINE (AAA Kalitesi, C++ ve Blueprint hibrit yapısı)

| Seviye           | Proje                             | Kapsam                                          | Neden Önemli?                                                         |
| ---------------- | --------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| 🟢 **Başlangıç** | **First-Person Template Modlama** | Hazır FPS şablonuna ek silah veya efekt ekleme. | Blueprint mantığını ve Unreal arayüzünü anlamayı sağlar.              |
| 🟡 **Kolay**     | **3D Labirent Oyunu (Blueprint)** | Zaman sınırlı çıkış bulma oyunu.                | Fizik, zamanlayıcı ve UI temelini öğretir.                            |
| 🔵 **Orta**      | **Third-Person Action Demo**      | Karakter combo sistemi ve düşman AI’sı.         | Animasyon blending, event dispatching ve hit detection öğretilir.     |
| 🔴 **Zor**       | **Mini Open-World Survival**      | Kaynak toplama, crafting, gündüz–gece döngüsü.  | C++ + Blueprint birleşimiyle tam ölçekli sistem geliştirmeyi öğretir. |
