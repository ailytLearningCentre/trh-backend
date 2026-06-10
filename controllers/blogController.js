// Placeholder content for blogController.js
const Blog = require("../models/Blog");

// Create a blog with an image
exports.createBlog = async (req, res) => {
  try {
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    const { title, content } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const newBlog = new Blog({
      title,
      content,
      image: imageUrl,
      createdAt: new Date(),
    });

    await newBlog.save();

    res.status(201).json({ message: "Blog posted successfully", blog: newBlog });
  } catch (error) {
    console.error("Error posting blog:", error.message);
    console.error("Error details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });

    // Update the image path dynamically
    const updatedBlogs = blogs.map(blog => ({
      ...blog._doc, // Spread the blog document
      image: blog.image ? `${req.protocol}://${req.get('host')}${blog.image}` : null, // Dynamically construct the image URL
    }));

    res.status(200).json(updatedBlogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Error fetching blogs", error: error.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Blog.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Blog not found" });
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting blog", error: error.message });
  }
};
