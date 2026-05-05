const mongoose = require('mongoose');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const dotenv = require('dotenv');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

async function checkData() {
  try {
    await mongoose.connect(db);
    console.log('Connected to MongoDB');

    const circles = await Circle.find({ CIRCLE_NO: { $in: [1, 2, 3, 4] } });
    for (const circle of circles) {
      console.log(`Circle ${circle.CIRCLE_NO} (${circle.name}): business_count=${circle.business_count}, ward_count=${circle.ward_count}`);
      const wards = await Ward.find({ _id: { $in: circle.wards } });
      let totalWardBusinesses = 0;
      wards.forEach(w => {
        totalWardBusinesses += w.business_count || 0;
        // console.log(`  Ward ${w.WARD_NO}: business_count=${w.business_count}`);
      });
      console.log(`  Sum of Ward businesses: ${totalWardBusinesses}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
