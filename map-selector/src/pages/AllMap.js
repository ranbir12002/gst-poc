import React, { useRef, useEffect, useState, useContext } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import axios from 'axios';
import { 
  Container, Grid, Box, Paper, Typography, TextField, 
  FormControlLabel, Switch, RadioGroup, Radio, FormControl, FormLabel,
  List, ListItem, ListItemText, CircularProgress, Alert,
  MenuItem, Select, InputLabel
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CategoryIcon from '@mui/icons-material/Category';
import LayersIcon from '@mui/icons-material/Layers';
import FilterListIcon from '@mui/icons-material/FilterList';
import { UserContext } from '../context/UserContext';
import { GEOJSON_BACKEND_URL } from '../config';

const OSM_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

// Stable color generator based on CIRCLE_NO (Golden Angle method)
function getCircleColor(circleNo) {
  if (!circleNo) return '#9e9e9e';
  const hue = (circleNo * 137.5) % 360;
  return `hsl(${hue}, 75%, 50%)`;
}

// Stable color for divisions
function getDivisionColor(divisionName, divisionList) {
  const idx = divisionList.findIndex(d => d.name === divisionName);
  if (idx === -1) return '#9e9e9e';
  const hue = (idx * 30) % 360; // 30° spacing for ~12 divisions
  return `hsl(${hue}, 70%, 45%)`;
}

function AllMap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const { user } = useContext(UserContext);
  
  const [allPolygons, setAllPolygons] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Controls
  const [colorMode, setColorMode] = useState('circle'); // 'circle', 'type', or 'division'
  const [showLabels, setShowLabels] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('all'); // 'all' or division name
  
  // Fetch polygons and divisions on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wardsRes, divisionsRes] = await Promise.all([
        axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards`),
        axios.get(`${GEOJSON_BACKEND_URL}/api/v2/divisions`)
      ]);
      setAllPolygons(wardsRes.data.wards || []);
      setDivisions(divisionsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch map data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  // Build a lookup: circleName -> divisionName from divisions data
  const circleToDivisionMap = {};
  divisions.forEach(div => {
    (div.circle_names || []).forEach(cName => {
      circleToDivisionMap[cName.toLowerCase()] = div.name;
    });
  });

  // Get the division name for a ward polygon
  const getDivisionForWard = (ward) => {
    // Check circle's populated division_name first
    if (ward.circle?.division_name) return ward.circle.division_name;
    // Fallback: look up by circle name
    const circleName = ward.circle?.name || ward.CIR_NAM_NU?.split('-').slice(1).join('-').trim();
    if (circleName) {
      return circleToDivisionMap[circleName.toLowerCase()] || null;
    }
    return null;
  };

  // Filter polygons by selected division
  const visiblePolygons = selectedDivision === 'all'
    ? allPolygons
    : allPolygons.filter(ward => {
        const divName = getDivisionForWard(ward);
        return divName === selectedDivision;
      });

  // Convert polygons to GeoJSON helper
  const getGeoJSONData = () => {
    return {
      type: 'FeatureCollection',
      features: visiblePolygons
        .filter(w => w.geometry && w.geometry.coordinates)
        .map(ward => {
          const isCircle = ward.WARD_NO >= 304;
          const divName = getDivisionForWard(ward) || 'N/A';
          let fillColor = '#9e9e9e';
          
          if (colorMode === 'type') {
            fillColor = isCircle ? '#e91e63' : '#2196f3';
          } else if (colorMode === 'division') {
            fillColor = getDivisionColor(divName, divisions);
          } else {
            fillColor = getCircleColor(ward.CIRCLE_NO);
          }

          return {
            type: 'Feature',
            id: ward.WARD_NO,
            geometry: ward.geometry,
            properties: {
              wardId: ward._id,
              name: ward.NAME,
              ward_no: ward.WARD_NO,
              isCircle,
              circle_name: ward.CIR_NAM_NU || (ward.circle?.CIR_NAM_NU) || 'N/A',
              circle_no: ward.CIRCLE_NO || 'N/A',
              division_name: divName,
              zone: ward.Zone_Name || 'N/A',
              ac: ward.AC_Name || 'N/A',
              corporate: ward.CORPORATE || 'N/A',
              area: ward.Area__Sqkm || 0,
              business_count: ward.business_count || 0,
              fillColor
            }
          };
        })
    };
  };

  // Initialize Map
  useEffect(() => {
    if (loading || allPolygons.length === 0 || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_STYLE,
      center: [78.4867, 17.3850],
      zoom: 11,
      antialias: true
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', () => {
      map.addSource('polygons', {
        type: 'geojson',
        data: getGeoJSONData(),
        generateId: false
      });

      // Fill Layer
      map.addLayer({
        id: 'polygons-fill',
        type: 'fill',
        source: 'polygons',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.55,
            0.35
          ]
        }
      });

      // Outline Layer
      map.addLayer({
        id: 'polygons-outline',
        type: 'line',
        source: 'polygons',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#000000',
            '#3f51b5'
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.5,
            1.2
          ]
        }
      });

      // Labels Layer
      map.addLayer({
        id: 'polygons-label',
        type: 'symbol',
        source: 'polygons',
        layout: {
          'text-field': ['get', 'ward_no'],
          'text-size': 10,
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'visibility': showLabels ? 'visible' : 'none'
        },
        paint: {
          'text-color': '#1a237e',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5
        }
      });

      // Hover Effect
      let hoveredId = null;
      map.on('mousemove', 'polygons-fill', (e) => {
        if (e.features.length > 0) {
          if (hoveredId !== null) {
            map.setFeatureState({ source: 'polygons', id: hoveredId }, { hover: false });
          }
          hoveredId = e.features[0].properties.ward_no;
          map.setFeatureState({ source: 'polygons', id: hoveredId }, { hover: true });
          map.getCanvas().style.cursor = 'pointer';
        }
      });

      map.on('mouseleave', 'polygons-fill', () => {
        if (hoveredId !== null) {
          map.setFeatureState({ source: 'polygons', id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        map.getCanvas().style.cursor = '';
      });

      // Click Handler for Popups
      map.on('click', 'polygons-fill', (e) => {
        if (e.features.length > 0) {
          const props = e.features[0].properties;
          const entityType = props.isCircle ? 'Standalone Circle' : 'Ward';
          const popupContent = `
            <div style="font-family: sans-serif; padding: 6px; min-width: 200px; font-size: 13px;">
              <div style="font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; color: #1a237e;">
                ${entityType}: ${props.name}
              </div>
              <strong>Ward/Circle No:</strong> ${props.ward_no}<br/>
              <strong>Parent Circle:</strong> ${props.circle_name}<br/>
              <strong>CT Division:</strong> ${props.division_name}<br/>
              <strong>Zone:</strong> ${props.zone}<br/>
              <strong>AC Name:</strong> ${props.ac}<br/>
              <strong>Corporate:</strong> ${props.corporate}<br/>
              <strong>Area:</strong> ${parseFloat(props.area).toFixed(3)} sq km<br/>
              <strong>Businesses:</strong> ${props.business_count || 0}
            </div>
          `;

          new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(popupContent)
            .addTo(map);
        }
      });

      // Fit bounds initially
      fitMapBounds(visiblePolygons);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading]);

  // Sync data changes (colorMode, division filter, allPolygons) to the map source
  useEffect(() => {
    if (mapRef.current && mapRef.current.getSource('polygons')) {
      mapRef.current.getSource('polygons').setData(getGeoJSONData());
    }
  }, [colorMode, allPolygons, selectedDivision, divisions]);

  // Fit bounds when division filter changes
  useEffect(() => {
    if (mapRef.current && visiblePolygons.length > 0) {
      fitMapBounds(visiblePolygons);
    }
  }, [selectedDivision]);

  // Sync Label Visibility
  useEffect(() => {
    if (mapRef.current && mapRef.current.getLayer('polygons-label')) {
      mapRef.current.setLayoutProperty(
        'polygons-label',
        'visibility',
        showLabels ? 'visible' : 'none'
      );
    }
  }, [showLabels]);

  // Fit bounds to given polygon list
  const fitMapBounds = (polygons) => {
    if (!mapRef.current || polygons.length === 0) return;
    const bounds = new maplibregl.LngLatBounds();
    polygons.forEach(ward => {
      if (ward.geometry && ward.geometry.coordinates) {
        const coords = ward.geometry.type === 'MultiPolygon'
          ? ward.geometry.coordinates.flat(2)
          : ward.geometry.coordinates.flat(1);
        coords.forEach(coord => bounds.extend(coord));
      }
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 40 });
    }
  };

  // Handle Search and zoom
  const handleSearchResultClick = (poly) => {
    if (!mapRef.current || !poly.geometry) return;
    
    const bounds = new maplibregl.LngLatBounds();
    const coords = poly.geometry.type === 'MultiPolygon'
      ? poly.geometry.coordinates.flat(2)
      : poly.geometry.coordinates.flat(1);
    
    coords.forEach(coord => bounds.extend(coord));
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    
    mapRef.current.setFeatureState({ source: 'polygons', id: poly.WARD_NO }, { hover: true });
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setFeatureState({ source: 'polygons', id: poly.WARD_NO }, { hover: false });
      }
    }, 3000);
  };

  const filteredPolygonsForSearch = visiblePolygons.filter(poly => 
    poly.NAME?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    poly.WARD_NO?.toString().includes(searchTerm)
  );

  const wardCount = visiblePolygons.filter(w => w.WARD_NO <= 303).length;
  const standaloneCircleCount = visiblePolygons.filter(w => w.WARD_NO >= 304).length;

  return (
    <Container maxWidth={false} disableGutters sx={{ height: 'calc(100vh - 64px)' }}>
      <Grid container sx={{ height: '100%' }}>
        
        {/* Sidebar Controls */}
        <Grid item xs={12} md={3} sx={{ height: '100%', overflowY: 'auto', borderRight: '1px solid #ddd', bgcolor: '#fafafa' }}>
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            <div>
              <Typography variant="h5" fontWeight="bold" color="primary.main" gutterBottom>
                Unified Map View
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Interactive representation of administrative areas and standalone circles.
              </Typography>
            </div>

            {error && <Alert severity="error">{error}</Alert>}

            {/* Division Filter */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <FormControl fullWidth size="small">
                <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <FilterListIcon fontSize="small" color="primary" /> Filter by CT Division
                </Typography>
                <Select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  displayEmpty
                  sx={{ bgcolor: '#fff' }}
                >
                  <MenuItem value="all">
                    <em>All Divisions ({allPolygons.length} polygons)</em>
                  </MenuItem>
                  {divisions.map((div) => (
                    <MenuItem key={div._id} value={div.name}>
                      {div.name} ({div.circle_names?.length || 0} circles)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Color Grouping Mode */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                  <CategoryIcon fontSize="small" color="primary" /> Color Grouping
                </FormLabel>
                <RadioGroup
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value)}
                >
                  <FormControlLabel 
                    value="circle" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">By Circle</Typography>} 
                  />
                  <FormControlLabel 
                    value="division" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">By Division</Typography>} 
                  />
                  <FormControlLabel 
                    value="type" 
                    control={<Radio size="small" />} 
                    label={<Typography variant="body2">Wards vs Circles</Typography>} 
                  />
                </RadioGroup>
              </FormControl>
            </Paper>

            {/* Map Options */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LayersIcon fontSize="small" color="primary" /> Map Options
              </Typography>
              <FormControlLabel
                control={
                  <Switch 
                    checked={showLabels} 
                    onChange={(e) => setShowLabels(e.target.checked)} 
                    color="primary" 
                    size="small"
                  />
                }
                label={<Typography variant="body2">Show Ward Numbers</Typography>}
              />
            </Paper>

            {/* Quick Stats */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, bgcolor: '#f1f8e9' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: 'success.dark' }}>
                {selectedDivision === 'all' ? 'Summary Statistics' : `${selectedDivision} Division`}
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Visible Polygons</Typography>
                  <Typography variant="body1" fontWeight="bold">{visiblePolygons.length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Wards</Typography>
                  <Typography variant="body1" fontWeight="bold" color="primary">{wardCount}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Divisions</Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.main">{divisions.length}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Standalone</Typography>
                  <Typography variant="body1" fontWeight="bold" color="secondary">{standaloneCircleCount}</Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Search Panel */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2, display: 'flex', flexDirection: 'column', maxHeight: '30vh', overflow: 'hidden' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SearchIcon fontSize="small" color="primary" /> Search & Locate
              </Typography>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Type name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
                {searchTerm ? (
                  <List dense disablePadding>
                    {filteredPolygonsForSearch.length === 0 ? (
                      <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'text.secondary' }}>No matches found</Typography>
                    ) : (
                      filteredPolygonsForSearch.slice(0, 15).map((poly) => (
                        <ListItem 
                          button 
                          key={poly._id} 
                          onClick={() => handleSearchResultClick(poly)}
                          sx={{ borderRadius: 1, mb: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <ListItemText 
                            primary={poly.NAME} 
                            secondary={`${poly.WARD_NO >= 304 ? 'Circle' : 'Ward'} No: ${poly.WARD_NO}`} 
                            primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 'medium' }}
                            secondaryTypographyProps={{ fontSize: '0.7rem' }}
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                ) : (
                  <Typography variant="caption" sx={{ p: 1, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                    Type above to search & zoom to an area
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Dynamic Legend */}
            <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5 }}>
                Legend
              </Typography>
              {colorMode === 'type' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#2196f3', opacity: 0.7, borderRadius: 1 }} />
                    <Typography variant="body2">Wards (1 - 303)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: '#e91e63', opacity: 0.7, borderRadius: 1 }} />
                    <Typography variant="body2">Standalone Circles (304 - 308)</Typography>
                  </Box>
                </Box>
              ) : colorMode === 'division' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: '25vh', overflowY: 'auto' }}>
                  {divisions.map((div) => (
                    <Box key={div._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 16, height: 16, minWidth: 16,
                        bgcolor: getDivisionColor(div.name, divisions), 
                        opacity: 0.8, borderRadius: 1 
                      }} />
                      <Typography variant="body2" noWrap sx={{ fontSize: '0.78rem' }}>
                        {div.name} ({div.circle_names?.length || 0})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 16, height: 16, background: 'linear-gradient(45deg, #f44336, #4caf50, #2196f3)', opacity: 0.7, borderRadius: 1 }} />
                    <Typography variant="body2">Wards colored by parent Circle</Typography>
                  </Box>
                </Box>
              )}
            </Paper>

          </Box>
        </Grid>

        {/* Map Panel */}
        <Grid item xs={12} md={9} sx={{ height: '100%', position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          {loading && (
            <Box sx={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.75)', zIndex: 10
            }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body1" fontWeight="medium">Loading polygon geometries...</Typography>
              </Box>
            </Box>
          )}
        </Grid>

      </Grid>
    </Container>
  );
}

export default AllMap;
