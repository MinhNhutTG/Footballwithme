const resend = require('../config/mailer')

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendReplyNotification(to, { replierName, originalText, replyText, postUrl }) {
    const safeReplierName = escapeHtml(replierName);
    const safeOriginalText = escapeHtml(originalText);
    const safeReplyText = escapeHtml(replyText);

    await resend.emails.send({
        from: 'FootballWithMe <noreply@minhnhutsoftware.id.vn>',
        to,
        subject: `${safeReplierName} đã trả lời bình luận của bạn`,
        html: `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Có người trả lời bình luận của bạn</title>
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
                                    <h2 style="margin:0 0 16px; color:#1a1a1a; font-size:20px;">${safeReplierName} đã trả lời bình luận của bạn</h2>

                                    <p style="margin:0 0 6px; color:#8a8a8a; font-size:13px;">Bình luận của bạn:</p>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:16px;">
                                        <tr>
                                            <td style="padding:12px 16px; color:#4a4a4a; font-size:14px; line-height:1.6; border-left:3px solid #cccccc;">
                                                ${safeOriginalText}
                                            </td>
                                        </tr>
                                    </table>

                                    <p style="margin:0 0 6px; color:#8a8a8a; font-size:13px;">Trả lời:</p>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:24px;">
                                        <tr>
                                            <td style="padding:12px 16px; color:#1a1a1a; font-size:14px; line-height:1.6; border-left:3px solid #2e7d32;">
                                                ${safeReplyText}
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- BUTTON -->
                                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                                        <tr>
                                            <td style="border-radius:8px; background-color:#2e7d32;">
                                                <a href="${postUrl}" target="_blank" style="display:inline-block; padding:14px 36px; color:#ffffff; text-decoration:none; font-size:15px; font-weight:600; border-radius:8px;">
                                                    Xem bài viết
                                                </a>
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
                                        Email này được gửi tự động, vui lòng không trả lời.
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

module.exports = sendReplyNotification;
