export function validateEnvironment(config: Record<string, unknown>) {
  if (config.NODE_ENV !== 'production') {
    config.DATABASE_URL ??= 'postgresql://eoa:eoa@localhost:5432/eoa?schema=public';
    config.REDIS_URL ??= 'redis://localhost:6379';
    config.JWT_SECRET ??= 'local-development-only-jwt-secret-change-before-production';
    config.CONFIG_ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    config.DEMO_MODE ??= 'true';
  }
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  if (String(config.JWT_SECRET).length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  return config;
}
