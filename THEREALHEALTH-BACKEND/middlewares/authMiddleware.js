const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET =
  process.env.JWT_SECRET || "therealhealth_jwt_secret_123";

const buildPhoneVariants = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const tenDigitPhone =
    digits.length >= 10 ? digits.slice(-10) : digits;

  if (!tenDigitPhone) return [];

  return [
    ...new Set([
      tenDigitPhone,
      `91${tenDigitPhone}`,
      `+91${tenDigitPhone}`,
    ]),
  ];
};

const findUserFromToken = async (decoded) => {
  const phoneVariants = buildPhoneVariants(decoded.phone);

  if (decoded.userId) {
    const userById = await User.findById(String(decoded.userId));
    if (userById) return userById;
  }

  for (const phone of phoneVariants) {
    const userById = await User.findById(phone);
    if (userById) return userById;
  }

  return User.findOne({
    alternativePhoneNumber: {
      $in: phoneVariants,
    },
  });
};

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Token missing",
      });
    }

    const token = authHeader.slice(7).trim();
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await findUserFromToken(decoded);

    if (!user) {
      console.error("User not found for token:", {
        phone: decoded.phone,
        userId: decoded.userId || null,
        role: decoded.role,
      });

      return res.status(404).json({
        message: "User not found",
      });
    }

    req.authenticatedUser = user;

    req.user = {
      ...decoded,
      _id: user._id.toString(),
      id: user._id.toString(),
      userId: user._id.toString(),
      phone: user._id.toString(),
      role: user.role || decoded.role || "user",
    };

    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

const authenticateAdmin = async (req, res, next) => {
  return authenticateUser(req, res, () => {
    if (
      req.method === "DELETE" &&
      req.user._id === req.params.id
    ) {
      return next();
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admins only",
      });
    }

    return next();
  });
};

module.exports = {
  authenticateUser,
  authenticateAdmin,
};