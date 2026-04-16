const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { roleCheck } = require('../middlewares/roleMiddleware');
const { getCircles, createCircle, updateCircle, deleteCircle, getCircle, getRelatedCircles, createRevisedCircle, getPendingRevisedCircles, approveRevisedCircleByRegion, approveRevisedCircleByAdmin } = require('../controllers/circleController');

// / Revised Circle routes
router.route('/revised-circles')
  .post(protect, roleCheck(['circle']), createRevisedCircle)
  .get(protect, roleCheck(['root', 'admin', 'region']), getPendingRevisedCircles);

router.route('/revised-circles/region/:id')
  .put(protect, roleCheck(['region']), approveRevisedCircleByRegion);

router.route('/revised-circles/admin/:id')
  .put(protect, roleCheck(['admin', 'root']), approveRevisedCircleByAdmin);

router.route('/')
  .get(protect, roleCheck(['root', 'admin', 'region', 'circle']), getCircles)
  .post(protect, roleCheck(['root', 'admin', 'region', 'circle']), createCircle);

router.route('/:id/related-circles')
  .get(protect, roleCheck(['root', 'admin', 'region', 'circle']), getRelatedCircles)

router.route('/:id')
  .get(protect, roleCheck(['root', 'admin', 'region', 'circle']), getCircle)
  .put(protect, roleCheck(['root', 'admin', 'region']), updateCircle)
  .delete(protect, roleCheck(['root', 'admin', 'region']), deleteCircle);



module.exports = router;
