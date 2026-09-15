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
