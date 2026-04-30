const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Circle = require('./models/Circle');
const turf = require('@turf/turf');
const dotenv = require('dotenv');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const circlesPath = path.join(__dirname, '..', 'data', 'circles_cleaned.json');

const failedNos = [6, 7, 9, 10, 12, 16, 17, 20, 22, 23, 27, 29, 35, 36, 37, 41, 42, 47, 50, 51, 53, 57, 58, 59];

/**
 * Ultra-robust geometry fix for MongoDB 2dsphere.
 * Uses the "Shrink-Grow" trick to resolve self-intersections and spikes.
 */
function ultraFix(geometry) {
  try {
    let feature;
    if (geometry.type === 'Polygon') {
      feature = turf.polygon(geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      feature = turf.multiPolygon(geometry.coordinates);
    } else {
      return geometry;
    }

    // 1. Clean coordinates
    let fixed = turf.cleanCoords(feature);

    // 2. Shrink-Grow Trick: Shrink by 10cm then grow back. 
    // This removes spikes, micro-self-intersections, and "hairline" errors.
    try {
      // 0.0001 km = 10 cm
      let smoothed = turf.buffer(fixed, -0.0001, { units: 'kilometers' });
      if (smoothed && smoothed.geometry.coordinates.length > 0) {
        fixed = turf.buffer(smoothed, 0.0001, { units: 'kilometers' });
      } else {
        // If it disappears after shrink, just use buffer(0)
        fixed = turf.buffer(fixed, 0);
      }
    } catch (e) {
      fixed = turf.buffer(fixed, 0);
    }

    // 3. Final rewind to ensure CCW order for MongoDB
    fixed = turf.rewind(fixed, { reverse: true });

    return fixed.geometry;
  } catch (err) {
    console.error(`    ⚠️  Ultra fix failed: ${err.message}.`);
    return geometry;
  }
}



async function retry() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');

    console.log('Reading circles_cleaned.json...');
    const circlesData = JSON.parse(fs.readFileSync(circlesPath, 'utf8'));
    
    const failedCircles = circlesData.filter(c => failedNos.includes(c.CIRCLE_NO));
    console.log(`Found ${failedCircles.length} failed circles to retry.\n`);

    let successCount = 0;
    let failCount = 0;

    const tolerances = [0, 0.000001, 0.000005, 0.00001, 0.00005, 0.0001]; // 0 to ~10 meters

    for (const circleItem of failedCircles) {
      console.log(`Retrying Circle NO ${circleItem.CIRCLE_NO} (${circleItem.CIR_NAM_NU})...`);
      let succeeded = false;

      for (const tolerance of tolerances) {
        try {
          let tempItem = JSON.parse(JSON.stringify(circleItem));
          let feature;
          if (tempItem.geometry.type === 'Polygon') {
            feature = turf.polygon(tempItem.geometry.coordinates);
          } else {
            feature = turf.multiPolygon(tempItem.geometry.coordinates);
          }

          // Apply simplification if tolerance > 0
          let processed = feature;
          if (tolerance > 0) {
            processed = turf.simplify(feature, { tolerance, highQuality: true });
          }

          // Clean, buffer(0), and rewind
          processed = turf.cleanCoords(processed);
          processed = turf.buffer(processed, 0);
          processed = turf.rewind(processed, { reverse: true });

          tempItem.geometry = processed.geometry;

          await Circle.findOneAndUpdate(
            { CIRCLE_NO: tempItem.CIRCLE_NO },
            tempItem,
            { upsert: true, new: true }
          );
          
          console.log(`  ✅ Success with tolerance ${tolerance}`);
          successCount++;
          succeeded = true;
          break; // Exit tolerance loop on success
        } catch (err) {
          // Log only the last failure
          if (tolerance === tolerances[tolerances.length - 1]) {
            console.log(`  ❌ Failed all tolerances. Last error: ${err.message}`);
          }
        }
      }

      if (!succeeded) failCount++;
    }

    console.log(`\nRetry Completed.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal Error during retry:', err);
    process.exit(1);
  }
}


retry();
