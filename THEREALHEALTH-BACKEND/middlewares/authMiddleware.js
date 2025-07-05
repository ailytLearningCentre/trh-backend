const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authenticateAdmin = (req, res, next) => {
  authenticateUser(req, res, () => {
    // Allow users to delete their own accounts
    if (req.method === "DELETE" && req.user._id === req.params.id) {
      return next(); // Allow the user to proceed
    }

    // Restrict other actions to admins only
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }

    next(); // Allow admins to proceed
  });
};

module.exports = { authenticateUser, authenticateAdmin };
