describe('security config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('keeps default frontend origins when FRONTEND_URLS is set', () => {
    process.env = {
      ...originalEnv,
      FRONTEND_URLS: 'https://streetsafe-client.onrender.com, https://example.com'
    };

    const { allowedOrigins } = require('../config/security');

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        'https://streetsafe-client.onrender.com',
        'https://example.com'
      ])
    );
    expect(allowedOrigins).toHaveLength(2);
  });

  it('normalizes configured frontend origins with trailing slashes', () => {
    process.env = {
      ...originalEnv,
      FRONTEND_URLS: 'https://streetsafe-client.onrender.com/, https://example.com///'
    };

    const { allowedOrigins } = require('../config/security');

    expect(allowedOrigins).toEqual(
      expect.arrayContaining([
        'https://streetsafe-client.onrender.com',
        'https://example.com'
      ])
    );
    expect(allowedOrigins).toHaveLength(2);
  });

  it('returns cross-site cookie settings in production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production'
    };

    const { getCookieOptions } = require('../config/security');

    expect(getCookieOptions({ secure: false }, 1000)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000
    });
  });

  it('returns local-safe cookie settings outside production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test'
    };

    const { getCookieOptions } = require('../config/security');

    expect(getCookieOptions({ secure: false }, 1000)).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000
    });
  });

  it('uses default rate limit policies when env values are missing', () => {
    const { rateLimitPolicies } = require('../config/rateLimit');

    expect(rateLimitPolicies).toEqual({
      auth: {
        windowMs: 15 * 60 * 1000,
        maxRequests: 10
      },
      externalApi: {
        windowMs: 60 * 1000,
        maxRequests: 30
      }
    });
  });

  it('parses configured rate limit policies from env', () => {
    process.env = {
      ...originalEnv,
      AUTH_RATE_LIMIT_WINDOW_MS: '60000',
      AUTH_RATE_LIMIT_MAX: '5',
      EXTERNAL_RATE_LIMIT_WINDOW_MS: '30000',
      EXTERNAL_RATE_LIMIT_MAX: '12'
    };
    jest.resetModules();

    const { rateLimitPolicies } = require('../config/rateLimit');

    expect(rateLimitPolicies).toEqual({
      auth: {
        windowMs: 60000,
        maxRequests: 5
      },
      externalApi: {
        windowMs: 30000,
        maxRequests: 12
      }
    });
  });
});
