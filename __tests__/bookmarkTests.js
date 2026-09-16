jest.mock("../database/connect", () => ({ query: jest.fn() }));
jest.mock("../model/userModel", () => ({ findById: jest.fn() }));

const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const db = require("../database/connect");
const User = require("../model/userModel");
const router = require("../routers/educational");
const errorHandler = require("../middleware/errorHandler");
const Bookmark = require("../model/bookmarkModel");

describe("Account resource bookmarks", () => {
  let server;
  let base;
  let cookie;
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    process.env.JWT_SECRET = "bookmark-test-secret";
    cookie = `auth_token=${jwt.sign({ userId: 7, sessionVersion: 2 }, process.env.JWT_SECRET)}`;
    const app = express();
    app.use(cookieParser());
    app.use("/educational", router);
    app.use(errorHandler);
    await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
    base = `http://127.0.0.1:${server.address().port}/educational/bookmarks`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ id: 7, session_version: 2 });
    db.query.mockResolvedValue({ rows: [] });
  });

  it.each(["GET", "PUT", "DELETE"])("rejects anonymous %s requests", async (method) => {
    const response = await fetch(method === "GET" ? base : `${base}/3`, { method });
    expect(response.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("rejects revoked sessions", async () => {
    User.findById.mockResolvedValue({ id: 7, session_version: 3 });
    const response = await fetch(base, { headers: { cookie } });
    expect(response.status).toBe(401);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("lists only the current user's saved resources", async () => {
    db.query.mockResolvedValue({ rows: [{ id: 3, title: "Safety guide" }] });
    const response = await fetch(`${base}?userId=99`, { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ resources: [{ id: 3, title: "Safety guide" }] });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE b.user_id = $1"), [7]);
  });

  it("saves for the authenticated account and safely handles duplicate saves", async () => {
    db.query.mockResolvedValue({ rows: [{ resource_id: 3 }] });
    for (let i = 0; i < 2; i++) {
      const response = await fetch(`${base}/3?userId=99`, { method: "PUT", headers: { cookie } });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ resourceId: 3, saved: true });
    }
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT (user_id, resource_id)"), [7, 3]);
  });

  it("returns 404 for a missing resource", async () => {
    const response = await fetch(`${base}/3`, { method: "PUT", headers: { cookie } });
    expect(response.status).toBe(404);
  });

  it.each(["0", "-1", "1.5", "abc", "2147483648"])("rejects invalid ID %s", async (id) => {
    const response = await fetch(`${base}/${id}`, { method: "PUT", headers: { cookie } });
    expect(response.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("removes only the authenticated user's bookmark, even when already absent", async () => {
    const response = await fetch(`${base}/3?userId=99`, { method: "DELETE", headers: { cookie } });
    expect(response.status).toBe(204);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1 AND resource_id = $2"), [7, 3]);
  });

  it("propagates database failures instead of reporting success", async () => {
    db.query.mockRejectedValue(new Error("Database unavailable"));
    await expect(Bookmark.save(7, 3)).rejects.toThrow("Database unavailable");
  });
});
