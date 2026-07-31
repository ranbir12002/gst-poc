/**
 * migrate_divisions.js
 *
 * Maps Circles to CT Divisions using new_data/division_mapping.json
 * (circle name -> division name). Requires migrate_wards_circles.js to
 * have already been run, since it depends on the Circle collection.
 *
 * division_mapping.json is missing an entry for circle 304, which
 * wards.json now calls "Toopran" (division_mapping.json still has it
 * under its old name "Narsapur") — special-cased below to be its own
 * division, matching the other standalone circles (305-308).
 *
 * Usage: node migrate_divisions.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const Circle = require('./models/Circle');
const Division = require('./models/Division');

const dbUri = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const mappingPath = path.join(__dirname, '..', 'new_data', 'division_mapping.json');

const CIRCLE_DIVISION_OVERRIDES = {
  'Toopran': 'Toopran'
};

async function runMigration() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB successfully.');

    console.log('🗑️  Clearing existing Division collection...');
    const deletedDivisions = await Division.deleteMany({});
    console.log(`🗑️  Cleared ${deletedDivisions.deletedCount} existing Division documents.`);

    console.log('🗑️  Clearing division references from Circle collection...');
    await Circle.updateMany({}, { $unset: { division: 1, division_name: 1 } });

    console.log(`\n📂 Reading division mapping from: ${mappingPath}`);
    if (!fs.existsSync(mappingPath)) {
      throw new Error(`division_mapping.json not found at: ${mappingPath}`);
    }
    const circleToDivision = { ...JSON.parse(fs.readFileSync(mappingPath, 'utf8')), ...CIRCLE_DIVISION_OVERRIDES };

    const circles = await Circle.find({});
    console.log(`📊 Found ${circles.length} circles in DB.`);

    const divisionGroups = new Map(); // divisionName -> { circleIds: [], circleNames: [] }
    const unmapped = [];

    for (const circle of circles) {
      const divisionName = circleToDivision[circle.name];
      if (!divisionName) {
        unmapped.push(circle);
        continue;
      }
      if (!divisionGroups.has(divisionName)) {
        divisionGroups.set(divisionName, { circleIds: [], circleNames: [] });
      }
      const group = divisionGroups.get(divisionName);
      group.circleIds.push(circle._id);
      group.circleNames.push(circle.name);
    }

    if (unmapped.length > 0) {
      console.warn(`\n⚠️ ${unmapped.length} circle(s) have no division mapping:`);
      unmapped.forEach(c => console.warn(`   - Circle ${c.CIRCLE_NO} "${c.name}"`));
    }

    console.log(`\n🏗️  Creating ${divisionGroups.size} divisions...`);
    for (const [divisionName, group] of divisionGroups.entries()) {
      const divisionDoc = await Division.create({
        name: divisionName,
        circles: group.circleIds,
        circle_names: group.circleNames
      });

      await Circle.updateMany(
        { _id: { $in: group.circleIds } },
        { division: divisionDoc._id, division_name: divisionName }
      );

      console.log(`   ✅ Division "${divisionName}" created with ${group.circleIds.length} circles.`);
    }

    // Verification
    console.log('\n🔬 --- Running Verification Checks ---');
    const finalDivisionCount = await Division.countDocuments({});
    const totalCirclesInDb = await Circle.countDocuments({});
    const mappedCirclesCount = await Circle.countDocuments({ division: { $exists: true } });

    console.log(`1. Total Division documents in DB: ${finalDivisionCount}`);
    console.log(`2. Total Circle documents in DB: ${totalCirclesInDb}`);
    console.log(`3. Total Circles linked to a Division: ${mappedCirclesCount}`);

    if (mappedCirclesCount === totalCirclesInDb) {
      console.log('\n🎉 SUCCESS: All circles successfully linked to a division!');
    } else {
      console.warn(`\n⚠️ Mapped ${mappedCirclesCount}/${totalCirclesInDb} circles.`);
    }

    console.log('\nNext step: run "node upload_businesses.js" to import businesses.');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Fatal error running division migration:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

runMigration();
