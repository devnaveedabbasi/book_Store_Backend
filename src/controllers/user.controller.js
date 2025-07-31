const {
  sendVerificationCode,
  wellcomeEmail,
  sendResetPasswordEmail,
} = require("../libs/mailSender.libs.js");
const { User } = require("../models/user.model.js");
const { ApiError } = require("../utils/apiError.js");
const { ApiResponse } = require("../utils/apiResponse.js");
const jwt = require("jsonwebtoken");

// Register User
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!(fullName && email && password)) {
      throw new ApiError(400, "fullName, email, and password are required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Email is not valid");
    }

    const existedUser = await User.findOne({ email });
    if (existedUser) {
      throw new ApiError(408, "User already exists");
    }

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      fullName,
      email,
      password,
      verificationCode,
      verificationCodeExpires: expiry,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -verificationCode -verificationCodeExpires"
    );

    await sendVerificationCode(user.email, verificationCode);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: createdUser },
          "User Registered Successfully"
        )
      );
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ApiError(400, "Email and verification code are required");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.isVerified) {
      throw new ApiError(400, "User is already verified");
    }

    if (
      user.verificationCode?.toString() !== otp.toString() ||
      user.verificationCodeExpires < new Date()
    ) {
      throw new ApiError(400, "Invalid or expired verification code");
    }

    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    const token = user.generateToken();
    user.token = token;

    await user.save();

    await wellcomeEmail(user.email, user.fullName);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified,
          },
        },
        "Email verified successfully"
      )
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (!user.isVerified) {
      throw new ApiError(403, "Please verify your email first");
    }

    // Compare password
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Generate token
    const token = user.generateToken();
    user.token = token;

    await user.save();

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          token,
          user: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            isVerified: user.isVerified,
          },
        },
        "Login successful"
      )
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// 1. Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(404, "User not found");

    if (user.isVerified) throw new ApiError(400, "User already verified");

    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();
    await sendVerificationCode(email, verificationCode);

    res.status(200).json(new ApiResponse(200, {}, "OTP resent successfully"));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// 2. Forgot Password (send reset link or OTP)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) throw new ApiError(404, "User not found");

    // ✅ Generate reset token with short expiry
    const resetToken = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.RESET_PASSWORD_SECRET, // ✅ Set this in .env
      { expiresIn: "10m" }
    );

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

    // ✅ Send email with reset link
    await sendResetPasswordEmail(email, resetLink);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Reset link sent successfully"));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// 3. Reset Password using OTP
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      throw new ApiError(400, "Token and new password are required");
    }

    // ✅ Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    } catch (err) {
      throw new ApiError(401, "Invalid or expired token");
    }

    // ✅ Find user
    const user = await User.findById(decoded._id);
    if (!user) throw new ApiError(404, "User not found");

    // ✅ Update password
    user.password = newPassword;
    await user.save();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully"));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// 4. Change Password (Authenticated Route)
const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const isMatch = await user.isPasswordCorrect(oldPassword);
    if (!isMatch) throw new ApiError(400, "Old password is incorrect");

    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json(new ApiResponse(200, {}, "Password changed successfully"));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById(userId).select("-password -__v");

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
        },
        "User fetched successfully"
      )
    );
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

const logoutUser = async (req, res) => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.token = null; // Clear the token
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = {
  registerUser,
  verifyOtp,
  loginUser,
  changePassword,
  resetPassword,
  forgotPassword,
  resendOtp,
  getUserDetails,
  logoutUser,
};
