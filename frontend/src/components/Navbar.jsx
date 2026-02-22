import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold flex items-center gap-1">
                    <span className="text-saffron">Jan</span>Samadhan
                </Link>
                <div className="flex gap-6 font-medium items-center">
                    <Link to="/" className="hover:text-saffron transition-colors">Home</Link>
                    <Link to="/submit" className="hover:text-saffron transition-colors">Lodge Grievance</Link>
                    <Link to="/admin" className="hover:text-saffron transition-colors">Admin Dashboard</Link>

                    {user ? (
                        <div className="flex items-center gap-3 ml-2">
                            <span className="text-sm opacity-75">
                                👤 {user.name}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-1.5 text-sm font-semibold rounded-lg border border-white/30 hover:bg-white hover:text-navy transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="px-5 py-1.5 text-sm font-semibold rounded-lg bg-saffron hover:bg-opacity-90 transition-colors"
                        >
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
