import { sanitizeString } from '../src/middleware/promptShield';

describe('Security Input Sanitizer', () => {
  it('should strip HTML tags successfully', () => {
    const dirty = '<div>Hello <script>alert("xss")</script> World</div>';
    const clean = sanitizeString(dirty);
    expect(clean).not.toContain('<div>');
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello alert(\\"xss\\") World');
  });

  it('should escape simple quotes and semi-colons for SQL safety', () => {
    const malicious = "SELECT * FROM users WHERE email = 'admin@stadiummind.ai';";
    const clean = sanitizeString(malicious);
    expect(clean).toContain("\\'");
    expect(clean).toContain('\\;');
  });

  it('should trim whitespace correctly', () => {
    const padded = '   clean me    ';
    expect(sanitizeString(padded)).toBe('clean me');
  });
});
