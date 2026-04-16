// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const BusinessSchema = new Schema({
//   name: { type: String, required: true },
//   address: { type: String, required: true },
//   location: {
//     type: { type: String, enum: ['Point'], required: true },
//     coordinates: { type: [Number], required: true },
//   },
//   precision: { type: String },  // Add precision field
//   types: { type: [String] },    // Add types field
//   confidence: { type: Number }, // Add confidence field
//   neighborhood: { type: String }, // Add neighborhood field
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now }
// });

// // Create a 2dsphere index on the location field
// BusinessSchema.index({ location: '2dsphere' });

// BusinessSchema.pre('save', function (next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model('Business', BusinessSchema);
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const BusinessSchema = new mongoose.Schema({
  name: { type: String },
  gstin: { type: String },
  street: { type: String },
  location: { type: String },
  buildingNo: { type: String },
  stateCode: { type: String },
  pincode: { type: String },
  flatNo: { type: String },
  buildingName: { type: String },
  district: { type: String },
  latitude_from_file: { type: Number },
  longitude_from_file: { type: Number },
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  },
  location_from_file: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  },
  precision: { type: String },  // Add precision field
  types: { type: [String] },    // Add types field
  confidence: { type: Number }, // Add confidence field
  neighborhood: { type: String }, // Add neighborhood field
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create a 2dsphere index on the location field
BusinessSchema.index({ location: '2dsphere' });

BusinessSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Business = mongoose.model('Business', BusinessSchema);

module.exports = Business;
