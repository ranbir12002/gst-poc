import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Pagination, CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';
import { decryptData } from '../utils/encryption';

const PAGE_SIZE = 100;

function Rural() {
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/businesses/rural`, {
        params: { page, limit: PAGE_SIZE, search: searchTerm || undefined }
      });
      setBusinesses(decryptData(response.data.businesses) || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching rural businesses:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const getAddress = (biz) => {
    const parts = [biz.flatNo, biz.buildingName, biz.buildingNo, biz.street, biz.neighborhood];
    return parts.filter(Boolean).join(', ') || '—';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Rural Businesses</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Businesses outside GHMC ward boundaries (Division/Circle/Ward = "Rural" in the source data).
          Does not include special zones like BHEL or GMR Airport, which fall under a real division/circle.
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 2, display: 'inline-block', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6">{total.toLocaleString()}</Typography>
            <Typography variant="caption" color="text.secondary">
              {searchTerm ? 'Matching Businesses' : 'Total Rural Businesses'}
            </Typography>
          </Paper>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Trade Name, GSTIN or District..."
          value={searchTerm}
          onChange={(e) => { setPage(1); setSearchTerm(e.target.value); }}
          sx={{ mb: 3, backgroundColor: 'white' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer component={Paper} sx={{ maxHeight: '65vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Trade Name</strong></TableCell>
                <TableCell><strong>GSTIN</strong></TableCell>
                <TableCell><strong>Address</strong></TableCell>
                <TableCell><strong>District</strong></TableCell>
                <TableCell><strong>Pincode</strong></TableCell>
                <TableCell><strong>Lat/Lng</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : businesses.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No rural businesses found.</TableCell></TableRow>
              ) : (
                businesses.map((biz) => (
                  <TableRow key={biz._id} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.gstin}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{getAddress(biz)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.district || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.pincode || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {biz.latitude?.toFixed(4) || '—'}, {biz.longitude?.toFixed(4) || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default Rural;
