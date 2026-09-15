import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tokens from '../src/tokens.json';

/**
 * tokens.json -> Tailwind preset.
 * Tek kaynaktan uretilir: renk paleti burada elle tekrar yazilmaz.
 */
function flattenColorScale(scale: Record<string, { $value: string }>) {
  return Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, v.$value]));
}

const brand = flattenColorScale(tokens.color.brand as any);
const neutral = flattenColorScale(tokens.color.neutral as any);
const semantic = flattenColorScale(tokens.color.semantic as any);
const surface = flattenColorScale(tokens.color.surface as any);

const preset = `// Bu dosya packages/design-tokens/src/tokens.json'dan otomatik uretilir.
// Elle duzenlemeyin - degisiklikleri tokens.json'a yapip \`pnpm tokens:build\` calistirin.
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: ${JSON.stringify(brand, null, 8)},
        neutral: ${JSON.stringify(neutral, null, 8)},
        status: ${JSON.stringify(semantic, null, 8)},
        surface: ${JSON.stringify(surface, null, 8)},
      },
      spacing: ${JSON.stringify(
        Object.fromEntries(Object.entries(tokens.spacing).map(([k, v]) => [k, (v as any).$value])),
        null,
        8,
      )},
      borderRadius: ${JSON.stringify(
        Object.fromEntries(Object.entries(tokens.radius).map(([k, v]) => [k, (v as any).$value])),
        null,
        8,
      )},
      fontFamily: {
        sans: ['${(tokens.typography.fontFamily as any).$value.split(',')[0]}', 'system-ui', 'sans-serif'],
      },
    },
  },
};
`;

writeFileSync(join(__dirname, '../dist/tailwind-preset.cjs'), preset);
console.log('tailwind-preset.cjs uretildi.');
