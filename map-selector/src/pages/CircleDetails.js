import React, { useState, useEffect } from 'react';
import MapComponent from './MapComponent';
import Sidebar from './Sidebar';
import { Container, Grid, Box, Button } from '@mui/material';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';
import './CircleDetails.css';
import { decryptData } from '../utils/encryption';

const CircleDetails = () => {
  const location = useLocation();
  const { circle } = location.state;
  const [features, setFeatures] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [mapKey, setMapKey] = useState(0);
  const [businesses, setBusinesses] = useState([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedBusiness, setFocusedBusiness] = useState(null);

  useEffect(() => {
    const fetchWards = async () => {
      try {
        const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/circles/${circle._id}/wards`);
        setWards(response.data.wards);
      } catch (error) {
        console.error('Error fetching wards:', error);
      }
    };
    if (circle && circle._id) {
      fetchWards();
    }
  }, [circle]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoadingBusinesses(true);
        setBusinesses([]); // Clear old businesses before fetching new ones
        const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/circles/${circle._id}/businesses?limit=30000`);
        setBusinesses(decryptData(response.data.businesses));
      } catch (error) {
        console.error('Error fetching circle businesses:', error);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    if (circle && circle._id) {
      fetchBusinesses();
    }
  }, [circle]);



  const updateSelectedFeature = (updatedFeature) => {
    setSelectedFeature(updatedFeature);
    setFeatures((prevFeatures) =>
      // console.log("prevFeatures", prevFeatures)
      prevFeatures?.map((feature) =>
        feature.id === updatedFeature.id ? updatedFeature : feature
      )
    );
  };

  const refreshMap = () => {
    setMapKey((prevKey) => prevKey + 1); // Increment the key to re-render the map
  };


  return (
    <Container maxWidth={false} disableGutters>
      <Grid container style={{ height: '100vh' }}>
        <Grid item xs={3} style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          <Sidebar
            features={features}
            selectedFeature={selectedFeature}
            setFeatures={setFeatures}
            businessInfo={businessInfo}
            updateSelectedFeature={updateSelectedFeature}
            setBusinessInfo={setBusinessInfo}
            refreshMap={refreshMap}
            businesses={businesses}
            loadingBusinesses={loadingBusinesses}
            circle={circle}
            onSelectBusiness={setFocusedBusiness}
            focusedBusiness={focusedBusiness}
          />
        </Grid>
        <Grid item xs={9} style={{ height: 'calc(100vh - 64px)' }}>
          <Box style={{ height: '100%', position: 'relative' }}>
            <MapComponent
              key={mapKey}
              setFeatures={setFeatures}
              setSelectedFeature={setSelectedFeature}
              setBusinessInfo={setBusinessInfo}
              setBusinesses={setBusinesses}
              businesses={businesses}
              circle={circle} // Pass the circle data as a prop
              wards={wards} // Pass the wards belonging to this circle
              focusedBusiness={focusedBusiness}
            />

            <Button className={`sidebar-toggle ${sidebarOpen ? 'open' : 'close'}`} onClick={() => setSidebarOpen(prev => !prev)}>
              <i className={`fas ${sidebarOpen ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CircleDetails;
