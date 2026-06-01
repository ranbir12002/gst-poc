/**
 * migrate_fresh_wards_circles.js
 * 
 * Performs a fresh import of:
 * 1. 308 Ward/Circle Polygons from final_data/clear.geojson into the 'wards' collection.
 *    (Cleans self-intersecting loops, duplicate vertices, and edge crossings).
 * 2. 78 Circles from final_data/GHMC Wards.xlsx into the 'circles' collection.
 * 3. 5 Standalone Circles from final_data/clear.geojson into the 'circles' collection.
 * 
 * Usage: node migrate_fresh_wards_circles.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const turf = require('@turf/turf');
const dotenv = require('dotenv');

dotenv.config();

const Ward = require('./models/Ward');
const Circle = require('./models/Circle');

const dbUri = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const geojsonPath = path.join(__dirname, '..', 'final_data', 'clear.geojson');
const xlsxPath = path.join(__dirname, '..', 'final_data', 'GHMC Wards.xlsx');

// ────────────────────────── Geometry Cleaning ──────────────────────────

/**
 * Removes consecutive duplicate vertices from a ring (open ring, then re-closes).
 * Also removes non-consecutive duplicate vertices that create spikes.
 */
function removeDuplicateVertices(ring) {
  if (!ring || ring.length < 4) return ring;

  // Work with open ring (exclude closing vertex)
  const openRing = ring.slice(0, ring.length - 1);

  // Pass 1: Remove consecutive duplicates
  let deduped = [openRing[0]];
  for (let i = 1; i < openRing.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = openRing[i];
    if (Math.abs(curr[0] - prev[0]) > 1e-9 || Math.abs(curr[1] - prev[1]) > 1e-9) {
      deduped.push(curr);
    }
  }

  // Pass 2: Remove non-consecutive duplicate vertices (spike loops)
  let cleaned = [];
  for (let i = 0; i < deduped.length; i++) {
    const pt = deduped[i];
    let dupIdx = -1;
    for (let j = 0; j < cleaned.length; j++) {
      if (Math.abs(pt[0] - cleaned[j][0]) < 1e-7 && Math.abs(pt[1] - cleaned[j][1]) < 1e-7) {
        dupIdx = j;
        break;
      }
    }
    if (dupIdx !== -1) {
      // Truncate back to the first occurrence, removing the spike
      cleaned = cleaned.slice(0, dupIdx + 1);
    } else {
      cleaned.push(pt);
    }
  }

  // Re-close the ring
  if (cleaned.length >= 3) {
    cleaned.push([cleaned[0][0], cleaned[0][1]]);
  }
  return cleaned;
}

/**
 * Cleans a geometry by:
 * 1. Removing duplicate vertices/spikes from all rings
 * 2. Applying turf.buffer(0) to fix edge crossings (standard GIS self-intersection fix)
 */
function cleanGeometry(geom, wardNo) {
  if (!geom) return geom;

  // Step 1: Remove duplicate vertices from all rings
  let dedupedGeom;
  if (geom.type === 'Polygon') {
    dedupedGeom = {
      type: 'Polygon',
      coordinates: geom.coordinates.map(ring => removeDuplicateVertices(ring))
    };
  } else if (geom.type === 'MultiPolygon') {
    dedupedGeom = {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map(poly => poly.map(ring => removeDuplicateVertices(ring)))
    };
  } else {
    return geom;
  }

  // Step 2: Check for remaining kinks (edge crossings) and fix with buffer(0)
  try {
    const feature = turf.feature(dedupedGeom);
    const kinks = turf.kinks(feature);
    if (kinks.features.length > 0) {
      console.log(`   🔧 WARD_NO ${wardNo}: Found ${kinks.features.length} edge crossings — applying buffer(0) fix...`);
      const buffered = turf.buffer(feature, 0, { units: 'meters' });
      if (buffered && buffered.geometry) {
        console.log(`   ✅ WARD_NO ${wardNo}: Fixed! Resulting type: ${buffered.geometry.type}`);
        return buffered.geometry;
      }
    }
  } catch (err) {
    console.warn(`   ⚠️ WARD_NO ${wardNo}: buffer(0) failed: ${err.message}. Using deduped geometry.`);
  }

  return dedupedGeom;
}

// ────────────────────────── Main Migration ──────────────────────────

async function runMigration() {
  try {
    // 1. Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB successfully.');

    // 2. Clear collections and drop index
    try {
      console.log('🗑️ Dropping geometry_2dsphere index on wards (if exists)...');
      await Ward.collection.dropIndex('geometry_2dsphere');
      console.log('✅ Index dropped successfully.');
    } catch (indexErr) {
      console.log('ℹ️ Index does not exist or already dropped. Proceeding.');
    }

    console.log('\n🗑️  Clearing existing Ward collection...');
    const deletedWards = await Ward.deleteMany({});
    console.log(`🗑️  Cleared ${deletedWards.deletedCount} existing Ward documents.`);

    console.log('🗑️  Clearing existing Circle collection...');
    const deletedCircles = await Circle.deleteMany({});
    console.log(`🗑️  Cleared ${deletedCircles.deletedCount} existing Circle documents.`);

    // 3. Load clear.geojson
    console.log(`\n📂 Reading GeoJSON from: ${geojsonPath}`);
    if (!fs.existsSync(geojsonPath)) {
      throw new Error(`GeoJSON file not found at: ${geojsonPath}`);
    }
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    const features = geojsonData.features || [];
    console.log(`📊 Found ${features.length} total features in clear.geojson.`);

    // 4. Import the first 308 features into the Ward collection
    const limitCount = Math.min(308, features.length);
    console.log(`🗳️  Processing first ${limitCount} features to insert into Ward collection...\n`);

    const wardDocs = [];
    const wardMapByNo = {}; // WARD_NO -> Ward DB document

    for (let i = 0; i < limitCount; i++) {
      const feature = features[i];
      const props = feature.properties || {};

      const wardNo = props.WARD_NO;
      if (wardNo === undefined || wardNo === null) {
        console.warn(`⚠️ Warning: Feature at index ${i} has no WARD_NO. Skipping.`);
        continue;
      }

      const cleanedGeom = cleanGeometry(feature.geometry, wardNo);

      const wardDoc = {
        WARD_NO: wardNo,
        NAME: props.NAME || props.name || `Ward ${wardNo}`,
        CIRCLE_NO: props.CIRCLE_NO || null,
        CIR_NAM_NU: props.CIR_NAM_NU || null,
        Zone_Name: props.Zone_Name || null,
        AC_Name: props.AC_Name || null,
        CORPORATE: props.CORPORATE || null,
        Area__Sqkm: props.Area__Sqkm || props.Area || null,
        geometry: cleanedGeom,
        status: 'active',
        business_count: 0
      };

      const createdWard = await Ward.create(wardDoc);
      wardMapByNo[wardNo] = createdWard;
      wardDocs.push(createdWard);

      if (wardDocs.length % 50 === 0) {
        console.log(`   Inserted ${wardDocs.length} wards...`);
      }
    }
    console.log(`\n✅ Successfully inserted ${wardDocs.length} Ward documents.`);

    // 5. Load GHMC Wards.xlsx
    console.log(`\n📂 Reading Excel file from: ${xlsxPath}`);
    if (!fs.existsSync(xlsxPath)) {
      throw new Error(`Excel file not found at: ${xlsxPath}`);
    }
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`📊 Found ${rows.length} rows in sheet '${sheetName}'.`);

    // 6. Build mapping from Excel rows
    const circleOrder = [];
    const circleWardsMap = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const circleName = row[0] ? String(row[0]).trim() : '';
      const wardStr = row[1] ? String(row[1]).trim() : '';

      if (!circleName || !wardStr) continue;

      const dashIndex = wardStr.indexOf('-');
      const emDashIndex = wardStr.indexOf('–');
      const splitIndex = dashIndex !== -1 ? dashIndex : emDashIndex;

      let wardNo = null;
      if (splitIndex !== -1) {
        wardNo = parseInt(wardStr.substring(0, splitIndex).trim(), 10);
      } else {
        wardNo = parseInt(wardStr.trim(), 10);
      }

      if (isNaN(wardNo)) {
        console.warn(`⚠️ Warning: Could not parse WARD_NO from row ${i}: "${wardStr}"`);
        continue;
      }

      if (!circleWardsMap[circleName]) {
        circleWardsMap[circleName] = [];
        circleOrder.push(circleName);
      }
      circleWardsMap[circleName].push(wardNo);
    }
    console.log(`✅ Parsed ${circleOrder.length} unique circles from Excel.`);

    // 7. Create Circle documents for Excel circles (1 to 78)
    console.log('\n🏗️  Creating Excel Circles (consecutive numbers 1 to 78)...');
    let excelCirclesCreated = 0;

    for (let idx = 0; idx < circleOrder.length; idx++) {
      const circleName = circleOrder[idx];
      const wardNos = circleWardsMap[circleName];
      const circleNo = idx + 1;
      const cirNamNu = `${circleNo} - ${circleName}`;

      const linkedWardIds = [];
      const linkedWardNumbers = [];
      const linkedWardNames = [];
      let firstWardDoc = null;

      for (const wNo of wardNos) {
        const wardDoc = wardMapByNo[wNo];
        if (wardDoc) {
          linkedWardIds.push(wardDoc._id);
          linkedWardNumbers.push(wardDoc.WARD_NO);
          linkedWardNames.push(wardDoc.NAME);
          if (!firstWardDoc) firstWardDoc = wardDoc;
        } else {
          console.warn(`⚠️ Warning: Ward ${wNo} mapped to Circle "${circleName}" was not found in database!`);
        }
      }

      if (linkedWardIds.length === 0) {
        console.error(`❌ Error: Circle "${circleName}" has 0 found wards in the database!`);
        continue;
      }

      const circleDoc = {
        name: circleName,
        CIRCLE_NO: circleNo,
        CIR_NAM_NU: cirNamNu,
        Zone_Name: firstWardDoc ? firstWardDoc.Zone_Name : null,
        CORPORATE: firstWardDoc ? firstWardDoc.CORPORATE : null,
        wards: linkedWardIds,
        ward_count: linkedWardIds.length,
        ward_numbers: linkedWardNumbers,
        ward_names: linkedWardNames,
        business_count: 0,
        status: 'active'
      };

      const createdCircle = await Circle.create(circleDoc);
      excelCirclesCreated++;

      // Update each Ward to link back
      for (const wardId of linkedWardIds) {
        await Ward.findByIdAndUpdate(wardId, {
          circle: createdCircle._id,
          CIRCLE_NO: circleNo,
          CIR_NAM_NU: cirNamNu
        });
      }
    }
    console.log(`✅ Successfully created ${excelCirclesCreated} circles from Excel.`);

    // 8. Create Circle documents for standalone circles (WARD_NO 304 to 308)
    console.log('\n🏗️  Creating Standalone Circles (original numbers 304 to 308)...');
    let standaloneCirclesCreated = 0;
    const standaloneNos = [304, 305, 306, 307, 308];

    for (const wNo of standaloneNos) {
      const wardDoc = wardMapByNo[wNo];
      if (!wardDoc) {
        console.warn(`⚠️ Warning: Standalone Ward ${wNo} was not found in DB!`);
        continue;
      }

      const circleNo = wNo;
      const circleName = wardDoc.Zone_Name || `Circle ${circleNo}`;
      const cirNamNu = wardDoc.CIR_NAM_NU || `${circleNo} - ${circleName}`;

      const circleDoc = {
        name: circleName,
        CIRCLE_NO: circleNo,
        CIR_NAM_NU: cirNamNu,
        Zone_Name: wardDoc.Zone_Name,
        CORPORATE: wardDoc.CORPORATE,
        wards: [wardDoc._id],
        ward_count: 1,
        ward_numbers: [wardDoc.WARD_NO],
        ward_names: [wardDoc.NAME],
        business_count: 0,
        status: 'active'
      };

      const createdCircle = await Circle.create(circleDoc);
      standaloneCirclesCreated++;

      await Ward.findByIdAndUpdate(wardDoc._id, {
        circle: createdCircle._id,
        CIRCLE_NO: circleNo,
        CIR_NAM_NU: cirNamNu
      });
    }
    console.log(`✅ Successfully created ${standaloneCirclesCreated} standalone circles.`);

    // 9. Verification Checks
    console.log('\n🔬 --- Running Verification Checks ---');
    const finalWardCount = await Ward.countDocuments({});
    const finalCircleCount = await Circle.countDocuments({});
    const linkedWardCount = await Ward.countDocuments({ circle: { $exists: true } });

    console.log(`1. Total Ward documents in DB: ${finalWardCount} (Expected: 308)`);
    console.log(`2. Total Circle documents in DB: ${finalCircleCount} (Expected: 83)`);
    console.log(`3. Total Wards linked to a circle: ${linkedWardCount} (Expected: 308)`);

    const errors = [];
    if (finalWardCount !== 308) errors.push(`Ward count mismatch: got ${finalWardCount}, expected 308`);
    if (finalCircleCount !== 83) errors.push(`Circle count mismatch: got ${finalCircleCount}, expected 83`);
    if (linkedWardCount !== 308) errors.push(`Linked ward count mismatch: got ${linkedWardCount}, expected 308`);

    if (errors.length === 0) {
      console.log('\n🎉 SUCCESS: All verification checks passed!');
    } else {
      console.error('\n❌ FAILURE:');
      errors.forEach(err => console.error(`   - ${err}`));
    }

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Fatal error running migration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

runMigration();
