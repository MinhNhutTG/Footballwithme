const sendContactEmail = require('../utils/sendContactEmail');

async function submit(req, res, next) {
  try {
    const { name, email, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'name, email and message are required' });
    }
    if (name.length > 100 || message.length > 2000) {
      return res.status(400).json({ message: 'name or message too long' });
    }

    await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit };
