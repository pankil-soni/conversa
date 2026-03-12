/**
 * sendMessageEmail
 *
 * Fire-and-forget email notification helper.
 *
 * Rules:
 *  - Only called when the receiver has NO open sockets (truly offline).
 *  - Only called when receiver.emailNotificationsEnabled === true.
 *  - Never awaited in the socket path so the real message is emitted
 *    with zero extra latency.
 */

const nodemailer = require("nodemailer");
const { EMAIL, PASSWORD, FRONTEND_URL } = require("../secrets.js");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: EMAIL, pass: PASSWORD },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 120000,
    greetingTimeout: 120000,
    socketTimeout: 120000,
});

/**
 * @param {{ name: string, email: string }} receiver
 * @param {{ name: string, profilePic?: string }} sender
 * @param {string|null} messageText   - raw text of the message (null for image-only)
 * @param {string} conversationId     - used to deep-link back to the conversation
 */
const sendMessageEmail = (receiver, sender, messageText, conversationId) => {
    const preview =
        messageText && messageText.trim()
            ? messageText.length > 120
                ? messageText.slice(0, 120) + "…"
                : messageText
            : "📷 sent you an image";

    const chatLink = `${FRONTEND_URL}/user/conversations/${conversationId}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Message on Conversa</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="background-color:#6366f1;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Conversa</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">You have a new message</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">
                Hi <strong>${receiver.name}</strong>, you received a new message from
                <strong>${sender.name}</strong>:
              </p>

              <!-- Message preview bubble -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f5f3ff;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:14px 18px;">
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;font-style:italic;">"${preview}"</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${chatLink}"
                       style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;
                              font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.3px;">
                      Open Conversation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 40px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because email notifications are enabled on your Conversa account.
              </p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
                To disable, visit <a href="${FRONTEND_URL}/user/profile" style="color:#6366f1;">Settings → Notifications</a>.
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Conversa. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Intentionally NOT awaited — fire and forget
    transporter
        .sendMail({
            from: `"Conversa" <${EMAIL}>`,
            to: receiver.email,
            subject: `💬 ${sender.name} sent you a message on Conversa`,
            html,
        })
        .catch((err) => {
            console.error("[sendMessageEmail] Failed to send notification email:", err.message);
        });
};

module.exports = sendMessageEmail;
