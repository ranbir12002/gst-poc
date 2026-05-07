const mongoose = require('mongoose');
const Circle = require('./models/Circle');
const dotenv = require('dotenv');
dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

async function check() {
  await mongoose.connect(db);
  const circles = await Circle.find({}, 'CIRCLE_NO CIR_NAM_NU business_count');
  console.log('Sample Circles:');
  circles.slice(0, 5).forEach(c => console.log(`${c.CIRCLE_NO}: ${c.CIR_NAM_NU} - ${c.business_count}`));
  
  const totalBiz = await Circle.aggregate([
    { $group: { _id: null, total: { $sum: "$business_count" } } }
  ]);
  console.log('Total Businesses in Circles:', totalBiz);
  
  process.exit(0);
}
check();
