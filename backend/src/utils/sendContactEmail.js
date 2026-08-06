const resend = require('../config/mailer')

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendContactEmail({ name, email, message }) {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    await resend.emails.send({
        from: 'FootballWithMe <noreply@minhnhutsoftware.id.vn>',
        to: process.env.ADMIN_EMAIL,
        replyTo: email,
        subject: `[Liên hệ] Tin nhắn mới từ ${safeName}`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
          <h2 style="font-size: 18px;">Tin nhắn liên hệ mới từ FootballWithMe</h2>
          <p><strong>Họ tên:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Nội dung:</p>
          <blockquote style="margin: 0; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #22c55e; font-size: 14px; white-space: pre-wrap;">${safeMessage}</blockquote>
        </body>
        </html>
        `,
    });
}

module.exports = sendContactEmail;
