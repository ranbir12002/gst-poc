/**
 * upload_businesses.js
 * 
 * Uploads businesses from data/matched_wards.csv into MongoDB.
 * Each business is linked to its ward via the ward_id column in the CSV.
 * 
 * CSV columns: S.No., GST_Id, GSTIN, Trade Name, Address, Building Number,
 *              Building Name, Flat No., Location, Street, Pincode, 
 *              District Name, lat, long, ward_id, ward_name, match_method, snap_distance_m
 * 
 * Usage: node upload_businesses.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const csv = require('csv-parser');

dotenv.config();

const Business = require('./models/Business');
const Ward = require('./models/Ward');

const CSV_FILE = path.join(__dirname, '..', 'data', 'matched_wards.csv');
const BATCH_SIZE = 500;

async function uploadBusinesses() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Build a ward lookup map: WARD_NO -> Ward document
    console.log('Building ward lookup map...');
    const allWards = await Ward.find({}, '_id WARD_NO NAME CIRCLE_NO CIR_NAM_NU');
    const wardMap = new Map();
    allWards.forEach(w => {
      wardMap.set(w.WARD_NO, w);
    });
    console.log(`Loaded ${wardMap.size} wards into lookup map`);

    // Clear existing businesses
    const deleted = await Business.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing business records`);

    // Parse CSV and insert in batches
    let batch = [];
    let totalRead = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let wardsNotFound = new Set();

    const stream = fs.createReadStream(CSV_FILE).pipe(csv());

    for await (const row of stream) {
      totalRead++;

      // Parse ward_id from CSV
      const wardNo = parseFloat(row.ward_id);
      if (isNaN(wardNo)) {
        totalSkipped++;
        continue;
      }

      const wardNoInt = Math.round(wardNo);
      const ward = wardMap.get(wardNoInt);

      if (!ward) {
        wardsNotFound.add(wardNoInt);
        totalSkipped++;
        continue;
      }

      const lat = parseFloat(row.lat);
      const lng = parseFloat(row.long);

      const businessDoc = {
        gstin: row.GSTIN || null,
        name: row['Trade Name'] || null,
        flatNo: row['Flat No.'] || null,
        buildingNo: row['Building Number'] || null,
        buildingName: row['Building Name'] || null,
        street: row.Street || null,
        neighborhood: row.Location || null,
        district: row['District Name'] || null,
        pincode: row.Pincode ? String(Math.round(parseFloat(row.Pincode))) : null,
        // Ward relationship
        ward: ward._id,
        ward_no: wardNoInt,
        ward_name: row.ward_name || ward.NAME,
        // Circle info from ward metadata (if available)
        circle_no: ward.CIRCLE_NO || null,
        circle_name: ward.CIR_NAM_NU || null,
        // Location
        latitude: !isNaN(lat) ? lat : null,
        longitude: !isNaN(lng) ? lng : null,
        location: (!isNaN(lat) && !isNaN(lng)) ? {
          type: 'Point',
          coordinates: [lng, lat]
        } : undefined
      };

      batch.push(businessDoc);

      if (batch.length >= BATCH_SIZE) {
        try {
          await Business.insertMany(batch, { ordered: false });
          totalInserted += batch.length;
        } catch (err) {
          // Some may have inserted, count what we can
          if (err.insertedDocs) {
            totalInserted += err.insertedDocs.length;
          }
          totalErrors += batch.length - (err.insertedDocs?.length || 0);
        }
        batch = [];

        if (totalInserted % 10000 === 0 || totalInserted % BATCH_SIZE === 0) {
          console.log(`  Progress: ${totalRead} read / ${totalInserted} inserted...`);
        }
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      try {
        await Business.insertMany(batch, { ordered: false });
        totalInserted += batch.length;
      } catch (err) {
        if (err.insertedDocs) {
          totalInserted += err.insertedDocs.length;
        }
        totalErrors += batch.length - (err.insertedDocs?.length || 0);
      }
    }

    // Update ward business counts
    console.log('\nUpdating ward business counts...');
    const wardCounts = await Business.aggregate([
      { $group: { _id: '$ward', count: { $sum: 1 } } }
    ]);
    for (const { _id, count } of wardCounts) {
      if (_id) {
        await Ward.findByIdAndUpdate(_id, { business_count: count });
      }
    }
    console.log(`Updated business counts for ${wardCounts.length} wards`);

    console.log('\n--- Business Upload Summary ---');
    console.log(`Total CSV rows:      ${totalRead}`);
    console.log(`Total inserted:      ${totalInserted}`);
    console.log(`Total skipped:       ${totalSkipped}`);
    console.log(`Total errors:        ${totalErrors}`);
    if (wardsNotFound.size > 0) {
      console.log(`Wards not found (${wardsNotFound.size}):`, [...wardsNotFound].sort((a,b) => a-b).slice(0, 20));
    }

    // Verify
    const totalInDB = await Business.countDocuments();
    console.log(`\nTotal businesses now in database: ${totalInDB}`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

uploadBusinesses();
