// const Circle = require('../models/Circle');
// const RevisedCircle = require('../models/RevisedCircleSchema');

// const getCircles = async (req, res) => {
//   const circles = await Circle.find({}).populate('region');
//   // console.log(circles)
//   res.json(circles);
// };

// const createCircle = async (req, res) => {
//   const { name, region, geometry, status, properties } = req.body;
//   console.log('name', name)
//   try {
//     const circle = new Circle({ name });
//     await circle.save();
//     res.status(201).json(circle);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const getCircle = async (req, res) => {
//   try {
//     const circle = await Circle.findById(req.params.id).populate('region');
//     if (circle) {
//       res.json(circle);
//     } else {
//       res.status(404).json({ message: 'Circle not found' });
//     }
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// }

// const getRelatedCircles = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find the circle to get the region
//     const circle = await Circle.findById(id).populate('region');
//     if (!circle) {
//       return res.status(404).json({ error: 'Circle not found' });
//     }

//     // Find all circles in the same region
//     const relatedCircles = await Circle.find({ region: circle.region._id });

//     res.json(relatedCircles);
//   } catch (error) {
//     res.status(500).json({ error: 'An error occurred while fetching related circles' });
//   }
// }
// const updateCircle = async (req, res) => {
//   try {
//     const circle = await Circle.findById(req.params.id);
//     if (circle) {
//       circle.name = req.body.name || circle.name;
//       circle.region = req.body.region || circle.region;
//       circle.geometry = req.body.geometry || circle.geometry;
//       circle.status = req.body.status || circle.status;
//       circle.properties = req.body.properties || circle.properties;
//       const updatedCircle = await circle.save();
//       res.json(updatedCircle);
//     } else {
//       res.status(404).json({ message: 'Circle not found' });
//     }
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// const deleteCircle = async (req, res) => {
//   try {
//     const circle = await Circle.findByIdAndDelete(req.params.id);
//     if (circle) {
//       res.json({ message: 'Circle removed' });
//     } else {
//       res.status(404).json({ message: 'Circle not found' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // / Create a new revised circle
// const createRevisedCircle = async (req, res) => {
//   try {
//     const revisedCircle = new RevisedCircle({
//       ...req.body,
//       createdBy: req.user.id
//     });
//     await revisedCircle.save();
//     res.status(201).json(revisedCircle);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Get all pending revised circles
// const getPendingRevisedCircles = async (req, res) => {
//   console.log('hello reached controler')
//   try {
//     const revisedCircles = await RevisedCircle.find({ status: 'pending' });
//     res.status(200).json(revisedCircles);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Approve a revised circle by region
// const approveRevisedCircleByRegion = async (req, res) => {
//   try {
//     const revisedCircle = await RevisedCircle.findById(req.params.id);
//     if (!revisedCircle) {
//       return res.status(404).json({ message: 'Revised circle not found' });
//     }
//     revisedCircle.status = 'regionApproved';
//     await revisedCircle.save();
//     res.status(200).json(revisedCircle);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

// // Approve a revised circle by admin
// const approveRevisedCircleByAdmin = async (req, res) => {
//   try {
//     const revisedCircle = await RevisedCircle.findById(req.params.id);
//     if (!revisedCircle) {
//       return res.status(404).json({ message: 'Revised circle not found' });
//     }

//     const originalCircle = await Circle.findById(revisedCircle.circleId);
//     if (!originalCircle) {
//       return res.status(404).json({ message: 'Original circle not found' });
//     }

//     originalCircle.name = revisedCircle.name;
//     originalCircle.region = revisedCircle.region;
//     originalCircle.geometry = revisedCircle.geometry;
//     originalCircle.properties = revisedCircle.properties;
//     originalCircle.status = 'approved';

//     await originalCircle.save();

//     revisedCircle.status = 'adminApproved';
//     await revisedCircle.save();

//     res.status(200).json(originalCircle);
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };
// module.exports = { getCircles, createCircle, updateCircle, deleteCircle, getCircle, getRelatedCircles, approveRevisedCircleByAdmin, approveRevisedCircleByRegion, getPendingRevisedCircles, createRevisedCircle };



const Circle = require('../models/Circle');
const User = require('../models/User')
const RevisedCircle = require('../models/RevisedCircleSchema');

// Get all circles
// const getCircles = async (req, res) => {
//   const circles = await Circle.find({}).populate('region');
//   res.json(circles);
// };
const getCircles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const all = req.query.all === 'true'; // Check if 'all' query parameter is true
    const skip = (page - 1) * limit;

    // Include search query
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};

    let circles;
    let totalCircles;

    if (all) {
      // Fetch all circles without pagination
      circles = await Circle.find(query).populate('region');
      totalCircles = circles.length;
    } else {
      // Fetch circles with pagination
      circles = await Circle.find(query).populate('region').skip(skip).limit(limit);
      totalCircles = await Circle.countDocuments(query);
    }

    const circlesWithUsers = await Promise.all(
      circles?.map(async (circle) => {
        const users = await User.find({ region: circle.region._id }, 'username role');
        return {
          ...circle.toObject(),
          users
        };
      })
    );

    res.json({
      circles: circlesWithUsers,
      totalPages: all ? 1 : Math.ceil(totalCircles / limit), // Only 1 page if all circles are returned
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching circles:', error);
    res.status(500).json({ error: 'An error occurred while fetching circles' });
  }
};




// Create a new circle or create a revised circle if the role is circle
const createCircle = async (req, res) => {
  try {
    const { name, region, geometry, status, properties } = req.body;
    const circle = new Circle({ name, region, geometry, status, properties });

    if (req.user.role === 'circle') {
      const revisedCircle = new RevisedCircle({
        circleId: circle._id,
        name,
        region,
        geometry,
        properties,
        createdBy: req.user.id,
        status: 'pending'
      });
      await revisedCircle.save();
      res.status(201).json(revisedCircle);
    } else {
      await circle.save();
      res.status(201).json(circle);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an existing circle or create a revised circle if the role is circle
const updateCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    const updatedData = {
      name: req.body.name || circle.name,
      region: req.body.region || circle.region,
      geometry: req.body.geometry || circle.geometry,
      properties: req.body.properties || circle.properties
    };

    if (req.user.role === 'circle') {
      const revisedCircle = new RevisedCircle({
        circleId: circle._id,
        ...updatedData,
        createdBy: req.user.id,
        status: 'pending'
      });
      await revisedCircle.save();
      res.status(200).json(revisedCircle);
    } else {
      Object.assign(circle, updatedData);
      await circle.save();
      res.status(200).json(circle);
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a circle or create a revised circle if the role is circle
const deleteCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) {
      return res.status(404).json({ message: 'Circle not found' });
    }

    if (req.user.role === 'circle') {
      const revisedCircle = new RevisedCircle({
        circleId: circle._id,
        name: circle.name,
        region: circle.region,
        geometry: circle.geometry,
        properties: circle.properties,
        createdBy: req.user.id,
        status: 'pendingDelete'
      });
      await revisedCircle.save();
      res.status(200).json(revisedCircle);
    } else {
      await Circle.findByIdAndDelete(req.params.id);
      res.status(204).send();
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a specific circle
const getCircle = async (req, res) => {
  try {
    const circle = await Circle.findById(req.params.id).populate('region');
    if (circle) {
      res.json(circle);
    } else {
      res.status(404).json({ message: 'Circle not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get related circles
const getRelatedCircles = async (req, res) => {
  try {
    const { id } = req.params;
    const circle = await Circle.findById(id).populate('region');
    if (!circle) {
      return res.status(404).json({ error: 'Circle not found' });
    }
    const relatedCircles = await Circle.find({ region: circle.region._id });
    res.json(relatedCircles);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching related circles' });
  }
};

// Create a new revised circle
const createRevisedCircle = async (req, res) => {
  try {
    const revisedCircle = new RevisedCircle({
      ...req.body,
      createdBy: req.user.id
    });
    await revisedCircle.save();
    res.status(201).json(revisedCircle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all pending revised circles
const getPendingRevisedCircles = async (req, res) => {
  try {
    let query = { status: 'pending' };

    // If the user is an admin, include circles that are regionApproved
    if (req.user.role === 'admin' || req.user.role === 'root') {
      query = { status: { $in: ['pending', 'regionApproved'] } };
    }

    const revisedCircles = await RevisedCircle.find(query);
    res.status(200).json(revisedCircles);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Approve a revised circle by region
const approveRevisedCircleByRegion = async (req, res) => {
  try {
    const revisedCircle = await RevisedCircle.findById(req.params.id);
    if (!revisedCircle) {
      return res.status(404).json({ message: 'Revised circle not found' });
    }
    revisedCircle.status = 'regionApproved';
    await revisedCircle.save();
    res.status(200).json(revisedCircle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Approve a revised circle by admin
const approveRevisedCircleByAdmin = async (req, res) => {
  try {
    const revisedCircle = await RevisedCircle.findById(req.params.id);
    if (!revisedCircle) {
      return res.status(404).json({ message: 'Revised circle not found' });
    }

    let originalCircle = await Circle.findById(revisedCircle.circleId);

    if (!originalCircle) {
      // Create a new circle if it doesn't exist
      originalCircle = new Circle({
        name: revisedCircle.name,
        region: revisedCircle.region,
        geometry: revisedCircle.geometry,
        properties: revisedCircle.properties,
        status: 'approved',
      });
    } else {
      // Update the existing circle
      originalCircle.name = revisedCircle.name;
      originalCircle.region = revisedCircle.region;
      originalCircle.geometry = revisedCircle.geometry;
      originalCircle.properties = revisedCircle.properties;
      originalCircle.status = 'approved';
    }

    await originalCircle.save();

    revisedCircle.status = 'adminApproved';
    await revisedCircle.save();

    res.status(200).json(originalCircle);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


module.exports = { getCircles, createCircle, updateCircle, deleteCircle, getCircle, getRelatedCircles, approveRevisedCircleByAdmin, approveRevisedCircleByRegion, getPendingRevisedCircles, createRevisedCircle };
