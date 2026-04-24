import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Loader2, CheckCircle, Clock, FileText, LayoutDashboard, PlusCircle, ListChecks, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
// ─── Grievance Card ───────────────────────────────────────────────────────────
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
        {g.english_summary || g.original_text?.slice(0, 120) || 'No summary available.'}
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'resolved'

  useEffect(() => {
    const fetchGrievances = async () => {
      try {
        const res = await api.get('/grievances');
        setGrievances(res.data);
      } catch (e) {
        console.error('Failed to fetch grievances', e);
      } finally {
        setLoading(false);
      }
    };
    fetchGrievances();
  }, []);

  const pending  = grievances.filter(g => g.status !== 'Resolved');
  const resolved = grievances.filter(g => g.status === 'Resolved');

  const visibleGrievances =
    activeTab === 'pending'  ? pending  :
    activeTab === 'resolved' ? resolved :
    grievances;

  // ── Sidebar nav items
  const navItems = [
    { id: 'all',      label: 'My Complaints',    icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pending',  label: 'Pending',           icon: <Clock           className="w-4 h-4" /> },
    { id: 'resolved', label: 'Resolved',          icon: <ListChecks      className="w-4 h-4" /> },
  ];

  return (
    <div className="flex min-h-[calc(100vh-120px)]">

      {/* ── LEFT SIDEBAR ─────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-navy text-white flex flex-col py-6 px-3 gap-1">
        {/* User greeting */}
        <div className="px-3 mb-4">
          <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold mb-1">Welcome</p>
          <p className="font-bold text-sm leading-tight truncate">{user?.name || 'Citizen'}</p>
        </div>

        <hr className="border-white/10 mb-3" />

        {/* Nav links */}
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left w-full
              ${activeTab === item.id
                ? 'bg-saffron text-white shadow'
                : 'text-blue-100 hover:bg-white/10'
              }`}
          >
            {item.icon}
            {item.label}
            {item.id === 'pending' && pending.length > 0 && (
              <span className="ml-auto bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
            {item.id === 'resolved' && resolved.length > 0 && (
              <span className="ml-auto bg-green-400 text-green-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {resolved.length}
              </span>
            )}
          </button>
        ))}

        <hr className="border-white/10 my-3" />

        {/* Quick actions */}
        <Link
          to="/submit"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Lodge Grievance
        </Link>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 px-8 py-8 bg-gray-50">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">
            Welcome, {user?.name || 'Citizen'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Track all your submitted grievances below.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Complaints',    value: grievances.length, icon: <FileText    className="w-5 h-5" />, cls: 'bg-blue-50 text-navy'         },
            { label: 'Unsolved Complaints', value: pending.length,    icon: <Clock       className="w-5 h-5" />, cls: 'bg-yellow-50 text-yellow-700' },
            { label: 'Solved Complaints',   value: resolved.length,   icon: <CheckCircle className="w-5 h-5" />, cls: 'bg-green-50 text-green-700'   },
          ].map(s => (
            <div key={s.label} className={`${s.cls} rounded-xl p-5 flex items-center gap-4 border border-gray-100 shadow-sm`}>
              {s.icon}
              <div>
                <p className="text-3xl font-bold leading-none">{s.value}</p>
                <p className="text-xs opacity-70 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">
            {activeTab === 'all' ? 'All Complaints' : activeTab === 'pending' ? 'Pending Complaints' : 'Resolved Complaints'}
          </h2>
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
            {visibleGrievances.length}
          </span>
        </div>

        {/* Grievance list */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="animate-spin text-navy w-8 h-8" />
          </div>
        ) : visibleGrievances.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No grievances here yet</p>
            <a
              href="/submit"
              className="inline-block mt-4 px-6 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
            >
              Lodge your first grievance
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleGrievances.map((g, i) => (
              <GrievanceCard key={g._id || i} g={g} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
