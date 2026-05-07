const mongoose = require('mongoose');
const path = require('path');
const XLSX = require('xlsx');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const dotenv = require('dotenv');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const xlsxPath = path.join(__dirname, '..', 'data', 'updated circles .xlsx');

async function migrate() {
  try {
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');

    // ── 1. Read the XLSX ───────────────────────────────────────────────
    const workbook = XLSX.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Row 0 = title, Row 1 = headers, data starts at Row 2
    // Columns: [SL.No, CT Division, CT Circle, CURE Ward No. & Name, CURE Circle No. & Name]

    // ── 2. Build circle → wards mapping ────────────────────────────────
    const circleOrder = [];          // preserves insertion order for numbering
    const circleDataMap = {};        // CT Circle name → { division, wards[] }

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      const ctDivision = row[1] ? String(row[1]).trim() : '';
      const ctCircle   = row[2] ? String(row[2]).trim() : '';
      const wardStr    = row[3] ? String(row[3]).trim() : '';

      if (!ctCircle || !wardStr) continue;

      // Parse ward number and name from "1 - Keesara" format
      const dashIndex = wardStr.indexOf('-');
      const emDashIndex = wardStr.indexOf('–');
      const splitIndex = dashIndex !== -1 ? dashIndex : emDashIndex;

      let wardNo = null;
      let wardName = null;

      if (splitIndex !== -1) {
        const numPart = wardStr.substring(0, splitIndex).trim();
        wardNo = parseInt(numPart, 10);
        wardName = wardStr.substring(splitIndex + 1).trim();
      }

      // Skip entries without a valid ward number (e.g. "GMR Hyderabad International Airport", "BHEL")
      if (!wardNo || isNaN(wardNo)) {
        console.log(`  ⏭ Skipping non-ward entry: "${wardStr}" under circle "${ctCircle}"`);
        continue;
      }

      if (!circleDataMap[ctCircle]) {
        circleDataMap[ctCircle] = {
          division: ctDivision,
          wards: []
        };
        circleOrder.push(ctCircle);   // track order for sequential numbering
      }

      circleDataMap[ctCircle].wards.push({ WARD_NO: wardNo, NAME: wardName });
    }

    console.log(`\n📊 Found ${circleOrder.length} unique circles in the XLSX\n`);

    // ── 3. Preview the mapping before writing ──────────────────────────
    console.log('=== CIRCLE → WARD MAPPING (preview) ===');
    circleOrder.forEach((ctName, idx) => {
      const cData = circleDataMap[ctName];
      const wardNums = cData.wards.map(w => w.WARD_NO).join(', ');
      console.log(`  ${idx + 1}. ${ctName} (${cData.division}) → ${cData.wards.length} wards [${wardNums}]`);
    });
    console.log('');

    // ── 4. Clear existing circles ──────────────────────────────────────
    const existingCount = await Circle.countDocuments();
    console.log(`🗑  Removing ${existingCount} existing circles...`);
    await Circle.deleteMany({});

    // Also clear circle references on all wards
    await Ward.updateMany({}, { $unset: { circle: 1, CIRCLE_NO: 1, CIR_NAM_NU: 1 } });
    console.log('🗑  Cleared circle references from all wards\n');

    // ── 5. Create new circles and link wards ───────────────────────────
    let successCount = 0;
    let wardLinkedCount = 0;
    let wardMissingCount = 0;

    for (let idx = 0; idx < circleOrder.length; idx++) {
      const ctName = circleOrder[idx];
      const cData = circleDataMap[ctName];
      const circleNo = idx + 1;   // Sequential: 1, 2, 3, ...
      const cirNamNu = `${circleNo} - ${ctName}`;

      console.log(`Creating Circle ${circleNo}: ${ctName} (${cData.division}) with ${cData.wards.length} wards...`);

      // Create the circle document
      const circle = new Circle({
        name: ctName,
        CIRCLE_NO: circleNo,
        CIR_NAM_NU: cirNamNu,
        Zone_Name: cData.division,
        wards: [],
        ward_count: 0,
        ward_numbers: [],
        ward_names: [],
        business_count: 0,
        status: 'active'
      });

      await circle.save();

      // Find and link each ward
      const linkedWardIds = [];
      const linkedWardNumbers = [];
      const linkedWardNames = [];
      let circleBusinessCount = 0;

      for (const wData of cData.wards) {
        const ward = await Ward.findOne({ WARD_NO: wData.WARD_NO });
        if (ward) {
          // Update the ward's circle reference
          ward.circle = circle._id;
          ward.CIRCLE_NO = circleNo;
          ward.CIR_NAM_NU = cirNamNu;
          await ward.save();

          linkedWardIds.push(ward._id);
          linkedWardNumbers.push(ward.WARD_NO);
          linkedWardNames.push(ward.NAME);
          circleBusinessCount += (ward.business_count || 0);
          wardLinkedCount++;
        } else {
          console.warn(`    ⚠ Ward ${wData.WARD_NO} (${wData.NAME}) not found in DB!`);
          wardMissingCount++;
        }
      }

      // Update circle with linked ward data
      circle.wards = linkedWardIds;
      circle.ward_count = linkedWardIds.length;
      circle.ward_numbers = linkedWardNumbers;
      circle.ward_names = linkedWardNames;
      circle.business_count = circleBusinessCount;
      await circle.save();

      console.log(`    ✅ Linked ${linkedWardIds.length}/${cData.wards.length} wards, ${circleBusinessCount} businesses`);
      successCount++;
    }

    // ── 6. Summary ─────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Circles created:  ${successCount}`);
    console.log(`  Wards linked:     ${wardLinkedCount}`);
    console.log(`  Wards missing:    ${wardMissingCount}`);

    // Verify
    const finalCircles = await Circle.countDocuments();
    const linkedWards = await Ward.countDocuments({ circle: { $exists: true } });
    console.log(`  DB Circles:       ${finalCircles}`);
    console.log(`  DB Wards linked:  ${linkedWards}`);
    console.log('='.repeat(60));

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

migrate();
