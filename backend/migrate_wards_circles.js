/**
 * migrate_wards_circles.js
 *
 * Fresh import of Wards and Circles from new_data/wards.json.
 *
 * wards.json already carries one document per ward (WARD_NO, NAME, geometry,
 * CIRCLE_NO, CIR_NAM_NU, Zone_Name, ...). Its own _id/circle fields are
 * stale (don't correspond to any current Circle collection) so they're
 * ignored here — Wards are re-inserted fresh, and Circles are rebuilt by
 * grouping wards on CIRCLE_NO.
 *
 * Usage: node migrate_wards_circles.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');
const dotenv = require('dotenv');

dotenv.config();

const Ward = require('./models/Ward');
const Circle = require('./models/Circle');

const dbUri = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const wardsPath = path.join(__dirname, '..', 'new_data', 'wards.json');

// ────────────────────────── Geometry Cleaning ──────────────────────────
// wards.json is the "cleaned" export, but this is cheap insurance against
// self-intersecting rings/duplicate vertices breaking downstream turf ops.

function removeDuplicateVertices(ring) {
  if (!ring || ring.length < 4) return ring;

  const openRing = ring.slice(0, ring.length - 1);

  let deduped = [openRing[0]];
  for (let i = 1; i < openRing.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = openRing[i];
    if (Math.abs(curr[0] - prev[0]) > 1e-9 || Math.abs(curr[1] - prev[1]) > 1e-9) {
      deduped.push(curr);
    }
  }

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
      cleaned = cleaned.slice(0, dupIdx + 1);
    } else {
      cleaned.push(pt);
    }
  }

  if (cleaned.length >= 3) {
    cleaned.push([cleaned[0][0], cleaned[0][1]]);
  }
  return cleaned;
}

function cleanGeometry(geom, wardNo) {
  if (!geom) return geom;

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

// Circle name is CIR_NAM_NU with the leading "<number> - " / "<number>-" stripped
function circleNameFromCIR(cir) {
  return cir.replace(/^\d+\s*-\s*/, '').trim();
}

// ────────────────────────── Main Migration ──────────────────────────

async function runMigration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB successfully.');

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

    console.log(`\n📂 Reading wards from: ${wardsPath}`);
    if (!fs.existsSync(wardsPath)) {
      throw new Error(`wards.json not found at: ${wardsPath}`);
    }
    const sourceWards = JSON.parse(fs.readFileSync(wardsPath, 'utf8'));
    console.log(`📊 Found ${sourceWards.length} wards in wards.json.`);

    // 1. Insert Wards (geometry cleaned, everything else re-mapped fresh)
    const wardMapByNo = {}; // WARD_NO -> created Ward DB document

    for (const src of sourceWards) {
      const wardNo = src.WARD_NO;
      if (wardNo === undefined || wardNo === null) {
        console.warn(`⚠️ Warning: source ward missing WARD_NO. Skipping: ${JSON.stringify(src).slice(0, 100)}`);
        continue;
      }

      const cleanedGeom = cleanGeometry(src.geometry, wardNo);

      const wardDoc = {
        WARD_NO: wardNo,
        NAME: src.NAME || `Ward ${wardNo}`,
        CIRCLE_NO: src.CIRCLE_NO ?? null,
        CIR_NAM_NU: src.CIR_NAM_NU ?? null,
        Zone_Name: src.Zone_Name ?? null,
        AC_Name: src.AC_Name ?? null,
        CORPORATE: src.CORPORATE ?? null,
        Area__Sqkm: src.Area__Sqkm ?? null,
        geometry: cleanedGeom,
        status: 'active',
        business_count: 0
      };

      const createdWard = await Ward.create(wardDoc);
      wardMapByNo[wardNo] = createdWard;

      if (Object.keys(wardMapByNo).length % 50 === 0) {
        console.log(`   Inserted ${Object.keys(wardMapByNo).length} wards...`);
      }
    }
    console.log(`\n✅ Successfully inserted ${Object.keys(wardMapByNo).length} Ward documents.`);

    // 2. Group wards by CIRCLE_NO to build Circles
    console.log('\n🏗️  Building Circles by grouping wards on CIRCLE_NO...');
    const circleGroups = new Map(); // CIRCLE_NO -> { CIR_NAM_NU, Zone_Name, CORPORATE, wardDocs: [] }

    for (const ward of Object.values(wardMapByNo)) {
      if (ward.CIRCLE_NO === null || ward.CIRCLE_NO === undefined) {
        console.warn(`⚠️ Warning: Ward ${ward.WARD_NO} has no CIRCLE_NO — not linked to any circle.`);
        continue;
      }
      if (!circleGroups.has(ward.CIRCLE_NO)) {
        circleGroups.set(ward.CIRCLE_NO, {
          CIR_NAM_NU: ward.CIR_NAM_NU,
          Zone_Name: ward.Zone_Name,
          CORPORATE: ward.CORPORATE,
          wardDocs: []
        });
      }
      circleGroups.get(ward.CIRCLE_NO).wardDocs.push(ward);
    }

    let circlesCreated = 0;
    for (const [circleNo, group] of circleGroups.entries()) {
      const circleName = group.CIR_NAM_NU ? circleNameFromCIR(group.CIR_NAM_NU) : `Circle ${circleNo}`;

      const circleDoc = await Circle.create({
        name: circleName,
        CIRCLE_NO: circleNo,
        CIR_NAM_NU: group.CIR_NAM_NU,
        Zone_Name: group.Zone_Name,
        CORPORATE: group.CORPORATE,
        wards: group.wardDocs.map(w => w._id),
        ward_count: group.wardDocs.length,
        ward_numbers: group.wardDocs.map(w => w.WARD_NO),
        ward_names: group.wardDocs.map(w => w.NAME),
        business_count: 0,
        status: 'active'
      });
      circlesCreated++;

      await Ward.updateMany(
        { _id: { $in: group.wardDocs.map(w => w._id) } },
        { circle: circleDoc._id }
      );
    }
    console.log(`✅ Successfully created ${circlesCreated} circles.`);

    // 3. Verification
    console.log('\n🔬 --- Running Verification Checks ---');
    const finalWardCount = await Ward.countDocuments({});
    const finalCircleCount = await Circle.countDocuments({});
    const linkedWardCount = await Ward.countDocuments({ circle: { $exists: true } });

    console.log(`1. Total Ward documents in DB: ${finalWardCount}`);
    console.log(`2. Total Circle documents in DB: ${finalCircleCount}`);
    console.log(`3. Total Wards linked to a circle: ${linkedWardCount}`);

    if (linkedWardCount === finalWardCount) {
      console.log('\n🎉 SUCCESS: All wards linked to a circle!');
    } else {
      console.warn(`\n⚠️ ${finalWardCount - linkedWardCount} ward(s) not linked to any circle.`);
    }

    console.log('\nNext step: run "node migrate_divisions.js" to build the Division collection.');

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
