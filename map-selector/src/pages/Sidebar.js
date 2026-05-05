import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { GEOJSON_BACKEND_URL } from '../config';
import { Box, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const Sidebar = ({ features, businessInfo, selectedFeature, updateSelectedFeature, refreshMap, handleExportBusinesses, businesses, circle }) => {
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

  const handleExportAll = async () => {
    try {
      // Fetch all polygons
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/polygons`);
      const polygons = response.data;

      const allBusinesses = [];

      // Iterate over each polygon
      for (const polygon of polygons) {
        try {
          // Fetch businesses for the current polygon
          const response = await axios.post(`${GEOJSON_BACKEND_URL}/businesses`, {
            coordinates: polygon.geometry.coordinates[0],
          });
          const businesses = response.data;

          // Map businesses with the polygon name
          const businessesWithPolygonName = businesses.map(business => ({
            gstin: business.gstin,
            address: `${business.flatNo}, ${business.buildingNo}, ${business.street}, ${business.neighborhood}, ${business.district}, ${business.stateCode}, ${business.pincode}`,
            polygonName: polygon.properties.name || polygon.name,
          }));

          // Add to all businesses list
          allBusinesses.push(...businessesWithPolygonName);
        } catch (error) {
          console.error(`Error fetching businesses for polygon ${polygon.properties.name || polygon.name}:`, error);
        }
      }

      // Create Excel file from all businesses
      const ws = XLSX.utils.json_to_sheet(allBusinesses);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'All Businesses');
      XLSX.writeFile(wb, 'all_businesses.xlsx');
    } catch (error) {
      console.error('Error exporting all businesses:', error);
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
        {selectedFeature && (
          <Button variant="contained" color="warning" onClick={handleExportBusinesses}>
            Export {entityType} Businesses
          </Button>
        )}
      </Box>
      {/* <Button variant="contained" color="warning" onClick={handleExportAll} sx={{ marginBottom: 2 }}>Export All</Button> */}

      {businessInfo && (
        <Box sx={{ marginY: 2 }}>
          <Typography variant="h6">Business Information</Typography>
          <Typography><strong>Name:</strong> {businessInfo.name}</Typography>
          <Typography><strong>Address:</strong> {address}</Typography>
          <Typography><strong>Latitude:</strong> {businessInfo?.location?.coordinates[1]}</Typography>
          <Typography><strong>Longitude:</strong> {businessInfo?.location?.coordinates[0]}</Typography>
        </Box>
      )}
      {businesses.length > 0 && (
        <TableContainer component={Paper} sx={{ marginY: 2 }}>
          <Table>
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
              {businesses.map((business, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{business.name}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{business.gstin}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{getAddress(business)}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{business.pincode}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>
                    {business.latitude?.toFixed(4)}, {business.longitude?.toFixed(4)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Sidebar;
