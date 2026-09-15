# ADR-0001: Modüler monolit, mikroservis değil

## Bağlam

Sistem v1'de 10+ yurt / birkaç yüz öğrenci ölçeğinde başlıyor, yıllar içinde birkaç bin öğrenciye çıkabilir. Ekip küçük (1-2 geliştirici).

## Karar

Tek bir NestJS backend (`apps/api`) içinde, her iş alanının (attendance, students, groups, schedule, reports, ...) kendi modülü ve kendi tablolarının sahibi olduğu bir **modüler monolit** kuruyoruz. Mikroservis mimarisi seçmiyoruz.

## Gerekçe

Bu ölçekte mikroservis; dağıtık deploy, servisler-arası iletişim ve dağıtık veri tutarlılığı gibi bedelleri karşılığında hiçbir gerçek fayda sağlamıyor. Modül sınırlarını (bounded context) en baştan disiplinli tutarsak (bir modül başka bir modülün tablosuna doğrudan erişmez, sadece onun servis arayüzü üzerinden konuşur), ileride gerçekten gerekirse (ör. raporlama ayrı bir servise çıkarılacaksa) bu bir **refactor** olur, yeniden yazım olmaz.

## Sonuçlar

- Tek deploy birimi → basit CI/CD, düşük operasyonel yük.
- Modül sınırı ihlalleri code review'da aranmalı (ör. `students` modülü `attendance` tablosuna doğrudan Prisma sorgusu atmamalı).
- Gerçek zamanlı/asenkron ihtiyaç doğduğunda (ör. bildirimler) Redis/BullMQ eklemek bu kararı bozmaz, aynı monolit içinde kalır.
