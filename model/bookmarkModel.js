const db = require("../database/connect");

class Bookmark {
  static async save(userId, resourceId) {
    const { rows } = await db.query(
      `INSERT INTO resource_bookmarks (user_id, resource_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, resource_id) DO NOTHING
      RETURNING resource_id`,
      [userId, resourceId],
    );

    return rows[0] || null;
  }

  static async getForUser(userId) {
    const { rows } = await db.query(
      `SELECT e.*, b.saved_at
      FROM resource_bookmarks AS b
      JOIN educational_sources AS e ON e.id = b.resource_id
      WHERE b.user_id = $1
      ORDER BY b.saved_at DESC, b.resource_id DESC`,
      [userId],
    );

    return rows;
  }

  static async remove(userId, resourceId) {
    await db.query(
      `DELETE FROM resource_bookmarks
      WHERE user_id = $1 AND resource_id = $2`,
      [userId, resourceId],
    );
  }
}

module.exports = Bookmark;
