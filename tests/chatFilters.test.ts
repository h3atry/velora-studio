import { describe, expect, it } from 'vitest';
import { dedupeMessages, messageMatchesBlocked, normalizeWord } from '../electron/chatFilterUtils';

describe('chatFilterUtils', () => {
  it('normalizeWord removes accents', () => {
    expect(normalizeWord('Café')).toBe('cafe');
  });

  it('messageMatchesBlocked is case insensitive', () => {
    expect(messageMatchesBlocked('SPAM aqui', ['spam'])).toBe(true);
  });

  it('messageMatchesBlocked handles accents', () => {
    expect(messageMatchesBlocked('promoção', ['promocao'])).toBe(true);
  });

  it('dedupeMessages keeps first id', () => {
    const out = dedupeMessages([
      { id: 'a', x: 1 },
      { id: 'b', x: 2 },
      { id: 'a', x: 3 },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].x).toBe(1);
  });
});
