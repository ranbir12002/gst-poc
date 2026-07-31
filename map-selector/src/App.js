// src/App.js
import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LogIn from './pages/LogIn';
import Dashboard from './pages/Dashboard';
// import Users from './pages/Users';
import Wards from './pages/Wards';

import Circle from './pages/Circle';
// import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import CircleDetails from './pages/CircleDetails';
import SignUp from './pages/SignUp';
// import CircleManagement from './pages/CircleManagement';
import WardDetails from './pages/WardDetails';
import AllMap from './pages/AllMap';
import Rural from './pages/Rural';


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
        <Route path="/signup" element={<SignUp />} />

        <Route element={<Navbar />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* <Route
            path="/users"
            element={
              <ProtectedRoute roles={['root', 'admin']}>
                <Users />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/wards"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region']}>
                <Wards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wards/:id"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region']}>
                <WardDetails />
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
          {/* <Route
            path="/circle-management"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region']}>
                <CircleManagement />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/circles/:id"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region', 'circle']}>
                <CircleDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/all-map"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region', 'circle']}>
                <AllMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rural"
            element={
              <ProtectedRoute roles={['root', 'admin', 'region', 'circle']}>
                <Rural />
              </ProtectedRoute>
            }
          />
          {/* <Route path="/profile" element={<Profile />} /> */}
        </Route>
      </Routes>
    </UserProvider>
  );
}

export default App;
