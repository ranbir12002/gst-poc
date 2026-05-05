// src/components/Navbar.js
import React, { useContext } from 'react';
import { AppBar, Toolbar, Button, Box } from '@mui/material';
import { Link, Outlet } from 'react-router-dom';
import { UserContext } from '../context/UserContext';
import headerLogo from '../assets/logo.png';


function Navbar() {
    const { user } = useContext(UserContext);

    if (!user) {
        return null; // Or a loading indicator
    }

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <img src={headerLogo} alt="Logo" style={{ maxHeight: '60px', marginRight: 'auto' }} />
                        
                        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                        
                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region') && (
                            <Button color="inherit" component={Link} to="/wards">Wards</Button>
                        )}

                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle') && (
                            <Button color="inherit" component={Link} to="/circles">Circle</Button>
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
