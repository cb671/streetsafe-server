describe('rate-limited routes', () => {
  it('applies rate limiting middleware to register and login routes', () => {
    const router = require('../routers/auth');
    const registerLayer = router.stack.find((layer) => layer.route?.path === '/register');
    const loginLayer = router.stack.find((layer) => layer.route?.path === '/login');

    expect(registerLayer.route.stack).toHaveLength(2);
    expect(loginLayer.route.stack).toHaveLength(2);
  });

  it('applies rate limiting middleware to external go routes', () => {
    const router = require('../routers/go');

    const routes = ['/', '/reverse', '/search', '/geocode'].map((path) =>
      router.stack.find((layer) => layer.route?.path === path)
    );

    for (const route of routes) {
      expect(route.route.stack).toHaveLength(2);
    }
  });
});
