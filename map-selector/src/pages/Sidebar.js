import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';

const Sidebar = ({ features, businessInfo, selectedFeature, updateSelectedFeature, refreshMap, businesses, loadingBusinesses, circle }) => {
  const [polygonName, setPolygonName] = useState(circle?.name || '');
  const [polygonRegionName, setPolygonRegionName] = useState(circle?.region?.name);
  const [address, setAddress] = useState('');
  const [entityType, setEntityType] = useState('Circle');

  useEffect(() => {
    if (selectedFeature) {
      setPolygonName(selectedFeature.properties.name || '');
      setPolygonRegionName(selectedFeature.properties.regionName || circle?.region?.name || '');
      setEntityType(selectedFeature.properties.type === 'ward' ? 'Ward' : 'Circle');
    }
  }, [selectedFeature, circle]);

  useEffect(() => {
    if (businessInfo) {
      const {
        buildingNo = '',
        flatNo = '',
        street = '',
        neighborhood = '',
        district = '',
        pincode = '',
        stateCode = ''
      } = businessInfo;
      const addressParts = [
        buildingNo,
        flatNo,
        street,
        neighborhood,
        district,
        pincode,
        stateCode
      ];

      // Filter out empty parts and join the non-empty parts with a comma
      const address = addressParts.filter(part => part).join(', ');
      setAddress(address);
    }
  }, [businessInfo]);

  const getAddress = (business) => {
    if (business) {
      const {
        buildingName = '',
        flatNo = '',
        street = '',
        neighborhood = '',
        district = '',
        pincode = '',
        stateCode = ''
      } = business;
      const addressParts = [
        buildingName,
        flatNo,
        street,
        neighborhood,
        district,
        pincode,
        stateCode
      ];
      // Filter out empty parts and join the non-empty parts with a comma
      return addressParts.filter(part => part).join(', ');
    }
  };


  const handleNameChange = (e) => {
    const newName = e.target.value;
    setPolygonName(newName);
    console.log("selectedFeature sidebar", selectedFeature)
    updateSelectedFeature({ ...selectedFeature, properties: { ...selectedFeature?.properties, name: newName } });
  };

  const handleRegionNameChange = (e) => {
    const newRegionName = e.target.value;
    setPolygonRegionName(newRegionName);
    updateSelectedFeature({ ...selectedFeature, properties: { ...selectedFeature?.properties, regionName: newRegionName } });
  };

  const handleSave = async () => {
    const updatedFeature = {
      ...selectedFeature,
      properties: {
        ...selectedFeature?.properties,
        name: polygonName,
        regionName: polygonRegionName,
      },
    };

    try {
      const response = await axios.post(`${GEOJSON_BACKEND_URL}/save`, updatedFeature);
      console.log('Saved:', response.data);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleUpdate = async () => {
    const updatedFeature = {
      ...selectedFeature,
      properties: {
        ...selectedFeature.properties,
        name: polygonName,
        regionName: polygonRegionName,
      },
    };

    try {
      const response = await axios.put(`${GEOJSON_BACKEND_URL}/update/${selectedFeature.properties._id}`, updatedFeature);
      console.log('Updated:', response.data);
      refreshMap(); // Call refreshMap to re-render the map
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };


  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6" gutterBottom>{entityType} Information</Typography>
      <TextField
        label={`${entityType} Name`}
        value={polygonName}
        onChange={handleNameChange}
        fullWidth
        margin="normal"
        disabled={entityType !== 'Polygon'}
      />
      <Box sx={{ display: 'flex', gap: 1, marginY: 2 }}>
        {entityType === 'Polygon' && (
          <>
            <Button variant="contained" color="primary" onClick={handleSave}>Save</Button>
            <Button variant="contained" color="secondary" onClick={handleUpdate} disabled={!selectedFeature}>Update</Button>
          </>
        )}
      </Box>

      {businessInfo && (
        <Box sx={{ marginY: 2 }}>
          <Typography variant="h6">Business Information</Typography>
          <Typography><strong>Name:</strong> {businessInfo.name}</Typography>
          <Typography><strong>Address:</strong> {address}</Typography>
          <Typography><strong>Latitude:</strong> {businessInfo?.location?.coordinates[1]}</Typography>
          <Typography><strong>Longitude:</strong> {businessInfo?.location?.coordinates[0]}</Typography>
        </Box>
      )}
      {(businesses.length > 0 || loadingBusinesses) && (
        <TableContainer component={Paper} sx={{ marginY: 2, maxHeight: '500px' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Trade Name</TableCell>
                <TableCell>GSTIN</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Pincode</TableCell>
                <TableCell>Lat/Lng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingBusinesses ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" sx={{ mt: 2 }}>Loading businesses...</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{business.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{business.gstin}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{getAddress(business)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{business.pincode}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {business.latitude?.toFixed(4)}, {business.longitude?.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Sidebar;
