const mongoose = require('mongoose');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const dotenv = require('dotenv');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

async function fixCounts() {
  try {
    await mongoose.connect(db);
    console.log('✅ Connected to MongoDB');

    const circles = await Circle.find({});
    console.log(`Found ${circles.length} circles. Recalculating business counts...`);

    for (const circle of circles) {
      if (!circle.wards || circle.wards.length === 0) {
        if (circle.business_count !== 0) {
           circle.business_count = 0;
           await circle.save();
        }
        continue;
      }

      const wards = await Ward.find({ _id: { $in: circle.wards } });
      const totalBusinessCount = wards.reduce((sum, ward) => sum + (ward.business_count || 0), 0);

      if (circle.business_count !== totalBusinessCount) {
        console.log(`Updating Circle ${circle.CIRCLE_NO} (${circle.name}): ${circle.business_count} -> ${totalBusinessCount}`);
        circle.business_count = totalBusinessCount;
        await circle.save();
      }
    }

    console.log('✅ All circles updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixCounts();
