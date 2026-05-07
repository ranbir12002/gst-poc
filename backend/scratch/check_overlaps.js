const mongoose = require('mongoose');
const Circle = require('../models/Circle');
const dotenv = require('dotenv');
dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

async function checkOverlaps() {
  await mongoose.connect(db);
  const circles = await Circle.find({}, 'CIRCLE_NO CIR_NAM_NU ward_numbers');
  
  const wardToCircles = {};
  circles.forEach(c => {
    (c.ward_numbers || []).forEach(wNo => {
      if (!wardToCircles[wNo]) wardToCircles[wNo] = [];
      wardToCircles[wNo].push({ no: c.CIRCLE_NO, name: c.CIR_NAM_NU });
    });
  });
  
  const overlaps = Object.entries(wardToCircles)
    .filter(([wNo, cs]) => cs.length > 1)
    .map(([wNo, cs]) => ({ wardNo: wNo, circles: cs }));
  
  if (overlaps.length === 0) {
    console.log('✅ No overlapping wards found across circles.');
  } else {
    console.log('❌ Overlapping wards found:');
    console.log(JSON.stringify(overlaps, null, 2));
  }
  
  process.exit(0);
}
checkOverlaps();
