// API base URLs — set via environment variables in production (Render)
// Falls back to localhost for local development
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const GEOJSON_BACKEND_URL = process.env.REACT_APP_GEOJSON_URL || 'http://localhost:4000';

export { BACKEND_URL, GEOJSON_BACKEND_URL };
