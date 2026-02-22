import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import GrievanceForm from './components/GrievanceForm';
import AdminDashboard from './components/AdminDashboard';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow bg-gray-50">
                    <Routes>
                        <Route path="/" element={
                            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
                                <h1 className="text-5xl font-bold text-navy mb-6">Jan Samadhan</h1>
                                <p className="text-xl text-gray-600 max-w-2xl mb-8">
                                    AI-Powered Public Grievance Redressal System.
                                    Submit your grievance in any Indian language and let our AI route it to the right department.
                                </p>
                                <div className="flex gap-4">
                                    <a href="/submit" className="px-8 py-3 bg-saffron text-white rounded-lg font-semibold shadow hover:bg-opacity-90 transition">
                                        Lodge Grievance
                                    </a>
                                    <a href="/admin" className="px-8 py-3 bg-white text-navy border border-navy rounded-lg font-semibold hover:bg-gray-50 transition">
                                        Admin Login
                                    </a>
                                </div>
                            </div>
                        } />
                        <Route path="/submit" element={<GrievanceForm />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                    </Routes>
                </main>
                <footer className="bg-navy text-white text-center py-6">
                    <p className="text-sm opacity-70">© 2026 Jan Samadhan. All Rights Reserved.</p>
                </footer>
            </div>
        </Router>
    );
}

export default App;
