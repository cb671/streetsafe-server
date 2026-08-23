jest.mock("../database/connect", () => ({
  query: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("h3-js", () => ({
  geoToH3: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

global.fetch = jest.fn();

const User = require("../model/userModel");
const AuthController = require("../controller/authController");
const db = require("../database/connect");
const bcrypt = require("bcrypt");
const { geoToH3 } = require("h3-js");
const jwt = require("jsonwebtoken");
const errorHandler = require("../middleware/errorHandler");
const crypto = require("crypto");

jest.mock("../utils/emailService", () => ({
  sendRegistrationConfirmation: jest.fn(),
}));

describe("User Model and Auth Controller", () => {
  let req, res;
  const next = jest.fn();

  const invokeController = async (handler) => {
    try {
      await handler();
    } catch (error) {
      errorHandler(error, req, res, next);
    }
  };

  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    require("../utils/emailService").sendRegistrationConfirmation.mockResolvedValue(
      undefined,
    );

    req = {
      body: {},
      userId: null,
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("User Model Tests", () => {
    describe("create", () => {
      it("should create a new user successfully", async () => {
        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          h3: "123456789",
          created_at: new Date(),
        };

        bcrypt.hash.mockResolvedValue("hashedPassword123");
        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.create(
          "John Doe",
          "john@example.com",
          "password123",
          "123456789",
          "confirmation-hash",
          expect.any(Date),
        );

        expect(bcrypt.hash).toHaveBeenCalledWith("password123", 12);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO users"),
          [
            "John Doe",
            "john@example.com",
            "hashedPassword123",
            "123456789",
            "confirmation-hash",
            expect.any(Date),
          ],
        );
        expect(result).toEqual(mockUser);
      });

      it("should throw error when database fails", async () => {
        bcrypt.hash.mockResolvedValue("hashedPassword123");
        db.query.mockRejectedValue(new Error("Database connection failed"));

        await expect(
          User.create(
            "John Doe",
            "john@example.com",
            "password123",
            "123456789",
          ),
        ).rejects.toThrow("Database error: Database connection failed");
      });
    });

    describe("findByEmail", () => {
      it("should find user by email", async () => {
        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          password: "hashedPassword",
        };

        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.findByEmail("john@example.com");

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining("WHERE LOWER(TRIM(email)) = $1"),
          ["john@example.com"],
        );
        expect(result).toEqual(mockUser);
      });

      it("should return null when user not found", async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await User.findByEmail("notfound@example.com");

        expect(result).toBeNull();
      });
    });

    describe("findById", () => {
      it("should find user by id", async () => {
        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          h3: "123456789",
          created_at: new Date(),
        };

        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.findById(1);

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining("email_verified_at"),
          [1],
        );
        expect(result).toEqual(mockUser);
      });

      it("should return null when user not found", async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await User.findById(999);

        expect(result).toBeNull();
      });
    });

    describe("confirmationEmail", () => {
      it("hashes the token, enforces expiry, and clears confirmation fields", async () => {
        const confirmedUser = {
          id: 1,
          email: "john@example.com",
          email_verified_at: new Date(),
        };
        db.query.mockResolvedValue({ rows: [confirmedUser] });

        const result = await User.confirmationEmail("raw-token");

        const [query, values] = db.query.mock.calls[0];
        expect(query).toContain("email_confirmation_expires_at > NOW()");
        expect(query).toContain("email_confirmation_token_hash = NULL");
        expect(query).toContain("email_confirmation_expires_at = NULL");
        expect(values).toEqual([
          crypto.createHash("sha256").update("raw-token").digest("hex"),
        ]);
        expect(result).toEqual(confirmedUser);
      });

      it("returns null when a token is invalid, expired, or already used", async () => {
        db.query.mockResolvedValue({ rows: [] });

        await expect(User.confirmationEmail("unusable-token")).resolves.toBeNull();
      });
    });

    describe("updateConfirmationToken", () => {
      it("only replaces the token for an unverified account", async () => {
        const expiresAt = new Date();
        db.query.mockResolvedValue({
          rows: [{ id: 1, email: "john@example.com" }],
        });

        await User.updateConfirmationToken(1, "new-hash", expiresAt);

        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining("email_verified_at IS NULL"),
          [1, "new-hash", expiresAt],
        );
      });
    });

    describe("validatePassword", () => {
      it("should validate correct password", async () => {
        bcrypt.compare.mockResolvedValue(true);

        const result = await User.validatePassword(
          "password123",
          "hashedPassword",
        );

        expect(bcrypt.compare).toHaveBeenCalledWith(
          "password123",
          "hashedPassword",
        );
        expect(result).toBe(true);
      });

      it("should reject incorrect password", async () => {
        bcrypt.compare.mockResolvedValue(false);

        const result = await User.validatePassword(
          "wrongpassword",
          "hashedPassword",
        );

        expect(result).toBe(false);
      });
    });

    describe("postcodeToH3", () => {
      it("should convert valid postcode to H3 index", async () => {
        const mockApiResponse = {
          result: {
            latitude: 51.5074,
            longitude: -0.1278,
          },
        };

        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse),
        });

        geoToH3.mockReturnValue("123456789");

        const result = await User.postcodeToH3("SW1A 1AA");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.postcodes.io/postcodes/SW1A%201AA",
          expect.objectContaining({
            headers: { "User-Agent": "StreetSafe-App/1.0" },
          }),
        );
        expect(geoToH3).toHaveBeenCalledWith(51.5074, -0.1278, 9);
        expect(result).toBe("123456789");
      });

      it("should convert a valid outward code to H3 using its area coordinates", async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              result: {
                latitude: 51.5607,
                longitude: -0.0811,
              },
            }),
        });

        geoToH3.mockReturnValue("outward-code-h3");

        const result = await User.postcodeToH3(" n16 ");

        expect(global.fetch).toHaveBeenCalledWith(
          "https://api.postcodes.io/outcodes/N16",
          expect.objectContaining({
            headers: { "User-Agent": "StreetSafe-App/1.0" },
          }),
        );
        expect(geoToH3).toHaveBeenCalledWith(51.5607, -0.0811, 9);
        expect(result).toBe("outward-code-h3");
      });

      it.each([
        ["an inward code on its own", "6QQ"],
        ["a partial inward code", "N16 6"],
        ["an incomplete full postcode", "N16 QQ"],
        ["arbitrary text", "not a postcode"],
        ["an empty value", "   "],
      ])("should reject %s before calling Postcodes.io", async (_label, input) => {
        await expect(User.postcodeToH3(input)).rejects.toThrow(
          "Error converting postcode to H3: Enter a valid UK outward code or full postcode",
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("should reject non-string postcode input before calling Postcodes.io", async () => {
        await expect(User.postcodeToH3(null)).rejects.toThrow(
          "Error converting postcode to H3: Postcode must be a string",
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it("should throw error when a correctly formatted postcode does not exist", async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Postcode not found"),
        });

        await expect(User.postcodeToH3("ZZ99 9ZZ")).rejects.toThrow(
          "Error converting postcode to H3: Invalid postcode: 404 - Postcode not found",
        );
      });

      it("should throw error when API is unavailable", async () => {
        global.fetch.mockRejectedValue(new Error("Network error"));

        await expect(User.postcodeToH3("SW1A 1AA")).rejects.toThrow(
          "Error converting postcode to H3: Network error",
        );
      });

      it("should throw error when no result returned", async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        });

        await expect(User.postcodeToH3("SW1A 1AA")).rejects.toThrow(
          "Error converting postcode to H3: Postcode not found",
        );
      });
    });
  });

  describe("AuthController Tests", () => {
    describe("register", () => {
      it("should register a new user successfully", async () => {
        req.body = {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          postcode: "SW1A 1AA",
        };

        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          h3: "123456789",
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest.fn().mockResolvedValue("123456789");
        User.create = jest.fn().mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue("mockToken");

        await invokeController(() => AuthController.register(req, res));

        expect(User.findByEmail).toHaveBeenCalledWith("john@example.com");
        expect(User.postcodeToH3).toHaveBeenCalledWith("SW1A 1AA");
        expect(User.create).toHaveBeenCalledWith(
          "John Doe",
          "john@example.com",
          "password123",
          "123456789",
          expect.stringMatching(/^[a-f0-9]{64}$/),
          expect.any(Date),
        );
        expect(
          require("../utils/emailService").sendRegistrationConfirmation,
        ).toHaveBeenCalledWith(mockUser, expect.stringMatching(/^[a-f0-9]{64}$/));
        const sentToken =
          require("../utils/emailService").sendRegistrationConfirmation.mock.calls[0][1];
        expect(User.create.mock.calls[0][4]).toBe(
          crypto.createHash("sha256").update(sentToken).digest("hex"),
        );
        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          message:
            "Registration successful. Please check your email to confirm your account.",
          requiresEmailConfirmation: true,
          confirmationEmailSent: true,
          user: mockUser,
        });
      });

      it("should return error for missing fields", async () => {
        req.body = { name: "John Doe" };

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "All fields are required",
          message: "All fields are required",
        });
      });

      it("should return error for short password", async () => {
        req.body = {
          name: "John Doe",
          email: "john@example.com",
          password: "123",
          postcode: "SW1A 1AA",
        };

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Password must be at least 8 characters long",
          message: "Password must be at least 8 characters long",
        });
      });

      it("should return error for existing user", async () => {
        req.body = {
          name: "John Doe",
          email: "existing@example.com",
          password: "password123",
          postcode: "SW1A 1AA",
        };

        User.findByEmail = jest
          .fn()
          .mockResolvedValue({ email: "existing@example.com" });

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
          error: "User with this email already exists",
          message: "User with this email already exists",
        });
      });

      it("should handle postcode conversion errors", async () => {
        req.body = {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          postcode: "INVALID",
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest
          .fn()
          .mockRejectedValue(new Error("Invalid postcode"));

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid postcode",
          message: "Invalid postcode",
          details: {
            postcode: "INVALID",
            reason: "Invalid postcode",
          },
        });
      });

      it("should return a clearer error when user creation fails", async () => {
        req.body = {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          postcode: "SW1A 1AA",
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest.fn().mockResolvedValue("123456789");
        User.create = jest
          .fn()
          .mockRejectedValue(new Error("Database connection failed"));

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Registration failed",
          message: "Unable to create user account",
          details: {
            email: "john@example.com",
            reason: "Database connection failed",
          },
        });
      });

      it("reports when the account is created but confirmation delivery fails", async () => {
        req.body = {
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
          postcode: "SW1A 1AA",
        };
        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          h3: "123456789",
        };
        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest.fn().mockResolvedValue("123456789");
        User.create = jest.fn().mockResolvedValue(mockUser);
        require("../utils/emailService").sendRegistrationConfirmation.mockRejectedValue(
          new Error("Brevo unavailable"),
        );

        await invokeController(() => AuthController.register(req, res));

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmationEmailSent: false,
            requiresEmailConfirmation: true,
            message:
              "Registration successful, but the confirmation email could not be sent. Please request another confirmation email.",
          }),
        );
      });
    });

    describe("confirmEmail", () => {
      it("confirms a valid token", async () => {
        req.query = { token: "valid-token" };
        User.confirmationEmail = jest.fn().mockResolvedValue({ id: 1 });

        await invokeController(() => AuthController.confirmEmail(req, res));

        expect(User.confirmationEmail).toHaveBeenCalledWith("valid-token");
        expect(res.json).toHaveBeenCalledWith({
          message: "Email confirmed successfully",
        });
      });

      it.each([
        ["an expired or reused token", "expired-token"],
        ["an invalid token", "invalid-token"],
      ])("rejects %s", async (_description, token) => {
        req.query = { token };
        User.confirmationEmail = jest.fn().mockResolvedValue(null);

        await invokeController(() => AuthController.confirmEmail(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Confirmation link is invalid or expired",
          message: "Confirmation link is invalid or expired",
        });
      });

      it("requires a token", async () => {
        req.query = {};

        await invokeController(() => AuthController.confirmEmail(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    describe("resendConfirmation", () => {
      it("replaces the token and sends a new confirmation email", async () => {
        req.body = { email: "john@example.com" };
        const user = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          email_verified_at: null,
        };
        User.findByEmail = jest.fn().mockResolvedValue(user);
        User.updateConfirmationToken = jest.fn().mockResolvedValue(user);

        await invokeController(() => AuthController.resendConfirmation(req, res));

        expect(User.updateConfirmationToken).toHaveBeenCalledWith(
          1,
          expect.stringMatching(/^[a-f0-9]{64}$/),
          expect.any(Date),
        );
        const sentToken =
          require("../utils/emailService").sendRegistrationConfirmation.mock.calls[0][1];
        expect(User.updateConfirmationToken.mock.calls[0][1]).toBe(
          crypto.createHash("sha256").update(sentToken).digest("hex"),
        );
        expect(res.json).toHaveBeenCalledWith({
          message:
            "If an unconfirmed account exists for this email, a new confirmation email has been sent.",
        });
      });

      it.each([
        ["unknown", null],
        ["already verified", { id: 1, email_verified_at: new Date() }],
      ])("returns the generic response for an %s account", async (_label, user) => {
        req.body = { email: "john@example.com" };
        User.findByEmail = jest.fn().mockResolvedValue(user);
        User.updateConfirmationToken = jest.fn();

        await invokeController(() => AuthController.resendConfirmation(req, res));

        expect(User.updateConfirmationToken).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
          message:
            "If an unconfirmed account exists for this email, a new confirmation email has been sent.",
        });
      });

      it("returns 502 when the replacement email cannot be sent", async () => {
        req.body = { email: "john@example.com" };
        const user = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          email_verified_at: null,
        };
        User.findByEmail = jest.fn().mockResolvedValue(user);
        User.updateConfirmationToken = jest.fn().mockResolvedValue(user);
        require("../utils/emailService").sendRegistrationConfirmation.mockRejectedValue(
          new Error("Brevo unavailable"),
        );

        await invokeController(() => AuthController.resendConfirmation(req, res));

        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith({
          error: "Email sending failed",
          message: "Unable to send confirmation email",
        });
      });
    });

    describe("login", () => {
      it("should login user successfully", async () => {
        req.body = {
          email: "john@example.com",
          password: "password123",
        };

        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          password: "hashedPassword",
          h3: "123456789",
          email_verified_at: new Date(),
        };

        User.findByEmail = jest.fn().mockResolvedValue(mockUser);
        User.validatePassword = jest.fn().mockResolvedValue(true);
        jwt.sign.mockReturnValue("mockToken");

        await invokeController(() => AuthController.login(req, res));

        expect(User.findByEmail).toHaveBeenCalledWith("john@example.com");
        expect(User.validatePassword).toHaveBeenCalledWith(
          "password123",
          "hashedPassword",
        );
        expect(res.cookie).toHaveBeenCalledWith(
          "auth_token",
          "mockToken",
          expect.any(Object),
        );
        expect(res.json).toHaveBeenCalledWith({
          message: "Login successful",
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            h3: mockUser.h3,
          },
        });
      });

      it("should return error for missing credentials", async () => {
        req.body = { email: "john@example.com" };

        await invokeController(() => AuthController.login(req, res));

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Email and password are required",
          message: "Email and password are required",
        });
      });

      it("should return error for non-existent user", async () => {
        req.body = {
          email: "nonexistent@example.com",
          password: "password123",
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);

        await invokeController(() => AuthController.login(req, res));

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid credentials",
          message: "Invalid credentials",
        });
      });

      it("should return error for invalid password", async () => {
        req.body = {
          email: "john@example.com",
          password: "wrongpassword",
        };

        const mockUser = {
          id: 1,
          email: "john@example.com",
          password: "hashedPassword",
        };

        User.findByEmail = jest.fn().mockResolvedValue(mockUser);
        User.validatePassword = jest.fn().mockResolvedValue(false);

        await invokeController(() => AuthController.login(req, res));

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid credentials",
          message: "Invalid credentials",
        });
      });

      it("rejects valid credentials until the email is confirmed", async () => {
        req.body = {
          email: "john@example.com",
          password: "password123",
        };
        User.findByEmail = jest.fn().mockResolvedValue({
          id: 1,
          email: "john@example.com",
          password: "hashedPassword",
          email_verified_at: null,
        });
        User.validatePassword = jest.fn().mockResolvedValue(true);

        await invokeController(() => AuthController.login(req, res));

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          error: "Email address has not been confirmed",
          message: "Please confirm your email before logging in",
        });
        expect(res.cookie).not.toHaveBeenCalled();
      });
    });

    describe("logout", () => {
      it("should logout user successfully", async () => {
        await invokeController(() => AuthController.logout(req, res));

        expect(res.clearCookie).toHaveBeenCalledWith(
          "auth_token",
          expect.any(Object),
        );
        expect(res.json).toHaveBeenCalledWith({ message: "Logout successful" });
      });
    });

    describe("getProfile", () => {
      it("should get user profile successfully", async () => {
        req.userId = 1;
        const mockUser = {
          id: 1,
          name: "John Doe",
          email: "john@example.com",
          h3: "123456789",
        };

        User.findById = jest.fn().mockResolvedValue(mockUser);

        await invokeController(() => AuthController.getProfile(req, res));

        expect(User.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({ user: mockUser });
      });

      it("should return error when user not found", async () => {
        req.userId = 999;

        User.findById = jest.fn().mockResolvedValue(null);

        await invokeController(() => AuthController.getProfile(req, res));

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          error: "User not found",
          message: "User not found",
        });
      });

      it("should handle database errors", async () => {
        req.userId = 1;

        User.findById = jest
          .fn()
          .mockRejectedValue(new Error("Database error"));

        await invokeController(() => AuthController.getProfile(req, res));

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          message: "Internal server error",
        });
      });
    });
  });
});
