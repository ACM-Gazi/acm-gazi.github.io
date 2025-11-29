---
title: Siber Güvenlik Çalışma Grubu Yol Haritası
date: 2025-01-01T11:27:00
logo: "/roadmaps/siber-gvenlik.png"
preparers:
  - Burak Suat Erman
---

## 1. Genel Tanıtım

- Siber Güvenlik bilişim teknolojilerinin bilgi sistemlerini, ağları ve daha önemlisi verileri kötü niyetli saldırganlardan muhafaza eden alt dalıdır.
- Kurumsal ve kişisel varlıkların (veri, para, itibar, sistem sürekliliği) gizliliğini (**C**onfidentiality), bütünlüğünü (**I**ntegrity) ve erişilebilirliğini (**A**vailability) sağlamaya çalışır. Bu üç temel prensibe **CIA** üçlemesi denir.
- Dijitalleşmenin artmasıyla (IoT, bulut bilişim, uzaktan çalışma) siber saldırıların sayısı ve karmaşıklığı artmıştır. Finans, sağlık, hükümet, e-ticaret ve kritik altyapılar (enerji, su, telekomünikasyon) başta olmak üzere **her sektörde** hayati öneme sahiptir.
- Sürekli ve hızlı büyüyen, yüksek talep gören ve yüksek maaş potansiyeline sahip bir alandır. Neredeyse her şirketin bir siber güvenlik uzmanına veya ekibine ihtiyacı vardır. **İş güvenliği** yüksek bir alandır. Ancak bazı durumlarda basit hatalar bile **ölümcül** sonuçlara yol açabilir.

---

## 2. Alt Dallar ve Uzmanlık Alanları

Bu alanın altında yer alan alanlar nelerdir?

| Alt Alan                                                          | Kısa Açıklama                                                                                                                                                                                                       | Uygulama Örneği                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ağ Güvenliği (Network Security)**                               | Bilgisayar ağlarının ve erişilebilirliklerinin istenmeyen 3. şahıslardan korunması                                                                                                                                  | Güvenlik Duvarı (**Firewall**) ve İzinsiz Giriş Tespit/Engelleme Sistemlerinin (**IDS/IPS**) tasarlanması, yönetimi, bakımlarının yapılması vs.                                                    |
| **Uygulama Güvenliği (Application Security)**                     | Uygulamaların hem geliştirme hem de güncelleme kısmında güvenlik açıklarına (örn. XSS, SQL Injection) karşı koruması                                                                                                | **Güvenli Yazılım Geliştirme Yaşam Döngüsü (SDLC)** süreçlerinde aktif rol almak.                                                                                                                  |
| **Sızma Testi (Penetration Testing / Pentesting)**                | Bir bilişim sistemi üzerine planlı ve etik bir şekilde simüle edilmiş saldırılar (**Advisory Attack Simulation**) gerçekleştirerek sistemin test edilmesi, tespit edilen açıkların düzenli bir şekilde raporlanması | Bir şirketin web sitesindeki zafiyetleri bulmak ve raporlamak.                                                                                                                                     |
| **Güvenlik Operasyonları Merkezi / Mavi Takım (SOC / Blue Team)** | Bir sistemin güvenliğini ilgilendirecek olayların gerçek zamanlı olarak izlenmesi, analiz edilmesi, gerekiyorsa karşılık verilip raporlanması ve bu sistemlerin otomatikleştirilmesi                                | **SIEM (Security Information and Event Management)** araçlarıyla logları takip edip zararlı yazılımlara (örn. bir fidye yazılımı / ransomware) karşı aktif koruma sağlamak ve saldırıyı durdurmak. |
| **Kriptografi (Cryptography)**                                    | Verilerin iletilmesi ve depolanması esnasında şifrelenerek gizlenmesi                                                                                                                                               | **HTTPS (SSL/TLS)** protokolleri yardımıyla istemci (client) ve sunucu (server) aradaki iletişimin korunması.                                                                                      |
| **Kimlik ve Erişim Yönetimi (IAM)**                               | Doğru kişilerin doğru bilgilere doğru zamanda erişmesini sağlayarak kötü niyetli şahısların engellenmesi                                                                                                            | Çift Faktör Doğrulama (**2FA**) sisteminin kurulması ve yönetilmesi.                                                                                                                               |
| **Risk Yönetimi ve Uyum (GRC)**                                   | Yasal çerçevelere, sektör standartlarına (ISO 27001, KVKK vb.) uyumun sağlanması, güvenlik risklerinin değerlendirilmesi ve yönetilmesi                                                                             | Şirket politikalarının yasal gerekliliklere göre düzenlenmesi ve iç/dış denetim süreçlerini yönetmek.                                                                                              |

---

## 3. Temel Konular ve Kavramlar

Öğrenilmesi gereken temel konular ve açıklamaları:

| Temel Konu                                         | Neden Önemli?                                                                                                                                                                                    | Öğrenme Sırası       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| **Temel Ağ Bilgisi (TCP/IP, OSI Modeli)**          | Siber güvenlik dalının temeli ağlara dayanır. Protokollerin, iletişim katmanlarının nasıl işlediğini bilmek, saldırı ve savunmayı anlamanın ilk adımıdır.                                        | 1. Başlangıç         |
| **Güvenlik İlkeleri (CIA Üçlemesi)**               | Gizlilik, Bütünlük, Erişilebilirlik. Stratejilerimizin temeli bu üçlemeye dayanır.                                                                                                               | 1. Başlangıç         |
| **Linux İşletim Sistemi ve Komut Satırı**          | Güvenlik araçlarının ve hatta sunucuların çoğu Linux üzerinde çalışır. Ayrıca Linux, sistem kaynaklarını daha verimli kullandığı ve açık kaynaklı olduğu için neredeyse her zaman ilk tercihtir. | 2. Başlangıç - Orta  |
| **Temel Kodlama Bilgisi (Python / Bash)**          | Otomasyon, exploit geliştirme, veri analizi ve hızlı scriptler geliştirmek için bu dillerde yetkin olmak kritik önem arz etmektedir.                                                             | 2. Başlangıç / Orta  |
| **Web Uygulama Temelleri**                         | Uygulama güvenliği (Web App Security) zafiyetlerini (OWASP Top 10) anlamak ve test etmek için web iletişiminin temelini bilmek gerekir.                                                          | 2. Başlangıç / Orta  |
| **Zafiyet Tarama ve Yönetimi**                     | Sistemlerdeki güvenlik açıklarının tespit edilmesi ve bunlarla önceliklerine göre ilgilenip çözülmesi sürecidir.                                                                                 | 3. Orta              |
| **Kötü Amaçlı Yazılımlar (Malware) ve Türleri**    | Virüs, fidye yazılımı (**ransomware**) truva atı (**trojan**) gibi farklı kötü amaçlı yazılımların çalışma prensiplerini bilmek siber güvenlik alanında başarılı olmak için çok önemlidir.       | 3. Orta              |
| **Bulut Güvenliği Temelleri (Cloud Security)**     | AWS, Azure, GCP gibi bulut hizmetlerinin temel güvenlik modelleri ve paylaşılan sorumluluk modellerini anlamak, özellikle büyük projelerde güvenliğin sağlanması ve dijitalleşmenin temelidir.   | 4. İleri             |
| **Mobil Uygulama Güvenliği (Mobile App Security)** | iOS ve Android uygulamalarındaki güvenlik açıklarını bulmak, alınabilecek en doğru tedbirleri almak, şirketin veri güvenliğini sağlamak için atılması gereken kritik adımlardandır.              | 4. İleri             |
| **Tehdit İstihbaratı (Threat Intelligence)**       | Güncel tehditleri, saldırgan grupları, taktiklerini, tekniklerini ve prosedürlerini (TTPs) anlamak, proaktif savunma için kritiktir.                                                             | 4. İleri             |
| **Tersine Mühendislik (Reverse Engineering)**      | Derlenmiş yazılımların kaynak koduna bakılmadan işlevini, potansiyel zafiyetlerini belirlemek, özellikle şekilde malware analizleri yapmanın birinci aşamasıdır.                                 | 5. Çok İleri / Uzman |
| **Sömürü Geliştirme**                              | Bulunan bu zafiyetleri kullanarak sistem kontrolünü ele geçirme aşamalarının otomatikleştirilmesi ve gereken kodun sıfırdan yazılması.                                                           | 5. Çok İleri / Uzman |

---

## 4. Ücretsiz Kaynaklar

Videolar, online kurslar, makaleler vb.

| Kaynak Adı                                                        | Tür                      | Link                                                                 | Not / Öneri                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TryHackMe                                                         | Online Platform / Lab    | https://tryhackme.com                                                | Siber güvenliğin alt alanlarını uygulamalı ve oyunlaştırılmış şekilde öğrenmek için eşsiz bir kaynaktır.                                                   |
| Hack The Box Academy                                              | Online Platform / Eğitim | https://academy.hackthebox.com                                       | Ücretsiz modüller sınırlı olduğundan ek bilgi edinmek için başka kaynaklara da danışmak önemli.                                                            |
| Professor Messer's SY0-701 Security+ Study Group - September 2025 | Video Kurs               | https://www.youtube.com/watch?v=g0zDNJwBT5I                          | Sertifika odaklı, CompTIA Security+ için örnek sorular.                                                                                                    |
| Cybrary                                                           | Online Eğitim Platformu  | https://www.cybrary.it                                               | Ücretsiz eğitimlerden faydalanılabilir. Ancak kurs ücretleri cep yakacak düzeyde pahalı.                                                                   |
| Google IT Support Professional Certificate                        | Sertifika / Kurs         | https://www.coursera.org/professional-certificates/google-it-support | Tamamen ücretsiz ve IT sektöründe başlangıç seviye bir iş için gereken bilgileri verdiğini iddia eden bilişim devi Google tarafından hazırlanan sertifika. |
| PicoCTF                                                           | CTF platformu            | https://picoctf.org / https://play.picoctf.org                       | Siber güvenlikle ilgili konularda uygulama imkanı sağlayan TryHackMe benzeri olup daha uygulama ağırlıklıdır.                                              |

---

## 5. Popüler Teknolojiler, Programlama Dilleri ve Kütüphaneler

Bu alanda sıklıkla kullanılan teknolojiler:

| Araç / Dil / Kütüphane                  | Kullanım Amacı                                                                                | Öğrenme Kaynağı                                                                                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python                                  | Otomasyon, Veri Analizi, Sömürü Geliştirme, Ağ Programlama...                                 | MIT, Introduction to Computer Science And Programming In Python, https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/download |
| Linux (Örn. Kali, Parrot, Arch, Fedora) | Güvenlik Araçlarının Çalıştırılması, Sunucu ve Ağ Sistemleri Yönetimi, Pentesting             | TryHackMe - Linux Fundamentals odaları                                                                                                                                            |
| Wireshark                               | Ağ trafiği yakalama ve analiz etme (Packet Analysis)                                          | Wireshark Resmi Dökümantasyon, Youtube: "Wireshark Tutorial for Beginners \| Network Scanning Made Easy - Anson Alexander"                                                        |
| SIEM Araçları (Örn. Splunk Free)        | Güvenlik loglarını toplama, analiz etme, tehditlerin tespit edilmesi                          | Splunk'ın kendi eğitim ve sertifika kısmı, https://www.splunk.com/en_us/training.html                                                                                             |
| Metasploit                              | Sızma zesti (pentesting), zafiyet sömürüsü (exploitation), yük (payload) oluşturma ve yönetme | Metasploit Resmi Dokümantasyon, TryHackMe - Metasploit Framework odası, Offensive Security (OffSec) eğitimleri (örneğin PWK/OSCP)                                                 |

---

## 6. Örnek Projeler

Bu konuyu öğrenirken geliştirilebilecek örnek projeler:

| Zorluk Seviyesi | Proje                                         | Proje Açıklaması                                                                                                                                                                                                                            | Kullanılacak Teknolojiler                                                      |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Kolay           | Temel Ağ Tarama ve Raporlama Betiği           | Belirli bir IP aralığındaki açık portları tarayan ve çıktıları okunabilir bir rapora dönüştüren basit bir Python betiği yazmak                                                                                                              | Python (*Socket*, *subprocess* veya *scapy* kütüphanesi), Linux (Komut Satırı) |
| Orta            | Ağ Protokolü Analiz Raporu                    | Kendi yerel ağınızda (ev/lab) Wireshark kullanarak belirli bir süre ağ trafiğini yakalamak. Elde edilen trafiği analiz ederek en çok kullanılan protokolleri, en yoğun konuşan cihazları ve olası anormal/şifresiz trafiği raporlamak       | Wireshark, Kismet                                                              |
| Orta            | SIEM Kural Geliştirme ve Uyarı Simülasyonu    | Basit bir log kaynağını (Linux logları) Splunk'a entegre ederek, belirli sayıda başarısız giriş denemesi gibi şüpheli aktiviteleri tespit eden bir uyarı kuralı (Alert) oluşturmak                                                          | SIEM Araçları (Splunk Free), Linux, Temel Kodlama (logları simüle etmek için)  |
| Zor             | Zafiyet Labı Tasarlamak ve Sızma Testi Yapmak | Sanal bir makine (örneğin Metasploitable2 veya zafiyetli bir Docker görüntüsü) kurmak. Metasploit kullanarak zafiyetleri sömürme (exploitation) denemeleri yapmak, sistemde kalıcı erişim sağlamak ve bu sürecin tüm adımlarını belgelemek. | Metasploit, Docker, Kali Linux                                                 |
| Zor             | Python ile Ağ Zafiyeti Sömürüsü Geliştirme    | Var olduğu bilinen, basit bir zafiyet için (örneğin Buffer Overflow) Metasploit yerine, sadece Python kullanarak çalışan bir sömürü (exploit) kodu yazmak                                                                                   | Python, Linux, picoCTF veya benzeri bir CTF platformu                          |

---
