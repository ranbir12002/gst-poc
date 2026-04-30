const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const dotenv = require('dotenv');
const turf = require('@turf/turf');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

const circlesPath = path.join(__dirname, '..', 'data', 'circles_cleaned.json');
const wardsPath = path.join(__dirname, '..', 'data', 'wards_cleaned.json');

/**
 * Attempts to fix common GeoJSON issues that cause MongoDB 2dsphere index errors
 */
function fixGeometry(geometry) {
  try {
    let feature;
    if (geometry.type === 'Polygon') {
      feature = turf.polygon(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      feature = turf.multiPolygon(geometry.coordinates);
    } else {
      return geometry;
    }

    // Check for kinks (self-intersections)
    const kinks = turf.kinks(feature);
    if (kinks.features.length > 0) {
      console.log(`    ⚠️  Self-intersection found. Attempting unkink...`);
      const unkinked = turf.unkinkPolygon(feature);
      
      if (unkinked.features.length > 1) {
        // Convert multiple unkinked polygons into a MultiPolygon
        return {
          type: 'MultiPolygon',
          coordinates: unkinked.features.map(f => f.geometry.coordinates)
        };
      } else {
        return unkinked.features[0].geometry;
      }
    }

    // Ensure proper winding order (MongoDB expects counter-clockwise for outer ring)
    const rewinded = turf.rewind(feature, { reverse: true });
    return rewinded.geometry;

  } catch (err) {
    console.error(`    ⚠️  Could not fix geometry automatically: ${err.message}`);
    return geometry;
  }
}


async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');

    // 1. Migrate Circles
    console.log('Reading circles_cleaned.json...');
    const circlesData = JSON.parse(fs.readFileSync(circlesPath, 'utf8'));
    console.log(`Found ${circlesData.length} circles. Starting migration...`);

    console.log('Migrating circles...');
    let circleCount = 0;
    let circleErrors = [];
    for (const circleItem of circlesData) {
      try {
        // Attempt to fix geometry before saving
        circleItem.geometry = fixGeometry(circleItem.geometry);

        await Circle.findOneAndUpdate(
          { CIRCLE_NO: circleItem.CIRCLE_NO },
          circleItem,
          { upsert: true, new: true }
        );
        circleCount++;
        if (circleCount % 10 === 0) console.log(`  Processed ${circleCount} circles...`);
      } catch (err) {
        console.error(`❌ Error migrating Circle NO ${circleItem.CIRCLE_NO}: ${err.message}`);
        circleErrors.push({ no: circleItem.CIRCLE_NO, name: circleItem.CIR_NAM_NU, error: err.message });
      }
    }
    console.log(`✅ Circles migration completed. Success: ${circleCount}, Failed: ${circleErrors.length}`);
    if (circleErrors.length > 0) {
      console.log('Failed Circle Nos:', circleErrors.map(e => e.no).join(', '));
    }

    // 2. Fetch all circles to create a map of CIRCLE_NO to _id for relational linking
    console.log('\nLinking wards to circles...');
    const circles = await Circle.find({}, '_id CIRCLE_NO');
    const circleMap = {};
    circles.forEach(c => {
      circleMap[c.CIRCLE_NO] = c._id;
    });

    // 3. Migrate Wards
    console.log('\nReading wards_cleaned.json...');
    const wardsData = JSON.parse(fs.readFileSync(wardsPath, 'utf8'));
    console.log(`Found ${wardsData.length} wards. Starting migration...`);

    console.log('Migrating wards...');
    let wardCount = 0;
    let wardErrors = [];
    for (const wardItem of wardsData) {
      try {
        // Link to circle ObjectId if found
        if (circleMap[wardItem.CIRCLE_NO]) {
          wardItem.circle = circleMap[wardItem.CIRCLE_NO];
        }

        // Attempt to fix geometry before saving
        wardItem.geometry = fixGeometry(wardItem.geometry);

        await Ward.findOneAndUpdate(
          { WARD_NO: wardItem.WARD_NO },
          wardItem,
          { upsert: true, new: true }
        );
        wardCount++;
        if (wardCount % 50 === 0) console.log(`  Processed ${wardCount} wards...`);
      } catch (err) {
        console.error(`❌ Error migrating Ward NO ${wardItem.WARD_NO}: ${err.message}`);
        wardErrors.push({ no: wardItem.WARD_NO, name: wardItem.NAME, error: err.message });
      }
    }

    console.log(`✅ Wards migration completed. Success: ${wardCount}, Failed: ${wardErrors.length}`);
    if (wardErrors.length > 0) {
      console.log('Failed Ward Nos:', wardErrors.map(e => e.no).join(', '));
    }



    console.log('Migration finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
