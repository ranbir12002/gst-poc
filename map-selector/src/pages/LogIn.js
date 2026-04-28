// src/pages/LogIn.js
import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { Container, Box, Typography, TextField, Button, CssBaseline, Alert } from '@mui/material';
import axios from 'axios';
import headerLogo from '../assets/logo.png';
import { BACKEND_URL } from '../config';
import { UserContext } from '../context/UserContext';

function LogIn() {
    const navigate = useNavigate();
    const { setUser } = useContext(UserContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post(`${BACKEND_URL}/api/auth/login`, { username, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data)); // Store user info
            setUser(response.data); // Set user in context
            navigate('/dashboard');
        } catch (error) {
            setError('Login failed. Please check your credentials and try again.');
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <CssBaseline />
            <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={headerLogo} alt="Logo" style={{ maxHeight: '100px' }} />
                <Typography component="h1" variant="h5" sx={{ mt: 2 }}>Log In</Typography>
                <Box component="form" noValidate onSubmit={handleSubmit} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username/Email"
                        name="username"
                        autoComplete="email"
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>Log In</Button>
                    <Link to="/signup" style={{ textDecoration: 'none' }}>
                        <Typography variant="body2" color="primary" align="center">
                            Don't have an account? Sign Up
                        </Typography>
                    </Link>

                </Box>
            </Box>
            <Box sx={{ mt: 'auto', mb: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" align="center">
                    {'© '}
                    {new Date().getFullYear()}
                    {' Commercial Taxes Department of Telangana. All rights reserved.'}
                </Typography>
            </Box>
        </Container>
    );
}

export default LogIn;
