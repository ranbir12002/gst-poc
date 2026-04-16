const mongoose = require('mongoose');
const xlsx = require('xlsx');
const path = require('path');
const NodeGeocoder = require('node-geocoder');
const dotenv = require('dotenv');
const Business = require('./models/Business');

dotenv.config();

const options = {
  provider: 'google',
  apiKey: 'AIzaSyAy8YCsflTp_qv7sUcRAARjd-KqmuIgBjg',
};

const geocoder = NodeGeocoder(options);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocodeWithRetry(address, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await geocoder.geocode(address);
      if (res.length > 0) {
        return res[0];
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
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/stategst', { useNewUrlParser: true, useUnifiedTopology: true });

    // Read the Excel file
    // const filePath = path.join(__dirname, 'gst_txp_dtls.xlsx');
    const filePath = path.join(__dirname, '1st_Data.xlsx');


    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Geocode the addresses and save to the database
    for (let entry of data) {
      const flatNo = entry['Flat NO'] || '';
      const buildingName = entry['Building name'] || '';
      const buildingNo = entry['Builiding No.'] || '';
      const street = entry.Street || '';
      const location = entry.Location || '';
      const district = entry.district || '';
      const pincode = entry.pincode || '';

      const address = [flatNo, buildingName, buildingNo, street, location, district, pincode].filter(Boolean).join(', ');

      let latitude = entry.latitude;
      let longitude = entry.longitude;
      let locationObj = null;

      if (latitude && longitude) {
        if (typeof latitude === 'string' && isCoordinateString(latitude)) {
          try {
            latitude = parseCoordinates(latitude);
            longitude = parseCoordinates(longitude);
          } catch (e) {
            console.error(`Failed to parse coordinates for ${entry.name || entry.gstin}: ${e.message}`);
            continue;
          }
        } else {
          latitude = parseFloat(latitude);
          longitude = parseFloat(longitude);
        }

        // Check if the parsed coordinates are valid numbers and within bounds
        if (isNaN(latitude) || isNaN(longitude) || !isValidCoordinate(latitude, longitude)) {
          console.error(`Invalid coordinates for ${entry.name || entry.gstin}: latitude = ${latitude}, longitude = ${longitude}`);
          continue;
        }

        locationObj = {
          type: 'Point',
          coordinates: [longitude, latitude]
        };

        const business = new Business({
          name: entry.name || entry.gstin, // Use name or gstin if name is not available
          gstin: entry.gstin,
          street,
          location,
          buildingNo,
          stateCode: entry['State code'],
          pincode,
          flatNo,
          buildingName,
          district,
          latitude_from_file: latitude,
          longitude_from_file: longitude,
          location: locationObj,
          location_from_file: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          precision: 'provided',
          types: [],
          confidence: null,
          neighborhood: null
        });

        await business.save();
        console.log(`Saved: ${entry.name || entry.gstin} at ${address} with provided coordinates`);
      } else {
        try {
          const geoResult = await geocodeWithRetry(address);
          latitude = geoResult.latitude;
          longitude = geoResult.longitude;

          // Check if the geocoded coordinates are within bounds
          if (!isValidCoordinate(latitude, longitude)) {
            console.error(`Geocoded coordinates out of bounds for ${entry.name || entry.gstin}: latitude = ${latitude}, longitude = ${longitude}`);
            continue;
          }

          const precision = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types[0] : 'unknown'; // Save the most relevant type if exists
          const types = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types : []; // Save all types if exists
          const confidence = geoResult.extra && geoResult.extra.confidence ? geoResult.extra.confidence : null; // Save confidence if exists
          const neighborhood = geoResult.extra && geoResult.extra.neighborhood ? geoResult.extra.neighborhood : null; // Save neighborhood if exists

          locationObj = {
            type: 'Point',
            coordinates: [longitude, latitude]
          };

          const business = new Business({
            name: entry.name || entry.gstin, // Use name or gstin if name is not available
            gstin: entry.gstin,
            street,
            location,
            buildingNo,
            stateCode: entry['State code'],
            pincode,
            flatNo,
            buildingName,
            district,
            latitude_from_file: entry.latitude || null,
            longitude_from_file: entry.longitude || null,
            location: locationObj,
            location_from_file: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            precision,
            types,
            confidence,
            neighborhood
          });

          await business.save();
          console.log(`Saved: ${entry.name || entry.gstin} at ${address}`);
        } catch (error) {
          console.error(`Failed to save business for address "${address}": ${error.message}`);
        }
      }
    }

    console.log('Data processed and saved successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

processAddresses();



// const mongoose = require('mongoose');
// const xlsx = require('xlsx');
// const path = require('path');
// const NodeGeocoder = require('node-geocoder');
// const dotenv = require('dotenv');
// const Business = require('./models/Business');

// dotenv.config();

// const options = {
//   provider: 'google',
//   apiKey: process.env.GOOGLE_MAPS_API_KEY,
// };

// const geocoder = NodeGeocoder(options);

// function sleep(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

// async function geocodeWithRetry(address, retries = 5) {
//   for (let i = 0; i < retries; i++) {
//     try {
//       const res = await geocoder.geocode(address);
//       if (res.length > 0) {
//         return res[0];
//       } else {
//         throw new Error('No geocoding result');
//       }
//     } catch (error) {
//       console.error(`Geocoding error for address "${address}": ${error.message}. Retrying... (${i + 1}/${retries})`);
//       await sleep(1000 * (i + 1)); // Exponential backoff
//     }
//   }
//   throw new Error(`Failed to geocode address "${address}" after ${retries} attempts`);
// }

// function parseCoordinates(coordStr) {
//   const match = coordStr.match(/^([0-9.]+)\s*([NSWE])$/i);
//   if (match) {
//     const value = parseFloat(match[1]);
//     const direction = match[2].toUpperCase();
//     if (direction === 'S' || direction === 'W') {
//       return -value;
//     }
//     return value;
//   }
//   throw new Error(`Invalid coordinate format: ${coordStr}`);
// }

// async function processAddresses() {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect('mongodb://localhost:27017/stategst', { useNewUrlParser: true, useUnifiedTopology: true });

//     // Read the Excel file
//     const filePath = path.join(__dirname, 'gst_txp_dtls.xlsx');
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(worksheet);

//     // Geocode the addresses and save to the database
//     for (let entry of data) {
//       const flatNo = entry['Flat NO'] || '';
//       const buildingName = entry['Building name'] || '';
//       const buildingNo = entry['Builiding No.'] || '';
//       const street = entry.Street || '';
//       const location = entry.Location || '';
//       const district = entry.district || '';
//       const pincode = entry.pincode || '';

//       const address = [flatNo, buildingName, buildingNo, street, location, district, pincode].filter(Boolean).join(', ');

//       let latitude = entry.latitude;
//       let longitude = entry.longitude;
//       let locationObj = null;

//       if (!latitude || !longitude) {
//         // try {
//         //   const geoResult = await geocodeWithRetry(address);
//         //   latitude = geoResult.latitude;
//         //   longitude = geoResult.longitude;
//         //   const precision = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types[0] : 'unknown'; // Save the most relevant type if exists
//         //   const types = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types : []; // Save all types if exists
//         //   const confidence = geoResult.extra && geoResult.extra.confidence ? geoResult.extra.confidence : null; // Save confidence if exists
//         //   const neighborhood = geoResult.extra && geoResult.extra.neighborhood ? geoResult.extra.neighborhood : null; // Save neighborhood if exists

//         //   locationObj = {
//         //     type: 'Point',
//         //     coordinates: [longitude, latitude]
//         //   };

//         //   const business = new Business({
//         //     name: entry.name || entry.gstin, // Use name or gstin if name is not available
//         //     gstin: entry.gstin,
//         //     street,
//         //     location,
//         //     buildingNo,
//         //     stateCode: entry['State code'],
//         //     pincode,
//         //     flatNo,
//         //     buildingName,
//         //     district,
//         //     latitude_from_file: entry.latitude || null,
//         //     longitude_from_file: entry.longitude || null,
//         //     location: locationObj,
//         //     location_from_file: {
//         //       type: 'Point',
//         //       coordinates: [longitude, latitude]
//         //     },
//         //     precision,
//         //     types,
//         //     confidence,
//         //     neighborhood
//         //   });

//         //   await business.save();
//         //   console.log(`Saved: ${entry.name || entry.gstin} at ${address}`);
//         // } catch (error) {
//         //   console.error(`Failed to save business for address "${address}": ${error.message}`);
//         // }
//       } else {
//         try {
//           latitude = parseCoordinates(latitude);
//           longitude = parseCoordinates(longitude);
//         } catch (e) {
//           console.error(`Failed to parse coordinates for ${entry.name || entry.gstin}: ${e.message}`);
//           continue;
//         }

//         locationObj = {
//           type: 'Point',
//           coordinates: [longitude, latitude]
//         };

//         const business = new Business({
//           name: entry.name || entry.gstin, // Use name or gstin if name is not available
//           gstin: entry.gstin,
//           street,
//           location,
//           buildingNo,
//           stateCode: entry['State code'],
//           pincode,
//           flatNo,
//           buildingName,
//           district,
//           latitude_from_file: latitude,
//           longitude_from_file: longitude,
//           location: locationObj,
//           location_from_file: {
//             type: 'Point',
//             coordinates: [longitude, latitude]
//           },
//           precision: 'provided',
//           types: [],
//           confidence: null,
//           neighborhood: null
//         });

//         await business.save();
//         console.log(`Saved: ${entry.name || entry.gstin} at ${address} with provided coordinates`);
//       }
//     }

//     console.log('Data processed and saved successfully');
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     mongoose.disconnect();
//   }
// }

// processAddresses();


// // async function processAddresses() {
// //   try {
// //     // Read the Excel file
// //     const filePath = path.join(__dirname, 'gst_txp_dtls.xlsx');
// //     const workbook = xlsx.readFile(filePath);
// //     const sheetName = workbook.SheetNames[0];
// //     const worksheet = workbook.Sheets[sheetName];
// //     const data = xlsx.utils.sheet_to_json(worksheet);


// //     // return
// //     // Geocode the addresses and save to database
// //     for (let entry of data) {
// //       const flatNo = entry['Flat NO'] ? `Flat No. ${entry['Flat NO']}` : '';
// //       const buildingName = entry['Building name'] || '';
// //       const buildingNo = entry['Builiding No.'] || '';
// //       const street = entry.Street || '';
// //       const location = entry.Location || '';
// //       const district = entry.district || '';
// //       const pincode = entry.pincode || '';

// //       const address = [flatNo, buildingName, buildingNo, street, location, district, pincode].filter(Boolean).join(',');
// //       // return
// //       try {
// //         const geoResult = await geocodeWithRetry(address);
// //         console.log(geoResult)
// //         return
// //         const latitude = geoResult.latitude;
// //         const longitude = geoResult.longitude;
// //         const precision = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types[0] : 'unknown'; // Save the most relevant type if exists
// //         const types = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types : []; // Save all types if exists
// //         const confidence = geoResult.extra && geoResult.extra.confidence ? geoResult.extra.confidence : null; // Save confidence if exists
// //         const neighborhood = geoResult.extra && geoResult.extra.neighborhood ? geoResult.extra.neighborhood : null; // Save neighborhood if exists

// //         const business = new Business({
// //           name,
// //           address,
// //           location: {
// //             type: 'Point',
// //             coordinates: [longitude, latitude]
// //           },
// //           precision,
// //           types,
// //           confidence,
// //           neighborhood
// //         });

// //         await business.save();
// //         console.log(`Saved: ${name} at ${address}`);
// //       } catch (error) {
// //         console.error(`Failed to save business for address "${address}": ${error.message}`);
// //       }
// //     }

// //     console.log('Data processed and saved successfully');
// //   } catch (error) {
// //     console.error('Error:', error);
// //   } finally {
// //     mongoose.disconnect();
// //   }
// // }

// // Start processing addresses asynchronously

// async function processAddresses() {
//   try {
//     // Read the Excel file
//     const filePath = path.join(__dirname, 'gst_txp_dtls.xlsx');
//     const workbook = xlsx.readFile(filePath);
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     const data = xlsx.utils.sheet_to_json(worksheet);

//     // Geocode the addresses and save to database
//     for (let entry of data) {
//       const flatNo = entry['Flat NO'] ? `Flat No. ${entry['Flat NO']}` : '';
//       const buildingName = entry['Building name'] || '';
//       const buildingNo = entry['Builiding No.'] || '';
//       const street = entry.Street || '';
//       const location = entry.Location || '';
//       const district = entry.district || '';
//       const pincode = entry.pincode || '';

//       const address = [flatNo, buildingName, buildingNo, street, location, district, pincode].filter(Boolean).join(', ');

//       let latitude = entry.latitude;
//       let longitude = entry.longitude;

//       if (!latitude || !longitude) {
//         try {
//           const geoResult = await geocodeWithRetry(address);

//           latitude = geoResult.latitude;
//           longitude = geoResult.longitude;
//           const precision = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types[0] : 'unknown'; // Save the most relevant type if exists
//           const types = geoResult.extra && geoResult.extra.google && geoResult.extra.google.types ? geoResult.extra.google.types : []; // Save all types if exists
//           const confidence = geoResult.extra && geoResult.extra.confidence ? geoResult.extra.confidence : null; // Save confidence if exists
//           const neighborhood = geoResult.extra && geoResult.extra.neighborhood ? geoResult.extra.neighborhood : null; // Save neighborhood if exists

//           const business = new Business({
//             name: entry.name,
//             gstin: entry.gstin,
//             address,
//             location: {
//               type: 'Point',
//               coordinates: [longitude, latitude]
//             },
//             precision,
//             types,
//             confidence,
//             neighborhood
//           });

//           await business.save();
//           console.log(`Saved: ${entry.name} at ${address}`);
//         } catch (error) {
//           console.error(`Failed to save business for address "${address}": ${error.message}`);
//         }
//       } else {
//         // console.log(entry)
//         return
//         const business = new Business({
//           name: entry.name,
//           gstin: entry.gstin,
//           address,
//           location: {
//             type: 'Point',
//             coordinates: [longitude, latitude]
//           }
//         });

//         await business.save();
//         console.log(`Saved: ${entry.name} at ${address}`);
//       }
//     } console.log('Data processed and saved successfully');
//   } catch (error) {
//     console.error('Error:', error);
//   } finally {
//     // mongoose.disconnect();
//   }
// }

// processAddresses();


