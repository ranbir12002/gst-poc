const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

// Function to read JSON data
function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading or parsing JSON file:', error);
    return null;
  }
}

// Function to write JSON data
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Fixed polygons saved to ${filePath}`);
  } catch (error) {
    console.error('Error writing JSON file:', error);
  }
}

// Function to fix overlapping polygons
function fixOverlappingPolygons(polygons) {
  if (!Array.isArray(polygons)) {
    console.error('Invalid JSON data.');
    return null;
  }

  let fixedPolygons = [];

  for (let i = 0; i < polygons.length; i++) {
    let polyA = polygons[i];
    let hasOverlap = false;

    for (let j = 0; j < fixedPolygons.length; j++) {
      let polyB = fixedPolygons[j];

      if (turf.booleanOverlap(polyA, polyB) || turf.booleanIntersects(polyA, polyB)) {
        polyB.geometry = turf.union(polyA.geometry, polyB.geometry).geometry;
        fixedPolygons[j] = polyB;
        hasOverlap = true;
        break;
      }
    }

    if (!hasOverlap) {
      fixedPolygons.push(polyA);
    }
  }

  return fixedPolygons;
}

// Read input JSON
const inputFilePath = './polygons.js'; // Update with your actual file path
const outputFilePath = './output_files/fixed_polygons.json'; // Update with your desired output file path

const polygons = readJSON(inputFilePath);

if (polygons) {
  // Fix overlapping polygons
  const fixedPolygons = fixOverlappingPolygons(polygons);

  if (fixedPolygons) {
    // Write the fixed polygons to a new JSON file
    writeJSON(outputFilePath, fixedPolygons);
  }
}
