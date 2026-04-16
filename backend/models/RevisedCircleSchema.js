const mongoose = require('mongoose');

const RevisedCircleSchema = new mongoose.Schema({
  circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circle' },
  name: { type: String },
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
  status: { type: String, enum: ['pending', 'regionApproved', 'adminApproved'], default: 'pending' },
  properties: {
    description: String
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

RevisedCircleSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('RevisedCircle', RevisedCircleSchema);
