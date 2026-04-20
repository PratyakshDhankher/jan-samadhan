import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Loader2, CheckCircle, Clock, AlertTriangle, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PIE_COLORS = ['#003366', '#FF9933', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const URGENCY_COLORS = {
  10: '#7f1d1d', 9: '#991b1b', 8: '#b91c1c',
  7: '#c2410c', 6: '#d97706', 5: '#f59e0b',
  4: '#84cc16', 3: '#22c55e', 2: '#16a34a', 1: '#15803d'
};

export default function AdminDashboard() {
  const { token } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview'); // 'overview' | 'grievances' | 'urgency'
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, sRes] = await Promise.all([
        axios.get(`${API_URL}/grievances`, { headers }),
        axios.get(`${API_URL}/stats`, { headers }),
      ]);
      setGrievances(gRes.data);
      setStats(sRes.data);
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Resolved' : 'Pending';
    setUpdating(id);
    try {
      const form = new FormData();
      form.append('status', newStatus);
      await axios.patch(`${API_URL}/grievances/${id}`, form, { headers });
      setGrievances(prev =>
        prev.map(g => g._id === id ? { ...g, status: newStatus } : g)
      );
    } catch (e) {
      alert('Failed to update status.');
    } finally {
      setUpdating(null);
    }
  };

  const getUrgencyBadge = (score) => {
    if (score >= 8) return 'bg-red-100 text-red-800 border border-red-200';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-green-100 text-green-800 border border-green-200';
  };

  const total = grievances.length;
  const pending = grievances.filter(g => g.status === 'Pending').length;
  const resolved = grievances.filter(g => g.status === 'Resolved').length;
  const critical = grievances.filter(g => g.urgency >= 8).length;

  const filtered = grievances
    .filter(g => filter === 'All' || g.status === filter)
    .filter(g => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        g.category?.toLowerCase().includes(q) ||
        g.department?.toLowerCase().includes(q) ||
        g.ai_summary?.toLowerCase().includes(q)
      );
    });

  const urgencyDist = Object.entries(
    grievances.reduce((acc, g) => {
      acc[g.urgency] = (acc[g.urgency] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([k, v]) => ({ score: `${k}`, count: v }))
    .sort((a, b) => Number(a.score) - Number(b.score));

  const TabBtn = ({ id, label, icon }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        tab === id
          ? 'bg-navy text-white shadow-sm'
          : 'text-gray-500 hover:text-navy hover:bg-gray-100'
      }`}
    >
      {icon} {label}
    </button>
  );

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="animate-spin text-navy w-10 h-10" />
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-navy mb-6">Admin Dashboard</h1>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: total, icon: <BarChart2 className="w-5 h-5" />, color: 'bg-blue-50 text-navy' },
          { label: 'Pending', value: pending, icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-50 text-yellow-700' },
          { label: 'Resolved', value: resolved, icon: <CheckCircle className="w-5 h-5" />, color: 'bg-green-50 text-green-700' },
          { label: 'Critical (8+)', value: critical, icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-red-50 text-red-700' },
        ].map(c => (
          <div key={c.label} className={`${c.color} p-4 rounded-xl border border-gray-100 flex items-center gap-3`}>
            {c.icon}
            <div>
              <p className="text-2xl font-bold leading-none">{c.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        <TabBtn id="overview" label="Overview" icon={<BarChart2 className="w-4 h-4" />} />
        <TabBtn id="grievances" label="All Grievances" icon={<Clock className="w-4 h-4" />} />
        <TabBtn id="urgency" label="Urgency View" icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Grievances by Category</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={4} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar chart — resolution status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Resolution Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Pending', value: pending, fill: '#FF9933' },
                  { name: 'Resolved', value: resolved, fill: '#003366' },
                  { name: 'Critical', value: critical, fill: '#dc2626' },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {[
                      { fill: '#FF9933' }, { fill: '#003366' }, { fill: '#dc2626' }
                    ].map((c, i) => <Cell key={i} fill={c.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent grievances */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Recent Grievances</h3>
            <div className="space-y-3">
              {grievances.slice(0, 5).map((g, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: URGENCY_COLORS[g.urgency] || '#999' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{g.category || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {g.ai_summary || g.raw_text?.slice(0, 80) || '—'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${getUrgencyBadge(g.urgency)}`}>
                    {g.urgency}/10
                  </span>
                </div>
              ))}
              {grievances.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No grievances yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ GRIEVANCES TABLE TAB ══ */}
      {tab === 'grievances' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search category, department, summary..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition"
            />
            <div className="flex gap-1">
              {['All', 'Pending', 'Resolved'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Summary</th>
                  <th className="px-6 py-3">Urgency</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No grievances found</td></tr>
                ) : filtered.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-navy text-sm">{g.category || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{g.department || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate" title={g.ai_summary}>
                      {g.ai_summary || g.raw_text?.slice(0, 60) || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getUrgencyBadge(g.urgency)}`}>
                        {g.urgency}/10
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        g.status === 'Resolved'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleResolve(g._id, g.status)}
                        disabled={updating === g._id}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50 ${
                          g.status === 'Pending'
                            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                            : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                        }`}
                      >
                        {updating === g._id ? '…' : g.status === 'Pending' ? '✅ Resolve' : '↩ Reopen'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {total} grievances
          </div>
        </div>
      )}

      {/* ══ URGENCY TAB ══ */}
      {tab === 'urgency' && (
        <div className="space-y-6">
          {/* Critical banner */}
          <div className="flex items-center gap-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-red-700">Critical Grievances (Urgency 8–10)</p>
              <p className="text-sm text-red-500">These require immediate attention</p>
            </div>
            <span className="text-3xl font-black text-red-700">{critical}</span>
          </div>

          {/* Urgency distribution bar chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Urgency Score Distribution</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={urgencyDist} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                  <XAxis dataKey="score" tick={{ fontSize: 12 }} label={{ value: 'Score', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={v => [v, 'Grievances']} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {urgencyDist.map((entry, i) => (
                      <Cell key={i} fill={URGENCY_COLORS[Number(entry.score)] || '#999'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-2 text-xs font-semibold">
              <span className="text-green-600">● 1–4 Low</span>
              <span className="text-yellow-600">● 5–7 Moderate</span>
              <span className="text-red-600">● 8–10 Critical</span>
            </div>
          </div>

          {/* Critical grievances list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-red-50">
              <h3 className="text-base font-semibold text-red-700">Critical Grievances — Needs Immediate Action</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {grievances
                .filter(g => g.urgency >= 8)
                .sort((a, b) => b.urgency - a.urgency)
                .map((g) => (
                  <div key={g._id} className="flex items-start gap-4 px-6 py-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                      style={{ background: URGENCY_COLORS[g.urgency] || '#b91c1c' }}
                    >
                      {g.urgency}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-red-700 text-sm">{g.category} · {g.department}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {g.ai_summary || g.raw_text?.slice(0, 120) || '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolve(g._id, g.status)}
                      disabled={updating === g._id || g.status === 'Resolved'}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition disabled:opacity-50 ${
                        g.status === 'Resolved'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {updating === g._id ? '…' : g.status === 'Resolved' ? '✅ Done' : 'Resolve'}
                    </button>
                  </div>
                ))}
              {critical === 0 && (
                <p className="text-center text-gray-400 text-sm py-12">🎉 No critical grievances right now</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
