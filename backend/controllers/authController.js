const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// const registerUser = async (req, res) => {
//   const { username, password, role } = req.body;
//   const userExists = await User.findOne({ username });

//   if (userExists) {
//     return res.status(400).json({ message: 'User already exists' });
//   }

//   const user = await User.create({ username, password, role });

//   if (user) {
//     res.status(201).json({
//       _id: user._id,
//       username: user.username,
//       role: user.role,
//       token: generateToken(user._id),
//     });
//   } else {
//     res.status(400).json({ message: 'Invalid user data' });
//   }
// };

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      username: user.username,
      role: user.role,
      region: user.region,
      circle: user.circle,
      token: generateToken(user._id),
    });
  } else {
    res.status(401).json({ message: 'Invalid username or password' });
  }
};

module.exports = { loginUser };
