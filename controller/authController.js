const User = require("../model/userModel");
const jwt = require("jsonwebtoken");

class AuthController {
  static async register(req, res) {
    try {
      const { name, email, password, postcode } = req.body;

      
      if (!name || !email || !password || !postcode) {
        return res.status(400).json({
          error: "All fields are required"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          error: "Password must be at least 8 characters long"
        });
      }

      
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
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

      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          h3: user.h3
        }
      });

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required"
        });
      }

      
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          error: "Invalid credentials"
        });
      }

     
      const isValidPassword = await User.validatePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: "Invalid credentials"
        });
      }

     
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      res.json({
        message: "Login successful",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          h3: user.h3
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message
      });
    }
  }

  static async logout(req, res) {
    res.clearCookie('auth_token');
    res.json({ message: "Logout successful" });
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found"
        });
      }

      res.json({ user });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        error: "Internal server error"
      });
    }
  }
}

module.exports = AuthController;