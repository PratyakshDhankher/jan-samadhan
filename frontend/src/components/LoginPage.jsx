import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ---------- tiny helpers ----------
const InputField = ({ label, id, type = 'text', value, onChange, placeholder }) => (
    <div className="login-field">
        <label htmlFor={id} className="login-label">{label}</label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="login-input"
            required
        />
    </div>
);

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    // tabs: 'google' | 'email'
    const [tab, setTab] = useState('google');
    // email sub-mode: 'signin' | 'signup'
    const [mode, setMode] = useState('signin');

    // form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSuccess = (data) => {
        login(data.access_token, data.role, data.user_name);
        navigate(from, { replace: true });
    };

    // ---------- Google ----------
    const onGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            const form = new FormData();
            form.append('token', credentialResponse.credential);
            const res = await axios.post(`${API}/auth/google`, form);
            handleSuccess(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || 'Google sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    // ---------- Email / Password ----------
    const onEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'signup' && password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const form = new FormData();
            form.append('email', email);
            form.append('password', password);
            const url = mode === 'signup' ? `${API}/auth/register` : `${API}/auth/login`;
            if (mode === 'signup') form.append('full_name', name);
            const res = await axios.post(url, form);
            handleSuccess(res.data);
        } catch (e) {
            setError(e.response?.data?.detail || 'Authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                /* ---- Page ---- */
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%);
                    padding: 1.5rem;
                }

                /* ---- Card ---- */
                .login-card {
                    width: 100%;
                    max-width: 440px;
                    background: rgba(255,255,255,0.05);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 1.5rem;
                    padding: 2.5rem 2rem;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.4);
                    animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both;
                }

                @keyframes fadeUp {
                    from { opacity:0; transform: translateY(24px); }
                    to   { opacity:1; transform: translateY(0); }
                }

                /* ---- Logo / heading ---- */
                .login-logo {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .login-logo-title {
                    font-size: 1.85rem;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                    color: #fff;
                }
                .login-logo-title span { color: #FF9933; }
                .login-logo-sub {
                    margin-top: 0.25rem;
                    font-size: 0.85rem;
                    color: rgba(255,255,255,0.5);
                    letter-spacing: 0.03em;
                }

                /* ---- Tab switcher ---- */
                .login-tabs {
                    display: flex;
                    background: rgba(255,255,255,0.07);
                    border-radius: 0.75rem;
                    padding: 0.25rem;
                    margin-bottom: 1.75rem;
                }
                .login-tab {
                    flex: 1;
                    padding: 0.6rem 0;
                    border: none;
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    font-size: 0.875rem;
                    font-weight: 600;
                    border-radius: 0.55rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .login-tab.active {
                    background: #FF9933;
                    color: #fff;
                    box-shadow: 0 4px 14px rgba(255,153,51,0.35);
                }

                /* ---- Error banner ---- */
                .login-error {
                    background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.4);
                    color: #fca5a5;
                    border-radius: 0.6rem;
                    padding: 0.65rem 0.9rem;
                    font-size: 0.82rem;
                    margin-bottom: 1rem;
                    text-align: center;
                }

                /* ---- Google section ---- */
                .login-google-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.25rem;
                }
                .login-google-text {
                    color: rgba(255,255,255,0.55);
                    font-size: 0.875rem;
                    text-align: center;
                    line-height: 1.6;
                }

                /* ---- Form fields ---- */
                .login-field {
                    margin-bottom: 1.1rem;
                }
                .login-label {
                    display: block;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: rgba(255,255,255,0.65);
                    margin-bottom: 0.4rem;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .login-input {
                    width: 100%;
                    padding: 0.7rem 0.95rem;
                    border-radius: 0.65rem;
                    border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.08);
                    color: #fff;
                    font-size: 0.9rem;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .login-input::placeholder { color: rgba(255,255,255,0.3); }
                .login-input:focus {
                    border-color: #FF9933;
                    box-shadow: 0 0 0 3px rgba(255,153,51,0.2);
                }

                /* ---- Submit button ---- */
                .login-btn {
                    width: 100%;
                    padding: 0.8rem;
                    margin-top: 0.5rem;
                    background: linear-gradient(135deg, #FF9933, #e67e22);
                    color: #fff;
                    font-size: 0.95rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.15s;
                    letter-spacing: 0.03em;
                }
                .login-btn:hover:not(:disabled) {
                    opacity: 0.92;
                    transform: translateY(-1px);
                }
                .login-btn:disabled { opacity: 0.55; cursor: not-allowed; }

                /* ---- Mode toggle (sign in / sign up) ---- */
                .login-mode-toggle {
                    text-align: center;
                    margin-top: 1rem;
                    font-size: 0.85rem;
                    color: rgba(255,255,255,0.5);
                }
                .login-mode-toggle button {
                    background: none;
                    border: none;
                    color: #FF9933;
                    font-weight: 700;
                    cursor: pointer;
                    margin-left: 0.3rem;
                }
                .login-mode-toggle button:hover { text-decoration: underline; }

                /* ---- Divider ---- */
                .login-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 1rem 0;
                    color: rgba(255,255,255,0.25);
                    font-size: 0.78rem;
                }
                .login-divider::before,
                .login-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: rgba(255,255,255,0.12);
                }

                /* ---- Spinner ---- */
                .spinner {
                    display: inline-block;
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                    vertical-align: middle;
                    margin-right: 0.4rem;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="login-page">
                <div className="login-card">
                    {/* Logo */}
                    <div className="login-logo">
                        <div className="login-logo-title">
                            <span>Jan</span>Samadhan
                        </div>
                        <div className="login-logo-sub">AI-Powered Public Grievance Redressal</div>
                    </div>

                    {/* Tab switcher */}
                    <div className="login-tabs">
                        <button
                            className={`login-tab ${tab === 'google' ? 'active' : ''}`}
                            onClick={() => { setTab('google'); setError(''); }}
                        >
                            Google
                        </button>
                        <button
                            className={`login-tab ${tab === 'email' ? 'active' : ''}`}
                            onClick={() => { setTab('email'); setError(''); }}
                        >
                            Email &amp; Password
                        </button>
                    </div>

                    {/* Error */}
                    {error && <div className="login-error">{error}</div>}

                    {/* ---- Google Tab ---- */}
                    {tab === 'google' && (
                        <div className="login-google-wrapper">
                            <p className="login-google-text">
                                Sign in quickly and securely using your Google account.<br />
                                No extra password needed.
                            </p>
                            {loading ? (
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                                    <span className="spinner" />Signing in…
                                </div>
                            ) : (
                                <GoogleLogin
                                    onSuccess={onGoogleSuccess}
                                    onError={() => setError('Google sign-in was cancelled or failed.')}
                                    theme="filled_black"
                                    shape="pill"
                                    size="large"
                                    text="signin_with"
                                />
                            )}
                        </div>
                    )}

                    {/* ---- Email Tab ---- */}
                    {tab === 'email' && (
                        <form onSubmit={onEmailSubmit} noValidate>
                            {mode === 'signup' && (
                                <InputField
                                    label="Full Name"
                                    id="full-name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Rajesh Kumar"
                                />
                            )}
                            <InputField
                                label="Email"
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                            <InputField
                                label="Password"
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            {mode === 'signup' && (
                                <InputField
                                    label="Confirm Password"
                                    id="confirm-password"
                                    type="password"
                                    value={confirm}
                                    onChange={e => setConfirm(e.target.value)}
                                    placeholder="••••••••"
                                />
                            )}

                            <button type="submit" className="login-btn" disabled={loading}>
                                {loading && <span className="spinner" />}
                                {mode === 'signup' ? 'Create Account' : 'Sign In'}
                            </button>

                            <div className="login-mode-toggle">
                                {mode === 'signin'
                                    ? <>Don't have an account?<button type="button" onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
                                    : <>Already have an account?<button type="button" onClick={() => { setMode('signin'); setError(''); }}>Sign in</button></>
                                }
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
