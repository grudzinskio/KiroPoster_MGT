
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './components/ui/Notification';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ErrorBoundary } from './components/error/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
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
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-soft p-8 text-center">
                      <div className="text-6xl mb-6">👥</div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-3">User Management</h1>
                      <p className="text-gray-600 mb-6">User management functionality will be implemented in future tasks.</p>
                      <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm">
                        🚧 Coming Soon
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="companies" 
              element={
                <ProtectedRoute allowedRoles={['company_employee']}>
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-soft p-8 text-center">
                      <div className="text-6xl mb-6">🏢</div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-3">Company Management</h1>
                      <p className="text-gray-600 mb-6">Company management functionality will be implemented in future tasks.</p>
                      <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm">
                        🚧 Coming Soon
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="campaigns" 
              element={
                <ProtectedRoute>
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-soft p-8 text-center">
                      <div className="text-6xl mb-6">📊</div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-3">Campaign Management</h1>
                      <p className="text-gray-600 mb-6">Campaign management functionality will be implemented in future tasks.</p>
                      <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm">
                        🚧 Coming Soon
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="images" 
              element={
                <ProtectedRoute allowedRoles={['company_employee', 'contractor']}>
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl shadow-soft p-8 text-center">
                      <div className="text-6xl mb-6">📸</div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-3">Image Management</h1>
                      <p className="text-gray-600 mb-6">Image management functionality will be implemented in future tasks.</p>
                      <div className="inline-flex items-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm">
                        🚧 Coming Soon
                      </div>
                    </div>
                  </div>
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
