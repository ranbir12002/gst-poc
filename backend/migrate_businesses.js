const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const dotenv = require('dotenv');

// Models
const Business = require('./models/Business');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const csvPath = path.join(__dirname, '../data/gst_mapped.csv');

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(db);
    console.log('✅ MongoDB connected');

    // 1. Pre-cache Circles and Wards for fast lookup
    console.log('Caching Circles and Wards...');
    const circles = await Circle.find({}, '_id CIRCLE_NO');
    const wards = await Ward.find({}, '_id WARD_NO');

    const circleMap = new Map();
    circles.forEach(c => circleMap.set(Number(c.CIRCLE_NO), c._id));

    const wardMap = new Map();
    wards.forEach(w => wardMap.set(Number(w.WARD_NO), w._id));

    console.log(`Cached ${circleMap.size} circles and ${wardMap.size} wards.`);

    // 2. Process CSV in batches
    let count = 0;
    let batch = [];
    const BATCH_SIZE = 500;

    const stream = fs.createReadStream(csvPath).pipe(csv());

    const isCoordValid = (lat, lon) => {
      return !isNaN(lat) && !isNaN(lon) && 
             lat >= -90 && lat <= 90 && 
             lon >= -180 && lon <= 180;
    };

    for await (const row of stream) {
      const lat = parseFloat(row.Lattitude);
      const lon = parseFloat(row.Longitude);
      const circleNo = parseInt(row.circle_id);
      const wardNo = parseInt(row.ward_id);

      const businessData = {
        gstin: row.GST_Id,
        name: row['Trade Name'],
        flatNo: row['Flat No.'],
        buildingNo: row['Building Number'],
        buildingName: row['Building Name'],
        street: row.Street,
        neighborhood: row.Location,
        district: row['District Name'],
        pincode: row.Pincode,
        latitude: isNaN(lat) ? undefined : lat,
        longitude: isNaN(lon) ? undefined : lon,
        circle_no: isNaN(circleNo) ? undefined : circleNo,
        ward_no: isNaN(wardNo) ? undefined : wardNo,
        circle_name: row.circle_name || undefined,
        ward_name: row.ward_name || undefined,
        circle: !isNaN(circleNo) ? circleMap.get(circleNo) : undefined,
        ward: !isNaN(wardNo) ? wardMap.get(wardNo) : undefined,
        location: isCoordValid(lat, lon) ? {
          type: 'Point',
          coordinates: [lon, lat]
        } : undefined
      };

      batch.push({
        updateOne: {
          filter: { gstin: businessData.gstin },
          update: { $set: businessData },
          upsert: true
        }
      });

      if (batch.length >= BATCH_SIZE) {
        try {
          await Business.bulkWrite(batch, { ordered: false });
        } catch (e) {
          // BulkWrite errors (like duplicate keys or partial failures) 
          // are ignored to keep the process moving
        }
        count += batch.length;
        process.stdout.write(`\rProcessed ${count} records...`);
        batch = [];
      }
    }

    // Process remaining
    if (batch.length > 0) {
      try {
        await Business.bulkWrite(batch, { ordered: false });
      } catch (e) {}
      count += batch.length;
    }


    console.log(`\n✅ Migration finished! Total businesses: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
