const apiRouter = require("../routers/api");
const graphsRouter = require("../routers/graphs");
const educationalRouter = require("../routers/educational");
const emergServicesRouter = require("../routers/emergServices");

const getPaths = (router) =>
  router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

describe("API contract route compatibility", () => {
  it("mounts the documented top-level resource routers", () => {
    const mountedRouters = apiRouter.stack
      .filter((layer) => layer.name === "router")
      .map((layer) => layer.handle);

    expect(mountedRouters).toContain(graphsRouter);
    expect(mountedRouters).toContain(educationalRouter);
    expect(mountedRouters).toContain(emergServicesRouter);
  });

  it("supports both graph date-range route variants", () => {
    const paths = getPaths(graphsRouter);

    expect(paths).toContain("/date-range");
    expect(paths).toContain("/dates");
  });

  it("supports both educational resource route variants", () => {
    const paths = getPaths(educationalRouter);

    expect(paths).toContain("/");
    expect(paths).toContain("/resources");
  });

  it("exposes the emergency services closest route", () => {
    const paths = getPaths(emergServicesRouter);

    expect(paths).toContain("/closest");
  });
});
