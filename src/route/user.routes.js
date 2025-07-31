const express = require("express");
const router = express.Router();
const {
  registerUser,
  verifyOtp,
  loginUser,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutUser,
  getUserDetails,
} = require("../controllers/user.controller.js");
const { auth } = require("../middlewares/auth.middleware.js");

// 🔐 Public Routes
router.post("/signup", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/signin", loginUser);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔒 Protected Route
router.post("/signout", auth, logoutUser);
router.post("/change-password", auth, changePassword);
router.post("/get-user-details", auth, getUserDetails);

module.exports = router;
