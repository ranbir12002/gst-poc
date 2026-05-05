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
    let currentCircleNo = null;
    let currentCircleName = null;
    let currentCirNamNu = null;
    
    const circleDataMap = {}; // Map of circle_no -> { name, CIR_NAM_NU, wards: [] }

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 5) continue;
      
      const slNo = parts[0];
      const ctDivision = parts[1];
      const ctCircle = parts[2];
      const wardStr = parts[3]; // e.g. "1 - Keesara"
      let circleStr = parts[4]; // e.g. "1 - Keesara"
      
      if (circleStr && circleStr.trim() !== '') {
        // parse new circle
        // Handle em dash and normal dash
        const dashIndex = circleStr.indexOf('-');
        const emDashIndex = circleStr.indexOf('–');
        let splitIndex = dashIndex !== -1 ? dashIndex : emDashIndex;
        
        if (splitIndex !== -1) {
            currentCircleNo = parseInt(circleStr.substring(0, splitIndex).trim(), 10);
            currentCircleName = circleStr.substring(splitIndex + 1).trim();
            currentCirNamNu = circleStr.trim();
        } else {
            console.warn(`Could not parse circle: ${circleStr}`);
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
      
      if (wardNo && currentCircleNo) {
          if (!circleDataMap[currentCircleNo]) {
              circleDataMap[currentCircleNo] = {
                  CIRCLE_NO: currentCircleNo,
                  name: currentCircleName,
                  CIR_NAM_NU: currentCirNamNu,
                  wards: []
              };
          }
          circleDataMap[currentCircleNo].wards.push({
              WARD_NO: wardNo,
              NAME: wardName
          });
      }
    }
    
    // Now update the DB
    for (const circleNo of Object.keys(circleDataMap)) {
        const cData = circleDataMap[circleNo];
        console.log(`Processing Circle ${cData.CIRCLE_NO} - ${cData.name} with ${cData.wards.length} wards`);
        
        let circle = await Circle.findOne({ CIRCLE_NO: cData.CIRCLE_NO });
        if (!circle) {
            circle = new Circle({
                CIRCLE_NO: cData.CIRCLE_NO,
                name: cData.name,
                CIR_NAM_NU: cData.CIR_NAM_NU,
                ward_numbers: [],
                ward_names: [],
                wards: []
            });
        }
        
        circle.name = cData.name;
        circle.CIR_NAM_NU = cData.CIR_NAM_NU;
        circle.ward_numbers = [];
        circle.ward_names = [];
        circle.wards = []; // Reset wards to reconstruct
        circle.ward_count = cData.wards.length;
        
        // Save circle first to get its _id
        await circle.save();
        
        // Find wards and update them
        for (const wData of cData.wards) {
            let ward = await Ward.findOne({ WARD_NO: wData.WARD_NO });
            if (ward) {
                ward.circle = circle._id;
                ward.CIRCLE_NO = cData.CIRCLE_NO;
                ward.CIR_NAM_NU = cData.CIR_NAM_NU;
                await ward.save();
                
                circle.wards.push(ward._id);
                circle.ward_numbers.push(ward.WARD_NO);
                circle.ward_names.push(ward.NAME);
            } else {
                console.warn(`Ward ${wData.WARD_NO} not found in DB!`);
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
