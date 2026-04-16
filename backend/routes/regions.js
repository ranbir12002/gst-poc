const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleMiddleware');
const { getRegions, createRegion, updateRegion, deleteRegion, getRegion, getCirclesByRegion } = require('../controllers/regionController');

router.route('/')
  .get(protect, roleCheck(['root', 'admin', 'region', 'circle']), getRegions)
  .post(protect, roleCheck(['root', 'admin']), createRegion);

router.route('/:id/circles')
  .get(protect, roleCheck(['root', 'admin', 'region']), getCirclesByRegion)

router.route('/:id')
  .get(protect, roleCheck(['root', 'admin', 'region']), getRegion)
  .put(protect, roleCheck(['root', 'admin', 'region']), updateRegion)
  .delete(protect, roleCheck(['root', 'admin']), deleteRegion);

module.exports = router;
