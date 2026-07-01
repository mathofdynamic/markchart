import { describe, it, expect, vi } from 'vitest';
import { signSession, verifySession, timingSafeEqual, type SessionUser } from './_lib';

const SECRET = 'test-secret-value';
const USER: SessionUser = { sub: 'u1', email: 'a@b.com', name: 'Ada', picture: '' };

describe('session sign/verify', () => {
  it('round-trips a valid session', async () => {
    const token = await signSession(USER, SECRET);
    const out = await verifySession(token, SECRET);
    expect(out?.sub).toBe('u1');
    expect(out?.email).toBe('a@b.com');
  });

  it('rejects a tampered signature', async () => {
    const token = await signSession(USER, SECRET);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(await verifySession(tampered, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession(USER, SECRET);
    expect(await verifySession(token, 'other-secret')).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifySession('not.a.token', SECRET)).toBeNull();
    expect(await verifySession('only-one-part', SECRET)).toBeNull();
    expect(await verifySession('', SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));
    const token = await signSession(USER, SECRET);
    // Advance well past the 30-day session lifetime.
    vi.setSystemTime(new Date('2020-03-01T00:00:00Z'));
    const out = await verifySession(token, SECRET);
    vi.useRealTimers();
    expect(out).toBeNull();
  });
});

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc123', 'abc123')).toBe(true);
  });
  it('returns false for differing strings of equal length', () => {
    expect(timingSafeEqual('abc123', 'abc124')).toBe(false);
  });
  it('returns false for differing lengths', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});
