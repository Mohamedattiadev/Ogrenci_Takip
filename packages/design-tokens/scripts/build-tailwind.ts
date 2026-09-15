import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tokens from '../src/tokens.json';

/**
 * tokens.json -> Tailwind v4 tema CSS'i (@theme bloğu).
 * Tailwind v4 artik JS preset degil, CSS custom property tabanli calisiyor:
 * "--color-brand-700: #163480" tanimlamak otomatik olarak bg-brand-700,
 * text-brand-700, border-brand-700 gibi utility siniflarini uretir.
 * Tek kaynaktan uretilir: renk paleti burada elle tekrar yazilmaz.
 */
function entries(group: Record<string, unknown>): [string, string][] {
  // "$description" gibi meta alanlari atla - sadece gercek deger basamaklarini al.
  return Object.entries(group)
    .filter(([k]) => !k.startsWith('$'))
    .map(([k, v]) => [k, (v as { $value: string }).$value]);
}

function colorVars(prefix: string, group: Record<string, unknown>): string[] {
  return entries(group).map(([k, v]) => `  --color-${prefix}-${k}: ${v};`);
}

const lines: string[] = [
  "/* Bu dosya packages/design-tokens/src/tokens.json'dan otomatik uretilir. */",
  "/* Elle duzenlemeyin - degisiklikleri tokens.json'a yapip `pnpm tokens:build` calistirin. */",
  '@theme {',
  ...colorVars('brand', tokens.color.brand),
  ...colorVars('accent', tokens.color.accent),
  ...colorVars('mark', tokens.color.mark),
  ...colorVars('neutral', tokens.color.neutral),
  ...colorVars('status', tokens.color.semantic),
  ...colorVars('surface', tokens.color.surface),
  // ONEMLI: bunu "--spacing-{k}" olarak YAZMAYIN. Tailwind v4'te --spacing-*
  // isim alani sadece padding/margin/gap degil, max-w-*, w-*, h-* gibi bircok
  // FARKLI utility kategorisi tarafindan da paylasiliyor/fallback olarak
  // kullanilabiliyor. "sm/md/lg/xl/2xl" gibi T-shirt isimleri Tailwind'in
  // kendi max-w-sm (--container-sm=24rem) gibi degerleriyle ayni ada sahip
  // oldugu icin, --spacing-sm tanimlamak max-w-sm'i SESSIZCE 8px'e dusurdu
  // (gercekten yasandi, bkz. git log). Bu yuzden kendi, colcusmayan bir
  // isim alaninda ("--space-*") tutuyoruz - Tailwind bunu hicbir utility'ye
  // otomatik baglamaz, sadece CSS degiskeni olarak erisilebilir kalir.
  ...entries(tokens.spacing).map(([k, v]) => `  --space-${k}: ${v};`),
  ...entries(tokens.radius).map(([k, v]) => `  --radius-${k}: ${v};`),
  `  --font-sans: '${(tokens.typography.fontFamily as { $value: string }).$value.split(',')[0]}', system-ui, sans-serif;`,
  `  --font-display: '${(tokens.typography.displayFontFamily as { $value: string }).$value.split(',')[0]}', system-ui, sans-serif;`,
  ...entries(tokens.typography.size).map(([k, v]) => `  --text-${k}: ${v};`),
  '}',
  '',
];

writeFileSync(join(__dirname, '../dist/tokens.css'), lines.join('\n'));
console.log('tokens.css uretildi.');
