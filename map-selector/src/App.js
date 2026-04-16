// src/App.js
import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LogIn from './pages/LogIn';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Regions from './pages/Regions';
import Circle from './pages/Circle';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import CircleDetails from './pages/CircleDetails';
import { UserProvider, UserContext } from './context/UserContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useContext(UserContext);

  if (!user) {
    return <Navigate to="/" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/" element={<LogIn />} />
        <Route element={<Navbar />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={['root', 'admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/regions"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region']}>
                <Regions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/circles"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region', 'circle']}>
                <Circle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/circles/:id"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region', 'circle']}>
                <CircleDetails />
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}

export default App;
