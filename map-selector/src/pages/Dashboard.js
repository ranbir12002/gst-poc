import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, Paper, Typography, Box, Button, CircularProgress } from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import BusinessIcon from '@mui/icons-material/Business';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';
import { UserContext } from '../context/UserContext';
import { GEOJSON_BACKEND_URL } from '../config';

const StatCard = ({ icon, label, value, color, onClick }) => (
  <Paper
    elevation={2}
    sx={{
      p: 3, display: 'flex', alignItems: 'center', gap: 2,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.15s, box-shadow 0.15s',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: 4 } : {}
    }}
    onClick={onClick}
  >
    <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: `${color}15`, color }}>
      {icon}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Box>
  </Paper>
);

function Dashboard() {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${GEOJSON_BACKEND_URL}/api/v2/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 8, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          GST Business Map — Circle & Ward Administration
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<MapIcon fontSize="large" />}
              label="Total Wards"
              value={stats?.wards}
              color="#2196f3"
              onClick={() => navigate('/wards')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<GroupWorkIcon fontSize="large" />}
              label="Circles"
              value={stats?.circles}
              color="#4caf50"
              onClick={() => navigate('/circles')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<BusinessIcon fontSize="large" />}
              label="Businesses"
              value={stats?.businesses?.toLocaleString()}
              color="#ff9800"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<WarningAmberIcon fontSize="large" />}
              label="Unassigned Wards"
              value={stats?.unassignedWards}
              color="#f44336"
              onClick={() => navigate('/circle-management')}
            />
          </Grid>
        </Grid>

        {(user?.role === 'root' || user?.role === 'admin') && stats?.unassignedWards > 0 && (
          <Paper elevation={1} sx={{ p: 3, backgroundColor: '#fff3e0', borderLeft: '4px solid #ff9800' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {stats.unassignedWards} wards are not assigned to any circle
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Go to Circle Management to group wards into circles.
            </Typography>
            <Button variant="contained" color="warning" onClick={() => navigate('/circle-management')}>
              Open Circle Builder
            </Button>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default Dashboard;
