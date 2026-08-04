const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function(){return !this.googleId;}, minlength: 6 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    favorites: { type: [String], default: [] },
    bio: { type: String, default: '', trim: true, maxlength: 300 },
    avatarUrl: {type: String, default: ''},
    resetPasswordToken: {type: String, default: undefined},
    resetPasswordExpires: {type: Date, default: undefined},
    googleId: {type: String, default: undefined},
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: undefined },
    verificationTokenExpires: { type: Date, default: undefined },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
