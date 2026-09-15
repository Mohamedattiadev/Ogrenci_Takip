import { Transform } from 'class-transformer';

/** Sorgu dizesindeki "true"/"false" degerlerini boolean'a cevirir (?isActive=false). */
export function ToBoolean() {
  return Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  });
}

/** Bos olmayan metinleri kirpar; "" -> undefined. */
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });
}

/** Virgulle ayrilmis sorgu dizesini sayi dizisine cevirir (?universityYears=0,1,2). */
export function ToNumberArray() {
  return Transform(({ value }) => {
    if (Array.isArray(value)) return value.map(Number);
    if (typeof value !== 'string' || value.trim() === '') return value;
    return value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v !== '')
      .map(Number);
  });
}
