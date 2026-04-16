const User = require('../models/User');
const Region = require('../models/Region');
const Circle = require('../models/Circle');

// const getRegions = async (req, res) => {
//   const regions = await Region.find({});
//   res.json(regions);
// };
const getRegions = async (req, res) => {
  try {
    // Fetch all regions
    const regions = await Region.find({});

    // Populate the users for each region
    const regionsWithUsers = await Promise.all(
      regions.map(async (region) => {
        const users = await User.find({ region: region._id }, 'username role');
        return {
          ...region._doc,
          users
        };
      })
    );

    res.json(regionsWithUsers);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching regions' });
  }
};

const createRegion = async (req, res) => {
  const { name, description } = req.body;
  const region = new Region({ name, description });
  await region.save();
  res.status(201).json(region);
};

const getRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const circles = await Circle.find({ region: id });
    res.json(circles);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching circles' });
  }
}
const getCirclesByRegion = async (req, res) => {
  try {
    const { id } = req.params;

    // Find all circles in the specified region
    const circles = await Circle.find({ region: id });

    if (circles.length === 0) {
      return res.status(404).json({ error: 'No circles found for this region' });
    }

    res.json(circles);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching circles' });
  }
};
const updateRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);
    if (region) {
      region.name = req.body.name || region.name;
      region.description = req.body.description || region.description;
      if (req.body.circles) {
        region.circles = req.body.circles;
      }

      const updatedRegion = await region.save();

      // Update the region reference in the Circle documents
      if (req.body.circles) {
        // Remove region reference from circles that are no longer part of the region
        await Circle.updateMany(
          { _id: { $nin: req.body.circles }, region: region._id },
          { $unset: { region: "" } }
        );

        // Add region reference to new circles
        await Circle.updateMany(
          { _id: { $in: req.body.circles } },
          { region: region._id }
        );
      }

      res.json(updatedRegion);
    } else {
      res.status(404).json({ message: 'Region not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteRegion = async (req, res) => {
  try {
    const region = await Region.findById(req.params.id);
    if (region) {
      await Region.deleteOne({ _id: req.params.id });
      res.json({ message: 'Region removed' });
    } else {
      res.status(404).json({ message: 'Region not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = { getRegions, createRegion, updateRegion, deleteRegion, getRegion, getCirclesByRegion };
