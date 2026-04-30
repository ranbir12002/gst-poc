const mongoose = require('mongoose');

const CircleSchema = new mongoose.Schema({
  // Identity
  CIRCLE_NO: { type: Number, unique: true, sparse: true },
  CIR_NAM_NU: { type: String },     // e.g. "6-Ghatkesar"
  name: { type: String },           // Human-readable name
  Zone_Name: { type: String },
  CORPORATE: { type: String },

  // A circle is a COLLECTION of wards — this is the source of truth
  wards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ward' }],
  ward_count: { type: Number, default: 0 },
  ward_numbers: [Number],
  ward_names: [String],

  // Combined geometry (auto-computed from constituent wards)
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed
    }
  },

  // Stats
  business_count: { type: Number, default: 0 },
  status: { type: String, default: 'active' },

  // Legacy fields for backward compatibility
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region' },
  type: { type: String, default: 'Feature' },
  properties: {
    description: String
  },
}, { timestamps: true });

CircleSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Circle', CircleSchema);
