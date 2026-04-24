import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Mic, Square, MapPin, Navigation } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const browserSupportsVoice = !!SpeechRecognition;

const LANGS = [
  { code: 'hi-IN', label: 'हिंदी (Hindi)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'bn-IN', label: 'বাংলা (Bengali)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
  { code: 'mr-IN', label: 'मराठी (Marathi)' },
  { code: 'gu-IN', label: 'ગુજરાતી (Gujarati)' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml-IN', label: 'മലയാളം (Malayalam)' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'ur-IN', label: 'اردو (Urdu)' },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli',
  'Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

export default function GrievanceForm() {
  const { token } = useAuth();
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState(null);

  // Location state
  const [location, setLocation] = useState({
    address: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    lat: '',
    lng: '',
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState('hi-IN');
  const [interimText, setInterimText] = useState('');
  const [voiceDone, setVoiceDone] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (document.getElementById('js-voice-styles')) return;
    const style = document.createElement('style');
    style.id = 'js-voice-styles';
    style.textContent = `
      @keyframes micPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
        50%      { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
      }
      @keyframes waveBar {
        0%,100% { height: 4px; }
        50%      { height: 20px; }
      }
      .mic-pulse { animation: micPulse 1.4s ease-in-out infinite; }
      .wave-bar  { animation: waveBar 0.6s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
    return () => recognitionRef.current?.stop();
  }, []);

  // ── GPS auto-detect location ──
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    setGpsSuccess(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          setLocation({
            address: data.display_name?.split(',').slice(0, 3).join(',') || '',
            locality: addr.suburb || addr.neighbourhood || addr.village || addr.hamlet || '',
            city: addr.city || addr.town || addr.county || '',
            state: addr.state || '',
            pincode: addr.postcode || '',
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
          });
          setGpsSuccess(true);
        } catch {
          // GPS got coords but geocoding failed — still save coords
          setLocation(prev => ({ ...prev, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
          setGpsError('Location detected but address lookup failed. Please fill manually.');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) setGpsError('Location access denied. Please allow location or fill manually.');
        else if (err.code === 2) setGpsError('Location unavailable. Please fill manually.');
        else setGpsError('Could not detect location. Please fill manually.');
      },
      { timeout: 10000 }
    );
  };

  const handleLocationChange = (field, value) => {
    setLocation(prev => ({ ...prev, [field]: value }));
  };

  // ── Voice ──
  const startListening = () => {
    if (!browserSupportsVoice) return;
    const r = new SpeechRecognition();
    r.lang = voiceLang;
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => { setIsListening(true); setVoiceDone(false); setInterimText(''); };
    r.onresult = (e) => {
      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      if (final) setText(prev => prev + final);
      setInterimText(interim);
    };
    r.onerror = () => { setIsListening(false); setInterimText(''); };
    r.onend = () => { setIsListening(false); setInterimText(''); setVoiceDone(true); };
    recognitionRef.current = r;
    r.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setVoiceDone(true);
    setInterimText('');
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
      setFile(e.target.files[0]);
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!text && !file) return;
    setIsPending(true);
    setResult(null);
    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (file) formData.append('file', file);

      // Append location fields
      if (location.address)  formData.append('address', location.address);
      if (location.locality) formData.append('locality', location.locality);
      if (location.city)     formData.append('city', location.city);
      if (location.state)    formData.append('state', location.state);
      if (location.pincode)  formData.append('pincode', location.pincode);
      if (location.lat)      formData.append('lat', location.lat);
      if (location.lng)      formData.append('lng', location.lng);

      const res = await api.post('/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult({
        success: true,
        message: res.data.message,
        analysis: res.data.ai_analysis,
        department_info: res.data.department_info,
      });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.detail || 'Submission failed. Please try again.' });
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setResult(null); setText(''); setFile(null); setFileName('');
    setVoiceDone(false); setInterimText(''); setMode('text');
    setLocation({ address: '', locality: '', city: '', state: '', pincode: '', lat: '', lng: '' });
    setGpsSuccess(false); setGpsError('');
  };

  const modeBtn = (m, icon, label) => (
    <button
      type="button"
      onClick={() => { setMode(m); stopListening(); }}
      className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
        mode === m ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy hover:bg-gray-100'
      }`}
    >
      {icon} {label}
    </button>
  );

  // ── SUCCESS STATE ──
  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 mt-10">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">Grievance Submitted!</h3>
          <p className="text-green-600 mb-4">{result.message}</p>

          {result.analysis && (
            <div className="text-left bg-white p-4 rounded border border-green-100 mt-4">
              <p className="font-semibold text-navy mb-2">AI Analysis:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li><span className="font-medium">Category:</span> {result.analysis.category}</li>
                <li><span className="font-medium">Urgency:</span> {result.analysis.urgency}/10</li>
                <li><span className="font-medium">Department:</span> {result.analysis.department}</li>
              </ul>
            </div>
          )}

          {result.department_info && (
            <div className="text-left bg-blue-50 p-5 rounded-lg border border-blue-100 mt-4 shadow-sm">
              <h4 className="font-bold text-navy mb-3">📌 Next Steps & Contact</h4>
              <div className="space-y-3 text-sm text-gray-700">
                <p><span className="font-semibold text-navy">Expected Action:</span> {result.department_info.next_step}</p>
                <p><span className="font-semibold text-navy">Resolution Timeline:</span> Within {result.department_info.sla}</p>
                <div className="flex gap-3 mt-4 pt-3 border-t border-blue-200">
                  <a href={result.department_info.website} target="_blank" rel="noreferrer"
                    className="flex-1 bg-white text-navy border border-navy text-center py-2 rounded font-semibold hover:bg-blue-50 transition">
                    🌐 Visit {result.department_info.portal_name || 'Official Portal'}
                  </a>
                  <a href={`tel:${result.department_info.helpline}`}
                    className="flex-1 bg-navy text-white text-center py-2 rounded font-semibold hover:bg-opacity-90 transition">
                    📞 Call {result.department_info.helpline}
                  </a>
                </div>
              </div>
            </div>
          )}

          <button onClick={resetForm}
            className="mt-6 px-6 py-2 bg-navy text-white rounded-lg hover:bg-opacity-90 transition font-semibold">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN FORM ──
  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 mt-10">
      <h2 className="text-2xl font-bold text-navy mb-2 flex items-center gap-2">
        <FileText className="w-6 h-6 text-saffron" />
        Lodge a Grievance
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Submit in any language — AI will translate, categorize, and route it automatically.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {modeBtn('text', <FileText className="w-4 h-4" />, 'Type')}
        {modeBtn('voice', <Mic className="w-4 h-4" />, 'Voice')}
        {modeBtn('image', <Upload className="w-4 h-4" />, 'Image')}
      </div>

      {result?.success === false && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg mb-4 border border-red-100">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── TEXT MODE ── */}
        {mode === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your complaint <span className="text-gray-400 font-normal">(any language)</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy transition text-sm"
              placeholder="Describe your grievance... e.g. नल से पानी नहीं आ रहा / Road has a large pothole near school..."
            />
            <p className="text-right text-xs text-gray-400 mt-1">{text.length} characters</p>
          </div>
        )}

        {/* ── VOICE MODE ── */}
        {mode === 'voice' && (
          <div className="space-y-4">
            {!browserSupportsVoice && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Voice input requires Chrome or Edge browser.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select language</label>
              <select value={voiceLang} onChange={e => setVoiceLang(e.target.value)} disabled={isListening}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition">
                {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col items-center gap-4 py-4">
              <button type="button" onClick={isListening ? stopListening : startListening}
                disabled={!browserSupportsVoice}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 ${
                  isListening ? 'bg-red-600 mic-pulse' : 'bg-navy hover:bg-opacity-90 shadow-lg'
                }`}>
                {isListening ? <Square className="w-7 h-7" /> : <Mic className="w-8 h-8" />}
              </button>
              {isListening && (
                <div className="flex items-center gap-1 h-7">
                  {[0.1, 0.3, 0, 0.2, 0.15, 0.35, 0.05].map((delay, i) => (
                    <div key={i} className="w-1 bg-red-500 rounded-full wave-bar" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 text-center">
                {isListening ? '🔴 Listening… tap square to stop'
                  : voiceDone ? '✅ Done — review transcript below'
                  : browserSupportsVoice ? 'Tap the mic and start speaking'
                  : 'Not supported in this browser'}
              </p>
            </div>
            {interimText && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-gray-500 italic">
                <span className="font-semibold text-blue-600 not-italic">Hearing: </span>{interimText}
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-700">Transcript</label>
                {text && (
                  <button type="button" onClick={() => { setText(''); setVoiceDone(false); }}
                    className="text-xs text-red-500 hover:text-red-700">✕ Clear</button>
                )}
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy transition text-sm"
                placeholder="Your spoken words appear here. You can also edit manually." />
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
              💡 Speak in your language — AI will automatically translate to English for processing.
            </div>
          </div>
        )}

        {/* ── IMAGE MODE ── */}
        {mode === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload image or handwritten complaint
              </label>
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-navy transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF · Handwritten supported via OCR</p>
                {fileName && (
                  <p className="text-xs text-navy font-semibold mt-2 px-3 py-1 bg-blue-50 rounded-full">
                    📎 {fileName}
                  </p>
                )}
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional context <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={text} onChange={e => setText(e.target.value)}
                placeholder="Add any other details..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy transition text-sm" />
            </div>
          </div>
        )}

        {/* ── LOCATION SECTION (shown for all modes) ── */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-saffron" />
              <span className="text-sm font-semibold text-gray-700">Location Details</span>
              <span className="text-xs text-gray-400 font-normal">(helps route your complaint faster)</span>
            </div>
            {/* GPS detect button */}
            <button
              type="button"
              onClick={detectLocation}
              disabled={gpsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-lg hover:bg-opacity-90 transition disabled:opacity-50"
            >
              {gpsLoading
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Navigation className="w-3 h-3" />
              }
              {gpsLoading ? 'Detecting…' : 'Auto-detect'}
            </button>
          </div>

          {/* GPS feedback */}
          {gpsSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2 text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Location detected successfully! You can edit the fields below if needed.
            </div>
          )}
          {gpsError && (
            <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {gpsError}
            </div>
          )}

          {/* Location fields grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
              <input
                type="text"
                value={location.address}
                onChange={e => handleLocationChange('address', e.target.value)}
                placeholder="e.g. 123, MG Road, Near Bus Stand"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Locality / Area</label>
              <input
                type="text"
                value={location.locality}
                onChange={e => handleLocationChange('locality', e.target.value)}
                placeholder="e.g. Sector 14, Andheri West"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City / District</label>
              <input
                type="text"
                value={location.city}
                onChange={e => handleLocationChange('city', e.target.value)}
                placeholder="e.g. Mumbai, Gurugram"
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
              <select
                value={location.state}
                onChange={e => handleLocationChange('state', e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition bg-white"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
              <input
                type="text"
                value={location.pincode}
                onChange={e => handleLocationChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 110001"
                maxLength={6}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy focus:border-navy transition bg-white"
              />
            </div>
          </div>

          {/* Show GPS coords if detected */}
          {location.lat && location.lng && (
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              GPS: {location.lat}, {location.lng}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isPending || (!text && !file)}
          className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-sm text-white bg-navy hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
              AI is analyzing your grievance…
            </>
          ) : (
            'Submit Grievance'
          )}
        </button>
      </form>
    </div>
  );
}
