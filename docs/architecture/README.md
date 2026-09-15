# Mimari

```
docs/architecture/
├── adrs/            Mimari karar kayıtları (ADR) — 0001, 0002, ...
├── c4/              C4 model diyagramları (Mermaid kaynağı, GitHub'da otomatik render edilir)
└── README.md        Bu dosya
```

## C4 model diyagramları

Sistem [C4 model](https://c4model.com) ile üç yakınlaştırma seviyesinde diyagramlanmıştır. Kaynaklar Mermaid metni — diff'lenebilir, PR'da incelenebilir, ve **GitHub üzerinde ayrıca bir render adımı gerekmeden otomatik görüntülenir** (root [`README.md`](../../README.md)'ye bakın).

| Seviye             | Diyagram                                               | Kime hitap eder                  | Kaynak                                   |
| ------------------ | ------------------------------------------------------ | -------------------------------- | ---------------------------------------- |
| **C1 — Context**   | Kim kullanıyor, hangi dış sistemlere bağımlı           | Karar vericiler, TDV sorumlusu   | [`c4/context.mmd`](./c4/context.mmd)     |
| **C2 — Container** | Sistemin dağıtılabilir parçaları (mobil, web, API, DB) | Yeni geliştirici, reviewer       | [`c4/container.mmd`](./c4/container.mmd) |
| **C3 — Component** | API içindeki modüller ve aralarındaki ilişki           | API'ye katkı yapacak geliştirici | [`c4/component.mmd`](./c4/component.mmd) |

C4/L4 (kod seviyesi) v1'de eklenmedi — sistem henüz bu detayı gerektirecek kadar büyümedi; gerektiğinde `attendance.service.ts` gibi kritik bir sınıf için eklenebilir.

### Diyagramları düzenleme

Mermaid'in `C4Context` / `C4Container` / `C4Component` sözdizimini kullanır ([Mermaid C4 referansı](https://mermaid.js.org/syntax/c4.html)). Bir `.mmd` dosyasını değiştirdiğinizde:

- GitHub'da ilgili dosyayı açtığınızda otomatik render edilir, ekstra bir araç kurmanıza gerek yok.
- Root `README.md` içine gömülü olan Container diyagramını da güncel tutmak için oradaki Mermaid bloğunu senkronize edin (şu an elle senkronize ediliyor — ikisi de aynı `container.mmd` içeriğini taşımalı).

## ADR'ler

Kararlar [`adrs/`](./adrs/) altında. Her biri bağlamı, kararı ve neden diğer alternatiflerin seçilmediğini kaydeder:

- [0001 — Modüler monolit, mikroservis değil](./adrs/0001-modular-monolith.md)
- [0002 — Çoklu kurum izolasyonu için Postgres Row-Level Security](./adrs/0002-multi-tenant-rls.md)

## İlgili

- [`../../PLAN.md`](../../PLAN.md) — tam kapsam, yapıldı/kalan checklist'i, adım adım kurulum ve sorun giderme.
