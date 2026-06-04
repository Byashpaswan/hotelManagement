const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'manager', 'receptionist', 'housekeeping', 'guest'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Invalid role: {VALUE}' },
      default: 'receptionist',
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,20}$/, 'Invalid phone number'],
    },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    refreshTokens: [
      {
        token: { type: String, select: false },
        createdAt: { type: Date, default: Date.now },
        userAgent: String,
        ip: String,
      },
    ],
    passwordChangedAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLogin: Date,
  },
  { 
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// --- Indexes ---
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// --- Pre-save: hash password ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

// --- Instance methods ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts = (this.loginAttempts || 0) + 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
  }
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.passwordChangedAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    return parseInt(this.passwordChangedAt.getTime() / 1000, 10) > jwtTimestamp;
  }
  return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;