# Supabase geliştirme veritabanı

Uygulama PostgreSQL'e NestJS ve Prisma üzerinden bağlanır. Supabase Data API kullanılmaz.

## Kurulum

1. `pnpm install` ve `pnpm db:generate` çalıştırın.
2. `packages/db/.env` içinde `MIGRATE_DATABASE_URL` alanına Supabase **Session pooler** yönetici adresini yazın. Paroladaki özel karakterleri URL biçiminde kodlayın. Bu dosya Git'e girmez.
3. `node packages/db/scripts/supabase.js setup` çalıştırın. Migration dosyaları uygulanır, RLS kuralları yüklenir, rastgele parolalı `app_runtime` hesabı oluşturulur. API'nin kısıtlı bağlantısı ve yerel giriş anahtarları `apps/api/.env` dosyasına kaydedilir. Yönetici bağlantısı API'ye verilmez.
4. `node packages/db/scripts/supabase.js verify` ilişki ve erişim sınırlarını geri alınan test kayıtlarıyla doğrular.
5. İstenirse `node packages/db/scripts/seed-demo.js` örnek veriyi oluşturur. Bu komut yalnızca kendi sabit demo kimliklerini kullanır; yeniden çalıştırınca kopya öğrenci üretmez. Demo öğrencilerinin isim/cinsiyet ve yurt adlarını günceller; gerçek verilerde kullanılmamalıdır.

Ortak Supabase veritabanına migration uygulamak için `migrate deploy` kullanın. `migrate reset` çalıştırmayın. Yeni migration dosyalarını ayrı yerel geliştirme veritabanında üretin ve Git üzerinden paylaşın. Yeni ekip üyesi mevcut proje için `setup` çalıştırıp ortak uygulama şifresini değiştirmek yerine ekipteki mevcut bağlantıyı güvenli kanaldan almalıdır.

## Veri ilişkileri

- `Institution`: yurt; adı ve öğrenci cinsiyeti. Cinsiyet arayüzde ayrıca gösterilmek zorunda değildir.
- `ScholarshipProgram`: yurtlardan bağımsız burs programı sözlüğü.
- `Student`: yurt, burs programı, üniversite, bölüm, sınıf ve cinsiyet.
- `User`: yönetici ve hoca giriş hesapları. Hocanın ana kurumu ders verdiği tüm yurtları sınırlamaz.
- `TeacherAssignment`: hoca + yurt + burs programı görevlendirmesi.
- `Group`: yurt + dönem + burs programı içindeki ders grubu.
- `GroupMembership`: öğrencinin ders gruplarına tarihli katılımı; aynı anda birden fazla grup mümkündür.
- `LessonSchedule`: hoca görevlendirmesine, gruba ve derse bağlı haftalık program.

Program/cinsiyet alanları mevcut eski kayıtlarla uyumluluk için boş olabilir. Cinsiyeti belirtilmiş yurda cinsiyeti eksik veya uyumsuz öğrenci eklenemez. Burs programı belirlenmiş ders grubunda program eşleşmesi ve uygun hoca görevlendirmesi zorunludur. Ders grubunun yurt/program kimliği geçmiş kayıtlar varsa değiştirilmez; yeni grup açılır. Aktif öğrenci üyelikleri varken öğrencinin yurt/programı uyumsuz biçimde değiştirilemez.

Hoca ayrıldığında önce hesabı pasif yapılabilir; dersleri ve görevlendirmeleri sonradan da kapatılabilir. Pasif hocanın görevlendirmesi yeniden aktif yapılamaz.

Her kullanıcı kendi işlem kaydını (`AuditLog`) yazar; hoca başka yurtta yoklama düzelttiğinde kayıt dersin yurduna yazılır. Başkası adına kayıt yazılamaz, kayıtlar değiştirilemez ve silinemez.

Hoca, aktif görevlendirmesine bağlı dersleri ve bu derslerin öğrencilerini farklı yurtlarda görebilir. Yurt yöneticisi kendi yurduyla sınırlıdır. Öğrenci giriş hesabı ve öğrenci ekranları bu aşamada eklenmemiştir.

## Excel'den öğrenci aktarımı

`POST /api/v1/students/import` (form alanı `file`). İlk satır başlıktır; sütunlar başlık adına göre okunur, sıra önemli değildir. Türkçe karakter ve büyük/küçük harf farkı dikkate alınmaz.

| Sütun                                                            | Zorunlu                       | Değer                      |
| ---------------------------------------------------------------- | ----------------------------- | -------------------------- |
| Öğrenci No, Ad, Soyad                                            | Evet                          |                            |
| Cinsiyet                                                         | Cinsiyeti tanımlı yurtta evet | K / Kız / E / Erkek        |
| Burs Programı                                                    | Hayır                         | Program kodu veya adı      |
| Sınıf                                                            | Hayır                         | Hazırlık veya 0-10         |
| Üniversite, Bölüm, Telefon, Veli Adı, Veli Telefon, Veli E-posta | Hayır                         |                            |
| Kayıt Tarihi                                                     | Hayır (boşsa bugün)           | YYYY-AA-GG veya GG.AA.YYYY |

Hatalı satırlar atlanır, diğerleri aktarılır. Yanıt `{ imported, errors }` döner; her hata satır numarasını içerir. Mevcut öğrenci numarası güncellenir; aktif grup üyeliği varken burs programı değiştirilemez.

## Testler

- `pnpm --filter @yoklama/api test`: Excel ayrıştırma birim testleri (veritabanı gerekmez).
- `node packages/db/scripts/supabase.js verify`: ilişki kuralları, RLS, hoca işlem kaydı, pasif hoca ve Supabase `anon` yetki kontrolleri; test kayıtları geri alınır.
- `node packages/db/tests/api-smoke.js`: önce `apps/api` içinde build alın. Giriş, görünürlük, başka yurtta yoklama düzeltme ve Excel aktarımını gerçek API üzerinden dener; oluşturduğu kayıtları sonunda siler.

Supabase Data API (`anon`, `authenticated`) bu uygulamada kullanılmaz; kurulum bu rollerin tablo, migration geçmişi ve yeni oluşturulacak nesneler üzerindeki yetkilerini kaldırır.

## Demo

100 kurgusal öğrenci: 50 erkek ve 50 kız. İki erkek ve iki kız yurdunda 25'er öğrenci, 5 hoca, 1 demo sistem yöneticisi, 6 burs programı ve 24 ders grubu/programı bulunur. Yurt adları örnektir; gerçek TDV yurt envanteri değildir. İletişim adresleri `example.invalid` kullanır; gerçek kişilere mesaj gönderilmez.

Demo hesaplarının rastgele şifreleri sadece `packages/db/demo-accounts.local.json` içinde saklanır; Git'e girmez. Demo öğrencilere yoklama veya devam durumu uydurulmaz.

Yeni API uçları: `GET/POST /api/v1/scholarships`, `GET/POST /api/v1/scholarships/assignments`, `PATCH /api/v1/scholarships/assignments/:id`. Burs programı ve hoca görevlendirmesi yazma yetkisi sistem yöneticisindedir.
