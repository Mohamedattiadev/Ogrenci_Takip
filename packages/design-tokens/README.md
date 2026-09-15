# @yoklama/design-tokens

Tum renk/spacing/tipografi degerlerinin **tek kaynagi** `src/tokens.json`.

- `pnpm build` -> `dist/tailwind-preset.cjs` (apps/web bunu `tailwind.config.ts` icinde `presets: [require('@yoklama/design-tokens/dist/tailwind-preset.cjs')]` ile kullanir)
- `pnpm build` -> `dist/app_theme.dart` (apps/mobile bu dosyayi kopyalar/paylasir, `MaterialApp(theme: buildAppTheme(...))`)

TDV'nin resmi marka klavuzu elde edildiginde **sadece `tokens.json` guncellenir**, web ve mobil otomatik ayni paleti kullanmaya devam eder.
