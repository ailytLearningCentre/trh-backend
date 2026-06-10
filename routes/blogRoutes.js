// Placeholder content for blogRoutes.js
const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");
const { authenticateAdmin } = require("../middlewares/authMiddleware");
const { createBlog, getBlogs, deleteBlog } = require("../controllers/blogController");

router.get("/blogs", getBlogs);
router.post("/admin/blogs", authenticateAdmin, upload.single("image"), createBlog);
router.delete("/:id", authenticateAdmin, deleteBlog);

module.exports = router;