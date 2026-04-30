const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GeoJSONSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ['Feature']
  },
  geometry: {
    type: {
      type: String,
      required: true,
      enum: ['Polygon', 'MultiPolygon']
    },
    coordinates: {
      type: [[[Number]]], // Array of array of arrays of numbers
      required: true
    }
  },
  properties: {
    name: String,
    description: String,
    regionName: String
  },
  polygonType: {
    type: String,
    required: true // Ensure this field is required
  }
});
GeoJSONSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('GeoJSON', GeoJSONSchema);
