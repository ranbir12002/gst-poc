const mongoose = require('mongoose');

const WardSchema = new mongoose.Schema({
  WARD_NO: { type: Number, required: true, unique: true },
  NAME: { type: String, required: true },
  // These are metadata from the source GeoJSON — NOT enforced relationships
  CIRCLE_NO: { type: Number },        // Optional: original circle assignment from KML
  CIR_NAM_NU: { type: String },       // Optional: original circle name from KML
  Zone_Name: { type: String },
  AC_Name: { type: String },
  CORPORATE: { type: String },
  Area__Sqkm: { type: Number },
  // Actual relational reference (set when a circle is created via UI)
  circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle' },
  geometry: {
    type: { type: String, enum: ['Polygon', 'MultiPolygon'], required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  business_count: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

WardSchema.index({ geometry: '2dsphere' });
WardSchema.index({ CIRCLE_NO: 1 });
WardSchema.index({ WARD_NO: 1 });

module.exports = mongoose.model('Ward', WardSchema);
