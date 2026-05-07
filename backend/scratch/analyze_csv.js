const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', '..', 'data', 'updated circles list.csv');
const csvData = fs.readFileSync(csvPath, 'utf8');
const lines = csvData.split('\n');

const ctCircles = {};
const cureCircles = {};

for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length < 5) continue;
    
    const ctCircle = parts[2].trim();
    const cureCircleStr = parts[4].trim();
    
    if (!ctCircles[ctCircle]) ctCircles[ctCircle] = [];
    if (cureCircleStr) {
        ctCircles[ctCircle].push(cureCircleStr);
        if (!cureCircles[cureCircleStr]) cureCircles[cureCircleStr] = ctCircle;
    }
}

console.log('Total CT Circles:', Object.keys(ctCircles).length);
console.log('CT Circle vs CURE Circles:');
for (const [ct, cures] of Object.entries(ctCircles)) {
    if (cures.length > 1) {
        console.log(`${ct}: ${cures.join(', ')}`);
    } else if (cures.length === 0) {
        console.log(`${ct}: NO CURE CIRCLE DEFINED`);
    }
}
