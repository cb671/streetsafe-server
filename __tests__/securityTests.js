describe('security config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('uses configured frontend origins when FRONTEND_URLS is set', () => {
    process.env = {
      ...originalEnv,
      FRONTEND_URLS: 'https://streetsafe-client.onrender.com, https://example.com'
    };

    const { allowedOrigins } = require('../config/security');

    expect(allowedOrigins).toEqual([
      'https://streetsafe-client.onrender.com',
      'https://example.com'
    ]);
  });

  it('normalizes configured frontend origins with trailing slashes', () => {
    process.env = {
      ...originalEnv,
      FRONTEND_URLS: 'https://streetsafe-client.onrender.com/, https://example.com///'
    };

    const { allowedOrigins } = require('../config/security');

    expect(allowedOrigins).toEqual([
      'https://streetsafe-client.onrender.com',
      'https://example.com'
    ]);
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
});
