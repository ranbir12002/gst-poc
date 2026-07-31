// src/components/Navbar.js
import React, { useContext, useState } from 'react';
import { AppBar, Toolbar, Button, Box, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import headerLogo from '../assets/logo.png';


function Navbar() {
    const { user } = useContext(UserContext);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    if (!user) {
        return null; // Or a loading indicator
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        }
    };

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <img src={headerLogo} alt="Logo" style={{ maxHeight: '60px' }} />

                        <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, maxWidth: 420 }}>
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Search any business..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{ backgroundColor: 'white', borderRadius: 1 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>

                        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                        
                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region') && (
                            <Button color="inherit" component={Link} to="/wards">Wards</Button>
                        )}

                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle') && (
                            <Button color="inherit" component={Link} to="/circles">Circle</Button>
                        )}

                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle') && (
                            <Button color="inherit" component={Link} to="/all-map">Map View</Button>
                        )}

                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle') && (
                            <Button color="inherit" component={Link} to="/rural">Rural</Button>
                        )}

                        <Button 
                            color="inherit" 
                            component={Link} 
                            to="/"
                            sx={{ 
                                ml: 2, 
                                border: '1px solid rgba(255,255,255,0.5)',
                                '&:hover': { border: '1px solid #fff' }
                            }}
                        >
                            Log Out
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Outlet />
        </div>
    );
}

export default Navbar;
