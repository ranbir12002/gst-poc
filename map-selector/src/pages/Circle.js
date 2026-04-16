// import React, { useState, useEffect, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import DrawIcon from '@mui/icons-material/Draw';
// import axios from 'axios';
// import { UserContext } from '../context/UserContext';

// function Circles() {
//     const { user } = useContext(UserContext);

//     const [open, setOpen] = useState(false);
//     const [editingCircle, setEditingCircle] = useState(null);
//     const [circleName, setCircleName] = useState('');
//     const [circles, setCircles] = useState([]);
//     const navigate = useNavigate();

//     useEffect(() => {
//         fetchCircles();
//     }, []);

//     const fetchCircles = async () => {
//         try {
//             const response = await axios.get('/api/circles', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             if (user.role !== 'admin' && user.role !== 'root') {
//                 const filteredCircles = response.data.filter(circle => user.circle.includes(circle._id));
//                 setCircles(filteredCircles);
//             } else {
//                 setCircles(response.data);
//             }

//         } catch (error) {
//             console.error('Error fetching circles:', error);
//         }
//     };

//     const handleClickOpen = (circle) => {
//         console.log(circle)
//         if (circle) {
//             setEditingCircle(circle);
//             setCircleName(circle.name);
//         } else {
//             setEditingCircle(null);
//             setCircleName('');
//         }
//         setOpen(true);
//     };

//     const handleClose = () => {
//         setOpen(false);
//     };

//     const handleCreateOrUpdate = async () => {
//         if (editingCircle) {
//             try {
//                 const response = await axios.put(`/api/circles/${editingCircle._id}`, { name: circleName }, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 const updatedCircles = circles.map(circle =>
//                     circle._id === editingCircle._id ? response.data : circle
//                 );
//                 setCircles(updatedCircles);
//             } catch (error) {
//                 console.error('Error updating circle:', error);
//             }
//         } else {
//             try {
//                 const response = await axios.post('/api/circles', { name: circleName }, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 setCircles([...circles, response.data]);
//             } catch (error) {
//                 console.error('Error creating circle:', error);
//             }
//         }
//         handleClose();
//     };

//     const handleEditClick = (circle) => {
//         handleClickOpen(circle);
//     };

//     const handleDeleteClick = async (id) => {
//         try {
//             await axios.delete(`/api/circles/${id}`, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 }
//             })

//             const updatedCircles = circles.filter(circle => circle._id !== id);
//             setCircles(updatedCircles);
//         } catch (error) {
//             console.error('Error deleting circle:', error);
//         }
//     };

//     const handleDrawClick = (circle) => {
//         navigate(`/circles/${circle._id}`, { state: { circle } });
//     };

//     return (
//         <Container>
//             <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
//                 <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)}>Create Circle</Button>
//             </Box>
//             <TableContainer component={Paper}>
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>S.No</TableCell>
//                             <TableCell>Circle Name</TableCell>
//                             <TableCell>Assigned Employee</TableCell>
//                             <TableCell>Number of Business</TableCell>
//                             <TableCell>Region Name</TableCell>
//                             <TableCell>Status</TableCell>
//                             <TableCell>Actions</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {circles.map((circle, index) => (
//                             <TableRow key={circle._id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{circle?.name}</TableCell>
//                                 <TableCell>{circle?.assignedEmployee}</TableCell>
//                                 <TableCell>{circle?.numberOfBusiness}</TableCell>
//                                 <TableCell>{circle?.region?.name}</TableCell>
//                                 <TableCell>{circle?.status}</TableCell>

//                                 <TableCell>
//                                     <IconButton color="primary" onClick={() => handleEditClick(circle)}>
//                                         <EditIcon />
//                                     </IconButton>
//                                     <IconButton color="secondary" onClick={() => handleDeleteClick(circle._id)}>
//                                         <DeleteIcon />
//                                     </IconButton>
//                                     <IconButton color="default" onClick={() => handleDrawClick(circle)}>
//                                         <DrawIcon />
//                                     </IconButton>
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             </TableContainer>

//             <Dialog open={open} onClose={handleClose}>
//                 <DialogTitle>{editingCircle ? 'Edit Circle' : 'Create Circle'}</DialogTitle>
//                 <DialogContent>
//                     <TextField autoFocus margin="dense" id="circleName" label="Circle Name" type="text" fullWidth variant="outlined" value={circleName} onChange={(e) => setCircleName(e.target.value)} />
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleClose}>Cancel</Button>
//                     <Button onClick={handleCreateOrUpdate}>{editingCircle ? 'Update' : 'Create'}</Button>
//                 </DialogActions>
//             </Dialog>
//         </Container>
//     );
// }

// export default Circles;

// import React, { useState, useEffect, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem } from '@mui/material';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import DrawIcon from '@mui/icons-material/Draw';
// import axios from 'axios';
// import { UserContext } from '../context/UserContext';

// function Circles() {
//     const { user } = useContext(UserContext);
//     const [open, setOpen] = useState(false);
//     const [editingCircle, setEditingCircle] = useState(null);
//     const [circleName, setCircleName] = useState('');
//     const [selectedRegion, setSelectedRegion] = useState('');
//     const [circles, setCircles] = useState([]);
//     const [regions, setRegions] = useState([]);
//     const [pendingRevisions, setPendingRevisions] = useState([]);
//     const navigate = useNavigate();

//     useEffect(() => {
//         fetchCircles();
//         fetchPendingRevisions();
//         fetchRegions();
//     }, []);

//     const fetchCircles = async () => {
//         try {
//             const response = await axios.get('/api/circles', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             if (user.role !== 'admin' && user.role !== 'root') {
//                 const filteredCircles = response.data.filter(circle => user.circle.includes(circle._id));
//                 setCircles(filteredCircles);
//             } else {
//                 setCircles(response.data);
//             }
//         } catch (error) {
//             console.error('Error fetching circles:', error);
//         }
//     };

//     const fetchPendingRevisions = async () => {
//         try {
//             const response = await axios.get('/api/circles/revised-circles', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             setPendingRevisions(response.data);
//         } catch (error) {
//             console.error('Error fetching pending revisions:', error);
//         }
//     };

//     const fetchRegions = async () => {
//         try {
//             const response = await axios.get('/api/regions', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             setRegions(response.data);
//         } catch (error) {
//             console.error('Error fetching regions:', error);
//         }
//     };

//     const handleClickOpen = (circle) => {
//         if (circle) {
//             setEditingCircle(circle);
//             setCircleName(circle.name);
//             setSelectedRegion(circle.region ? circle.region._id : '');
//         } else {
//             setEditingCircle(null);
//             setCircleName('');
//             setSelectedRegion('');
//         }
//         setOpen(true);
//     };

//     const handleClose = () => {
//         setOpen(false);
//     };

//     const handleCreateOrUpdate = async () => {
//         const circleData = {
//             name: circleName,
//             region: selectedRegion
//         };

//         if (editingCircle) {
//             try {
//                 const response = await axios.put(`/api/circles/${editingCircle._id}`, circleData, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 const updatedCircles = circles.map(circle =>
//                     circle._id === editingCircle._id ? response.data : circle
//                 );
//                 setCircles(updatedCircles);
//             } catch (error) {
//                 console.error('Error updating circle:', error);
//             }
//         } else {
//             try {
//                 const response = await axios.post('/api/circles', circleData, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 setCircles([...circles, response.data]);
//             } catch (error) {
//                 console.error('Error creating circle:', error);
//             }
//         }
//         handleClose();
//     };

//     const handleEditClick = (circle) => {
//         handleClickOpen(circle);
//     };

//     const handleDeleteClick = async (id) => {
//         try {
//             await axios.delete(`/api/circles/${id}`, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 }
//             });
//             const updatedCircles = circles.filter(circle => circle._id !== id);
//             setCircles(updatedCircles);
//         } catch (error) {
//             console.error('Error deleting circle:', error);
//         }
//     };

//     const handleDrawClick = (circle) => {
//         navigate(`/circles/${circle._id}`, { state: { circle } });
//     };

//     const handleApproveByRegion = async (id) => {
//         try {
//             await axios.put(`/api/circles/revised-circles/region/${id}`, null, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             fetchPendingRevisions();
//         } catch (error) {
//             console.error('Error approving revision by region:', error);
//         }
//     };

//     const handleApproveByAdmin = async (id) => {
//         try {
//             await axios.put(`/api/circles/revised-circles/admin/${id}`, null, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             fetchPendingRevisions();
//         } catch (error) {
//             console.error('Error approving revision by admin:', error);
//         }
//     };

//     return (
//         <Container>
//             <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
//                 <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)}>Create Circle</Button>
//             </Box>
//             <TableContainer component={Paper}>
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>S.No</TableCell>
//                             <TableCell>Circle Name</TableCell>
//                             <TableCell>Assigned Employee</TableCell>
//                             <TableCell>Number of Business</TableCell>
//                             <TableCell>Region Name</TableCell>
//                             <TableCell>Status</TableCell>
//                             <TableCell>Actions</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {circles.map((circle, index) => (
//                             <TableRow key={circle._id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{circle?.name}</TableCell>
//                                 <TableCell>{circle?.assignedEmployee}</TableCell>
//                                 <TableCell>{circle?.numberOfBusiness}</TableCell>
//                                 <TableCell>{circle?.region?.name}</TableCell>
//                                 <TableCell>{circle?.status}</TableCell>
//                                 <TableCell>
//                                     <IconButton color="primary" onClick={() => handleEditClick(circle)}>
//                                         <EditIcon />
//                                     </IconButton>
//                                     <IconButton color="secondary" onClick={() => handleDeleteClick(circle._id)}>
//                                         <DeleteIcon />
//                                     </IconButton>
//                                     <IconButton color="default" onClick={() => handleDrawClick(circle)}>
//                                         <DrawIcon />
//                                     </IconButton>
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                         {pendingRevisions?.map((revision, index) => (
//                             <TableRow key={revision?._id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{revision?.name}</TableCell>
//                                 <TableCell>{revision?.assignedEmployee}</TableCell>
//                                 <TableCell>{revision?.numberOfBusiness}</TableCell>
//                                 <TableCell>{revision?.region?.name}</TableCell>
//                                 <TableCell>{revision?.status}</TableCell>
//                                 <TableCell>
//                                     {user.role === 'region' && revision.status === 'pending' && (
//                                         <Button onClick={() => handleApproveByRegion(revision._id)}>Approve</Button>
//                                     )}
//                                     {user.role === 'admin' && revision.status === 'regionApproved' && (
//                                         <Button onClick={() => handleApproveByAdmin(revision._id)}>Approve</Button>
//                                     )}
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             </TableContainer>

//             <Dialog open={open} onClose={handleClose}>
//                 <DialogTitle>{editingCircle ? 'Edit Circle' : 'Create Circle'}</DialogTitle>
//                 <DialogContent>
//                     <TextField autoFocus margin="dense" id="circleName" label="Circle Name" type="text" fullWidth variant="outlined" value={circleName} onChange={(e) => setCircleName(e.target.value)} />
//                     <Select
//                         margin="dense"
//                         id="region"
//                         label="Select Region"
//                         value={selectedRegion}
//                         onChange={(e) => setSelectedRegion(e.target.value)}
//                         fullWidth
//                         variant="outlined"
//                         sx={{ mt: 2 }}
//                     >
//                         {regions.map((region) => (
//                             <MenuItem key={region._id} value={region._id}>
//                                 {region.name}
//                             </MenuItem>
//                         ))}
//                     </Select>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleClose}>Cancel</Button>
//                     <Button onClick={handleCreateOrUpdate}>{editingCircle ? 'Update' : 'Create'}</Button>
//                 </DialogActions>
//             </Dialog>
//         </Container>
//     );
// }

// export default Circles;

// import React, { useState, useEffect, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem } from '@mui/material';
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import DrawIcon from '@mui/icons-material/Draw';
// import axios from 'axios';
// import { UserContext } from '../context/UserContext';

// function Circles() {
//     const { user } = useContext(UserContext);
//     const [open, setOpen] = useState(false);
//     const [openRevisions, setOpenRevisions] = useState(false);
//     const [editingCircle, setEditingCircle] = useState(null);
//     const [circleName, setCircleName] = useState('');
//     const [selectedRegion, setSelectedRegion] = useState('');
//     const [circles, setCircles] = useState([]);
//     const [regions, setRegions] = useState([]);
//     const [pendingRevisions, setPendingRevisions] = useState([]);
//     const navigate = useNavigate();

//     useEffect(() => {
//         fetchCircles();
//         fetchRegions();
//     }, []);

//     const fetchCircles = async () => {
//         try {
//             const response = await axios.get('/api/circles', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             if (user.role !== 'admin' && user.role !== 'root') {
//                 const filteredCircles = response.data.filter(circle => user.circle.includes(circle._id));
//                 setCircles(filteredCircles);
//             } else {
//                 setCircles(response.data);
//             }
//         } catch (error) {
//             console.error('Error fetching circles:', error);
//         }
//     };

//     const fetchPendingRevisions = async () => {
//         try {
//             const response = await axios.get('/api/circles/revised-circles', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             setPendingRevisions(response.data);
//         } catch (error) {
//             console.error('Error fetching pending revisions:', error);
//         }
//     };

//     const fetchRegions = async () => {
//         try {
//             const response = await axios.get('/api/regions', {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             setRegions(response.data);
//         } catch (error) {
//             console.error('Error fetching regions:', error);
//         }
//     };

//     const handleClickOpen = (circle) => {
//         if (circle) {
//             setEditingCircle(circle);
//             setCircleName(circle.name);
//             setSelectedRegion(circle.region ? circle.region._id : '');
//         } else {
//             setEditingCircle(null);
//             setCircleName('');
//             setSelectedRegion('');
//         }
//         setOpen(true);
//     };

//     const handleClose = () => {
//         setOpen(false);
//     };

//     const handleCreateOrUpdate = async () => {
//         const circleData = {
//             name: circleName,
//             region: selectedRegion
//         };

//         if (editingCircle) {
//             try {
//                 const response = await axios.put(`/api/circles/${editingCircle._id}`, circleData, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 const updatedCircles = circles.map(circle =>
//                     circle._id === editingCircle._id ? response.data : circle
//                 );
//                 setCircles(updatedCircles);
//             } catch (error) {
//                 console.error('Error updating circle:', error);
//             }
//         } else {
//             try {
//                 const response = await axios.post('/api/circles', circleData, {
//                     headers: {
//                         Authorization: `Bearer ${localStorage.getItem('token')}`,
//                     },
//                 });
//                 setCircles([...circles, response.data]);
//             } catch (error) {
//                 console.error('Error creating circle:', error);
//             }
//         }
//         handleClose();
//     };

//     const handleEditClick = (circle) => {
//         handleClickOpen(circle);
//     };

//     const handleDeleteClick = async (id) => {
//         try {
//             await axios.delete(`/api/circles/${id}`, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 }
//             });
//             const updatedCircles = circles.filter(circle => circle._id !== id);
//             setCircles(updatedCircles);
//         } catch (error) {
//             console.error('Error deleting circle:', error);
//         }
//     };

//     const handleDrawClick = (circle) => {
//         navigate(`/circles/${circle._id}`, { state: { circle } });
//     };

//     const handleApproveByRegion = async (id) => {
//         try {
//             await axios.put(`/api/circles/revised-circles/region/${id}`, null, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             fetchPendingRevisions();
//         } catch (error) {
//             console.error('Error approving revision by region:', error);
//         }
//     };

//     const handleApproveByAdmin = async (id) => {
//         try {
//             await axios.put(`/api/circles/revised-circles/admin/${id}`, null, {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem('token')}`,
//                 },
//             });
//             fetchPendingRevisions();
//         } catch (error) {
//             console.error('Error approving revision by admin:', error);
//         }
//     };

//     const handleOpenRevisions = () => {
//         fetchPendingRevisions();
//         setOpenRevisions(true);
//     };

//     const handleCloseRevisions = () => {
//         setOpenRevisions(false);
//     };

//     return (
//         <Container>
//             <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
//                 <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)}>Create Circle</Button>
//                 <Button variant="contained" color="secondary" onClick={handleOpenRevisions} sx={{ ml: 2 }}>Show Revisions</Button>
//             </Box>
//             <TableContainer component={Paper}>
//                 <Table>
//                     <TableHead>
//                         <TableRow>
//                             <TableCell>S.No</TableCell>
//                             <TableCell>Circle Name</TableCell>
//                             <TableCell>Assigned Employee</TableCell>
//                             <TableCell>Number of Business</TableCell>
//                             <TableCell>Region Name</TableCell>
//                             <TableCell>Status</TableCell>
//                             <TableCell>Actions</TableCell>
//                         </TableRow>
//                     </TableHead>
//                     <TableBody>
//                         {circles.map((circle, index) => (
//                             <TableRow key={circle._id}>
//                                 <TableCell>{index + 1}</TableCell>
//                                 <TableCell>{circle?.name}</TableCell>
//                                 <TableCell>
//                                     {circle?.users?.length > 0 ? (
//                                         circle?.users?.map(user => (
//                                             <div key={user._id}>
//                                                 {user.username} ({user.role})
//                                             </div>
//                                         )).reduce((prev, curr) => [prev, ', ', curr])
//                                     ) : (
//                                         'No assigned employees'
//                                     )}
//                                 </TableCell>
//                                 <TableCell>{circle?.numberOfBusiness}</TableCell>
//                                 <TableCell>{circle?.region?.name}</TableCell>
//                                 <TableCell>{circle?.status}</TableCell>
//                                 <TableCell>
//                                     <IconButton color="primary" onClick={() => handleEditClick(circle)}>
//                                         <EditIcon />
//                                     </IconButton>
//                                     <IconButton color="secondary" onClick={() => handleDeleteClick(circle._id)}>
//                                         <DeleteIcon />
//                                     </IconButton>
//                                     <IconButton color="default" onClick={() => handleDrawClick(circle)}>
//                                         <DrawIcon />
//                                     </IconButton>
//                                 </TableCell>
//                             </TableRow>
//                         ))}
//                     </TableBody>
//                 </Table>
//             </TableContainer>

//             <Dialog open={open} onClose={handleClose}>
//                 <DialogTitle>{editingCircle ? 'Edit Circle' : 'Create Circle'}</DialogTitle>
//                 <DialogContent>
//                     <TextField autoFocus margin="dense" id="circleName" label="Circle Name" type="text" fullWidth variant="outlined" value={circleName} onChange={(e) => setCircleName(e.target.value)} />
//                     <Select
//                         margin="dense"
//                         id="region"
//                         label="Select Region"
//                         value={selectedRegion}
//                         onChange={(e) => setSelectedRegion(e.target.value)}
//                         fullWidth
//                         variant="outlined"
//                         sx={{ mt: 2 }}
//                     >
//                         {regions.map((region) => (
//                             <MenuItem key={region._id} value={region._id}>
//                                 {region.name}
//                             </MenuItem>
//                         ))}
//                     </Select>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleClose}>Cancel</Button>
//                     <Button onClick={handleCreateOrUpdate}>{editingCircle ? 'Update' : 'Create'}</Button>
//                 </DialogActions>
//             </Dialog>

//             <Dialog open={openRevisions} onClose={handleCloseRevisions}>
//                 <DialogTitle>Pending Revisions</DialogTitle>
//                 <DialogContent>
//                     <TableContainer component={Paper}>
//                         <Table>
//                             <TableHead>
//                                 <TableRow>
//                                     <TableCell>S.No</TableCell>
//                                     <TableCell>Circle Name</TableCell>
//                                     <TableCell>Assigned Employee</TableCell>
//                                     <TableCell>Number of Business</TableCell>
//                                     <TableCell>Region Name</TableCell>
//                                     <TableCell>Status</TableCell>
//                                     <TableCell>Actions</TableCell>
//                                 </TableRow>
//                             </TableHead>
//                             <TableBody>
//                                 {pendingRevisions.map((revision, index) => (
//                                     <TableRow key={revision._id}>
//                                         <TableCell>{index + 1}</TableCell>
//                                         <TableCell>{revision.name}</TableCell>
//                                         <TableCell>{revision.assignedEmployee}</TableCell>
//                                         <TableCell>{revision.numberOfBusiness}</TableCell>
//                                         <TableCell>{revision.region?.name}</TableCell>
//                                         <TableCell>{revision.status}</TableCell>
//                                         <TableCell>
//                                             {user.role === 'region' && revision.status === 'pending' && (
//                                                 <Button onClick={() => handleApproveByRegion(revision._id)}>Approve</Button>
//                                             )}
//                                             {user.role === 'admin' || user.role === 'root' && revision.status === 'regionApproved' && (
//                                                 <Button onClick={() => handleApproveByAdmin(revision._id)}>Approve</Button>
//                                             )}
//                                         </TableCell>
//                                     </TableRow>
//                                 ))}
//                             </TableBody>
//                         </Table>
//                     </TableContainer>
//                 </DialogContent>
//                 <DialogActions>
//                     <Button onClick={handleCloseRevisions}>Close</Button>
//                 </DialogActions>
//             </Dialog>
//         </Container>
//     );
// }

// export default Circles;
import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem, Pagination, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DrawIcon from '@mui/icons-material/Draw';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { BACKEND_URL } from '../config';

function Circles() {
    const { user } = useContext(UserContext);
    const [open, setOpen] = useState(false);
    const [openRevisions, setOpenRevisions] = useState(false);
    const [editingCircle, setEditingCircle] = useState(null);
    const [circleName, setCircleName] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [circles, setCircles] = useState([]);
    const [regions, setRegions] = useState([]);
    const [pendingRevisions, setPendingRevisions] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchCircles(page, search);
        fetchRegions();
    }, [page, search]);

    const fetchCircles = async (page, search) => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/circles`, {
                params: { page, limit: 10, search },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (user.role !== 'admin' && user.role !== 'root') {
                const filteredCircles = response.data.circles.filter(circle => user.circle.includes(circle._id));
                setCircles(filteredCircles);
            } else {
                setCircles(response.data.circles);
            }
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error('Error fetching circles:', error);
        }
    };

    const fetchPendingRevisions = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/circles/revised-circles`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setPendingRevisions(response.data);
        } catch (error) {
            console.error('Error fetching pending revisions:', error);
        }
    };

    const fetchRegions = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/regions`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setRegions(response.data);
        } catch (error) {
            console.error('Error fetching regions:', error);
        }
    };

    const handleClickOpen = (circle) => {
        if (circle) {
            setEditingCircle(circle);
            setCircleName(circle.name);
            setSelectedRegion(circle.region ? circle.region._id : '');
        } else {
            setEditingCircle(null);
            setCircleName('');
            setSelectedRegion('');
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleCreateOrUpdate = async () => {
        const circleData = {
            name: circleName,
            region: selectedRegion
        };

        if (editingCircle) {
            try {
                const response = await axios.post(`${BACKEND_URL}/api/revised-circles`, {
                    ...circleData,
                    originalCircleId: editingCircle._id
                }, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                const updatedCircles = circles.map(circle =>
                    circle._id === editingCircle._id ? { ...circle, revised: true } : circle
                );
                setCircles(updatedCircles);
            } catch (error) {
                console.error('Error creating revised circle:', error);
            }
        } else {
            try {
                const response = await axios.post(`${BACKEND_URL}/api/circles`, circleData, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setCircles([...circles, response.data]);
            } catch (error) {
                console.error('Error creating circle:', error);
            }
        }
        handleClose();
    };

    const handleEditClick = (circle) => {
        handleClickOpen(circle);
    };

    const handleDeleteClick = async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/circles/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });
            const updatedCircles = circles.filter(circle => circle._id !== id);
            setCircles(updatedCircles);
        } catch (error) {
            console.error('Error deleting circle:', error);
        }
    };

    const handleDrawClick = (circle) => {
        navigate(`/circles/${circle._id}`, { state: { circle } });
    };

    const handleApproveByRegion = async (id) => {
        try {
            await axios.put(`${BACKEND_URL}/api/circles/revised-circles/region/${id}`, null, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            fetchPendingRevisions();
        } catch (error) {
            console.error('Error approving revision by region:', error);
        }
    };

    const handleApproveByAdmin = async (id) => {
        try {
            await axios.put(`${BACKEND_URL}/api/circles/revised-circles/admin/${id}`, null, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            fetchPendingRevisions();
        } catch (error) {
            console.error('Error approving revision by admin:', error);
        }
    };

    const handleOpenRevisions = () => {
        fetchPendingRevisions();
        setOpenRevisions(true);
    };

    const handleCloseRevisions = () => {
        setOpenRevisions(false);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const handleSearchChange = (event) => {
        setSearch(event.target.value);
    };

    return (
        <Container>
            <Box sx={{ mt: 4, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TextField
                    label="Search Circles"
                    variant="outlined"
                    value={search}
                    onChange={handleSearchChange}
                    sx={{ mb: 2, flex: 1, mr: 2 }}
                    InputProps={{
                        endAdornment: (
                            <SearchIcon />
                        ),
                    }}
                />
                <Box>
                    <Button variant="contained" color="primary" onClick={() => handleClickOpen(null)}>Create Circle</Button>
                    <Button variant="contained" color="secondary" onClick={handleOpenRevisions} sx={{ ml: 2 }}>Show Revisions</Button>
                </Box>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>S.No</TableCell>
                            <TableCell>Circle Name</TableCell>
                            <TableCell>Assigned Employee</TableCell>
                            <TableCell>Number of Business</TableCell>
                            <TableCell>Region Name</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {circles.map((circle, index) => (
                            <TableRow key={circle._id}>
                                <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                                <TableCell>{circle?.name}</TableCell>
                                <TableCell>
                                    {circle?.users?.length > 0 ? (
                                        circle?.users?.map(user => (
                                            <div key={user._id}>
                                                {user.username} ({user.role})
                                            </div>
                                        )).reduce((prev, curr) => [prev, ', ', curr])
                                    ) : (
                                        'No assigned employees'
                                    )}
                                </TableCell>
                                <TableCell>{circle?.numberOfBusiness}</TableCell>
                                <TableCell>{circle?.region?.name}</TableCell>
                                <TableCell>{circle?.status}</TableCell>
                                <TableCell>
                                    <IconButton color="primary" onClick={() => handleEditClick(circle)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="secondary" onClick={() => handleDeleteClick(circle._id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                    <IconButton color="default" onClick={() => handleDrawClick(circle)}>
                                        <DrawIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Stack spacing={2} sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" />
            </Stack>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{editingCircle ? 'Edit Circle' : 'Create Circle'}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" id="circleName" label="Circle Name" type="text" fullWidth variant="outlined" value={circleName} onChange={(e) => setCircleName(e.target.value)} />
                    <Select
                        margin="dense"
                        id="region"
                        label="Select Region"
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 2 }}
                    >
                        {regions.map((region) => (
                            <MenuItem key={region._id} value={region._id}>
                                {region.name}
                            </MenuItem>
                        ))}
                    </Select>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleCreateOrUpdate}>{editingCircle ? 'Update' : 'Create'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRevisions} onClose={handleCloseRevisions}>
                <DialogTitle>Pending Revisions</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>S.No</TableCell>
                                    <TableCell>Circle Name</TableCell>
                                    <TableCell>Assigned Employee</TableCell>
                                    <TableCell>Number of Business</TableCell>
                                    <TableCell>Region Name</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingRevisions.map((revision, index) => (
                                    <TableRow key={revision._id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{revision.name}</TableCell>
                                        <TableCell>{revision.assignedEmployee}</TableCell>
                                        <TableCell>{revision.numberOfBusiness}</TableCell>
                                        <TableCell>{revision.region?.name}</TableCell>
                                        <TableCell>{revision.status}</TableCell>
                                        <TableCell>
                                            {user.role === 'region' && revision.status === 'pending' && (
                                                <Button onClick={() => handleApproveByRegion(revision._id)}>Approve</Button>
                                            )}
                                            {user.role === 'admin' || user.role === 'root' && revision.status === 'regionApproved' && (
                                                <Button onClick={() => handleApproveByAdmin(revision._id)}>Approve</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseRevisions}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Circles;


