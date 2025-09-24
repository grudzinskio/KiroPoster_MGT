
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Placeholder routes for future implementation */}
            <Route 
              path="users" 
              element={
                <ProtectedRoute allowedRoles={['company_employee']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-gray-600 mt-2">User management functionality will be implemented in future tasks.</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="companies" 
              element={
                <ProtectedRoute allowedRoles={['company_employee']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Company Management</h1>
                    <p className="text-gray-600 mt-2">Company management functionality will be implemented in future tasks.</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="campaigns" 
              element={
                <ProtectedRoute>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Campaign Management</h1>
                    <p className="text-gray-600 mt-2">Campaign management functionality will be implemented in future tasks.</p>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="images" 
              element={
                <ProtectedRoute allowedRoles={['company_employee', 'contractor']}>
                  <div className="p-6">
                    <h1 className="text-2xl font-bold">Image Management</h1>
                    <p className="text-gray-600 mt-2">Image management functionality will be implemented in future tasks.</p>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
