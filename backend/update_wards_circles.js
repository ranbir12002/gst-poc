const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const dotenv = require('dotenv');

dotenv.config();

const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";
const csvPath = path.join(__dirname, '..', 'data', 'updated circles list.csv');

async function migrate() {
  try {
    await mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ MongoDB connected');

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n');
    
    // skip line 0 (Title) and line 1 (Headers)
    
    const circleDataMap = {}; // Map of CT Circle name -> { name, zone, circleNo, cirNamNu, wards: [] }

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 4) continue;
      
      const slNo = parts[0];
      const ctDivision = parts[1] ? parts[1].trim() : '';
      const ctCircle = parts[2] ? parts[2].trim() : '';
      const wardStr = parts[3] ? parts[3].trim() : '';
      let circleStr = parts[4] ? parts[4].trim() : '';
      
      if (!ctCircle || !wardStr) continue;

      if (!circleDataMap[ctCircle]) {
          circleDataMap[ctCircle] = {
              name: ctCircle,
              zone: ctDivision,
              circleNo: null,
              cirNamNu: null,
              wards: []
          };
      }
      
      if (circleStr && !circleDataMap[ctCircle].circleNo) {
        // parse circle number if available in this row
        const dashIndex = circleStr.indexOf('-');
        const emDashIndex = circleStr.indexOf('–');
        let splitIndex = dashIndex !== -1 ? dashIndex : emDashIndex;
        
        if (splitIndex !== -1) {
            circleDataMap[ctCircle].circleNo = parseInt(circleStr.substring(0, splitIndex).trim(), 10);
            circleDataMap[ctCircle].cirNamNu = circleStr.trim();
        }
      }
      
      // parse ward
      const wDashIndex = wardStr.indexOf('-');
      let wSplitIndex = wDashIndex;
      if (wSplitIndex === -1) wSplitIndex = wardStr.indexOf('–');
      
      let wardNo = null;
      let wardName = null;
      
      if (wSplitIndex !== -1) {
          wardNo = parseInt(wardStr.substring(0, wSplitIndex).trim(), 10);
          wardName = wardStr.substring(wSplitIndex + 1).trim();
      }
      
      if (wardNo) {
          circleDataMap[ctCircle].wards.push({
              WARD_NO: wardNo,
              NAME: wardName
          });
      }
    }
    
    // Now update the DB
    let unknownCircleCounter = 10000;
    for (const ctName of Object.keys(circleDataMap)) {
        const cData = circleDataMap[ctName];
        
        if (!cData.circleNo) {
            cData.circleNo = unknownCircleCounter++;
            console.log(`  Assigning temp CIRCLE_NO ${cData.circleNo} to ${ctName}`);
        }

        console.log(`Processing Circle: ${ctName} (Zone: ${cData.zone}) with ${cData.wards.length} wards`);
        
        // Find circle by name or CIRCLE_NO
        let circle = await Circle.findOne({ name: ctName });
        if (!circle) {
            circle = await Circle.findOne({ CIRCLE_NO: cData.circleNo });
        }

        if (!circle) {
            circle = new Circle({
                name: ctName,
                CIRCLE_NO: cData.circleNo,
                CIR_NAM_NU: cData.cirNamNu || `${cData.circleNo} - ${ctName}`,
                Zone_Name: cData.zone,
                ward_numbers: [],
                ward_names: [],
                wards: []
            });
        }
        
        circle.name = ctName;
        circle.Zone_Name = cData.zone;
        circle.CIRCLE_NO = cData.circleNo;
        if (cData.cirNamNu) circle.CIR_NAM_NU = cData.cirNamNu;
        else if (!circle.CIR_NAM_NU) circle.CIR_NAM_NU = `${cData.circleNo} - ${ctName}`;
        
        circle.ward_numbers = [];
        circle.ward_names = [];
        circle.wards = []; 
        circle.ward_count = cData.wards.length;
        
        // Save circle first to get its _id
        await circle.save();
        
        // Find wards and update them
        for (const wData of cData.wards) {
            let ward = await Ward.findOne({ WARD_NO: wData.WARD_NO });
            if (ward) {
                ward.circle = circle._id;
                ward.CIRCLE_NO = circle.CIRCLE_NO;
                ward.CIR_NAM_NU = circle.CIR_NAM_NU;
                await ward.save();
                
                circle.wards.push(ward._id);
                circle.ward_numbers.push(ward.WARD_NO);
                circle.ward_names.push(ward.NAME);
            } else {
                console.warn(`  Ward ${wData.WARD_NO} not found in DB!`);
            }
        }
        
        await circle.save();
    }
    
    console.log('✅ Update completed successfully');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

migrate();
