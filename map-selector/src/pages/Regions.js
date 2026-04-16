// // src/pages/Regions.js
// import React, { useContext, useState, useEffect } from 'react';
// import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem, Checkbox, ListItemText } from '@mui/material';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import DrawIcon from '@mui/icons-material/Draw';
// import axios from 'axios';
// import { UserContext } from '../context/UserContext';

// function Regions() {
//     const { user } = useContext(UserContext);
//     const [open, setOpen] = useState(false);
//     const [editingRegion, setEditingRegion] = useState(null);
//     const [regionName, setRegionName] = useState('');
//     const [circles, setCircles] = useState([]);
//     const [selectedCircles, setSelectedCircles] = useState([]);
//     const [regions, setRegions] = useState([]);

//     useEffect(() => {
//         fetchCircles();
//         fetchRegions();
//     }, []);

//     const fetchCircles = async () => {
//         try {
//             const response = await axios.get('/api/circles', {
//                 params: { all: true },
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             setCircles(response.data);
//         } catch (error) {
//             console.error('Error fetching circles:', error);
//         }
//     };

//     const fetchRegions = async () => {
//         try {
//             const response = await axios.get('/api/regions', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });

//             if (user.role === 'region') {
//                 const filteredRegions = response.data.filter(region => user.region.includes(region._id));
//                 setRegions(filteredRegions);
//             } else {
//                 setRegions(response.data);
//             }
//         } catch (error) {
//             console.error('Error fetching regions:', error);
//         }
//     };

//     const handleClickOpen = (region) => {
//         if (region) {
//             setEditingRegion(region);
//             setRegionName(region.name);
//             setSelectedCircles(region.circles || []);
//         } else {
//             setEditingRegion(null);
//             setRegionName('');
//             setSelectedCircles([]);
//         }
//         setOpen(true);
//     };

//     const handleClose = () => {
//         setOpen(false);
//     };

//     const handleCreateOrUpdate = async () => {
//         if (editingRegion) {
//             try {
//                 const response = await axios.put(`/api/regions/${editingRegion._id}`, { name: regionName, circles: selectedCircles }, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 const updatedRegions = regions.map(region =>
//                     region._id === editingRegion._id ? response.data : region
//                 );
//                 setRegions(updatedRegions);
//             } catch (error) {
//                 console.error('Error updating region:', error);
//             }
//         } else {
//             try {
//                 const response = await axios.post('/api/regions', { name: regionName, circles: selectedCircles }, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 setRegions([...regions, response.data]);
//             } catch (error) {
//                 console.error('Error creating region:', error);
//             }
//         }
//         handleClose();
//     };

//     const handleEditClick = (region) => {
//         handleClickOpen(region);
//     };

//     const handleDeleteClick = async (id) => {
//         try {
//             await axios.delete(`/api/regions/${id}`, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             const updatedRegions = regions.filter(region => region._id !== id);
//             setRegions(updatedRegions);
//         } catch (error) {
//             console.error('Error deleting region:', error);
//         }
//     };

//     const handleCircleChange = (event) => {
//         setSelectedCircles(event.target.value);
//     };

//     return (
//         <Container>
//             <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
//                 <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)} disabled={user.role !== 'admin' && user.role !== 'root'}>
//                     Create Region
//                 </Button>
//             </Box>
//             <TableContainer component={Paper}>
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>S.No</TableCell>
//                             <TableCell>Region Name</TableCell>
//                             <TableCell>Assigned Employee</TableCell>
//                             <TableCell>Number of Circles</TableCell>
//                             <TableCell>Number of Business</TableCell>
//                             <TableCell>Status</TableCell>
//                             <TableCell>Actions</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {regions.map((region, index) => (
//                             <TableRow key={region._id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{region.name}</TableCell>
//                                 <TableCell>
//                                     {region?.users?.length > 0 ? (
//                                         region?.users?.map(user => (
//                                             <div key={user._id}>
//                                                 {user.username} ({user.role})
//                                             </div>
//                                         )).reduce((prev, curr) => [prev, ', ', curr])
//                                     ) : (
//                                         'No assigned employees'
//                                     )}
//                                 </TableCell>
//                                 <TableCell>{region?.circles?.length}</TableCell>
//                                 <TableCell>{region?.numberOfBusiness}</TableCell>
//                                 <TableCell>{region?.status}</TableCell>

//                                 <TableCell>
//                                     <IconButton color="primary" onClick={() => handleEditClick(region)}>
//                                         <EditIcon />
//                                     </IconButton>
//                                     <IconButton color="secondary" onClick={() => handleDeleteClick(region._id)}>
//                                         <DeleteIcon />
//                                     </IconButton>
//                                     <IconButton color="default">
//                                         <DrawIcon />
//                                     </IconButton>
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             </TableContainer>

//             <Dialog open={open} onClose={handleClose}>
//                 <DialogTitle>{editingRegion ? 'Edit Region' : 'Create Region'}</DialogTitle>
//                 <DialogContent>
//                     <TextField autoFocus margin="dense" id="regionName" label="Region Name" type="text" fullWidth variant="outlined" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
//                     <Select
//                         multiple
//                         value={selectedCircles}
//                         onChange={handleCircleChange}
//                         renderValue={(selected) => selected.map(id => circles.find(circle => circle._id === id)?.name).join(', ')}
//                         fullWidth
//                         sx={{ mt: 2 }}
//                     >
//                         {circles?.map((circle) => (
//                             <MenuItem key={circle._id} value={circle._id}>
//                                 <Checkbox checked={selectedCircles.indexOf(circle._id) > -1} />
//                                 <ListItemText primary={circle.name} />
//                             </MenuItem>
//                         ))}
//                     </Select>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleClose}>Cancel</Button>
//                     <Button onClick={handleCreateOrUpdate}>{editingRegion ? 'Update' : 'Create'}</Button>
//                 </DialogActions>
//             </Dialog>
//         </Container>
//     );
// }

// export default Regions;

import React, { useContext, useState, useEffect } from 'react';
import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem, Checkbox, ListItemText } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DrawIcon from '@mui/icons-material/Draw';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { BACKEND_URL } from '../config';

function Regions() {
    const { user } = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [editingRegion, setEditingRegion] = useState(null);
    const [regionName, setRegionName] = useState('');
    const [circles, setCircles] = useState([]);
    const [selectedCircles, setSelectedCircles] = useState([]);
    const [regions, setRegions] = useState([]);

    useEffect(() => {
        fetchCircles();
        fetchRegions();
    }, []);

    const fetchCircles = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/circles`, {
                params: { all: true },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setCircles(response.data.circles); // Ensure to access the circles array correctly
        } catch (error) {
            console.error('Error fetching circles:', error);
            setCircles([]); // Ensure circles is set to an empty array on error
        }
    };

    const fetchRegions = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/regions`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (user.role === 'region') {
                const filteredRegions = response.data.filter(region => user.region.includes(region._id));
                setRegions(filteredRegions);
            } else {
                setRegions(response.data);
            }
        } catch (error) {
            console.error('Error fetching regions:', error);
        }
    };

    const handleClickOpen = (region) => {
        if (region) {
            setEditingRegion(region);
            setRegionName(region.name);
            setSelectedCircles(region.circles || []);
        } else {
            setEditingRegion(null);
            setRegionName('');
            setSelectedCircles([]);
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleCreateOrUpdate = async () => {
        if (editingRegion) {
            try {
                const response = await axios.put(`${BACKEND_URL}/api/regions/${editingRegion._id}`, { name: regionName, circles: selectedCircles }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                const updatedRegions = regions.map(region =>
                    region._id === editingRegion._id ? response.data : region
                );
                setRegions(updatedRegions);
            } catch (error) {
                console.error('Error updating region:', error);
            }
        } else {
            try {
                const response = await axios.post(`${BACKEND_URL}/api/regions`, { name: regionName, circles: selectedCircles }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setRegions([...regions, response.data]);
            } catch (error) {
                console.error('Error creating region:', error);
            }
        }
        handleClose();
    };

    const handleEditClick = (region) => {
        handleClickOpen(region);
    };

    const handleDeleteClick = async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/regions/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const updatedRegions = regions.filter(region => region._id !== id);
            setRegions(updatedRegions);
        } catch (error) {
            console.error('Error deleting region:', error);
        }
    };

    const handleCircleChange = (event) => {
        setSelectedCircles(event.target.value);
    };

    return (
        <Container>
            <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
                <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)} disabled={user.role !== 'admin' && user.role !== 'root'}>
                    Create Region
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S.No</TableCell>
                            <TableCell>Region Name</TableCell>
                            <TableCell>Assigned Employee</TableCell>
                            <TableCell>Number of Circles</TableCell>
                            <TableCell>Number of Business</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {regions.map((region, index) => (
                            <TableRow key={region._id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{region.name}</TableCell>
                                <TableCell>
                                    {region?.users?.length > 0 ? (
                                        region?.users?.map(user => (
                                            <div key={user._id}>
                                                {user.username} ({user.role})
                                            </div>
                                        )).reduce((prev, curr) => [prev, ', ', curr])
                                    ) : (
                                        'No assigned employees'
                                    )}
                                </TableCell>
                                <TableCell>{region?.circles?.length}</TableCell>
                                <TableCell>{region?.numberOfBusiness}</TableCell>
                                <TableCell>{region?.status}</TableCell>

                                <TableCell>
                                    <IconButton color="primary" onClick={() => handleEditClick(region)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="secondary" onClick={() => handleDeleteClick(region._id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                    <IconButton color="default">
                                        <DrawIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingRegion ? 'Edit Region' : 'Create Region'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" id="regionName" label="Region Name" type="text" fullWidth variant="outlined" value={regionName} onChange={(e) => setRegionName(e.target.value)} />
                    <Select
                        multiple
                        value={selectedCircles}
                        onChange={handleCircleChange}
                        renderValue={(selected) => selected.map(id => circles.find(circle => circle._id === id)?.name).join(', ')}
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        {circles.map((circle) => (
                            <MenuItem key={circle._id} value={circle._id}>
                                <Checkbox checked={selectedCircles.indexOf(circle._id) > -1} />
                                <ListItemText primary={circle.name} />
                            </MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleCreateOrUpdate}>{editingRegion ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Regions;
