const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getUsers, createUser, updateUser, deleteUser, getProfile } = require('../controllers/userController');
const { roleCheck } = require('../middlewares/roleMiddleware');



router.route('/')
  .get(protect, roleCheck(['root', 'admin', 'region']), getUsers)
  .post(protect, roleCheck(['root', 'admin']), createUser);

router.route('/profile')
  .get(protect, roleCheck(['root', 'admin', 'region', 'circle']), getProfile)


router.route('/:id')
  .put(protect, roleCheck(['root', 'admin']), updateUser)
  .delete(protect, roleCheck(['root', 'admin']), deleteUser);

module.exports = router;
