const mongoose = require('mongoose');

const CircleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region' },
  type: { type: String, default: "Feature" },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
    },
    coordinates: {
      type: [[[Number]]], // Array of array of arrays of numbers
    }
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  properties: {
    description: String
  }
}, { timestamps: true });

CircleSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Circle', CircleSchema);
