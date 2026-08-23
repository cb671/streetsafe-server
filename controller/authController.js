const crypto = require("crypto");
const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const { getCookieOptions } = require("../config/security");
const { createHttpError } = require("../utils/httpError");
const EmailService = require("../utils/emailService");

class AuthController {
  static async register(req, res) {
    const { name, email, password, postcode } = req.body;

    if (!name || !email || !password || !postcode) {
      throw createHttpError(400, "All fields are required", {
        error: "All fields are required",
      });
    }

    if (password.length < 8) {
      throw createHttpError(
        400,
        "Password must be at least 8 characters long",
        {
          error: "Password must be at least 8 characters long",
        },
      );
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw createHttpError(409, "User with this email already exists", {
        error: "User with this email already exists",
      });
    }

    let h3Index;
    try {
      h3Index = await User.postcodeToH3(postcode);
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      throw createHttpError(400, "Invalid postcode", {
        error: "Invalid postcode",
        details: {
          postcode,
          reason: error.message,
        },
      });
    }

    let user;
    let confirmationToken;

    try {
      confirmationToken = crypto.randomBytes(32).toString("hex");

      const confirmationTokenHash = crypto
        .createHash("sha256")
        .update(confirmationToken)
        .digest("hex");

      const confirmationExpiresat = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      user = await User.create(
        name,
        email,
        password,
        h3Index,
        confirmationTokenHash,
        confirmationExpiresat,
      );
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      throw createHttpError(500, "Unable to create user account", {
        expose: true,
        error: "Registration failed",
        details: {
          email,
          reason: error.message,
        },
      });
    }

    let confirmationEmailSent = true;

    try {
      await EmailService.sendRegistrationConfirmation(user, confirmationToken);
    } catch (error) {
      confirmationEmailSent = false;
      console.error("Registration email failed:", error.message);
    }

    res.status(201).json({
      message: confirmationEmailSent
        ? "Registration successful. Please check your email to confirm your account."
        : "Registration successful, but the confirmation email could not be sent. Please request another confirmation email.",

      requiresEmailConfirmation: true,
      confirmationEmailSent,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        h3: user.h3,
      },
    });
  }

  static async confirmEmail(req, res) {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw createHttpError(400, "Confirmation token is required", {
        error: "Confirmation token is required",
      });
    }

    const user = await User.confirmationEmail(token);

    if (!user) {
      throw createHttpError(400, "Confirmation link is invalid or expired", {
        error: "Confirmation link is invalid or expired",
      });
    }

    res.json({
      message: "Email confirmed successfully",
    });
  }

  static async resendConfirmation(req, res) {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      throw createHttpError(400, "Email is required", {
        error: "Email is required",
      });
    }

    const user = await User.findByEmail(email);

    const genericMessage =
      "If an unconfirmed account exists for this email, a new confirmation email has been sent.";

    // Do not reveal whether an email address is registered or already verified.
    if (!user || user.email_verified_at) {
      return res.json({
        message: genericMessage,
      });
    }

    const confirmationToken = crypto.randomBytes(32).toString("hex");

    const confirmationTokenHash = crypto
      .createHash("sha256")
      .update(confirmationToken)
      .digest("hex");

    const confirmationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updatedUser = await User.updateConfirmationToken(
      user.id,
      confirmationTokenHash,
      confirmationExpiresAt,
    );

    // The account could have been confirmed between the initial lookup
    // and the database update.
    if (!updatedUser) {
      return res.json({
        message: genericMessage,
      });
    }

    try {
      await EmailService.sendRegistrationConfirmation(
        updatedUser,
        confirmationToken,
      );
    } catch (error) {
      console.error("Confirmation email resend failed:", error.message);

      throw createHttpError(502, "Unable to send confirmation email", {
        expose: true,
        error: "Email sending failed",
      });
    }

    return res.json({
      message: genericMessage,
    });
  }

  static async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createHttpError(400, "Email and password are required", {
        error: "Email and password are required",
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      throw createHttpError(401, "Invalid credentials", {
        error: "Invalid credentials",
      });
    }

    const isValidPassword = await User.validatePassword(
      password,
      user.password,
    );

    if (!isValidPassword) {
      throw createHttpError(401, "Invalid credentials", {
        error: "Invalid credentials",
      });
    }

    if (!user.email_verified_at) {
      throw createHttpError(
        403,
        "Please confirm your email before logging in",
        {
          error: "Email address has not been confirmed",
        },
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie(
      "auth_token",
      token,
      getCookieOptions(req, 7 * 24 * 60 * 60 * 1000),
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        h3: user.h3,
      },
    });
  }

  static async logout(req, res) {
    res.clearCookie("auth_token", getCookieOptions(req));
    res.json({ message: "Logout successful" });
  }

  static async getProfile(req, res) {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createHttpError(404, "User not found", {
        error: "User not found",
      });
    }

    res.json({ user });
  }
}

module.exports = AuthController;
