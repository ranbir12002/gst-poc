const express = require('express');
const router = express.Router();
const turf = require('@turf/turf');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const Business = require('../models/Business');
const GeoJSON = require('../models/GeoJSON');
const Circle = require('../models/Circle');
const Ward = require('../models/Ward');
const User = require('../models/User');

// ============================================================
//  WARD ENDPOINTS (base entity)
// ============================================================

// GET /api/v2/wards — List all wards (optionally filter by CIRCLE_NO or unassigned)
router.get('/api/v2/wards', async (req, res) => {
  try {
    const query = {};
    if (req.query.CIRCLE_NO) query.CIRCLE_NO = parseInt(req.query.CIRCLE_NO);
    if (req.query.unassigned === 'true') query.circle = null;

    const wards = await Ward.find(query)
      .sort({ WARD_NO: 1 })
      .populate('circle', 'CIR_NAM_NU CIRCLE_NO name');
    res.json({ wards, total: wards.length });
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

// GET /api/v2/wards/:id — Get single ward
router.get('/api/v2/wards/:id', async (req, res) => {
  try {
    const ward = await Ward.findById(req.params.id).populate('circle', 'CIR_NAM_NU CIRCLE_NO name');
    if (!ward) return res.status(404).json({ error: 'Ward not found' });
    res.json(ward);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ward' });
  }
});

// GET /api/v2/wards/:id/businesses — List businesses in a ward (paginated)
router.get('/api/v2/wards/:id/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const ward = await Ward.findById(req.params.id);
    if (!ward) {
      console.log(`Ward not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: 'Ward not found' });
    }

    console.log(`Fetching businesses for Ward: ${ward.NAME} (WARD_NO: ${ward.WARD_NO})`);

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

    console.log(`Found ${businesses.length} out of ${total} businesses.`);

    res.json({
      ward_name: ward.NAME,
      ward_no: ward.WARD_NO,
      businesses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      debug: {
        query,
        wardId: ward._id,
        wardNo: ward.WARD_NO
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// ============================================================
//  CIRCLE ENDPOINTS (derived from wards)
// ============================================================

// GET /api/v2/circles — List all circles (paginated, searchable)
router.get('/api/v2/circles', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 60;
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const query = search 
      ? { $or: [
          { CIR_NAM_NU: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]} 
      : {};

    const [circles, total] = await Promise.all([
      Circle.find(query).sort({ CIRCLE_NO: 1 }).skip(skip).limit(limit).populate('wards', 'WARD_NO NAME'),
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

// GET /api/v2/circles/:id — Get single circle with its wards
router.get('/api/v2/circles/:id', async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id).populate('wards', 'WARD_NO NAME geometry Area__Sqkm business_count');
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    res.json(circle);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circle' });
  }
});

// GET /api/v2/circles/:id/wards — List wards belonging to a circle
router.get('/api/v2/circles/:id/wards', async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    const wards = await Ward.find({ circle: circle._id }).sort({ WARD_NO: 1 });
    res.json({ circle_name: circle.CIR_NAM_NU || circle.name, CIRCLE_NO: circle.CIRCLE_NO, wards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wards' });
  }
});

// GET /api/v2/circles/:id/businesses — List all businesses in a circle (via its wards)
router.get('/api/v2/circles/:id/businesses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    // Get businesses via the ward numbers that belong to this circle
    const wardNos = circle.ward_numbers || [];
    // Find businesses linked to this circle directly or via its assigned wards
    const query = {
      $or: [
        { circle: circle._id },
        { ward_no: { $in: circle.ward_numbers || [] } }
      ]
    };


    const [businesses, total] = await Promise.all([
      Business.find(query).skip(skip).limit(limit),
      Business.countDocuments(query)
    ]);

    res.json({
      circle_name: circle.CIR_NAM_NU || circle.name,
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

// POST /api/v2/circles/assign-wards — Create a circle by grouping wards
router.post('/api/v2/circles/assign-wards', async (req, res) => {
  const { wardIds, circleId, circleNo, circleName, zoneName, corporate } = req.body;

  try {
    const wards = await Ward.find({ _id: { $in: wardIds } });
    if (wards.length === 0) {
      return res.status(400).json({ error: 'No wards selected' });
    }

    let circle;
    try {
      if (circleId) {
        circle = await Circle.findById(circleId);
      } else if (circleNo) {
        circle = await Circle.findOne({ CIRCLE_NO: circleNo });
      }

      // 1. Handle OLD wards that are removed from this circle
      if (circle) {
        const existingWardIds = circle.wards.map(w => w.toString());
        const removedWardIds = existingWardIds.filter(id => !wardIds.includes(id));
        
        if (removedWardIds.length > 0) {
          // Update removed wards to be empty
          await Ward.updateMany(
            { _id: { $in: removedWardIds } },
            { $unset: { circle: 1, CIRCLE_NO: 1, CIR_NAM_NU: 1 } }
          );

          // Update businesses in these removed wards to be empty
          const removedWards = await Ward.find({ _id: { $in: removedWardIds } });
          const removedWardNos = removedWards.map(w => w.WARD_NO);
          if (removedWardNos.length > 0) {
            await Business.updateMany(
              { ward_no: { $in: removedWardNos } },
              { $unset: { circle: 1, circle_no: 1, circle_name: 1 } }
            );
          }
        }
      }

      // 2. Find OTHER circles that currently own any of the NEW wardIds and remove them
      const otherCircles = await Circle.find({ 
        wards: { $in: wardIds },
        _id: circle ? { $ne: circle._id } : { $exists: true }
      });

      for (const otherCircle of otherCircles) {
        otherCircle.wards = otherCircle.wards.filter(wId => !wardIds.includes(wId.toString()));
        const remainingWards = await Ward.find({ _id: { $in: otherCircle.wards } });
        otherCircle.ward_numbers = remainingWards.map(w => w.WARD_NO);
        otherCircle.ward_names = remainingWards.map(w => w.NAME);
        otherCircle.ward_count = remainingWards.length;
        otherCircle.business_count = await Business.countDocuments({ ward_no: { $in: otherCircle.ward_numbers } });
        
        // Remove geometry as it might be outdated or invalid
        otherCircle.geometry = undefined;
        await otherCircle.save();
      }

      // 3. Update or Create the main circle
      if (circle) {
        circle.wards = wardIds;
        circle.ward_numbers = wards.map(w => w.WARD_NO);
        circle.ward_names = wards.map(w => w.NAME);
        circle.ward_count = wards.length;
        if (circleName) circle.CIR_NAM_NU = circleName;
        if (circleName) circle.name = circleName;
        if (circleNo) circle.CIRCLE_NO = circleNo;
        if (zoneName) circle.Zone_Name = zoneName;
        
        circle.geometry = undefined; // No longer saving combined geometry
        await circle.save();
      } else {
        circle = new Circle({
          CIRCLE_NO: circleNo,
          CIR_NAM_NU: circleName,
          name: circleName,
          Zone_Name: zoneName,
          CORPORATE: corporate,
          wards: wardIds,
          ward_count: wards.length,
          ward_numbers: wards.map(w => w.WARD_NO),
          ward_names: wards.map(w => w.NAME)
        });
        await circle.save();
      }
    } catch (dbError) {
      console.error('Database Error creating/updating circle:', dbError);
      
      // Handle Duplicate Key Error
      if (dbError.code === 11000) {
        return res.status(400).json({ error: `Circle Number ${circleNo} already exists.` });
      }
      throw dbError; 
    }

    // Update wards to point to their new circle
    await Ward.updateMany(
      { _id: { $in: wardIds } },
      {
        circle: circle._id,
        CIRCLE_NO: circle.CIRCLE_NO,
        CIR_NAM_NU: circle.CIR_NAM_NU
      }
    );

    // Update all businesses in these wards to point to the new circle
    console.log(`Updating circle reference for businesses in wards: ${circle.ward_numbers.join(', ')}`);
    await Business.updateMany(
      { ward_no: { $in: circle.ward_numbers } },
      {
        circle: circle._id,
        circle_no: circle.CIRCLE_NO,
        circle_name: circle.CIR_NAM_NU
      }
    );

    // Compute business count for the circle
    const bizCount = await Business.countDocuments({ ward_no: { $in: circle.ward_numbers } });
    circle.business_count = bizCount;
    
    try {
      await circle.save();
    } catch (finalSaveError) {
      console.error('Final circle save error:', finalSaveError.message);
      if (finalSaveError.code === 16755) {
        circle.geometry = undefined;
        await circle.save();
      }
    }


    console.log(`Successfully created/updated Circle: ${circle.CIR_NAM_NU} (ID: ${circle.CIRCLE_NO})`);

    res.json({
      success: true,
      message: circleId ? 'Wards added to circle' : 'Circle created from wards',
      circle
    });

  } catch (error) {
    console.error('Error assigning wards to circle:', error);
    res.status(500).json({ error: 'Failed to assign wards to circle', details: error.message });
  }
});

// DELETE /api/v2/circles/:id — Delete a circle and unassign its wards
router.delete('/api/v2/circles/:id', async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    // Unassign wards
    await Ward.updateMany(
      { circle: circle._id },
      { $unset: { circle: 1 } }
    );

    await Circle.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Circle deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete circle' });
  }
});

// ============================================================
//  BUSINESS ENDPOINTS
// ============================================================

// GET /api/v2/businesses/by-ward/:wardNo — Get businesses by ward number
router.get('/api/v2/businesses/by-ward/:wardNo', async (req, res) => {
  try {
    const businesses = await Business.find({ ward_no: parseInt(req.params.wardNo) })
      .select('name gstin latitude longitude street ward_no ward_name')
      .limit(2000);
    res.json({ count: businesses.length, businesses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ward businesses' });
  }
});

// GET /api/v2/businesses/by-circle/:circleNo — Get businesses by circle number
router.get('/api/v2/businesses/by-circle/:circleNo', async (req, res) => {
  try {
    const circle = await Circle.findOne({ CIRCLE_NO: parseInt(req.params.circleNo) });
    if (!circle) return res.status(404).json({ error: 'Circle not found' });

    const businesses = await Business.find({ ward_no: { $in: circle.ward_numbers || [] } })
      .select('name gstin latitude longitude street ward_no ward_name')
      .limit(5000);
    res.json({ count: businesses.length, businesses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circle businesses' });
  }
});

// GET /api/v2/businesses/:id — Get single business detail
router.get('/api/v2/businesses/:id', async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('ward', 'NAME WARD_NO')
      .populate('circle', 'CIR_NAM_NU CIRCLE_NO');
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business' });
  }
});

// ============================================================
//  STATS
// ============================================================

// GET /api/v2/stats — Dashboard stats
router.get('/api/v2/stats', async (req, res) => {
  try {
    const [circleCount, wardCount, businessCount, unassignedWards] = await Promise.all([
      Circle.countDocuments(),
      Ward.countDocuments(),
      Business.countDocuments(),
      Ward.countDocuments({ circle: null })
    ]);
    res.json({ 
      circles: circleCount, 
      wards: wardCount, 
      businesses: businessCount,
      unassignedWards 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================
//  LEGACY GEOJSON ENDPOINTS (polygon drawing, etc.)
// ============================================================

router.post('/save', async (req, res) => {
  try {
    const geojson = new GeoJSON(req.body);
    const savedGeojson = await geojson.save();
    res.status(201).send(savedGeojson);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.put('/update/:id', async (req, res) => {
  try {
    const updatedGeojson = await GeoJSON.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).send(updatedGeojson);
  } catch (error) {
    res.status(400).send(error);
  }
});

router.get('/polygons', async (req, res) => {
  try {
    const polygons = await GeoJSON.find();
    res.status(200).send(polygons);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post('/businesses', async (req, res) => {
  try {
    const { coordinates } = req.body;
    const polygon = turf.polygon([coordinates]);
    const isValid = turf.kinks(polygon).features.length === 0;

    let validCoordinates = coordinates;
    if (!isValid) {
      const fixedPolygon = turf.unkinkPolygon(polygon);
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

router.get('/business/:id', async (req, res) => {
  const businessId = req.params.id;
  try {
    const businessObjectId = new ObjectId(businessId);
    const businessInfo = await Business.findOne({ _id: businessObjectId });
    if (!businessInfo) {
      return res.status(404).send('Business not found');
    }
    res.json(businessInfo);
  } catch (error) {
    console.error('Error fetching business information:', error);
    res.status(500).send('Error fetching business information');
  }
});

module.exports = router;
