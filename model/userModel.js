const db = require("../database/connect");
const bcrypt = require("bcrypt");
const { geoToH3 } = require("h3-js");
const crypto = require("crypto");
const { createHttpError } = require("../utils/httpError");

class User {
  static async create(
    name,
    email,
    password,
    h3,
    emailConfirmationTokenHash,
    emailConfirmationExpiresAt,
  ) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);

      const query = `
        INSERT INTO users (
          name, 
          email, 
          password, 
          h3,
          email_confirmation_token_hash,
          email_confirmation_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, email, h3, email_verified_at, created_at
      `;

      // Normalize the email before saving it
      const values = [
        name,
        email.trim().toLowerCase(),
        hashedPassword,
        h3,
        emailConfirmationTokenHash,
        emailConfirmationExpiresAt,
      ];

      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Fetch user by email

  static async findByEmail(email) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const query = `
        SELECT * 
        FROM users 
        WHERE LOWER(TRIM(email)) = $1
      `;
      const { rows } = await db.query(query, [normalizedEmail]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          id, 
          name, 
          email, 
          h3, 
          email_verified_at,
          created_at 
        FROM users 
        WHERE id = $1
      `;

      const { rows } = await db.query(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async confirmationEmail(token) {
    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const query = `
        UPDATE users
        SET 
          email_verified_at = COALESCE(email_verified_at, NOW()),
          email_confirmation_token_hash = NULL,
          email_confirmation_expires_at = NULL
        WHERE email_confirmation_token_hash = $1
          AND email_confirmation_expires_at > NOW()
        RETURNING id, name, email, email_verified_at
      `;

      const { rows } = await db.query(query, [tokenHash]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async updateConfirmationToken(
    userId,
    confirmationTokenHash,
    confirmationExpiresAt,
  ) {
    try {
      const query = `
        UPDATE users
        SET
          email_confirmation_token_hash = $2,
          email_confirmation_expires_at = $3
        WHERE id = $1
          AND email_verified_at IS NULL
        RETURNING id, name, email
      `;

      const values = [userId, confirmationTokenHash, confirmationExpiresAt];

      const { rows } = await db.query(query, values);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Updating password

  static async resetPassword(token, newPassword) {
    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const query = `
        UPDATE users
        SET password = $2,
            password_reset_token_hash = NULL,
            password_reset_expires_at = NULL
        WHERE password_reset_token_hash = $1
        AND password_reset_expires_at > NOW()
        RETURNING id, name, email
      `;

      const { rows } = await db.query(query, [tokenHash, hashedPassword]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async updatePassword(userId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const query = `
        UPDATE users
        SET password = $2,
            password_reset_token_hash = NULL,
            password_reset_expires_at = NULL
        WHERE id = $1
        RETURNING id, name, email
      `;

      const { rows } = await db.query(query, [userId, hashedPassword]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async updatePasswordResetToken(
    userId,
    resetTokenHash,
    resetExpiresAt,
  ) {
    try {
      const query = `
        UPDATE users
        SET
          password_reset_token_hash = $2,
          password_reset_expires_at = $3
        WHERE id = $1
        RETURNING id, name, email
      `;

      const values = [userId, resetTokenHash, resetExpiresAt];

      const { rows } = await db.query(query, values);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findByPasswordResetToken(token) {
    try {
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const query = `
        SELECT * 
        FROM users 
        WHERE password_reset_token_hash = $1
          AND password_reset_expires_at > NOW()
      `;

      const { rows } = await db.query(query, [tokenHash]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updatePostcode(userId, h3Index) {
    const query = `
      UPDATE users
      SET h3 = $2
      WHERE id = $1
      RETURNING id, name, email, h3, email_verified_at, created_at
    `;

    const { rows } = await db.query(query, [userId, h3Index]);
    return rows[0] || null;
  }

  static async postcodeToH3(postcode) {
    try {
      if (typeof postcode !== "string" || !postcode.trim()) {
        throw createHttpError(400, "Postcode must be a string");
      }
      const normalizedPostcode = postcode.trim().toUpperCase();
      const outwardCodePattern = /^[A-Z]{1,2}\d[A-Z\d]?$/;
      const fullPostcodePattern =
        /^(?:GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/;
      const isOutwardCode = outwardCodePattern.test(normalizedPostcode);

      if (!isOutwardCode && !fullPostcodePattern.test(normalizedPostcode)) {
        throw createHttpError(
          400,
          "Enter a valid UK outward code or full postcode",
        );
      }

      const postcodePath = isOutwardCode ? "outcodes" : "postcodes";

      console.log(`Converting postcode: "${normalizedPostcode}"`);

      const response = await fetch(
        `https://api.postcodes.io/${postcodePath}/${encodeURIComponent(normalizedPostcode)}`,
        {
          headers: {
            "User-Agent": "StreetSafe-App/1.0",
          },
        },
      );

      console.log(`API Response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw createHttpError(400, "Postcode not found");
        }

        throw new Error(`Postcode service returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.result) {
        throw new Error("Postcode service returned no result");
      }

      const { latitude, longitude } = data.result;
      console.log(`Coordinates: lat=${latitude}, lng=${longitude}`);

      const h3Index = geoToH3(latitude, longitude, 9);
      console.log(`H3 index: ${h3Index}`);
      return h3Index;
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }
      console.error("Postcode lookup failed:", error.message);

      throw createHttpError(
        502,
        "Postcode lookup is temporarily unavailable. Please try again later.",
        { expose: true },
      );
    }
  }
}

module.exports = User;
