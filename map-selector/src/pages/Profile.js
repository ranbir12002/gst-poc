import React, { useState, useEffect, useContext } from 'react';
import { Container, Box, TextField, Button, Typography, Alert } from '@mui/material';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { UserContext } from '../context/UserContext';

function Profile() {
    const { user } = useContext(UserContext);

    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
    });
    const [editMode, setEditMode] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/api/users/profile/${user._id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setProfile(response.data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setProfile({ ...profile, [id]: value });
    };

    const handleSave = async () => {
        try {
            await axios.put(`${BACKEND_URL}/api/employees/${user.id}`, profile, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setEditMode(false);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
    };

    return (
        <Container>
            <Box sx={{ mt: 4, mb: 2 }}>
                <Typography variant="h4">Profile</Typography>
                {message && (
                    <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mt: 2 }}>
                        {message.text}
                    </Alert>
                )}
                <Box sx={{ mt: 2 }}>
                    <TextField
                        id="firstName"
                        label="First Name"
                        value={profile.firstName}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                    />
                    <TextField
                        id="lastName"
                        label="Last Name"
                        value={profile.lastName}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                    />
                    <TextField
                        id="email"
                        label="Email"
                        value={profile.email}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                    />
                    <TextField
                        id="phone"
                        label="Phone"
                        value={profile.phone}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                        disabled={!editMode}
                    />
                </Box>
                <Box sx={{ mt: 2 }}>
                    {editMode ? (
                        <>
                            <Button variant="contained" color="primary" onClick={handleSave} sx={{ mr: 2 }}>
                                Save
                            </Button>
                            <Button variant="contained" color="secondary" onClick={() => setEditMode(false)}>
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button variant="contained" color="primary" onClick={() => setEditMode(true)}>
                            Edit Profile
                        </Button>
                    )}
                </Box>
            </Box>
        </Container>
    );
}

export default Profile;
