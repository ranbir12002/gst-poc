import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
    Container, Grid, Paper, Typography, List, ListItem, ListItemText, 
    Button, TextField, Box, Divider, Alert, CircularProgress,
    IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LayersIcon from '@mui/icons-material/Layers';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';

const OSM_STYLE = {
    version: 8,
    sources: {
        'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
        },
    },
    layers: [
        {
            id: 'osm',
            type: 'raster',
            source: 'osm',
        },
    ],
};

const CircleManagement = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [wards, setWards] = useState([]);
    const [selectedWardIds, setSelectedWardIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Form states
    const [circleName, setCircleName] = useState('');
    const [circleNo, setCircleNo] = useState('');
    const [zoneName, setZoneName] = useState('');

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchWards();
    }, []);

    const fetchWards = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards`);
            setWards(response.data.wards || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching wards:', err);
            setError('Failed to load wards. Please check if the backend is running.');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!loading && wards.length > 0 && mapContainerRef.current && !mapRef.current) {
            initializeMap();
        }
    }, [loading, wards]);

    const initializeMap = () => {
        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: OSM_STYLE,
            center: [78.4867, 17.3850],
            zoom: 11,
            antialias: true
        });

        mapRef.current = map;

        map.on('load', () => {
            // Add wards source
            map.addSource('wards', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: wards.map(ward => ({
                        type: 'Feature',
                        id: ward.WARD_NO, // Use numeric ID for feature-state
                        geometry: ward.geometry,
                        properties: {
                            mongodbId: ward._id,
                            name: ward.NAME,
                            ward_no: ward.WARD_NO,
                            circle_no: ward.CIRCLE_NO,
                            circle_name: ward.circle?.CIR_NAM_NU || ward.CIR_NAM_NU || 'N/A'
                        }
                    }))
                }
            });

            // Layer for ward fills
            map.addLayer({
                id: 'wards-fill',
                type: 'fill',
                source: 'wards',
                paint: {
                    'fill-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        '#ff9800', // Selected color (Orange)
                        '#2196f3'  // Default color (Blue)
                    ],
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        0.6,
                        0.2
                    ]
                }
            });

            // Layer for ward outlines
            map.addLayer({
                id: 'wards-outline',
                type: 'line',
                source: 'wards',
                paint: {
                    'line-color': '#0d47a1',
                    'line-width': 1
                }
            });

            // Layer for ward labels (Names)
            map.addLayer({
                id: 'wards-labels',
                type: 'symbol',
                source: 'wards',
                layout: {
                    'text-field': ['get', 'name'],
                    'text-size': 10,
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-radial-offset': 0.5,
                    'text-justify': 'auto',
                    'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                    'text-allow-overlap': false,
                    'text-padding': 2
                },
                paint: {
                    'text-color': '#0d47a1',
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 1.5
                }
            });


            // Click handler for selection
            map.on('click', 'wards-fill', (e) => {
                const featureId = e.features[0].id;
                toggleWardSelection(featureId);
            });

            // Hover effect
            map.on('mouseenter', 'wards-fill', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'wards-fill', () => {
                map.getCanvas().style.cursor = '';
            });

            // Fit bounds to all wards
            const bounds = new maplibregl.LngLatBounds();
            wards.forEach(ward => {
                if (ward.geometry && ward.geometry.coordinates) {
                    const coords = ward.geometry.type === 'MultiPolygon' 
                        ? ward.geometry.coordinates.flat(2) 
                        : ward.geometry.coordinates.flat(1);
                    coords.forEach(coord => bounds.extend(coord));
                }
            });
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: 50 });
            }
        });
    };

    const toggleWardSelection = (wardNo) => {
        const ward = wards.find(w => w.WARD_NO === wardNo);
        if (!ward) return;

        const wardId = ward._id;
        setSelectedWardIds(prev => {
            const next = new Set(prev);
            const isSelected = next.has(wardId);
            
            if (isSelected) {
                next.delete(wardId);
                mapRef.current.setFeatureState({ source: 'wards', id: wardNo }, { selected: false });
            } else {
                next.add(wardId);
                mapRef.current.setFeatureState({ source: 'wards', id: wardNo }, { selected: true });
            }
            return next;
        });
    };

    const handleClearSelection = () => {
        wards.forEach(ward => {
            mapRef.current.setFeatureState({ source: 'wards', id: ward.WARD_NO }, { selected: false });
        });
        setSelectedWardIds(new Set());
    };

    const handleCreateCircle = async () => {
        if (selectedWardIds.size === 0) {
            setError('Please select at least one ward.');
            return;
        }
        if (!circleName || !circleNo) {
            setError('Please provide Circle Name and Number.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            
            const payload = {
                wardIds: Array.from(selectedWardIds),
                circleName,
                circleNo: parseInt(circleNo),
                zoneName
            };

            const response = await axios.post(`${GEOJSON_BACKEND_URL}/api/v2/circles/assign-wards`, payload);
            
            setSuccess(`Successfully created Circle: ${response.data.circle.CIR_NAM_NU}`);
            setCircleName('');
            setCircleNo('');
            setZoneName('');
            handleClearSelection();
            fetchWards(); // Refresh wards to show updated circle assignments
        } catch (err) {
            console.error('Error creating circle:', err);
            setError(err.response?.data?.error || 'Failed to create circle.');
        } finally {
            setSaving(false);
        }
    };

    const selectedWardsList = wards.filter(w => selectedWardIds.has(w._id));

    return (
        <Container maxWidth={false} sx={{ py: 3, height: 'calc(100vh - 64px)' }}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
                {/* Left Side: Map Selection */}
                <Grid item xs={12} md={8} sx={{ height: '100%' }}>
                    <Paper elevation={3} sx={{ height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
                        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1, backgroundColor: 'rgba(255,255,255,0.9)', p: 1, borderRadius: 1, boxShadow: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold">Visual Ward Selector</Typography>
                            <Typography variant="caption" color="textSecondary">Click on polygons to group wards</Typography>
                        </Box>
                        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
                        {loading && (
                            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 2 }}>
                                <CircularProgress />
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {/* Right Side: Configuration & Selection List */}
                <Grid item xs={12} md={4} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LayersIcon color="primary" /> Circle Builder
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                            Selected wards will be combined into a single administrative circle.
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

                        <Box component="form" sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={8}>
                                    <TextField 
                                        fullWidth 
                                        label="Circle Name" 
                                        variant="outlined" 
                                        size="small"
                                        value={circleName}
                                        onChange={(e) => setCircleName(e.target.value)}
                                        placeholder="e.g. Hyderabad South"
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField 
                                        fullWidth 
                                        label="Circle No" 
                                        variant="outlined" 
                                        size="small"
                                        type="number"
                                        value={circleNo}
                                        onChange={(e) => setCircleNo(e.target.value)}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField 
                                        fullWidth 
                                        label="Zone Name (Optional)" 
                                        variant="outlined" 
                                        size="small"
                                        value={zoneName}
                                        onChange={(e) => setZoneName(e.target.value)}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        <Divider sx={{ mb: 2 }}>
                            <Typography variant="overline" color="textSecondary">Ward Search & Selection ({selectedWardIds.size})</Typography>
                        </Divider>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search ward by name or number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            <List dense>
                                {selectedWardsList.length === 0 && !searchTerm ? (
                                    <ListItem>
                                        <ListItemText primary="No wards selected" secondary="Click on the map or search to select" />
                                    </ListItem>
                                ) : (
                                    // Show selected wards first, then searched wards if they are not selected
                                    <>
                                        {selectedWardsList.map(ward => (
                                            <ListItem 
                                                key={ward._id}
                                                sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}
                                                secondaryAction={
                                                    <IconButton edge="end" size="small" onClick={() => toggleWardSelection(ward.WARD_NO)}>
                                                        <DeleteIcon fontSize="inherit" />
                                                    </IconButton>
                                                }
                                            >
                                                <ListItemText 
                                                    primary={`Ward ${ward.WARD_NO}: ${ward.NAME}`} 
                                                    secondary={`Current Circle: ${ward.circle?.CIR_NAM_NU || 'None'}`}
                                                />
                                            </ListItem>
                                        ))}
                                        {searchTerm && wards
                                            .filter(w => !selectedWardIds.has(w._id) && 
                                                (w.NAME.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                                 w.WARD_NO.toString().includes(searchTerm)))
                                            .slice(0, 10) // Limit results
                                            .map(ward => (
                                                <ListItem 
                                                    key={ward._id}
                                                    button
                                                    onClick={() => toggleWardSelection(ward.WARD_NO)}
                                                >
                                                    <ListItemText 
                                                        primary={`Ward ${ward.WARD_NO}: ${ward.NAME}`} 
                                                        secondary="Click to select"
                                                    />
                                                </ListItem>
                                            ))
                                        }
                                    </>
                                )}
                            </List>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                fullWidth 
                                variant="outlined" 
                                color="inherit" 
                                onClick={handleClearSelection}
                                disabled={selectedWardIds.size === 0 || saving}
                            >
                                Clear Selection
                            </Button>
                            <Button 
                                fullWidth 
                                variant="contained" 
                                color="primary" 
                                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                onClick={handleCreateCircle}
                                disabled={selectedWardIds.size === 0 || !circleName || !circleNo || saving}
                            >
                                Group Into Circle
                            </Button>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default CircleManagement;
