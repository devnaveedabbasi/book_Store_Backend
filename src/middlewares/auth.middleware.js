const jwt = require("jsonwebtoken");
const { ApiError } = require("../utils/apiError.js");

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(401, "Unauthorized: Token not provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    req.user = decoded; // Attach decoded user info to request
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ✅ New Middleware: Only allow Admin
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied: Admins only",
    });
  }
  next();
};

module.exports = { auth, isAdmin };
