const express = require('express');
const connectDB = require('./config/db');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
connectDB();

app.use(cors())
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit from geojson-backend

console.log('server file')
console.log('reached server')

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/regions', require('./routes/regions'));
app.use('/api/circles', require('./routes/circles'));

// Mount migrated geojson-backend routes
app.use('/', require('./routes/v2'));

const PORT = process.env.PORT || 5000;

// Serve static assets in production
const path = require('path');
// Check if we are in production or if the build folder exists
if (process.env.NODE_ENV === 'production') {
  // Serve the static files from the React app build folder
  app.use(express.static(path.join(__dirname, '../map-selector/build')));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../map-selector', 'build', 'index.html'));
  });
} else {
  // Basic health check for dev
  app.get('/', (req, res) => {
    res.send('GST POC Backend API is running...');
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


