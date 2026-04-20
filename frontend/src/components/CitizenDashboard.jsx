import { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2, CheckCircle, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function GrievanceCard({ g }) {
  const urgencyClass = g.urgency >= 8
    ? 'bg-red-100 text-red-800 border-red-200'
    : g.urgency >= 5
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
    : 'bg-green-100 text-green-800 border-green-200';

  const urgencyLabel = g.urgency >= 8 ? 'Critical' : g.urgency >= 5 ? 'Moderate' : 'Low';

  const date = g.created_at
    ? new Date(g.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 flex-wrap">
          {g.category && (
            <span className="text-xs font-bold bg-blue-50 text-navy border border-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
              {g.category}
            </span>
          )}
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            g.status === 'Resolved'
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-yellow-100 text-yellow-700 border-yellow-200'
          }`}>
            {g.status === 'Resolved' ? '✅' : '🕐'} {g.status}
          </span>
        </div>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed border-l-4 border-blue-100 pl-3 mb-3">
        {g.ai_summary || g.raw_text?.slice(0, 120) || 'No summary available.'}
      </p>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {g.department && <><span>🏛️</span><span>{g.department}</span></>}
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${urgencyClass}`}>
          ⚡ {g.urgency}/10 · {urgencyLabel}
        </span>
      </div>
    </div>
  );
}

export default function CitizenDashboard() {
  const { token, user } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await axios.get(`${API_URL}/grievances`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setGrievances(res.data);
      } catch (e) {
        console.error('Failed to fetch grievances', e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, [token]);

  const pending = grievances.filter(g => g.status === 'Pending');
  const resolved = grievances.filter(g => g.status === 'Resolved');

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">
          Welcome, {user?.name || 'Citizen'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">Track all your submitted grievances below.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total', value: grievances.length, icon: <FileText className="w-5 h-5" />, cls: 'bg-blue-50 text-navy' },
          { label: 'Pending', value: pending.length, icon: <Clock className="w-5 h-5" />, cls: 'bg-yellow-50 text-yellow-700' },
          { label: 'Resolved', value: resolved.length, icon: <CheckCircle className="w-5 h-5" />, cls: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`${s.cls} rounded-xl p-4 flex items-center gap-3 border border-gray-100`}>
            {s.icon}
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-xs opacity-70 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="animate-spin text-navy w-8 h-8" />
        </div>
      ) : grievances.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No grievances submitted yet</p>
          <a
            href="/submit"
            className="inline-block mt-4 px-6 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
          >
            Lodge your first grievance
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-yellow-700 uppercase tracking-wide mb-3">
                <Clock className="w-4 h-4" /> Pending ({pending.length})
              </div>
              <div className="space-y-3">
                {pending.map((g, i) => <GrievanceCard key={g._id || i} g={g} />)}
              </div>
            </div>
          )}
          {resolved.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-green-700 uppercase tracking-wide mb-3">
                <CheckCircle className="w-4 h-4" /> Resolved ({resolved.length})
              </div>
              <div className="space-y-3">
                {resolved.map((g, i) => <GrievanceCard key={g._id || i} g={g} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
