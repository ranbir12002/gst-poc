const mongoose = require('mongoose');

const RegionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  circles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Circle' }]
}, { timestamps: true });

module.exports = mongoose.model('Region', RegionSchema);
