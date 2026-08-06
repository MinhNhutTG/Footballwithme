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
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Tin nhắn liên hệ mới</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f2f4f7; font-family: 'Segoe UI', Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f7; padding:30px 0;">
                <tr>
                    <td align="center">
                        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

                            <!-- BANNER -->
                            <tr>
                                <td style="padding:0;">
                                    <img
                                        src="https://res.cloudinary.com/deumqjwte/image/upload/v1785398516/banner_m4zm5a.png"
                                        alt="FootballWithMe"
                                        width="600"
                                        style="display:block; width:100%; max-width:600px; height:auto; border:0;"
                                    />
                                </td>
                            </tr>

                            <!-- NỘI DUNG -->
                            <tr>
                                <td style="padding:40px 40px 20px;">
                                    <h2 style="margin:0 0 16px; color:#1a1a1a; font-size:20px;">Tin nhắn liên hệ mới</h2>
                                    <p style="margin:0 0 4px; color:#4a4a4a; font-size:15px;"><strong>Họ tên:</strong> ${safeName}</p>
                                    <p style="margin:0 0 20px; color:#4a4a4a; font-size:15px;"><strong>Email:</strong> ${safeEmail}</p>

                                    <p style="margin:0 0 6px; color:#8a8a8a; font-size:13px;">Nội dung:</p>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px;">
                                        <tr>
                                            <td style="padding:14px 16px; color:#1a1a1a; font-size:14px; line-height:1.6; white-space:pre-wrap; border-left:3px solid #2e7d32;">
                                                ${safeMessage}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>

                            <!-- FOOTER -->
                            <tr>
                                <td style="background-color:#f7f8fa; padding:24px 40px; text-align:center; border-top:1px solid #eaeaea;">
                                    <p style="margin:0 0 6px; color:#9a9a9a; font-size:12px;">
                                        © ${new Date().getFullYear()} FootballWithMe. All rights reserved.
                                    </p>
                                    <p style="margin:0; color:#b0b0b0; font-size:11px;">
                                        Bấm "Trả lời" trên email này để phản hồi trực tiếp cho người gửi.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
    });
}

module.exports = sendContactEmail;
