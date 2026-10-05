import React, { useState } from 'react';
import { Lock, User, UserPlus, Shield, CheckCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('Staff');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const authPayload = { ...data.user, token: data.token };
        localStorage.setItem('traveledger_auth', JSON.stringify(authPayload));
        if (onLogin) onLogin(data.user);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          name: regName || regUsername,
          role: regRole
        })
      });
      const data = await res.json();

      if (res.status === 201 && data.success) {
        setSuccess('Registration successful! Please log in with your credentials.');
        setUsername(regUsername);
        setPassword('');
        setMode('login');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-slate-200/70 dark:border-zinc-800/70 shadow-sm rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-teal-700 text-white font-black text-xl rounded-full flex items-center justify-center shadow border border-teal-400/40">
            AH
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Arafa Hafiz Ltd.</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs">Umrah & Travel Ledger Management System</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900'
            }`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs rounded-lg border border-rose-200 dark:border-rose-800/50">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs rounded-lg border border-teal-200 dark:border-teal-800/50 flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg shadow-sm text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Enter full name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Username</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Choose username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Choose password"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300 mb-1">Role</label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="pl-9 w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="Staff">Staff</option>
                  <option value="Accountant">Accountant</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg shadow-sm text-xs transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
