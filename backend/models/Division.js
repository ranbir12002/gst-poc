const mongoose = require('mongoose');

const DivisionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  circles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Circle' }],
  circle_names: [String]
}, { timestamps: true });

module.exports = mongoose.model('Division', DivisionSchema);
