const db = require("../database/connect");
const bcrypt = require("bcrypt");

class User {
  static async create(name, email, password, h3) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const query = `
        INSERT INTO users (name, email, password, h3)
        VALUES ($1, $2, $3, $4::h3index::bigint)
        RETURNING id, name, email, h3, created_at
      `;
      const values = [name, email, hashedPassword, h3];
      const { rows } = await db.query(query, values);
      return rows[0];
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const query = `SELECT * FROM users WHERE email = $1`;
      const { rows } = await db.query(query, [email]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const query = `SELECT id, name, email, h3, created_at FROM users WHERE id = $1`;
      const { rows } = await db.query(query, [id]);
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
            'User-Agent': 'StreetSafe-App/1.0'
          }
        }
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
        throw new Error('Postcode not found');
      }

      const { latitude, longitude } = data.result;
      console.log(`Coordinates: lat=${latitude}, lng=${longitude}`);
      
      
      const query = `SELECT h3_lat_lng_to_cell(POINT($1, $2), 9)::h3index as h3_index`;
      const { rows } = await db.query(query, [longitude, latitude]);
      
      console.log(`H3 index: ${rows[0].h3_index}`);
      return rows[0].h3_index;
    } catch (error) {
      console.error(`Full error details:`, error);
      throw new Error(`Error converting postcode to H3: ${error.message}`);
    }
  }
}

module.exports = User;