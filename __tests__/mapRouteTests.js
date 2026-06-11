const router = require('../routers/map');

describe('Map router compatibility', () => {
  it('supports both the root and legacy features endpoints', () => {
    const paths = router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    expect(paths).toContain('/');
    expect(paths).toContain('/features');
  });

  it('supports both hex route variants for hexagon details', () => {
    const paths = router.stack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);

    expect(paths).toContain('/hex/:h3Index');
    expect(paths).toContain('/hexagon/:h3Index');
  });
});
