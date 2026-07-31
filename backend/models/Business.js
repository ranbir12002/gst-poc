const mongoose = require('mongoose');

const BusinessSchema = new mongoose.Schema({
  gstin: { type: String, index: true },
  name: { type: String },
  // Address fields
  flatNo: { type: String },
  buildingNo: { type: String },
  buildingName: { type: String },
  street: { type: String },
  neighborhood: { type: String },
  district: { type: String },
  stateCode: { type: String },
  pincode: { type: String },
  // Pre-computed relationships
  ward: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
  circle: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle' },
  ward_no: { type: Number },
  circle_no: { type: Number },
  ward_name: { type: String },
  circle_name: { type: String },
  // Denormalized from the source CSV directly — not every business falls
  // inside a mapped ward (e.g. "Rural"), so this is kept even when
  // ward/circle refs above are unset.
  division_name: { type: String },
  // Location
  latitude: { type: Number },
  longitude: { type: Number },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] }
  }
}, { timestamps: true });

BusinessSchema.index({ location: '2dsphere' });
BusinessSchema.index({ ward: 1 });
BusinessSchema.index({ circle: 1 });
BusinessSchema.index({ circle_no: 1, ward_no: 1 });

module.exports = mongoose.model('Business', BusinessSchema);
