const mongoose = require('mongoose');

const CircleSchema = new mongoose.Schema({
  CIRCLE_NO: { type: Number, required: true, unique: true },
  CIR_NAM_NU: { type: String, required: true },
  Zone_Name: { type: String },
  CORPORATE: { type: String },
  ward_count: { type: Number, default: 0 },
  ward_names: [String],
  ward_numbers: [Number],
  geometry: {
    type: { type: String, enum: ['Polygon', 'MultiPolygon'], required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  business_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

CircleSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Circle', CircleSchema);
