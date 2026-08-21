const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const getEmailConfig = () => {
  const apiKey = process.env.BREVO_API_KEY;
  const templateId = Number.parseInt(
    process.env.BREVO_CONFIRMATION_TEMPLATE_ID,
    10,
  );
  const confirmationUrl = process.env.EMAIL_CONFIRMATION_URL;

  if (!apiKey || !Number.isInteger(templateId) || !confirmationUrl) {
    throw new Error(
      "Brevo email is not configured. Set BREVO_API_KEY, BREVO_CONFIRMATION_TEMPLATE_ID, and EMAIL_CONFIRMATION_URL.",
    );
  }

  try {
    new URL(confirmationUrl);
  } catch {
    throw new Error("EMAIL_CONFIRMATION_URL must be an absolute URL.");
  }

  return { apiKey, templateId, confirmationUrl };
};

const sendRegistrationConfirmation = async (user, token) => {
  const { apiKey, templateId, confirmationUrl } = getEmailConfig();

  const url = new URL(confirmationUrl);
  url.searchParams.set("token", token);
  const confirmationUrlWithToken = url.toString();

  const firstName = user.name.trim().split(/\s+/)[0];
  const response = await fetch(BREVO_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: [{ email: user.email, name: user.name }],
      templateId,
      params: {
        firstName,
        confirmationUrl: url.toString(),
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Brevo rejected the confirmation email (${response.status}): ${details}`,
    );
  }
};

module.exports = {
  sendRegistrationConfirmation,
};
