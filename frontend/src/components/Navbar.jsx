import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
    return (
        <nav className="bg-navy text-white shadow-lg sticky top-0 z-50">
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold flex items-center gap-1">
                    <span className="text-saffron">Jan</span>Samadhan
                </Link>
                <div className="flex gap-6 font-medium">
                    <Link to="/" className="hover:text-saffron transition-colors">Home</Link>
                    <Link to="/submit" className="hover:text-saffron transition-colors">Lodge Grievance</Link>
                    <Link to="/admin" className="hover:text-saffron transition-colors">Admin Dashboard</Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
