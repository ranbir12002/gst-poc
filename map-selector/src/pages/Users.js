import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { Container, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem, Checkbox, ListItemText } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const initialUsers = [];

function Users() {
    const [open, setOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState(initialUsers);
    const [regions, setRegions] = useState([]);
    const [circles, setCircles] = useState([]);
    const [filteredCircles, setFilteredCircles] = useState([]);
    const [userData, setUserData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        mobile: '',
        password: '',
        username: '',
        role: '',
        selectedRegions: [],
        selectedCircles: [],
    });

    useEffect(() => {
        fetchUsers();
        fetchRegions();
        // fetchCircles()
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/users`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchCircles = async (regionIds) => {
        // console.log(regionIds)
        try {
            const responses = await Promise.all(regionIds.map(id =>
                axios.get(`${BACKEND_URL}/api/regions/${id}/circles`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                })
            ));
            const circlesData = responses.map(response => response.data).flat();
            // console.log(circlesData)
            setFilteredCircles(circlesData);
        } catch (error) {
            console.error('Error fetching circles:', error);
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

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setIsEditing(false);
        setUserData({
            firstName: '',
            lastName: '',
            email: '',
            mobile: '',
            password: '',
            username: '',
            role: '',
            selectedRegions: [],
            selectedCircles: [],
        });
        setFilteredCircles([]);
    };

    const handleCreateUser = async () => {
        const newUser = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            mobile: userData.mobile,
            password: userData.password,
            username: userData.username,
            role: userData.role,
            region: userData.selectedRegions,
            circle: userData.selectedCircles,
        };

        try {
            if (isEditing) {
                await axios.put(`${BACKEND_URL}/api/users/${currentUser._id}`, newUser, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setUsers(
                    users.map((user) =>
                        user._id === currentUser._id ? { ...newUser, _id: currentUser._id } : user
                    )
                );
            } else {
                const response = await axios.post(`${BACKEND_URL}/api/users`, newUser, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });
                setUsers([...users, { ...newUser, _id: response.data._id }]);
            }
            handleClose();
        } catch (error) {
            console.error('Error creating/updating user:', error);
        }
    };

    const handleEditClick = async (user) => {
        setCurrentUser(user);
        setUserData({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            mobile: user.mobile,
            password: '', // Don't pre-fill the password field
            username: user.username,
            role: user.role,
            selectedRegions: user.region || [],
            selectedCircles: user.circle || [],
        });
        setIsEditing(true);
        handleClickOpen();
        if (user?.region?.length > 0) {
            await fetchCircles(user.region);
        }
    };

    const handleDeleteClick = async (id) => {
        try {
            await axios.delete(`${BACKEND_URL}/api/users/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setUsers(users.filter((user) => user._id !== id));
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        setUserData({ ...userData, [id]: value });
    };

    const handleRoleChange = (e) => {
        const selectedRole = e.target.value;
        setUserData({
            ...userData,
            role: selectedRole,
            selectedRegions: selectedRole === 'admin' ? userData.selectedRegions : [],
            selectedCircles: selectedRole === 'admin' ? userData.selectedCircles : [],
        });
        setFilteredCircles([]);
    };

    const handleRegionChange = async (event) => {
        const selectedRegions = event.target.value;
        setUserData({
            ...userData,
            selectedRegions: userData.role === 'admin' ? selectedRegions : [selectedRegions],
            selectedCircles: [], // Clear selected circles when region changes
        });

        if (selectedRegions.length > 0) {
            await fetchCircles(userData.role === 'admin' ? selectedRegions : [selectedRegions]);
        } else {
            setFilteredCircles([]);
        }
    };

    const handleCircleChange = (event) => {
        const selectedCircles = event.target.value;
        setUserData({
            ...userData,
            selectedCircles: userData.role === 'admin' ? selectedCircles : [selectedCircles],
        });
    };

    return (
        <Container>
            <Box sx={{ mt: 4, mb: 2, textAlign: 'right' }}>
                <Button variant="contained" color="primary" onClick={() => { setIsEditing(false); handleClickOpen(); }}>
                    Create User
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Username</TableCell>
                            <TableCell>Email Id</TableCell>
                            <TableCell>Mobile</TableCell>
                            <TableCell>Role Name</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user._id}>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.mobile}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>
                                    <IconButton color="primary" onClick={() => handleEditClick(user)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="secondary" onClick={() => handleDeleteClick(user._id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>{isEditing ? 'Edit User' : 'Create User'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="firstName"
                        label="First Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={userData.firstName}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        id="lastName"
                        label="Last Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={userData.lastName}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        id="email"
                        label="Email Id"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={userData.email}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        id="mobile"
                        label="Mobile No"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={userData.mobile}
                        onChange={handleChange}
                    />
                    {!isEditing && (
                        <TextField
                            margin="dense"
                            id="password"
                            label="Password"
                            type="password"
                            fullWidth
                            variant="outlined"
                            value={userData.password}
                            onChange={handleChange}
                        />
                    )}
                    <TextField
                        margin="dense"
                        id="username"
                        label="Username"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={userData.username}
                        onChange={handleChange}
                    />
                    <Select
                        margin="dense"
                        id="role"
                        label="User Role"
                        value={userData.role}
                        onChange={handleRoleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 2 }}
                    >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="region">Region</MenuItem>
                        <MenuItem value="circle">Circle</MenuItem>
                    </Select>
                    {userData.role === 'admin' && (
                        <>
                            <Select
                                multiple
                                value={userData?.selectedRegions}
                                onChange={handleRegionChange}
                                renderValue={(selected) =>
                                    selected
                                        .map((id) => regions.find((region) => region._id === id)?.name)
                                        .join(', ')
                                }
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                {regions.map((region) => (
                                    <MenuItem key={region._id} value={region._id}>
                                        <Checkbox checked={userData.selectedRegions.indexOf(region._id) > -1} />
                                        <ListItemText primary={region.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                            <Select
                                multiple
                                value={userData.selectedCircles}
                                onChange={handleCircleChange}
                                renderValue={(selected) =>
                                    selected
                                        .map((id) => filteredCircles.find((circle) => circle._id === id)?.name)
                                        .join(', ')
                                }
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                {filteredCircles.map((circle) => (
                                    <MenuItem key={circle._id} value={circle._id}>
                                        <Checkbox checked={userData.selectedCircles.indexOf(circle._id) > -1} />
                                        <ListItemText primary={circle.name} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </>
                    )}
                    {(userData.role === 'region' || userData.role === 'circle') && (
                        <>
                            <Select
                                value={userData?.selectedRegions?.[0] || ''}
                                onChange={handleRegionChange}
                                renderValue={(selected) =>
                                    regions.find((region) => region._id === selected)?.name
                                }
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                {regions.map((region) => (
                                    <MenuItem key={region._id} value={region._id}>
                                        {region.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Select
                                value={userData.selectedCircles[0] || ''}
                                onChange={handleCircleChange}
                                renderValue={(selected) =>
                                    filteredCircles.find((circle) => circle._id === selected)?.name
                                }
                                fullWidth
                                sx={{ mt: 2 }}
                            >
                                {filteredCircles.map((circle) => (
                                    <MenuItem key={circle._id} value={circle._id}>
                                        {circle.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleCreateUser}>
                        {isEditing ? 'Save Changes' : 'Create User'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default Users;
