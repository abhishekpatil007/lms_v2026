import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptsApi } from '@/api/endpoints/attempts';
import { IconCheck, IconX, IconArrowLeft } from '@tabler/icons-react';

export const TestResultPage = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResult = async () => {
            try {
                const data = await attemptsApi.getResult(parseInt(attemptId!));
                setResult(data);
            } catch (error) {
                console.error("Error fetching result:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [attemptId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Results...</div>;
    if (!result) return <div className="p-8 text-center text-red-500">Results not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/student/tests')}
                    className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900"
                >
                    <IconArrowLeft size={20} /> Back to Tests
                </button>

                <div className="bg-white rounded-[24px] shadow-sm p-8 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{result.test_title}</h1>
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                                {result.status.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mb-1">Total Score</p>
                            <p className="text-4xl font-bold text-blue-600">{result.total_score}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-xl font-bold text-gray-800">Detailed Analysis</h2>

                        {result.answers?.map((ans: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-900 mb-2">Q{idx + 1}. {ans.question}</p>
                                        <div className="flex items-center gap-2">
                                            {ans.is_correct === true && <span className="flex items-center gap-1 text-green-600 text-sm font-medium"><IconCheck size={16} /> Correct</span>}
                                            {ans.is_correct === false && <span className="flex items-center gap-1 text-red-600 text-sm font-medium"><IconX size={16} /> Incorrect</span>}
                                            {ans.is_correct === null && <span className="text-gray-500 text-sm">Pending Evaluation</span>}
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <span className="block text-lg font-bold text-gray-700">{ans.marks_awarded}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
