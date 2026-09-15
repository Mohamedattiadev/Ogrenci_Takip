# @yoklama/shared-types

`src/generated.ts` bu paketin **tek** icerigidir ve elle yazilmaz. Uretim sirasi:

```bash
pnpm --filter @yoklama/api openapi:dump   # apps/api -> docs/api/openapi.json
pnpm --filter @yoklama/shared-types generate  # openapi.json -> src/generated.ts
```

`apps/web` bu paketi TS tipleri icin kullanir; API sozlesmesi degistiginde bu iki komut tekrar calistirilir (ileride CI'da otomatik drift kontrolu eklenebilir).
