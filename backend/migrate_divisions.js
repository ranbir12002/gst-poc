/**
 * migrate_divisions.js
 * 
 * Performs mapping of Circles to CT Divisions using final_data/division_circle.csv.
 * Group standalone circles (304-308) under a "Standalone Circles" division.
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
const csvPath = path.join(__dirname, '..', 'final_data', 'division_circle.csv');

async function runMigration() {
  try {
    // 1. Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected to MongoDB successfully.');

    // 2. Clear existing divisions
    console.log('🗑️  Clearing existing Division collection...');
    const deletedDivisions = await Division.deleteMany({});
    console.log(`🗑️  Cleared ${deletedDivisions.deletedCount} existing Division documents.`);

    // 3. Clear division links on Circle collection
    console.log('🗑️  Clearing division references from Circle collection...');
    await Circle.updateMany({}, { $unset: { division: 1, division_name: 1 } });
    console.log('✅ Circle division references reset.');

    // 4. Load division_circle.csv
    console.log(`\n📂 Reading Division-Circle CSV from: ${csvPath}`);
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split(/\r?\n/);
    console.log(`📊 Found ${lines.length} lines in CSV.`);

    // 5. Parse and group circles under divisions
    const divisionToCirclesMap = {}; // Division -> Set of circleNames
    
    // First line is header (CT Division,CT Circle)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 2) continue;

      const divisionName = parts[0].trim();
      const circleName = parts[1].trim();

      if (!divisionName || !circleName) continue;

      if (!divisionToCirclesMap[divisionName]) {
        divisionToCirclesMap[divisionName] = new Set();
      }
      divisionToCirclesMap[divisionName].add(circleName);
    }

    const divisionNames = Object.keys(divisionToCirclesMap);
    console.log(`Parsed ${divisionNames.length} divisions from CSV.`);

    // 6. Map and insert divisions
    let totalCirclesMapped = 0;

    for (const divName of divisionNames) {
      const circleNamesSet = divisionToCirclesMap[divName];
      const circleNamesArr = Array.from(circleNamesSet);
      
      console.log(`\n🏢 Processing division: "${divName}" (${circleNamesArr.length} circles)...`);
      
      const linkedCircleIds = [];
      const matchedCircleNames = [];

      for (const cName of circleNamesArr) {
        // Query circle by name (case-insensitive)
        const circleDoc = await Circle.findOne({
          name: { $regex: new RegExp("^" + cName + "$", "i") }
        });

        if (circleDoc) {
          linkedCircleIds.push(circleDoc._id);
          matchedCircleNames.push(circleDoc.name);
          totalCirclesMapped++;
        } else {
          console.warn(`   ⚠️ Warning: Circle "${cName}" not found in database.`);
        }
      }

      if (linkedCircleIds.length === 0) {
        console.warn(`   ⚠️ Warning: Division "${divName}" has 0 matching circles in database. Skipping.`);
        continue;
      }

      // Create division doc
      const divisionDoc = await Division.create({
        name: divName,
        circles: linkedCircleIds,
        circle_names: matchedCircleNames
      });

      // Update parent division reference on matching circles
      await Circle.updateMany(
        { _id: { $in: linkedCircleIds } },
        { 
          division: divisionDoc._id,
          division_name: divName
        }
      );
      
      console.log(`   ✅ Division "${divName}" created with ${linkedCircleIds.length} circles.`);
    }

    // 7. Group standalone circles (304 to 308) under "Standalone Circles"
    console.log('\n🌟 Processing Standalone Circles (304 to 308)...');
    const standaloneCircleDocs = await Circle.find({
      CIRCLE_NO: { $in: [304, 305, 306, 307, 308] }
    });

    if (standaloneCircleDocs.length > 0) {
      const standaloneDivName = "Standalone Circles";
      const standaloneCircleIds = standaloneCircleDocs.map(c => c._id);
      const standaloneCircleNames = standaloneCircleDocs.map(c => c.name);

      const standaloneDivision = await Division.create({
        name: standaloneDivName,
        circles: standaloneCircleIds,
        circle_names: standaloneCircleNames
      });

      await Circle.updateMany(
        { _id: { $in: standaloneCircleIds } },
        {
          division: standaloneDivision._id,
          division_name: standaloneDivName
        }
      );

      console.log(`✅ Standalone Circles division created with ${standaloneCircleDocs.length} circles.`);
    } else {
      console.log('ℹ️ No standalone circles found to group.');
    }

    // 8. Verification
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
      const unmapped = await Circle.find({ division: { $exists: false } });
      console.warn(`\n⚠️ Mapped ${mappedCirclesCount}/${totalCirclesInDb} circles. Unmapped circles count: ${unmapped.length}`);
      unmapped.forEach(c => console.warn(`   - Unmapped Circle: No ${c.CIRCLE_NO} "${c.name}"`));
    }

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
