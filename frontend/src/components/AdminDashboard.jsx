import { useEffect, useState } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const COLORS = ['#003366', '#FF9933', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
    const [grievances, setGrievances] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const [grievancesRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/grievances`, { headers }),
                axios.get(`${API_URL}/stats`, { headers })
            ]);

            setGrievances(grievancesRes.data);
            setStats(statsRes.data);
        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setLoading(false);
        }
    };

    const getUrgencyColor = (score) => {
        if (score >= 8) return 'bg-red-100 text-red-800 border-red-200';
        if (score >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-green-100 text-green-800 border-green-200';
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-navy w-10 h-10" /></div>;

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold text-navy mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* Stats Card / Chart */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 col-span-1">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Grievances by Category</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 col-span-1 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Total Grievances</p>
                            <p className="text-3xl font-bold text-navy">{grievances.length}</p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">High Urgency (7+)</p>
                            <p className="text-3xl font-bold text-red-600">
                                {grievances.filter(g => g.urgency > 7).length}
                            </p>
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500">Pending</p>
                            <p className="text-3xl font-bold text-yellow-600">
                                {grievances.filter(g => g.status === 'Pending').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700">Recent Grievances</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                                <th className="px-6 py-3">ID</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3">Department</th>
                                <th className="px-6 py-3">Urgency</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Summary</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {grievances.map((g) => (
                                <tr key={g._id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-mono text-sm text-gray-500">#{g._id.substring(18)}</td>
                                    <td className="px-6 py-4 font-medium text-navy">{g.category || 'N/A'}</td>
                                    <td className="px-6 py-4 text-gray-600">{g.department || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getUrgencyColor(g.urgency)}`}>
                                            {g.urgency}/10
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                            {g.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={g.ai_summary}>
                                        {g.ai_summary}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
