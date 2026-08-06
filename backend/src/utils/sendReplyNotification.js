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
        <html>
        <body style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 480px; margin: 0 auto;">
          <h2 style="font-size: 18px;">${safeReplierName} đã trả lời bình luận của bạn trên FootballWithMe</h2>

          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Bình luận của bạn:</p>
          <blockquote style="margin: 0 0 16px; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #ccc; font-size: 14px;">
            ${safeOriginalText}
          </blockquote>

          <p style="color: #666; font-size: 13px; margin-bottom: 4px;">Trả lời:</p>
          <blockquote style="margin: 0 0 20px; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #22c55e; font-size: 14px;">
            ${safeReplyText}
          </blockquote>

          <a href="${postUrl}" style="display: inline-block; padding: 10px 20px; background: #22c55e; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">
            Xem bài viết
          </a>
        </body>
        </html>
        `,
    });
}

module.exports = sendReplyNotification;
