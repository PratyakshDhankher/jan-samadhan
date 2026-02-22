import { useActionState, useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

// API URL from env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Action function for form submission
async function submitGrievance(prevState, formData) {
    try {
        // In a real app, you'd get the token from context/storage
        // For demo, we are mocking the auth header or assuming a public/test endpoint
        // or we should have a login flow.
        // Assuming we have a mock token for development if not logged in.
        const token = localStorage.getItem('token');

        // Note: If no token, the backend will reject. 
        // For this plan, we assume user is logged in or we handle it.

        const response = await axios.post(`${API_URL}/submit`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
            }
        });

        return {
            success: true,
            message: response.data.message,
            analysis: response.data.ai_analysis
        };
    } catch (error) {
        return {
            success: false,
            message: error.response?.data?.detail || "Submission failed. Please try again."
        };
    }
}

export default function GrievanceForm() {
    const [state, formAction, isPending] = useActionState(submitGrievance, null);
    const [fileName, setFileName] = useState("");

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md border border-gray-100 mt-10">
            <h2 className="text-2xl font-bold text-navy mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-saffron" />
                Lodge a Grievance
            </h2>

            {state?.success ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-in fade-in zoom-in">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Grievance Submitted!</h3>
                    <p className="text-green-600 mb-4">{state.message}</p>
                    {state.analysis && (
                        <div className="text-left bg-white p-4 rounded border border-green-100 mt-4">
                            <p className="font-semibold text-navy">AI Analysis:</p>
                            <ul className="text-sm text-gray-700 mt-2 space-y-1">
                                <li><span className="font-medium">Category:</span> {state.analysis.category}</li>
                                <li><span className="font-medium">Urgency:</span> {state.analysis.urgency}/10</li>
                                <li><span className="font-medium">Dept:</span> {state.analysis.department}</li>
                                <li><span className="font-medium">Summary:</span> {state.analysis.english_summary}</li>
                            </ul>
                        </div>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 bg-navy text-white rounded hover:bg-opacity-90 transition"
                    >
                        Submit Another
                    </button>
                </div>
            ) : (
                <form action={formAction} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            name="text"
                            rows={5}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy focus:border-navy transition"
                            placeholder="Describe your grievance in detail (English or any Indian language)..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Image/Document)</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 border-gray-300 hover:border-navy transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    {fileName && <p className="text-xs text-navy font-medium mt-2">{fileName}</p>}
                                </div>
                                <input
                                    type="file"
                                    name="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept="image/*"
                                />
                            </label>
                        </div>
                    </div>

                    {state?.success === false && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
                            <AlertCircle className="w-5 h-5" />
                            <p className="text-sm">{state.message}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-navy hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5 mr-2" />
                                Processing (AI Analysis)...
                            </>
                        ) : (
                            "Submit Grievance"
                        )}
                    </button>
                </form>
            )}
        </div>
    );
}
