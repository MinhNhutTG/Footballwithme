const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {OAuth2Client} = require(('google-auth-library'));
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const toggleFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { postId } = req.params;
    const index = user.favorites.indexOf(postId);
    if (index === -1) {
      user.favorites.push(postId);
    } else {
      user.favorites.splice(index, 1);
    }
    await user.save();
    res.json({ favorites: user.favorites });
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try{
      const {credential} = req.body;
      if (!credential) {
        return res.status(400).json({message: 'Missing Google credential'});
      }

      const ticket = await googleClient.verifyIdToken({idToken: credential, audience: process.env.GOOGLE_CLIENT_ID,});
      const payload = ticket.getPayload();
      const {sub: googleId, email, name} = payload;

      let user = await(User.findOne({$or: [{googleId}, {email}]}));
      if (!user){
        user = await(User.create({name, email, googleId}));
      }
      else if (!user.googleId){
        user.googleId = googleId;
        await user.save();
      }

      const token = signToken(user);
      res.json({user, token});
  }
  catch(err){
    next(err);
  }
}

module.exports = { register, login, me, toggleFavorite, googleAuth};
