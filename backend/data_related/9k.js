const xlsx = require('xlsx');
const path = require('path');
const { Client } = require('@googlemaps/google-maps-services-js');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function geocodeWithRetry(address, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await client.geocode({
        params: {
          address: address,
          key: 'AIzaSyC9b8itaiJC5ZHTO_9F2X-8wccbJY_oblQ',
        },
        timeout: 1000,
      });
      if (res.data.results.length > 0) {
        // console.log()
        return res.data.results[0];
      } else {
        throw new Error('No geocoding result');
      }
    } catch (error) {
      console.error(`Geocoding error for address "${address}": ${error.message}. Retrying... (${i + 1}/${retries})`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  throw new Error(`Failed to geocode address "${address}" after ${retries} attempts`);
}


async function findNearestPlace(pincode, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await client.geocode({
        params: {
          address: pincode,
          key: 'AIzaSyAy8YCsflTp_qv7sUcRAARjd-KqmuIgBjg',
        },
        timeout: 1000,
      });
      if (res.data.results.length > 0) {

        return res.data.results[0];
      } else {
        throw new Error('No geocoding result for pincode');
      }
    } catch (error) {
      console.error(`Geocoding error for pincode "${pincode}": ${error.message}. Retrying... (${i + 1}/${retries})`);
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
  throw new Error(`Failed to geocode pincode "${pincode}" after ${retries} attempts`);
}

function parseCoordinates(coordStr) {
  const match = coordStr.match(/^([0-9.]+)\s*([NSWE])$/i);
  if (match) {
    const value = parseFloat(match[1]);
    const direction = match[2].toUpperCase();
    if (direction === 'S' || direction === 'W') {
      return -value;
    }
    return value;
  }
  throw new Error(`Invalid coordinate format: ${coordStr}`);
}

function isCoordinateString(coordStr) {
  return /^[0-9.]+\s*[NSWE]$/i.test(coordStr);
}

function isValidCoordinate(latitude, longitude) {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
}

async function processAddresses() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, 'Wrong.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const results = [];

    // Geocode the addresses and prepare the results for Excel
    for (let entry of data) {

      const address = `${entry.District_1
        },${entry.Pincode}`;
      console.log(address);
      let latitude = entry.latitude;
      let longitude = entry.longitude;
      let locationObj = null;

      if (latitude && longitude) {
        // if (typeof latitude === 'string' && isCoordinateString(latitude)) {
        //   try {
        //     latitude = parseCoordinates(latitude);
        //     longitude = parseCoordinates(longitude);
        //   } catch (e) {
        //     console.error(`Failed to parse coordinates for ${entry.name || entry.GSTIN}: ${e.message}`);
        //     continue;
        //   }
        // } else {
        //   latitude = parseFloat(latitude);
        //   longitude = parseFloat(longitude);
        // }

        // // Check if the parsed coordinates are valid numbers and within bounds
        // if (isNaN(latitude) || isNaN(longitude) || !isValidCoordinate(latitude, longitude)) {
        //   console.error(`Invalid coordinates for ${entry.name || entry.GSTIN}: latitude = ${latitude}, longitude = ${longitude}`);
        //   continue;
        // }

        // locationObj = {
        //   type: 'Point',
        //   coordinates: [longitude, latitude]
        // };

        // results.push({
        //   name: entry.name || entry.GSTIN, // Use name or GSTIN if name is not available
        //   GSTIN: entry.GSTIN,
        //   address,
        //   latitude: latitude,
        //   longitude: longitude,
        //   precision: 'provided',
        //   types: [],
        //   confidence: null,
        //   neighborhood: null
        // });

        // console.log(`Processed: ${entry.name || entry.GSTIN} at ${address} with provided coordinates`);
      } else {
        // console.log(entry)
        try {
          let geoResult;
          try {
            geoResult = await geocodeWithRetry(address);
            // console.log(geoResult)
          } catch (geocodeError) {
            console.error(`Failed to geocode address "${address}": ${geocodeError.message}. Trying nearest pincode...`);
            geoResult = await findNearestPlace(entry.Pincode);
          }

          latitude = geoResult.geometry.location.lat;
          longitude = geoResult.geometry.location.lng;

          // Check if the geocoded coordinates are within bounds
          if (!isValidCoordinate(latitude, longitude)) {
            console.error(`Geocoded coordinates out of bounds for ${entry.name || entry.GSTIN}: latitude = ${latitude}, longitude = ${longitude}`);
            continue;
          }

          const precision = geoResult.types ? geoResult.types[0] : 'unknown'; // Save the most relevant type if exists
          const types = geoResult.types ? geoResult.types : []; // Save all types if exists
          const confidence = geoResult.extra && geoResult.extra.confidence ? geoResult.extra.confidence : null; // Save confidence if exists
          const neighborhood = geoResult.extra && geoResult.extra.neighborhood ? geoResult.extra.neighborhood : null; // Save neighborhood if exists

          locationObj = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };

          results.push({
            name: entry.name || entry.GSTIN, // Use name or GSTIN if name is not available
            GSTIN: entry.GSTIN,
            address,
            latitude_from_file: entry.latitude || null,
            longitude_from_file: entry.longitude || null,
            latitude: latitude,
            longitude: longitude,
            precision,
            types,
            confidence,
            neighborhood
          });

          console.log(`Processed: ${entry.name || entry.GSTIN} at ${address}`);
        } catch (error) {
          console.error(`Failed to process address "${address}": ${error.message}`);
        }
      }
    }

    // Write results to an Excel file
    const newWorkbook = xlsx.utils.book_new();
    const newWorksheet = xlsx.utils.json_to_sheet(results);
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Geocoded_Addresses_20');

    const outputFilePath = path.join(__dirname, 'geocoded_addresses_20.xlsx');
    xlsx.writeFile(newWorkbook, outputFilePath);

    console.log('Data processed and saved successfully to geocoded_addresses.xlsx');
  } catch (error) {
    console.error('Error:', error);
  }
}

processAddresses();
