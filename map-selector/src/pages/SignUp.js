import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Box, Typography, TextField, Button, CssBaseline, Alert, MenuItem } from '@mui/material';
import axios from 'axios';
import headerLogo from '../assets/logo.png';
import { BACKEND_URL } from '../config';

function SignUp() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        role: 'admin'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post(`${BACKEND_URL}/api/auth/register`, formData);
            if (response.status === 201) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 2000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={headerLogo} alt="Logo" style={{ width: '100px', marginBottom: '20px' }} />
                <Typography component="h1" variant="h5">Sign Up</Typography>
                {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ width: '100%', mt: 2 }}>Registration successful! Redirecting to login...</Alert>}
                
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                    <TextField
                        margin="normal" required fullWidth name="firstName" label="First Name"
                        autoFocus value={formData.firstName} onChange={handleChange}
                    />
                    <TextField
                        margin="normal" required fullWidth name="lastName" label="Last Name"
                        value={formData.lastName} onChange={handleChange}
                    />
                    <TextField
                        margin="normal" required fullWidth name="email" label="Email Address"
                        type="email" value={formData.email} onChange={handleChange}
                    />
                    <TextField
                        margin="normal" required fullWidth name="username" label="Username"
                        value={formData.username} onChange={handleChange}
                    />
                    <TextField
                        margin="normal" required fullWidth name="password" label="Password"
                        type="password" value={formData.password} onChange={handleChange}
                    />
                    <TextField
                        select margin="normal" required fullWidth name="role" label="Role"
                        value={formData.role} onChange={handleChange}
                    >
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="root">Root</MenuItem>
                        <MenuItem value="region">Region</MenuItem>
                        <MenuItem value="circle">Circle</MenuItem>
                    </TextField>

                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Sign Up
                    </Button>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" color="primary" align="center">
                            Already have an account? Log In
                        </Typography>
                    </Link>
                </Box>
            </Box>
        </Container>
    );
}

export default SignUp;
