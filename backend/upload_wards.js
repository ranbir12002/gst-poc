/**
 * upload_wards.js
 * 
 * Uploads wards from data/wards_cleaned.json into MongoDB.
 * Wards are the base entity — circles are created later by grouping wards.
 * 
 * Usage: node upload_wards.js
 */
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const Ward = require('./models/Ward');

const WARDS_FILE = path.join(__dirname, '..', 'data', 'wards_cleaned.json');

async function uploadWards() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Read wards data
    console.log(`Reading wards from: ${WARDS_FILE}`);
    const rawData = fs.readFileSync(WARDS_FILE, 'utf8');
    const wardsData = JSON.parse(rawData);
    console.log(`Found ${wardsData.length} wards in the file`);

    // Clear existing wards
    const deleted = await Ward.deleteMany({});
    console.log(`Cleared ${deleted.deletedCount} existing ward records`);

    // Prepare ward documents
    let inserted = 0;
    let skipped = 0;
    const errors = [];

    for (const ward of wardsData) {
      try {
        // Validate required fields
        if (!ward.WARD_NO || !ward.NAME || !ward.geometry) {
          skipped++;
          continue;
        }

        const wardDoc = {
          WARD_NO: ward.WARD_NO,
          NAME: ward.NAME || ward.name,
          CIRCLE_NO: ward.CIRCLE_NO || null,     // Keep as metadata, not a relationship
          CIR_NAM_NU: ward.CIR_NAM_NU || null,
          Zone_Name: ward.Zone_Name || null,
          AC_Name: ward.AC_Name || null,
          CORPORATE: ward.CORPORATE || null,
          Area__Sqkm: ward.Area__Sqkm || ward.Area || null,
          geometry: ward.geometry,
          status: 'active'
        };

        await Ward.create(wardDoc);
        inserted++;

        if (inserted % 50 === 0) {
          console.log(`  Inserted ${inserted} wards...`);
        }
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key — skip
          skipped++;
        } else {
          errors.push({ ward_no: ward.WARD_NO, error: err.message });
        }
      }
    }

    console.log('\n--- Ward Upload Summary ---');
    console.log(`Total in file:  ${wardsData.length}`);
    console.log(`Inserted:       ${inserted}`);
    console.log(`Skipped:        ${skipped}`);
    console.log(`Errors:         ${errors.length}`);
    if (errors.length > 0) {
      console.log('Error details:', errors.slice(0, 10));
    }

    // Verify
    const totalInDB = await Ward.countDocuments();
    console.log(`\nTotal wards now in database: ${totalInDB}`);

  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

uploadWards();
