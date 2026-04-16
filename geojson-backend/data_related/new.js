const mongoose = require('mongoose');
const xlsx = require('xlsx');
const GeoJSON = require('../models/GeoJSON'); // Ensure the correct path to your model

// MongoDB connection URI and Database Name
const uri = 'mongodb://localhost:27017/stategst';

// Function to load Excel data
async function loadExcelData(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

// Function to connect to MongoDB using Mongoose
async function connectToMongoDB() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  }
}

// Function to create an address string from business object
function createAddress(business) {
  const flatNo = business.flatNo || '';
  const buildingNo = business.buildingNo || '';
  const buildingName = business.buildingName || '';
  const street = business.street || '';
  const district = business.district || '';
  const stateCode = business.stateCode || '';
  const pincode = business.pincode || '';
  return `${flatNo} ${buildingNo} ${buildingName} ${street} ${district} ${stateCode} ${pincode}`.trim();
}

// Function to find nearby polygons using $nearSphere
const MAX_DISTANCE = 100; // Maximum distance in meters

async function findNearbyPolygons(pointGeoJSON, maxDistance) {
  console.log(pointGeoJSON)
  try {
    const polygons = await GeoJSON.find({
      geometry: {
        $nearSphere: {
          $geometry: pointGeoJSON,
          $maxDistance: maxDistance
        }
      }
    }).exec(); // Ensure exec() is called to execute the query
    return polygons;
  } catch (error) {
    console.error('Error in findNearbyPolygons:', error);
    return [];
  }
}

// Function to map points to polygons using MongoDB geospatial queries
async function mapPointsToPolygons(points) {
  const belongsToPolygon = [];
  const doesNotBelongToPolygon = [];

  for (const point of points) {
    // console.log(point)
    const lat = parseFloat(point.latitude); // Correctly extract latitude
    const lon = parseFloat(point.longitude); // Correctly extract longitude

    console.log(`Latitude: ${lat}, Longitude: ${lon}`);

    if (isNaN(lat) || isNaN(lon)) {
      console.log(`Invalid coordinates for business ${point.gstin}: (${point.latitude_from_file}, ${point.longitude_from_file})`);
      continue;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      console.log(`Invalid coordinates for business ${point.gstin}: (${lat}, ${lon})`);
      continue;
    }

    const pointGeoJSON = {
      type: "Point",
      coordinates: [lon, lat] // Correct order: [longitude, latitude]
    };

    console.log('Querying with point:', pointGeoJSON);

    const polygon = await GeoJSON.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: pointGeoJSON
        }
      }
    });

    if (polygon) {
      // console.log('1')
      belongsToPolygon.push({
        gstin: point.GSTIN,
        address: point.address,
        // address: createAddress(point),
        circle_name: polygon.properties.name || 'Polygon'
      });
    } else {
      console.log('No intersecting polygon found, searching for nearby polygons...');
      const nearbyPolygons = await findNearbyPolygons(pointGeoJSON, MAX_DISTANCE);

      // console.log('Nearby polygons:', nearbyPolygons);
      // return
      if (nearbyPolygons.length > 0) {
        const nearestPolygon = nearbyPolygons[0]; // Take the closest polygon
        belongsToPolygon.push({
          gstin: point.GSTIN,
          address: point.address,

          // address: createAddress(point),
          circle_name: nearestPolygon.properties.name || 'Nearest Polygon'
        });
      } else {
        doesNotBelongToPolygon.push({
          gstin: point.GSTIN,
          // address: createAddress(point),
          address: point.address,
          lat,
          lon
        });
      }
    }
  }

  // Create Excel files
  const wb = xlsx.utils.book_new();

  // Create sheet for businesses that belong to a polygon
  const wsBelongs = xlsx.utils.json_to_sheet(belongsToPolygon);
  xlsx.utils.book_append_sheet(wb, wsBelongs, 'BelongsToPolygon');

  // Create sheet for businesses that do not belong to a polygon
  const wsDoesNotBelong = xlsx.utils.json_to_sheet(doesNotBelongToPolygon);
  xlsx.utils.book_append_sheet(wb, wsDoesNotBelong, 'DoesNotBelongToPolygon');

  // Write workbook to file
  xlsx.writeFile(wb, 'businesses_polygons_today.xlsx');
}

// Main function to clean and validate polygons, and then map points to polygons
(async () => {
  const filePath = 'geocoded_addresses_20.xlsx';
  const points = await loadExcelData(filePath);

  try {
    await connectToMongoDB();
    await mapPointsToPolygons(points);
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
})();
