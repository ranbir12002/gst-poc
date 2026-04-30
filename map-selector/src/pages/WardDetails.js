import React, { useState, useEffect } from 'react';
import { Container, Grid, Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button, CircularProgress } from '@mui/material';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';
import MapComponent from './MapComponent';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import MapIcon from '@mui/icons-material/Map';
import * as XLSX from 'xlsx';

const WardDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [ward, setWard] = useState(location.state?.ward || null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(!ward);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  useEffect(() => {
    if (!ward) {
      fetchWard();
    } else {
      fetchBusinesses();
    }
  }, [id, ward]);

  const fetchWard = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards/${id}`);
      setWard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ward:', error);
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      setLoadingBusinesses(true);
      console.log(`WardDetails: Fetching businesses for ward ID: ${id}`);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards/${id}/businesses?limit=1000`);
      console.log('WardDetails API Response:', response.data);
      setBusinesses(response.data.businesses || []);
      setLoadingBusinesses(false);
    } catch (error) {
      console.error('WardDetails: Error fetching businesses:', error);
      setLoadingBusinesses(false);
    }
  };


  const handleExport = () => {
    if (businesses.length === 0) return;
    
    const data = businesses.map(b => ({
      'Trade Name': b.name,
      'GSTIN': b.gstin,
      'Address': `${b.flatNo || ''} ${b.buildingName || ''} ${b.street || ''} ${b.neighborhood || ''}`.trim(),
      'Pincode': b.pincode,
      'Latitude': b.latitude,
      'Longitude': b.longitude
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Businesses');
    XLSX.writeFile(wb, `Ward_${ward.WARD_NO}_Businesses.xlsx`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!ward) {
    return <Typography variant="h6" sx={{ p: 4 }}>Ward not found.</Typography>;
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, height: 'calc(100vh - 64px)' }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/wards')}
        sx={{ mb: 2 }}
      >
        Back to Wards
      </Button>

      <Grid container spacing={3} sx={{ height: 'calc(100% - 48px)' }}>
        {/* Left Side: Info & List */}
        <Grid item xs={12} md={5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Ward {ward.WARD_NO}: {ward.NAME}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip 
                icon={<MapIcon />} 
                label={`Circle: ${ward.circle?.CIR_NAM_NU || ward.CIR_NAM_NU || 'N/A'}`} 
                color="primary" 
                variant="outlined" 
              />
              <Chip 
                icon={<BusinessIcon />} 
                label={`${ward.business_count || businesses.length} Businesses`} 
                color="secondary" 
                variant="outlined" 
              />
            </Box>
            <Typography variant="body2" color="textSecondary">
              Zone: {ward.Zone_Name || 'N/A'} | AC: {ward.AC_Name || 'N/A'}
            </Typography>
          </Paper>

          <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <Typography variant="h6">Businesses in Ward</Typography>
              <Button size="small" variant="contained" onClick={handleExport} disabled={businesses.length === 0}>
                Export Excel
              </Button>
            </Box>
            
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Trade Name</strong></TableCell>
                    <TableCell><strong>GSTIN</strong></TableCell>
                    <TableCell><strong>Area</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loadingBusinesses ? (
                    <TableRow><TableCell colSpan={3} align="center"><CircularProgress size={20} sx={{ mt: 2 }} /></TableCell></TableRow>
                  ) : businesses.length === 0 ? (
                    <TableRow><TableCell colSpan={3} align="center">No businesses found in this ward.</TableCell></TableRow>
                  ) : (
                    businesses.map((biz) => (
                      <TableRow key={biz._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{biz.name}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{biz.gstin}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{biz.neighborhood || biz.street || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right Side: Map */}
        <Grid item xs={12} md={7} sx={{ height: '100%' }}>
          <Paper elevation={3} sx={{ height: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
            <MapComponent 
              wards={[ward]} 
              businesses={businesses}
              setBusinesses={setBusinesses} 
              setBusinessInfo={() => {}} 
              setSelectedFeature={() => {}} 
              setFeatures={() => {}}
            />

          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default WardDetails;
