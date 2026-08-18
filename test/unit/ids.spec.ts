import { describe, expect, it, vi } from 'vitest';

import { generateUuid, newTransactionId } from '@/utils/ids';

const nativeUuid = '123e4567-e89b-42d3-a456-426614174000';

describe('UUID generation', () => {
  it('uses native randomUUID when the browser provides it', () => {
    const randomUUID = vi.fn(() => nativeUuid);
    const getRandomValues = vi.fn((array: Uint8Array<ArrayBuffer>) => array);

    expect(generateUuid({ randomUUID, getRandomValues })).toBe(nativeUuid);
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it('creates an RFC 4122 UUID v4 with getRandomValues when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((array: Uint8Array<ArrayBuffer>) => {
      array.set(Array.from({ length: 16 }, (_, index) => index));
      return array;
    });

    expect(newTransactionId({ getRandomValues })).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues).toHaveBeenCalledOnce();
  });

  it('refuses to generate an insecure identifier without Web Crypto', () => {
    expect(() => generateUuid({} as never)).toThrow('Web Crypto no está disponible');
  });
});
