const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const { getCookieOptions } = require("../config/security");
const { createHttpError } = require("../utils/httpError");

class AuthController {
  static async register(req, res) {
    const { name, email, password, postcode } = req.body;

    if (!name || !email || !password || !postcode) {
      throw createHttpError(400, "All fields are required", {
        error: "All fields are required"
      });
    }

    if (password.length < 8) {
      throw createHttpError(400, "Password must be at least 8 characters long", {
        error: "Password must be at least 8 characters long"
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw createHttpError(409, "User with this email already exists", {
        error: "User with this email already exists"
      });
    }

    const h3Index = await User.postcodeToH3(postcode);

    const user = await User.create(name, email, password, h3Index);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(
      'auth_token',
      token,
      getCookieOptions(req, 7 * 24 * 60 * 60 * 1000)
    );

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        h3: user.h3
      }
    });
  }

  static async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw createHttpError(400, "Email and password are required", {
        error: "Email and password are required"
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      throw createHttpError(401, "Invalid credentials", {
        error: "Invalid credentials"
      });
    }

    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      throw createHttpError(401, "Invalid credentials", {
        error: "Invalid credentials"
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(
      'auth_token',
      token,
      getCookieOptions(req, 7 * 24 * 60 * 60 * 1000)
    );

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        h3: user.h3
      }
    });
  }

  static async logout(req, res) {
    res.clearCookie('auth_token', getCookieOptions(req));
    res.json({ message: "Logout successful" });
  }

  static async getProfile(req, res) {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createHttpError(404, "User not found", {
        error: "User not found"
      });
    }

    res.json({ user });
  }
}

module.exports = AuthController;
