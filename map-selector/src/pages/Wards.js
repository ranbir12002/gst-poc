import React, { useContext, useState, useEffect } from 'react';
import { Container, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, TextField, InputAdornment, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { GEOJSON_BACKEND_URL } from '../config';

import { useNavigate } from 'react-router-dom';

function Wards() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [wards, setWards] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWards();
    }, []);

    const fetchWards = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/wards`);
            setWards(response.data.wards || []);
        } catch (error) {
            console.error('Error fetching wards:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = (ward) => {
        navigate(`/wards/${ward._id}`, { state: { ward } });
    };

    const filteredWards = wards.filter(ward => 
        ward.NAME?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        ward.WARD_NO?.toString().includes(searchTerm) ||
        ward.circle?.CIR_NAM_NU?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ward.CIR_NAM_NU?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Container maxWidth="lg">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>City Wards</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    List of all 300 administrative wards and their parent circles.
                </Typography>
                <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                    <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
                        <Typography variant="h6">{filteredWards.length}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {searchTerm ? 'Matching Wards' : 'Total Wards'}
                        </Typography>
                    </Paper>
                    <Paper sx={{ p: 2, flex: 1, textAlign: 'center', backgroundColor: '#e3f2fd' }}>
                        <Typography variant="h6" color="primary">
                            {filteredWards.reduce((sum, w) => sum + (w.business_count || 0), 0).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {searchTerm ? 'Filtered Businesses' : 'Total Businesses'}
                        </Typography>
                    </Paper>
                </Box>

                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search by Ward Name, Number or Circle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
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
                                <TableCell><strong>Ward No</strong></TableCell>
                                <TableCell><strong>Ward Name</strong></TableCell>
                                <TableCell><strong>Parent Circle</strong></TableCell>
                                <TableCell><strong>Circle No</strong></TableCell>
                                <TableCell align="center"><strong>Businesses</strong></TableCell>
                                <TableCell align="right"><strong>Actions</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} align="center">Loading Wards...</TableCell></TableRow>
                            ) : filteredWards.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No wards found matching your search.</TableCell></TableRow>
                            ) : (
                                filteredWards.map((ward) => (
                                    <TableRow key={ward._id} hover>
                                        <TableCell>{ward.WARD_NO}</TableCell>
                                        <TableCell>{ward.NAME}</TableCell>
                                        <TableCell>
                                            {ward.circle?.CIR_NAM_NU || ward.CIR_NAM_NU || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {ward.circle?.CIRCLE_NO || ward.CIRCLE_NO || 'N/A'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {ward.business_count != null ? ward.business_count.toLocaleString() : '0'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button 
                                                size="small" 
                                                variant="outlined" 
                                                onClick={() => handleViewDetails(ward)}
                                            >
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Container>
    );
}

export default Wards;
