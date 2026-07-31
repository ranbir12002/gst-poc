/**
 * upload_businesses.js
 *
 * Uploads businesses from new_data/full_data.csv into MongoDB.
 * Requires migrate_wards_circles.js and migrate_divisions.js to have
 * already been run.
 *
 * CSV columns: S.No., GST_Id, GSTIN, Trade Name, Address, Building Number,
 *              Building Name, Flat No., Location, Street, Pincode,
 *              District Name, lat, long, Division, Circle, Ward
 *
 * The CSV's Division/Circle/Ward columns are trusted and stored as-is
 * (division_name/circle_name/ward_name) on every row. The Ward column is
 * additionally matched (case-insensitively) against Ward.NAME to resolve
 * the ward/circle ObjectId refs and ward_no/circle_no — roughly 30% of
 * rows are "Rural" or other out-of-jurisdiction values with no matching
 * ward, and are still imported with those refs left unset.
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

const CSV_FILE = path.join(__dirname, '..', 'new_data', 'full_data.csv');
const BATCH_SIZE = 1000;

// The CSV still uses ward 304's old name ("304-Narsapur") in its Ward
// column, but wards.json has since renamed it to "304-Toopran" — these
// rows have a real Division/Circle ("Future City"/"Toopran"), they're not
// Rural, just a stale ward label. Keyed/valued uppercase to match wardMap.
const WARD_NAME_ALIASES = {
  '304-NARSAPUR': '304-TOOPRAN'
};

async function uploadBusinesses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    console.log('Building ward lookup map...');
    const allWards = await Ward.find({}, '_id WARD_NO NAME CIRCLE_NO circle');
    const wardMap = new Map();
    allWards.forEach(w => {
      wardMap.set(w.NAME.trim().toUpperCase(), w);
    });
    console.log(`Loaded ${wardMap.size} wards into lookup map`);

    const deleted = await Business.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing business records`);

    let batch = [];
    let totalRead = 0;
    let totalInserted = 0;
    let totalMatched = 0;
    let totalUnmatched = 0;
    let totalErrors = 0;
    const unmatchedWardValues = new Map();

    const stream = fs.createReadStream(CSV_FILE).pipe(csv());

    const flushBatch = async () => {
      if (batch.length === 0) return;
      try {
        await Business.insertMany(batch, { ordered: false });
        totalInserted += batch.length;
      } catch (err) {
        if (err.insertedDocs) totalInserted += err.insertedDocs.length;
        totalErrors += batch.length - (err.insertedDocs?.length || 0);
      }
      batch = [];
    };

    for await (const row of stream) {
      totalRead++;

      const wardNameRaw = (row.Ward || '').trim();
      const wardKeyRaw = wardNameRaw.toUpperCase();
      const wardKey = WARD_NAME_ALIASES[wardKeyRaw] || wardKeyRaw;
      const ward = wardMap.get(wardKey);

      if (ward) {
        totalMatched++;
      } else {
        totalUnmatched++;
        unmatchedWardValues.set(wardNameRaw, (unmatchedWardValues.get(wardNameRaw) || 0) + 1);
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
        // Trusted as-is from the CSV, regardless of whether a ward matched
        division_name: row.Division || null,
        circle_name: row.Circle || null,
        ward_name: row.Ward || null,
        // Only set when the Ward column resolved to an actual ward
        ward: ward ? ward._id : undefined,
        ward_no: ward ? ward.WARD_NO : undefined,
        circle_no: ward ? ward.CIRCLE_NO : undefined,
        circle: ward ? ward.circle : undefined,
        latitude: !isNaN(lat) ? lat : null,
        longitude: !isNaN(lng) ? lng : null,
        location: (!isNaN(lat) && !isNaN(lng)) ? {
          type: 'Point',
          coordinates: [lng, lat]
        } : undefined
      };

      batch.push(businessDoc);

      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
        if (totalInserted % 50000 < BATCH_SIZE) {
          console.log(`  Progress: ${totalRead} read / ${totalInserted} inserted...`);
        }
      }
    }

    await flushBatch();

    console.log('\nUpdating ward business counts...');
    const wardCounts = await Business.aggregate([
      { $match: { ward: { $ne: null } } },
      { $group: { _id: '$ward', count: { $sum: 1 } } }
    ]);
    for (const { _id, count } of wardCounts) {
      await Ward.findByIdAndUpdate(_id, { business_count: count });
    }
    console.log(`Updated business counts for ${wardCounts.length} wards`);

    console.log('\n--- Business Upload Summary ---');
    console.log(`Total CSV rows:      ${totalRead}`);
    console.log(`Total inserted:      ${totalInserted}`);
    console.log(`Matched to a ward:   ${totalMatched}`);
    console.log(`Unmatched (no ward): ${totalUnmatched}`);
    console.log(`Total errors:        ${totalErrors}`);
    if (unmatchedWardValues.size > 0) {
      const top = [...unmatchedWardValues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
      console.log(`Top unmatched Ward values:`, top);
    }

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
