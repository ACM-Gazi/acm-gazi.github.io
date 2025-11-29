---
title: Gömülü Sistemler Çalışma Grubu Yol Haritası
date: 2025-01-01T11:27:00
logo: "/roadmaps/gömülü-sistemler.png"
preparers:
  - Muhammed Hüsnü Kayahan
  - Mehmet Aydın Erbey
---

## 1. Genel Tanıtım

- Gömülü Sistemler nedir?
    - Gömülü sistemler, belirli bir görevi yerine getirmek için donanım ve yazılımın bir arada çalıştığı özel bilgisayar sistemleridir. Genellikle sensörlerden veri alıp bu veriye göre tepki veren küçük cihazlarda bulunurlar.

- Hangi temel probleme çözüm üretir?
    - Gömülü sistemler, belirli görevlerin hızlı, güvenilir ve otomatik şekilde yapılması ihtiyacına çözüm üretir. Karmaşık sistemlerde insan müdahalesini azaltarak hataları önler ve işlemleri gerçek zamanlı hale getirir.
- Günümüzdeki önemi ve kullanım alanları nelerdir?
    - Gömülü sistemler günümüzde teknolojinin kalbinde yer alır çünkü birçok cihazın akıllı, hızlı ve güvenilir şekilde çalışmasını sağlar. Ulaşım, sağlık, savunma, haberleşme ve ev elektroniği gibi alanlarda yaygın olarak kullanılır. Örneğin otomobillerde hava yastığı, fren kontrolü ve motor yönetimi; hastanelerde kalp pilleri ve tıbbi izleme cihazları; evlerde akıllı televizyonlar, çamaşır makineleri ve klimalar hep gömülü sistemlerle çalışır. Bu sistemler, günlük yaşamı kolaylaştırmanın yanı sıra endüstride üretim süreçlerini otomatikleştirerek verimliliği artırır ve güvenliği sağlar.

- Bu alt dalın sektördeki konumu nasıldır?
    - Gömülü sistemler sektörde oldukça güçlü ve sürekli büyüyen bir konuma sahiptir çünkü hemen her endüstride kullanılır. Otomotivden savunmaya, tıptan telekomünikasyona kadar birçok alanda gömülü sistem mühendislerine ihtiyaç duyulur. Akıllı cihazların ve nesnelerin interneti (IoT) teknolojisinin yaygınlaşmasıyla bu alandaki iş olanakları da hızla artmaktadır. Şirketler, daha küçük, daha hızlı ve enerji verimli sistemler geliştirebilmek için gömülü yazılım ve donanım konusunda uzman kişilere öncelik verir. Bu nedenle gömülü sistemler hem günümüzün hem de geleceğin en önemli mühendislik alanlarından biridir.


---

## 2. Alt Dallar ve Uzmanlık Alanları

Bu alanın altında yer alan alanlar nelerdir?

| Alt Alan                           | Kısa Açıklama                            | Uygulama Örneği |
| --------                           | -------------                            | --------------- |
| Mikrodenetleyici Sistemleri        | Donanım üzerinde doğrudan çalışan, belirli bir işlevi yerine getiren küçük işlemci tabanlı sistemlerdir.                                       |   Arduino ile sensör verisi okuyup LED kontrol etmek.              |
|Gerçek Zamanlı Sistemler (RTOS)                                    |  Zamanın kritik olduğu, işlemlerin belirli süre içinde tamamlanması gereken sistemlerdir.                                        | Araba hava yastığı veya fren kontrol sistemi.                |
|                   IoT (Nesnelerin İnterneti)                 |    Gömülü sistemlerin internet üzerinden birbirine bağlanarak veri paylaşması ve uzaktan kontrol edilmesidir.                                      |     Akıllı ev sistemlerinde sıcaklık sensörünün mobil uygulamaya veri göndermesi.            |
|                Gömülü Yapay Zeka                    |                  Küçük cihazlarda veri işleyip karar verebilen yapay zekâ modellerinin çalıştırılmasıdır.                        |        Güvenlik kameralarının gerçek zamanlı yüz tanıma yapması.         |
|            Otomotiv Gömülü Sistemleri                        |    Araçlarda güvenlik, performans ve konforu artırmak için geliştirilen özel sistemlerdir.                                      |          ABS, otomatik park veya otonom sürüş sistemleri.       |
---

## 3. Temel Konular ve Kavramlar

Öğrenilmesi gereken temel konular ve açıklamaları:

| Temel Konu                  | Neden Önemli?                                                     | Öğrenme Sırası |
|----------------------------|-------------------------------------------------------------------|----------------|
| C Programlama              | Gömülü kartlar genelde C ile programlanır, temel dil bilgisidir   | 1 |
| Temel Elektronik Bilgisi   | Sensör, direnç, voltaj vb. anlamadan devre kurulamaz              | 2 |
| Mikrodenetleyici Kullanımı | Arduino / STM32 gibi kartlarla gerçek uygulama geliştirmeyi sağlar| 3 |
| Sensör ve Motor Bağlama    | Gerçek dünyadan veri alıp hareket kontrolü yapmayı öğretir        | 4 |
| Temel Haberleşme (UART/I2C)| Kartın başka cihazlarla konuşmasını sağlar                        | 5 |
| Basit RTOS Mantığı         | Birden fazla işi aynı anda düzenli çalıştırmayı öğretir           | 6 |

---

## 4. Ücretsiz Kaynaklar

Videolar, online kurslar, makaleler ve uygulamalı eğitimler ile gömülü sistemleri başlangıç seviyesinden ileri seviyeye öğrenebilirsiniz. Aşağıdaki kaynaklar STM32 ve modern gömülü sistem tasarımı üzerine odaklanmaktadır.

| **Kaynak Adı** | **Tür** | **Link** | **Not / Öneri** |
|----------------|---------|----------|----------------|
| STM32 Education (BTK) | Video / Doküman | https://www.btkakademi.gov.tr/portal/course/stm32-ile-gomul-yazilm-gelistirme-35649 | BTK üzerinden STM32 eğitimleri ve uygulamalı örnekler. |
| Miro Samek - Modern Embedded Systems | Video / Makale | https://www.youtube.com/playlist?list=PLb-MsRpo_wlLW0EWRpAqnbbDsf4kxSI1x | Modern gömülü sistem tasarımı ve uygulamaları. |
| Coşkun Taşdemir - Gömülü Sistemler Serisi | Video / Eğitim | https://www.youtube.com/watch?v=LYGJ0sUCB5s&list=PLmkV2uU8kdpJ3J7Fd_i846_OrAcILV0GC | Gömülü sistemler temelleri ve STM32 projeleri. |
| ElectroBrains - STM32 ile Gömülü Sistemlere Giriş | Video / Eğitim | https://www.youtube.com/watch?v=0ErzhvmUwXg&list=PLtXAZpyAEX3_oMZNTz3CVuMqwRD2phxlK | STM32 ile uygulamalı gömülü sistem dersleri. |
| Sinyal ve Sistemler (Mühendislik) | Online Kurs | https://www.udemy.com/course/sinyal-ve-sistemler-muhendislik/ | Sinyal işleme ve sistem analizini öğrenmek için uygundur. |
| Sayısal Sistemler (Dijital) (Logic, Mantık Devreleri) | Online Kurs | https://www.udemy.com/course/saysal-sistemler-dijital-logic-mantk-devreleri/ | Dijital devre ve mantık bilgisi kazandırır; temel oluşturur. |



---

## 5. Popüler Teknolojiler, Programlama Dilleri ve Kütüphaneler

Bu alanda sıklıkla kullanılan teknolojiler:

| Araç / Dil / Kütüphane | Kullanım Amacı | Öğrenme Kaynağı |
|------------------------|----------------|----------------|
| C | Mikrodenetleyicileri programlamak için temel dil | STM32 Education (BTK), Fehmi UYAR, Coşkun Taşdemir |
| C++ | Daha karmaşık gömülü projelerde nesne yönelimli programlama | Udemy kursları, Fehmi UYAR |
| Arduino IDE | Arduino kartlarını programlamak ve test etmek | Arduino Resmi Eğitimleri, Robo90 |
| STM32CubeIDE | STM32 mikrodenetleyicileri geliştirmek | STM32 Education (BTK), ElectroBrains |
| FreeRTOS | Gerçek zamanlı işletim sistemi mantığını öğrenmek ve uygulamak | Gömülü Sistemler Eğitimi (Zenopix.com) |

---

## 6. Örnek Projeler  
Bu konuyu öğrenirken geliştirilebilecek örnek projeler:

| Zorluk Seviyesi | Proje | Proje Açıklaması | Kullanılacak Teknolojiler |
|-----------------|-------|-----------------|---------------------------|
| Başlangıç | LED Yakıp Söndürme | Basit bir LED’i yakıp söndürerek mikrodenetleyici ve Arduino IDE kullanımını öğrenme | Arduino, C, Arduino IDE |
| Başlangıç | Buton Kontrollü LED | Buton ile LED’in açılıp kapanmasını sağlama; giriş/çıkış kontrolünü öğrenme | Arduino, C, Arduino IDE |
| Orta | Sıcaklık Sensörü ile Fan Kontrolü | Sensör verisine göre fanın hızını kontrol etme; veri okuma ve PWM uygulaması | Arduino/STM32, C, Sensörler, PWM |
| Orta | LCD ile Sayısal Gösterge | Sensör verilerini LCD ekranda görüntüleme; kullanıcı arayüzü deneyimi | Arduino/STM32, C, LCD ekran, Sensörler |
| İleri | Servo Motor ile Robot Kol | Servo motorları kontrol ederek basit bir robot kol tasarlama | STM32/Arduino, C/C++, Servolar, Sensörler |
| İleri | IoT Sıcaklık ve Nem Takibi | Sensör verilerini Wi-Fi üzerinden buluta gönderme ve web uygulamasında gösterme | ESP32/STM32, C/C++/MicroPython, Sensörler, Wi-Fi, IoT Platformu |

---
