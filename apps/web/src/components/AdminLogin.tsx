import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle } from 'lucide-react';
import { api } from '../config/api';


const AdminLogin = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with credentials:', {
        username: credentials.username,
        hasPassword: !!credentials.password
      });

      const data = await api.post<{ success: boolean; message: string }>('/auth/admin/login', credentials);

      console.log('Login response:', data);
      console.log('Response type:', typeof data);
      console.log('Response keys:', data ? Object.keys(data) : 'No keys (data is null/undefined)');

      // Handle the case where data is undefined or null
      if (!data) {
        throw new Error('Login failed: Received empty response from server');
      }

      // Check if the response has the expected structure
      if (typeof data !== 'object') {
        throw new Error(`Login failed: Invalid response type (${typeof data})`);
      }

      if (data.success) {
        navigate('/admin');
      } else {
        const errorMsg = data.message || 'Unknown error';
        throw new Error(`Login failed: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Login error details:', {
        message: err.message,
        status: err.status,
        info: err.info,
        stack: err.stack
      });

      // Provide more specific error messages based on the error type
      let errorMessage = 'Login failed. Please try again.';

      if (err.status === 400) {
        errorMessage = 'Please enter both username and password.';
      } else if (err.status === 401) {
        errorMessage = 'Invalid username or password.';
      } else if (err.status === 500) {
        errorMessage = 'Server configuration error. Please contact administrator.';
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Login request timed out. Please try again.';
      } else if (err.message?.includes('NetworkError') || err.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('JSON') || err.message?.includes('parse')) {
        errorMessage = 'Server response error. Please try again or contact administrator.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4" style={{minHeight: '100dvh'}}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative" style={{maxHeight: '90vh', overflowY: 'auto'}}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="text-slate-600 mt-2">TCG Singles Market</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
                autoComplete="username"
                style={{fontSize: '16px'}}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
                autoComplete="current-password"
                style={{fontSize: '16px'}}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            ← Back to Shop
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;