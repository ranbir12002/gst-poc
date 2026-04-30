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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

