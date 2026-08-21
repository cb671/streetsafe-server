const db = require("../database/connect");
const bcrypt = require("bcrypt");
const { geoToH3 } = require("h3-js");
const crypto = require("crypto");

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
        SELECT id, name, email, h3, created_at FROM users WHERE id = $1`;
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
        SET email_verified_at = COALESCE(email_verified_at, NOW())
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

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async postcodeToH3(postcode) {
    try {
      console.log(`Converting postcode: "${postcode}"`);

      const response = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
        {
          headers: {
            "User-Agent": "StreetSafe-App/1.0",
          },
        },
      );

      console.log(`API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`API Error response: ${errorText}`);
        throw new Error(`Invalid postcode: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`API Response data:`, data);

      if (!data.result) {
        throw new Error("Postcode not found");
      }

      const { latitude, longitude } = data.result;
      console.log(`Coordinates: lat=${latitude}, lng=${longitude}`);

      const h3Index = geoToH3(latitude, longitude, 9);
      console.log(`H3 index: ${h3Index}`);
      return h3Index;
    } catch (error) {
      console.error(`Full error details:`, error);
      throw new Error(`Error converting postcode to H3: ${error.message}`);
    }
  }
}

module.exports = User;
