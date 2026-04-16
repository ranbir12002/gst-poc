const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  mobile: { type: Number },
  password: { type: String, required: true },
  role: { type: String, enum: ['root', 'admin', 'region', 'circle'], required: true },
  region: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Region', default: null }],
  circle: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Circle', default: null }],
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
