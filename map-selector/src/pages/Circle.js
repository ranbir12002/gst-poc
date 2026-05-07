import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, Pagination, CircularProgress, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { GEOJSON_BACKEND_URL } from '../config';

function Circles() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalBusinesses, setTotalBusinesses] = useState(0);
  const [integrityStatus, setIntegrityStatus] = useState({ isValid: true, overlapCount: 0 });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, circle: null });

  const fetchIntegrity = async () => {
    try {
        const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/circles/check-overlaps`);
        setIntegrityStatus(response.data);
    } catch (error) {
        console.error('Error checking integrity:', error);
    }
  };

  const fetchCircles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/circles`, {
        params: { limit: 1000, search } // High limit to get all matching circles
      });
      setCircles(response.data.circles || []);
      setTotal(response.data.total || 0);
      
      // Calculate total businesses in frontend
      const bizSum = (response.data.circles || []).reduce((sum, c) => sum + (c.business_count || 0), 0);
      setTotalBusinesses(bizSum);
      
    } catch (error) {
      console.error('Error fetching circles:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCircles();
    fetchIntegrity();
  }, [fetchCircles]);

  const handleViewCircle = (circle) => {
    navigate(`/circles/${circle._id}`, { state: { circle } });
  };

  const handleDeleteCircle = async () => {
    if (!deleteDialog.circle) return;
    try {
      await axios.delete(`${GEOJSON_BACKEND_URL}/api/v2/circles/${deleteDialog.circle._id}`);
      setDeleteDialog({ open: false, circle: null });
      fetchCircles();
      fetchIntegrity();
    } catch (error) {
      console.error('Error deleting circle:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ mb: 1, width: '100%' }}>
                <Typography variant="h4" gutterBottom>Circles</Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                        <Typography variant="h6">{circles.length}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {search ? 'Matching Circles' : 'Total Circles'}
                        </Typography>
                    </Paper>
                    <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                        <Typography variant="h6" color="primary">
                            {totalBusinesses.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {search ? 'Filtered Businesses' : 'Total Businesses'}
                        </Typography>
                    </Paper>
                    <Paper sx={{ 
                        p: 2, 
                        flex: 1, 
                        textAlign: 'center', 
                        backgroundColor: integrityStatus.isValid ? '#e8f5e9' : '#ffebee',
                        border: integrityStatus.isValid ? 'none' : '1px solid #f44336'
                    }}>
                        <Typography variant="h6" color={integrityStatus.isValid ? 'success.main' : 'error.main'}>
                            {integrityStatus.isValid ? '100%' : `${integrityStatus.overlapCount} Overlaps`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {integrityStatus.isValid ? 'Data Integrity' : 'Overlap Detected'}
                        </Typography>
                    </Paper>
                </Box>
            </Box>
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Circle Name or Number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); }}
          sx={{ mb: 3, backgroundColor: 'white' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Circle No</strong></TableCell>
                <TableCell><strong>Circle Name</strong></TableCell>
                <TableCell align="center"><strong>Wards</strong></TableCell>
                <TableCell align="center"><strong>Businesses</strong></TableCell>
                <TableCell align="right"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : circles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    No circles found.
                  </TableCell>
                </TableRow>
              ) : (
                circles.map((circle) => (
                  <TableRow key={circle._id} hover>
                    <TableCell>{circle.CIRCLE_NO || '—'}</TableCell>
                    <TableCell>{circle.CIR_NAM_NU || circle.name || '—'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', maxWidth: 200, mx: 'auto' }}>
                        {circle.ward_numbers && circle.ward_numbers.length > 0 ? (
                          circle.ward_numbers.slice(0, 5).map(no => (
                            <Chip key={no} label={no} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">None</Typography>
                        )}
                        {circle.ward_numbers && circle.ward_numbers.length > 5 && (
                          <Chip label={`+${circle.ward_numbers.length - 5}`} size="small" sx={{ fontSize: '0.7rem' }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={circle.business_count || 0} color="secondary" size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => handleViewCircle(circle)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {(user?.role === 'root' || user?.role === 'admin') && (
                        <Tooltip title="Delete Circle">
                          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, circle })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, circle: null })}>
        <DialogTitle>Delete Circle?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete circle "{deleteDialog.circle?.CIR_NAM_NU || deleteDialog.circle?.name}" and
            unassign its {deleteDialog.circle?.ward_count || 0} wards. The wards themselves will NOT be deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, circle: null })}>Cancel</Button>
          <Button onClick={handleDeleteCircle} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Circles;
