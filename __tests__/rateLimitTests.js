const { createRateLimiter, getClientIdentifier } = require('../middleware/rateLimit');

describe('rate limit middleware', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-19T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses req.ip as the client identifier when available', () => {
    expect(getClientIdentifier({ ip: '127.0.0.1', headers: {} })).toBe('127.0.0.1');
  });

  it('allows requests within the configured limit', () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      keyPrefix: 'test',
      message: 'Slow down'
    });
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    const req = {
      ip: '127.0.0.1',
      headers: {}
    };

    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks requests after the configured limit and sets Retry-After', () => {
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 1,
      keyPrefix: 'test',
      message: 'Slow down'
    });
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    const req = {
      ip: '127.0.0.1',
      headers: {}
    };

    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Slow down',
      error: 'Too many requests',
      retryAfterSeconds: 60
    });
  });

  it('resets the limit after the time window elapses', () => {
    const limiter = createRateLimiter({
      windowMs: 1000,
      maxRequests: 1,
      keyPrefix: 'test',
      message: 'Slow down'
    });
    const next = jest.fn();
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    const req = {
      ip: '127.0.0.1',
      headers: {}
    };

    limiter(req, res, next);
    jest.advanceTimersByTime(1001);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });
});
