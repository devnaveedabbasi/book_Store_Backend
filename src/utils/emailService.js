const nodemailer = require("nodemailer");
const config = require("../config/auth.config");

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Changed to use Gmail service directly
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

// Verify transporter connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error("SMTP connection error:", error);
    console.log("Email configuration:", {
      user: config.email.auth.user,
      passLength: config.email.auth.pass ? config.email.auth.pass.length : 0,
    });
  } else {
    console.log("SMTP server is ready to send messages");
  }
});

const sendOTPEmail = async (email, otp) => {
  console.log("Attempting to send OTP email to:", email);

  const mailOptions = {
    from: `"BookStore" <${config.email.auth.user}>`,
    to: email,
    subject: "Email Verification OTP",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Verify Your Email</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 2px;">${otp}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
};

module.exports = { sendOTPEmail };
