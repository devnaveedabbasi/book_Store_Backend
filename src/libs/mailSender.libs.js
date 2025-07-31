const {
  Reset_Password_Email_Template,
  Verification_Email_Template,
  Welcome_Email_Template,
} = require("../config/emailTemplete.config.js");

const transporter = require("../config/sendEmail.config.js");

const sendVerificationCode = async (email, verificationCode) => {
  try {
    const response = await transporter.sendMail({
      from: '"Naveed" <naveedabbasi03111309060@gmail.com>',
      to: email,
      subject: "Verify your Email",
      text: "Verify your Email",
      html: Verification_Email_Template.replace(
        "{verificationCode}",
        verificationCode
      ),
    });
  } catch (error) {
    console.log("Email error", error);
  }
};

const wellcomeEmail = async (email, name) => {
  try {
    const response = await transporter.sendMail({
      from: '"Naveed" <naveedabbasi03111309060@gmail.com>',
      to: email,
      subject: "Welcome to Our Community!",
      text: "Welcome to Our Community!",
      html: Welcome_Email_Template.replace("{name}", name),
    });
  } catch (error) {
    console.log("Email error", error);
  }
};

const sendResetPasswordEmail = async (email, resetLink) => {
  try {
    const response = await transporter.sendMail({
      from: '"Naveed" <naveedabbasi03111309060@gmail.com>',
      to: email,
      subject: "Reset your password",
      text: "Reset your password",
      html: Reset_Password_Email_Template.replace("{resetLink}", resetLink),
    });
    console.log("Reset Password Email sent successfully", response);
  } catch (error) {
    console.log("Email error", error);
  }
};

module.exports = {
  wellcomeEmail,
  sendVerificationCode,
  sendResetPasswordEmail,
};
