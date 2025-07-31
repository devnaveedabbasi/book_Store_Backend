const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: "naveedabbasi03111309060@gmail.com",
    pass: "sltjlahkmhkgmtyz",
  },
});

module.exports = transporter;
