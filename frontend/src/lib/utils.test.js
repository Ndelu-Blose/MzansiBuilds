import { cn, formatRelativeTime } from './utils';

describe('cn', () => {
  it('merges tailwind classes and resolves conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toContain('px-4');
    expect(cn('px-2 py-1', 'px-4')).toContain('py-1');
  });
});

describe('formatRelativeTime', () => {
  it('returns Just now for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });
});
