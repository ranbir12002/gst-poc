const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'root' } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
};
const createUser = async (req, res) => {
  console.log(req.body)
  const { firstName, lastName, email, username, password, role, region, circle, mobile } = req.body;
  const user = new User({ firstName, lastName, email, username, password, role, region, circle, mobile });
  await user.save();
  res.status(201).json(user);
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;
      user.username = req.body.username || user.username;
      user.mobile = req.body.mobile || user.mobile,
        user.role = req.body.role || user.role;
      user.region = req.body.region || user.region;
      user.circle = req.body.circle || user.circle;
      if (req.body.password) {
        user.password = req.body.password;
      }
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.remove();
    res.json({ message: 'User removed' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

const getProfile = async (req, res) => {
  console.log(req.user, 'hello')
  try {
    const user = await User.findById('6699b4520dcff2ca9b685c46').select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, getProfile };
