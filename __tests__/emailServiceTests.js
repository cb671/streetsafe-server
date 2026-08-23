const { sendRegistrationConfirmation } = require("../utils/emailService");

describe("emailService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BREVO_API_KEY: "test-api-key",
      BREVO_CONFIRMATION_TEMPLATE_ID: "42",
      EMAIL_CONFIRMATION_URL: "https://example.com/confirm-email",
    };
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("sends the active Brevo template with its expected parameters", async () => {
    await sendRegistrationConfirmation(
      {
        name: "John Doe",
        email: "john@example.com",
      },
      "confirmation-token",
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "api-key": "test-api-key" }),
        body: JSON.stringify({
          to: [{ email: "john@example.com", name: "John Doe" }],
          templateId: 42,
          params: {
            firstName: "John",
            confirmationUrl:
              "https://example.com/confirm-email?token=confirmation-token",
          },
        }),
      }),
    );
  });

  it("reports Brevo API errors", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue("invalid template"),
    });

    await expect(
      sendRegistrationConfirmation(
        {
          name: "John Doe",
          email: "john@example.com",
        },
        "confirmation-token",
      ),
    ).rejects.toThrow("Brevo rejected the confirmation email (400)");
  });
});
