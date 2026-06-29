const KEY_PATTERN = /(?:live_[a-z0-9]{20,}|rtmp:\/\/[^\s"']+|streamKey["']?\s*[:=]\s*["'][^"']+["'])/gi;

export function redactSecrets(text: string): string {
  return text.replace(KEY_PATTERN, '[REDACTED]');
}

export function redactObject(value: unknown): unknown {
  if (typeof value === 'string') return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactObject);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (/streamkey|password|token|secret|oauth/i.test(k) && typeof v === 'string') {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactObject(v);
      }
    }
    return out;
  }
  return value;
}
