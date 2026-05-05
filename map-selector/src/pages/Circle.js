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
  const [deleteDialog, setDeleteDialog] = useState({ open: false, circle: null });

  const fetchCircles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/circles`, {
        params: { page, limit: 20, search }
      });
      setCircles(response.data.circles || []);
      setTotalPages(response.data.totalPages || 1);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching circles:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCircles();
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
    } catch (error) {
      console.error('Error deleting circle:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>Circles</Typography>
            <Typography variant="body1" color="text.secondary">
              {total} circles created by grouping wards.
            </Typography>
          </Box>
          {(user?.role === 'root' || user?.role === 'admin') && (
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/circle-management')}
            >
              Create Circle
            </Button>
          )}
        </Box>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by Circle Name or Number..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                    No circles found. Use "Create Circle" to group wards into circles.
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

        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" />
          </Box>
        )}
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
