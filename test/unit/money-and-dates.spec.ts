import { describe, expect, it } from 'vitest';

import { toLocalDate } from '@/utils/dates';
import { formatArs, parseArsInput, toMoneyCents } from '@/utils/money';

describe('money', () => {
  it('keeps money as safe integer cents and formats ARS', () => {
    expect(formatArs(toMoneyCents(2_500_000))).toBe('$ 25.000');
    expect(() => toMoneyCents(10.5)).toThrow(RangeError);
    expect(() => toMoneyCents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });

  it('parses Argentine grouped and decimal input without floating point arithmetic', () => {
    expect(parseArsInput('25.000')).toBe(2_500_000);
    expect(parseArsInput('$ 25.000,50')).toBe(2_500_050);
    expect(parseArsInput('25000.50')).toBe(2_500_050);
    expect(() => parseArsInput('10,999')).toThrow(RangeError);
    expect(() => parseArsInput('0')).toThrow(RangeError);
  });
});

describe('local dates', () => {
  it('validates calendar dates without UTC conversion', () => {
    expect(toLocalDate('2028-02-29')).toBe('2028-02-29');
    expect(() => toLocalDate('2027-02-29')).toThrow(RangeError);
    expect(() => toLocalDate('18/08/2026')).toThrow(RangeError);
  });
});
