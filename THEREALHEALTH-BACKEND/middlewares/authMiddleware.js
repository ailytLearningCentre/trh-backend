const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const authenticateUser = (req, res, next) => {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is missing in environment variables",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      ...decoded,
      role: String(decoded.role || "").toLowerCase(),
    };

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authenticateAdmin = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only" });
    }
    next();
  });
};

const authenticateDoctor = (req, res, next) => {
  authenticateUser(req, res, () => {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Doctors only" });
    }
    next();
  });
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
  authenticateDoctor,
};