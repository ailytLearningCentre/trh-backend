// Placeholder content for blogRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middlewares/authMiddleware");
const { createBlog, getBlogs, deleteBlog } = require("../controllers/blogController");

router.get("/", getBlogs);
router.post("/", authenticateAdmin, createBlog);
router.delete("/:id", authenticateAdmin, deleteBlog);

module.exports = router;