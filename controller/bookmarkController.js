const Bookmark = require("../model/bookmarkModel");
const { createHttpError } = require("../utils/httpError");

class BookmarkController {
  static async getBookmarks(req, res) {
    const resources = await Bookmark.getForUser(req.userId);

    res.json({ resources });
  }

  static async saveBookmark(req, res) {
    const resourceId = Number(req.params.resourceId);

    if (
      !Number.isInteger(resourceId) ||
      resourceId < 1 ||
      resourceId > 2147483647
    ) {
      throw createHttpError(400, "Invalid resource ID");
    }

    try {
      await Bookmark.save(req.userId, resourceId);
    } catch (error) {
      if (
        error.code === "23503" &&
        error.constraint === "resource_bookmarks_resource_id_fkey"
      ) {
        throw createHttpError(404, "Resource not found");
      }

      throw error;
    }

    res.status(200).json({ resourceId, saved: true });
  }

  static async removeBookmark(req, res) {
    const resourceId = Number(req.params.resourceId);

    if (
      !Number.isInteger(resourceId) ||
      resourceId < 1 ||
      resourceId > 2147483647
    ) {
      throw createHttpError(400, "Invalid resource ID");
    }

    await Bookmark.remove(req.userId, resourceId);

    res.status(204).end();
  }
}

module.exports = BookmarkController;
