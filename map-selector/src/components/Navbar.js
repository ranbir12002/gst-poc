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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <img src={headerLogo} alt="Logo" style={{ maxHeight: '100px' }} />

                        <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
                        {(user.role === 'admin' || user.role === 'root') && (
                            <>
                                <Button color="inherit" component={Link} to="/users">Users</Button>
                            </>
                        )}
                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region') && (
                            <Button color="inherit" component={Link} to="/wards">Wards</Button>
                        )}


                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle') && (
                            <Button color="inherit" component={Link} to="/circles">Circle</Button>
                        )}
                        {(user.role === 'admin' || user.role === 'root' || user.role === 'region') && (
                            <Button color="inherit" component={Link} to="/circle-management">Circle Builder</Button>
                        )}

                        {/* {user.role === 'admin' || user.role === 'root' || user.role === 'region' || user.role === 'circle' && (
                            <Button color="inherit" component={Link} to={`/circles/${user.circleId}`}>Circle Details</Button>
                        )} */}
                        <Button color="inherit" component={Link} to="/profile">Profile</Button>
                        <Button color="inherit" component={Link} to="/">Log Out</Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Outlet />
        </div>
    );
}

export default Navbar;
