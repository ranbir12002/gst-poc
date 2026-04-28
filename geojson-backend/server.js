const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const turf = require('@turf/turf');
const xlsx = require('xlsx');
const NodeGeocoder = require('node-geocoder');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Business = require('./models/Business');
const GeoJSON = require('./models/GeoJSON'); // Import GeoJSON model
const { protect } = require('./middleware/auth');
const Circle = require('./models/Circle');
const Ward = require('./models/Ward');
const { ObjectId } = mongoose.Types;
dotenv.config();
const app = express();
const port = process.env.PORT || 4000;

// Configure the geocoder
const geocoder = NodeGeocoder({
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());

// MongoDB connection
const db = process.env.MONGO_URI || "mongodb+srv://ranbir12002:gg@cluster0.jjvmywl.mongodb.net/stateGst";

mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');
    // Ensure collections exist by calling createCollection (idempotent)
    const collections = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);
    if (!collections.includes('circles')) {
      await mongoose.connection.db.createCollection('circles');
      console.log('✅ Created circles collection');
    }
    if (!collections.includes('wards')) {
      await mongoose.connection.db.createCollection('wards');
      console.log('✅ Created wards collection');
    }
    if (!collections.includes('businesses')) {
      await mongoose.connection.db.createCollection('businesses');
      console.log('✅ Created businesses collection');
    }
    console.log('✅ All collections ready');
  })
  .catch(err => console.log(err));


// Routes


// --- NEW HIERARCHY API ---

// GET /api/v2/businesses/by-circle/:circleNo
app.get('/api/v2/businesses/by-circle/:circleNo', async (req, res) => {
  try {
    const businesses = await Business.find({ circle_no: parseInt(req.params.circleNo) })
      .select('name gstin latitude longitude street ward_no ward_name')
      .limit(5000); 
    res.json({ count: businesses.length, businesses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circle businesses' });
  }
});

// GET /api/v2/businesses/by-ward/:wardNo
app.get('/api/v2/businesses/by-ward/:wardNo', async (req, res) => {
  try {
    const businesses = await Business.find({ ward_no: parseInt(req.params.wardNo) })
      .select('name gstin latitude longitude street')
      .limit(2000);
    res.json({ count: businesses.length, businesses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ward businesses' });
  }
});

app.post('/save', async (req, res) => {

  try {
    const geojson = new GeoJSON(req.body);
    const savedGeojson = await geojson.save();
    res.status(201).send(savedGeojson);
  } catch (error) {
    res.status(400).send(error);
  }
});

app.put('/update/:id', async (req, res) => {
  try {
    const updatedGeojson = await GeoJSON.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).send(updatedGeojson);
  } catch (error) {
    res.status(400).send(error);
  }
});


app.get('/polygons', async (req, res) => {
  try {
    const polygons = await GeoJSON.find();
    // console.log('hello', polygons[0])
    // const capitalizeFirstLetter = (string) => {
    //   return { name: string.charAt(0).toUpperCase() + string.slice(1), status: "pending" };
    // };
    // const polygonss = polygons.map(p => {
    //   return {
    //     name: (p.properties.name.charAt(0).toUpperCase() + p.properties.name.slice(1)).trim(),
    //     geometry: p.geometry
    //   }
    // })
    // const polygonNames = polygons.map(polygon => capitalizeFirstLetter(polygon.properties.regionName.trim()));
    // // const uniquePolygonNames = Array.from(new Set(polygonNames.map(JSON.stringify))).map(JSON.parse);

    // console.log(uniquePolygonNames);

    console.log(polygons)


    // const uniqueNames = new Set(polygons.map(polygon => polygon.properties.name));
    // console.log(uniqueNames);
    res.status(200).send(polygons);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Endpoint to fetch businesses within a polygon

app.post('/businesses', async (req, res) => {
  try {
    const { coordinates } = req.body;
    const polygon = turf.polygon([coordinates]);

    // Validate the polygon
    const isValid = turf.kinks(polygon).features.length === 0;
    console.log('Is the polygon valid?:', isValid);

    let validCoordinates = coordinates;

    if (!isValid) {
      console.log('The polygon has self-intersections.');
      const fixedPolygon = turf.unkinkPolygon(polygon);
      console.log('Fixed Polygon:', JSON.stringify(fixedPolygon, null, 2));
      // Assuming we take the first valid polygon after unkinking
      validCoordinates = fixedPolygon.features[0].geometry.coordinates[0];
    }

    const businesses = await Business.find({
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [validCoordinates]
          }
        }
      }
    });

    res.status(200).send(businesses);
  } catch (error) {
    res.status(500).send(error);
  }
});
// app.post('/businesses', async (req, res) => {
//   try {
//     const { coordinates } = req.body;
//     console.log(coordinates)
//     const businesses = await Business.find({
//       location: {
//         $geoWithin: {
//           $geometry: {
//             type: 'Polygon',
//             coordinates: [coordinates]
//           }
//         }
//       }
//     });
//     // console.log(`Fetched ${businesses[0]} businesses`); // Log the number of businesses fetched
//     res.status(200).send(businesses);
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });
function isValidPolygon(coordinates) {
  if (coordinates.length < 4) return false; // Not a valid polygon

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];

  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    coordinates.push(firstPoint);
  }

  const polygon = turf.polygon([[coordinates]]);

  // Check for kinks (self-intersections)
  const hasKinks = turf.kinks(polygon).features.length > 0;
  if (hasKinks) return false;

  // Check for duplicate vertices
  const uniqueCoordinates = new Set(coordinates.map(coord => coord.join(',')));
  if (uniqueCoordinates.size !== coordinates.length) return false;

  return true;
}

// Function to fix polygons
function fixPolygon(coordinates) {
  // Ensure the polygon is closed
  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];
  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    coordinates.push(firstPoint);
  }

  // Remove duplicate vertices
  const uniqueCoordinates = [];
  const seen = new Set();
  for (const coord of coordinates) {
    const key = coord.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCoordinates.push(coord);
    }
  }

  return uniqueCoordinates;
}

// Function to check if a polygon is valid
function isValidPolygon(coordinates) {
  if (coordinates.length < 4) return false; // Not a valid polygon

  const firstPoint = coordinates[0];
  const lastPoint = coordinates[coordinates.length - 1];

  if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
    coordinates.push(firstPoint);
  }

  const polygon = turf.polygon([coordinates]);

  // Check for kinks (self-intersections)
  const hasKinks = turf.kinks(polygon).features.length > 0;
  if (hasKinks) return false;

  // Check for duplicate vertices
  const uniqueCoordinates = new Set(coordinates.map(coord => coord.join(',')));
  if (uniqueCoordinates.size !== coordinates.length) return false;

  return true;
}

app.get('/export-all-businesses', async (req, res) => {
  try {
    const polygons = await GeoJSON.find();
    const allBusinesses = [];
    let validPolygonCount = 0;
    let invalidPolygonCount = 0;

    for (const polygon of polygons) {
      const polygonName = polygon.properties.name || polygon.name;
      let coordinates = polygon.geometry.coordinates[0];

      // Fix the polygon coordinates
      coordinates = fixPolygon(coordinates);
      console.log(`Processing polygon: ${polygonName}`);
      console.log(`Coordinates: ${JSON.stringify(coordinates)}`);

      try {
        if (!isValidPolygon(coordinates)) {
          console.log(`Skipping invalid polygon: ${polygonName}`);
          console.log(`Invalid polygon coordinates: ${JSON.stringify(coordinates)}`);
          invalidPolygonCount++;
          continue; // Skip invalid polygons
        }

        const businesses = await Business.find({
          location: {
            $geoWithin: {
              $geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              }
            }
          }
        });

        const businessesWithPolygonName = businesses.map(business => ({
          gstin: business.gstin,
          address: `${business.flatNo}, ${business.buildingNo}, ${business.street}, ${business.neighborhood}, ${business.district}, ${business.stateCode}, ${business.pincode}`,
          polygonName: polygonName
        }));

        allBusinesses.push(...businessesWithPolygonName);
        validPolygonCount++;
      } catch (polygonError) {
        console.error(`Error processing polygon: ${polygonName}`);
        console.error(`Polygon coordinates: ${JSON.stringify(coordinates)}`);
        console.error(`Error: ${polygonError.message}`);
      }
    }

    console.log(`Total valid polygons: ${validPolygonCount}`);
    console.log(`Total invalid polygons: ${invalidPolygonCount}`);
    res.status(200).json(allBusinesses);
  } catch (error) {
    console.error('Error fetching all businesses:', error);
    res.status(500).send(error);
  }
});


app.get('/business/:id', async (req, res) => {
  const businessId = req.params.id;

  console.log('Fetching businessId:', businessId);

  try {
    // Convert businessId to ObjectId using the `new` keyword
    const businessObjectId = new ObjectId(businessId);
    const businessInfo = await Business.findOne({ _id: businessObjectId });
    console.log(businessInfo)
    if (!businessInfo) {
      return res.status(404).send('Business not found');
    }
    res.json(businessInfo);
  } catch (error) {
    console.error('Error fetching business information:', error);
    res.status(500).send('Error fetching business information');
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      res.json({ token });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ─────────────────────────────────────────────────────────────
// NEW API: Circle → Ward → Business Hierarchy
// ─────────────────────────────────────────────────────────────

// GET /api/v2/circles — List all circles (paginated, searchable)
app.get('/api/v2/circles', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search ? { CIR_NAM_NU: { $regex: search, $options: 'i' } } : {};

    const [circles, total] = await Promise.all([
      Circle.find(query).sort({ CIRCLE_NO: 1 }).skip(skip).limit(limit),
      Circle.countDocuments(query)
    ]);

    res.json({
      circles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching circles:', error);
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

// GET /api/v2/circles/:id — Get single circle
app.get('/api/v2/circles/:id', async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    res.json(circle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circle' });
  }
});

// GET /api/v2/circles/:id/wards — List wards under a circle
app.get('/api/v2/circles/:id/wards', async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    const wards = await Ward.find({ 
      $or: [
        { circle: circle._id },
        { CIRCLE_NO: circle.CIRCLE_NO }
      ]
    }).sort({ WARD_NO: 1 });
    res.json({ circle_name: circle.CIR_NAM_NU, CIRCLE_NO: circle.CIRCLE_NO, wards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

// GET /api/v2/circles/:id/businesses — List all businesses in a circle
app.get('/api/v2/circles/:id/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;

    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    const query = {
      $or: [
        { circle: circle._id },
        { circle_no: circle.CIRCLE_NO }
      ]
    };

    const [businesses, total] = await Promise.all([
      Business.find(query).skip(skip).limit(limit),
      Business.countDocuments(query)
    ]);

    res.json({
      circle_name: circle.CIR_NAM_NU,
      circle_no: circle.CIRCLE_NO,
      businesses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// GET /api/v2/wards — List all wards (optionally filter by CIRCLE_NO)
app.get('/api/v2/wards', async (req, res) => {
  try {
    const query = {};
    if (req.query.CIRCLE_NO) query.CIRCLE_NO = parseInt(req.query.CIRCLE_NO);

    const wards = await Ward.find(query).sort({ WARD_NO: 1 }).populate('circle', 'CIR_NAM_NU CIRCLE_NO');
    res.json({ wards, total: wards.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

// GET /api/v2/wards/:id — Get single ward
app.get('/api/v2/wards/:id', async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id).populate('circle', 'CIR_NAM_NU CIRCLE_NO');
    if (!ward) return res.status(404).json({ error: 'Ward not found' });
    res.json(ward);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ward' });
  }
});

// GET /api/v2/wards/:id/businesses — List businesses in a ward (paginated)
app.get('/api/v2/wards/:id/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const ward = await Ward.findById(req.params.id);
    if (!ward) return res.status(404).json({ error: 'Ward not found' });

    const query = {
      $or: [
        { ward: ward._id },
        { ward_no: ward.WARD_NO }
      ]
    };

    const [businesses, total] = await Promise.all([
      Business.find(query).skip(skip).limit(limit),
      Business.countDocuments(query)
    ]);

    res.json({
      ward_name: ward.NAME,
      ward_no: ward.WARD_NO,
      businesses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Endpoints moved to top

// GET /api/v2/businesses/:id — Get single business detail
app.get('/api/v2/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('ward', 'name ward_no')
      .populate('circle', 'CIR_NAM_NU CIRCLE_NO');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});


// GET /api/v2/stats — Dashboard stats
app.get('/api/v2/stats', async (req, res) => {
  try {
    const [circleCount, wardCount, businessCount] = await Promise.all([
      Circle.countDocuments(),
      Ward.countDocuments(),
      Business.countDocuments()
    ]);
    res.json({ circles: circleCount, wards: wardCount, businesses: businessCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


// Catch-all for 404s to help debugging
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route ${req.url} not found on this server` });
});

app.listen(port, () => {
  console.log(`🚀 Data Server running on http://localhost:${port}`);
  console.log(`✅ Registered Routes:`);
  console.log(`   - GET /api/v2/circles`);
  console.log(`   - GET /api/v2/businesses/by-circle/:circleNo`);
  console.log(`   - GET /api/v2/businesses/by-ward/:wardNo`);
});

