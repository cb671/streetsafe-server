const nodemailer = require("nodemailer");

const getTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10);
  const secure = process.env.EMAIL_SECURE === "true";
  const authUser = process.env.EMAIL_USER;
  const authPass = process.env.EMAIL_PASS;

  if (!host || Number.isNaN(port) || !authUser || !authPass) {
    throw new Error(
      "Email transport is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS.",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: authUser,
      pass: authPass,
    },
  });
};

const sendRegistrationConfirmation = async (user) => {
  const transporter = getTransporter();

  const message = {
    from: process.env.EMAIL_FROM || `StreetSafe <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Welcome to StreetSafe",
    text: `Hi ${user.name},\n\nThanks for signing up to StreetSafe! Your account has been created successfully.\n\nIf you have any questions, reply to info@dominic-simpson.co.uk\n\nStay safe,\nStreetSafe Team`,
    html: `<p>Hi ${user.name},</p><p>Thanks for signing up to <strong>StreetSafe</strong>! Your account has been created successfully.</p><p>If you have any questions, reply to info@dominic-simpson.co.uk</p><p>Stay safe,<br/>StreetSafe Team</p>`,
  };

  await transporter.sendMail(message);
};

module.exports = {
  sendRegistrationConfirmation,
};
