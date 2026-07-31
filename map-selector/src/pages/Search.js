import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Paper, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Pagination, CircularProgress, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { GEOJSON_BACKEND_URL } from '../config';
import { decryptData } from '../utils/encryption';

const PAGE_SIZE = 50;

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [inputValue, setInputValue] = useState(q);
  const [businesses, setBusinesses] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!q) {
      setBusinesses([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/businesses/search`, {
        params: { q, page, limit: PAGE_SIZE }
      });
      setBusinesses(decryptData(response.data.businesses) || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error('Error searching businesses:', error);
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    setInputValue(q);
    setPage(1);
  }, [q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(inputValue.trim() ? { q: inputValue.trim() } : {});
  };

  const getAddress = (biz) => {
    const parts = [biz.flatNo, biz.buildingName, biz.buildingNo, biz.street, biz.neighborhood];
    return parts.filter(Boolean).join(', ') || '—';
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>Search Businesses</Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by Trade Name, GSTIN or District..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{ backgroundColor: 'white' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {q && (
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ p: 2, display: 'inline-block', textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6">{total.toLocaleString()}</Typography>
              <Typography variant="caption" color="text.secondary">
                Results for "{q}"
              </Typography>
            </Paper>
          </Box>
        )}

        <TableContainer component={Paper} sx={{ maxHeight: '65vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell><strong>Trade Name</strong></TableCell>
                <TableCell><strong>GSTIN</strong></TableCell>
                <TableCell><strong>Address</strong></TableCell>
                <TableCell><strong>Ward</strong></TableCell>
                <TableCell><strong>Circle</strong></TableCell>
                <TableCell><strong>Division</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!q ? (
                <TableRow><TableCell colSpan={6} align="center">Type something above to search.</TableCell></TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : businesses.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">No businesses found.</TableCell></TableRow>
              ) : (
                businesses.map((biz) => (
                  <TableRow key={biz._id} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.gstin}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{getAddress(biz)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      {biz.ward_name ? <Chip label={biz.ward_name} size="small" variant="outlined" /> : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.circle_name || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{biz.division_name || '—'}</TableCell>
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

export default Search;
