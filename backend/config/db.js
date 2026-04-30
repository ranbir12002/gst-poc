const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected...');

    // Ensure collections exist (idempotent)
    const collections = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);
    if (!collections.includes('circles')) {
      await mongoose.connection.db.createCollection('circles');
      console.log('✅ Created circles collection');
    }
    if (!collections.includes('wards')) {
      await mongoose.connection.db.createCollection('wards');
      console.log('✅ Created wards collection');
    }
    if (!collections.includes('businesses')) {
      await mongoose.connection.db.createCollection('businesses');
      console.log('✅ Created businesses collection');
    }
    console.log('✅ All collections ready');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
