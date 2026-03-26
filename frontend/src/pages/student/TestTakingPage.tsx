
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    IconClock,
    IconAlertTriangle,
    IconFile,
    IconCheck,
    IconX,
    IconUpload,
    IconPlayerPlay,
    IconEye,
    IconFlag,
    IconFlagFilled,
    IconMinus,
    IconArrowLeft,
    IconArrowRight,
    IconChevronLeft,
    IconSend,
    IconCloudUpload,
    IconFileCheck,
    IconCircleDashed,
} from '@tabler/icons-react';
import { attemptsApi } from '@/api/endpoints/attempts';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BlockListSelector } from '@/components/student/BlockListSelector';

export const TestTakingPage = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'ATTEMPT_SELECTION' | 'BLOCK_SELECTION' | 'TAKING_BLOCK' | 'RESULT'>('ATTEMPT_SELECTION');

    // Data States
    const [attemptsList, setAttemptsList] = useState<any[]>([]);
    const [attempt, setAttempt] = useState<any>(null);
    const [activeBlock, setActiveBlock] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);

    // Test Taking States
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<any>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [submissionLoading, setSubmissionLoading] = useState(false);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [showReviewSummary, setShowReviewSummary] = useState(false);
    const [timerWarning, setTimerWarning] = useState<'none' | '5min' | '1min'>('none');

    // Initial Load: Fetch Attempts
    useEffect(() => {
        loadAttempts();
    }, [testId]);

    const loadAttempts = async () => {
        setLoading(true);
        try {
            const list = await attemptsApi.getMyAttempts(parseInt(testId!));
            setAttemptsList(list);
            setView('ATTEMPT_SELECTION');
        } catch (error) {
            console.error("Error loading attempts:", error);
            alert("Failed to load attempts");
        } finally {
            setLoading(false);
        }
    };

    // Actions
    const handleStartNewAttempt = async () => {
        setLoading(true);
        try {
            const newAttempt = await attemptsApi.start(parseInt(testId!));
            setAttempt(newAttempt);
            setView('BLOCK_SELECTION');
        } catch (error: any) {
            console.error("Error starting attempt:", error);
            alert(error.response?.data?.message || "Failed to start attempt");
        } finally {
            setLoading(false);
        }
    };

    const handleResumeAttempt = async (attemptId: number) => {
        setLoading(true);
        try {
            const data = await attemptsApi.resume(parseInt(testId!));
            setAttempt(data.attempt);
            if (data.activeBlock) {
                await resumeBlock(data.attempt.id, data.activeBlock.block_id, data.activeBlock.duration_minutes, data.activeBlock.start_time);
            } else {
                setView('BLOCK_SELECTION');
            }
        } catch (error) {
            console.error(error);
            alert("Failed to resume attempt");
        } finally {
            setLoading(false);
        }
    };

    const resumeBlock = async (attemptId: number, blockId: number, durationMinutes: number, startTimeStr: string) => {
        const blockData = await attemptsApi.startBlock(attemptId, blockId);
        setActiveBlock(blockData.attemptBlock);
        setQuestions(blockData.questions);

        const start = new Date(startTimeStr).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = (now - start) / 1000;
        const totalSeconds = durationMinutes * 60;
        const remaining = Math.max(0, totalSeconds - elapsedSeconds);

        setTimeLeft(remaining);
        setView('TAKING_BLOCK');
    };

    // Timer
    useEffect(() => {
        if (view !== 'TAKING_BLOCK' || !timeLeft || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitBlock(true);
                    return 0;
                }
                const next = prev - 1;
                if (next === 300) setTimerWarning('5min');
                if (next === 60) setTimerWarning('1min');
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft, view]);


    const handleStartBlock = async (blockId: number) => {
        try {
            const data = await attemptsApi.startBlock(attempt.id, blockId);
            setActiveBlock(data.attemptBlock);
            setQuestions(data.questions);
            setAnswers({});
            setCurrentQuestionIndex(0);
            setFlaggedQuestions(new Set());
            setShowReviewSummary(false);
            setTimerWarning('none');
            setTimeLeft(60 * 60);
            setView('TAKING_BLOCK');
        } catch (error) {
            console.error('Error starting block:', error);
        }
    };

    const handleSubmitBlock = async (auto = false) => {
        if (!auto && !confirm("Are you sure you want to submit this section?")) return;

        setSubmissionLoading(true);
        try {
            const formattedAnswers = Object.entries(answers).map(([qId, ans]: [string, any]) => ({
                question_id: parseInt(qId),
                selected_option_id: ans.type === 'MCQ' ? ans.value : null,
                text_answer: ans.type === 'SHORT_ANSWER' ? ans.value : null
            }));

            const response = await attemptsApi.submitBlock(attempt.id, activeBlock.block_id, formattedAnswers);

            setActiveBlock(null);
            setQuestions([]);

            if (response.isFinal) {
                setView('ATTEMPT_SELECTION');
                loadAttempts();
            } else {
                setView('BLOCK_SELECTION');
            }
        } catch (error) {
            console.error("Error submitting block:", error);
            alert("Submission failed. Please try again.");
        } finally {
            setSubmissionLoading(false);
        }
    };

    const handleViewResult = (attemptId: number) => {
        navigate(`/student/tests/${attemptId}/result`);
    };

    const isAnswered = (q: any) => answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id]?.value !== undefined && answers[q.id]?.value !== '';

    // Render Helpers
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="relative">
                        <div className="h-12 w-12 rounded-full border-[3px] border-gray-200" />
                        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-violet-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-500">Loading...</p>
                </motion.div>
            </div>
        );
    }

    // VIEW 1: ATTEMPT SELECTION
    if (view === 'ATTEMPT_SELECTION') {
        const ongoingCount = attemptsList.filter(a => a.status === 'ongoing').length;
        const completedCount = attemptsList.filter(a => ['submitted', 'evaluated', 'completed'].includes(a.status)).length;

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
                <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
                    {/* Back Button */}
                    <motion.button
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => navigate('/student/tests')}
                        className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors mb-8"
                    >
                        <IconChevronLeft size={18} />
                        Back to Tests
                    </motion.button>

                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                            Test Attempts
                        </h1>
                        <p className="mt-2 text-gray-500">
                            Select an attempt to resume or start a new one.
                        </p>
                        {attemptsList.length > 0 && (
                            <div className="mt-4 flex gap-3">
                                {ongoingCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-200">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        {ongoingCount} in progress
                                    </span>
                                )}
                                {completedCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-200">
                                        <IconCheck size={12} />
                                        {completedCount} completed
                                    </span>
                                )}
                            </div>
                        )}
                    </motion.div>

                    {/* Attempts List */}
                    <div className="space-y-3">
                        {attemptsList.map((att, idx) => {
                            const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
                                ongoing: { bg: 'bg-blue-50 ring-blue-200', text: 'text-blue-700', icon: <IconCircleDashed size={14} className="animate-spin-slow" />, label: 'In Progress' },
                                submitted: { bg: 'bg-amber-50 ring-amber-200', text: 'text-amber-700', icon: <IconClock size={14} />, label: 'Submitted' },
                                evaluated: { bg: 'bg-emerald-50 ring-emerald-200', text: 'text-emerald-700', icon: <IconCheck size={14} />, label: 'Evaluated' },
                                completed: { bg: 'bg-emerald-50 ring-emerald-200', text: 'text-emerald-700', icon: <IconCheck size={14} />, label: 'Completed' },
                            };
                            const config = statusConfig[att.status] || statusConfig.submitted;

                            return (
                                <motion.div
                                    key={att.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                    className={cn(
                                        "group rounded-2xl border bg-white p-5 transition-all hover:shadow-lg",
                                        att.status === 'ongoing' ? "border-blue-200 shadow-md shadow-blue-100/50" : "border-gray-100 shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Attempt Number Badge */}
                                            <div className={cn(
                                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                                                att.status === 'ongoing' ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200" :
                                                att.status === 'evaluated' ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200" :
                                                "bg-gray-100 text-gray-600"
                                            )}>
                                                #{idx + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2.5 mb-0.5">
                                                    <span className="font-semibold text-gray-900">Attempt {idx + 1}</span>
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                                        config.bg, config.text, `ring-${att.status === 'ongoing' ? 'blue' : att.status === 'evaluated' ? 'emerald' : 'amber'}-200`
                                                    )}>
                                                        {config.icon}
                                                        {config.label}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(att.created_at || att.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            {att.status === 'ongoing' && (
                                                <button
                                                    onClick={() => handleResumeAttempt(att.id)}
                                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-200/70 transition-all"
                                                >
                                                    <IconPlayerPlay size={16} />
                                                    Resume
                                                </button>
                                            )}
                                            {att.status === 'submitted' && (
                                                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-600 ring-1 ring-inset ring-amber-200">
                                                    <IconClock size={16} />
                                                    Awaiting Review
                                                </div>
                                            )}
                                            {att.status === 'evaluated' && (
                                                <button
                                                    onClick={() => handleViewResult(att.id)}
                                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
                                                >
                                                    <IconEye size={16} />
                                                    View Result
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {attemptsList.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center"
                            >
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
                                    <IconPlayerPlay size={28} />
                                </div>
                                <p className="text-gray-900 font-semibold text-lg mb-1">No attempts yet</p>
                                <p className="text-gray-500 text-sm">Start your first attempt below</p>
                            </motion.div>
                        )}

                        <motion.button
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: attemptsList.length * 0.06 + 0.1 }}
                            onClick={handleStartNewAttempt}
                            className="group w-full rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-[1px] shadow-lg shadow-violet-200/50 hover:shadow-xl hover:shadow-violet-300/50 transition-all"
                        >
                            <div className="flex items-center justify-center gap-2.5 rounded-[15px] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 py-3.5 font-semibold text-white">
                                <IconPlayerPlay size={20} />
                                Start New Attempt
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    }

    // VIEW 2: BLOCK SELECTION
    if (view === 'BLOCK_SELECTION' && attempt) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30 p-4 sm:p-6 flex justify-center items-start pt-12">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="max-w-2xl w-full"
                >
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 md:p-8 shadow-xl shadow-gray-200/40">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Select Section</h1>
                                <p className="text-sm text-gray-500 mt-1">Choose a section to begin answering</p>
                            </div>
                            <button
                                onClick={() => setView('ATTEMPT_SELECTION')}
                                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                            >
                                <IconChevronLeft size={16} />
                                Back
                            </button>
                        </div>

                        <BlockListSelector
                            testId={parseInt(testId!)}
                            onStartBlock={handleStartBlock}
                            attemptId={attempt.id}
                        />
                    </div>
                </motion.div>
            </div>
        );
    }

    // VIEW 3: ACTIVE TEST
    if (view === 'TAKING_BLOCK' && activeBlock) {
        if (!questions || questions.length === 0) {
            return (
                <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-full border-[3px] border-gray-200" />
                        <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-violet-500" />
                    </div>
                </div>
            );
        }
        const currentQ = questions[currentQuestionIndex];
        const answeredCount = questions.filter(q => isAnswered(q)).length;
        const progressPct = Math.round((answeredCount / questions.length) * 100);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex flex-col">
                {/* Top Bar */}
                <div className={cn(
                    "sticky top-0 z-10 border-b backdrop-blur-xl transition-colors",
                    timerWarning === '1min' ? "bg-red-50/90 border-red-200" :
                    timerWarning === '5min' ? "bg-amber-50/90 border-amber-200" :
                    "bg-white/90 border-gray-100"
                )}>
                    <div className="max-w-5xl mx-auto px-4 sm:px-6">
                        <div className="flex items-center justify-between h-16">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 font-bold text-sm">
                                    S{activeBlock?.order_index}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-sm font-semibold text-gray-900">Section {activeBlock?.order_index}</p>
                                    <p className="text-[11px] text-gray-400">{answeredCount}/{questions.length} answered</p>
                                </div>
                            </div>

                            {/* Progress bar (center) */}
                            <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs mx-8">
                                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 0.4 }}
                                    />
                                </div>
                                <span className="text-xs font-semibold text-gray-500 tabular-nums">{progressPct}%</span>
                            </div>

                            {/* Timer */}
                            <div className={cn(
                                "flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-lg font-bold tabular-nums transition-all",
                                timerWarning === '1min' ? "bg-red-100 text-red-600 animate-pulse shadow-md shadow-red-200/50" :
                                timerWarning === '5min' ? "bg-amber-100 text-amber-600 animate-pulse" :
                                "bg-gray-100 text-gray-700"
                            )}>
                                <IconClock size={18} className={timerWarning === '1min' ? "text-red-500" : timerWarning === '5min' ? "text-amber-500" : "text-gray-400"} />
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
                    {/* Question Navigator */}
                    <div className="mb-6 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                        {questions.map((q, i) => {
                            const answered = isAnswered(q);
                            const flagged = flaggedQuestions.has(q.id);
                            const current = i === currentQuestionIndex;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestionIndex(i)}
                                    className={cn(
                                        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all",
                                        current ? "bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-110" :
                                        answered ? "bg-violet-500 text-white shadow-sm" :
                                        "bg-white text-gray-400 border border-gray-200 hover:border-gray-300",
                                        flagged && !current && "ring-2 ring-amber-400 ring-offset-1"
                                    )}
                                >
                                    {i + 1}
                                    {flagged && (
                                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border-2 border-white" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Question Card */}
                    <motion.div
                        key={currentQ.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/30 overflow-hidden"
                    >
                        {/* Question Header */}
                        <div className="flex items-center justify-between gap-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white px-6 py-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 items-center rounded-lg bg-violet-100 px-3 text-xs font-bold text-violet-700">
                                    Q{currentQuestionIndex + 1}/{questions.length}
                                </span>
                                <span className={cn(
                                    "rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                                    currentQ.type === 'MCQ' ? "bg-blue-50 text-blue-600" :
                                    currentQ.type === 'SHORT_ANSWER' ? "bg-purple-50 text-purple-600" :
                                    "bg-amber-50 text-amber-600"
                                )}>
                                    {currentQ.type === 'MCQ' ? 'Multiple Choice' : currentQ.type === 'SHORT_ANSWER' ? 'Written' : 'File Upload'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-400">{currentQ.marks} {currentQ.marks === 1 ? 'mark' : 'marks'}</span>
                                <button
                                    onClick={() => {
                                        setFlaggedQuestions(prev => {
                                            const next = new Set(prev);
                                            if (next.has(currentQ.id)) next.delete(currentQ.id);
                                            else next.add(currentQ.id);
                                            return next;
                                        });
                                    }}
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                                        flaggedQuestions.has(currentQ.id) ? "bg-amber-100 text-amber-600" : "bg-gray-50 text-gray-300 hover:bg-gray-100 hover:text-gray-500"
                                    )}
                                    title={flaggedQuestions.has(currentQ.id) ? "Unflag question" : "Flag for review"}
                                >
                                    {flaggedQuestions.has(currentQ.id) ? <IconFlagFilled size={16} /> : <IconFlag size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Question Body */}
                        <div className="p-6 sm:p-8">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed mb-6">
                                {currentQ.content}
                            </h3>

                            {currentQ.reference_media_url && (() => {
                                let urls: string[] = [];
                                try { urls = JSON.parse(currentQ.reference_media_url); } catch { urls = [currentQ.reference_media_url]; }
                                return urls.length > 0 ? (
                                    <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-3">
                                        <div className={cn("flex gap-3", urls.length === 1 ? "justify-center" : "flex-wrap")}>
                                            {urls.map((url: string, i: number) => (
                                                <img key={i} src={url} className="max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity" alt={`Reference ${i + 1}`} onClick={() => window.open(url, '_blank')} />
                                            ))}
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Answer Area */}
                            <div className="space-y-3">
                                {currentQ.type === 'MCQ' && (
                                    <div className="space-y-2.5">
                                        {currentQ.options?.map((opt: any, optIdx: number) => {
                                            const selected = answers[currentQ.id]?.value === opt.id;
                                            const letter = String.fromCharCode(65 + optIdx);
                                            return (
                                                <label
                                                    key={opt.id}
                                                    className={cn(
                                                        "group flex items-center gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all",
                                                        selected
                                                            ? "border-violet-400 bg-violet-50/70 shadow-sm shadow-violet-100"
                                                            : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
                                                    )}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`q-${currentQ.id}`}
                                                        className="hidden"
                                                        onChange={() => setAnswers({ ...answers, [currentQ.id]: { value: opt.id, type: 'MCQ' } })}
                                                    />
                                                    <div className={cn(
                                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all",
                                                        selected
                                                            ? "bg-violet-500 text-white shadow-sm"
                                                            : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                                                    )}>
                                                        {letter}
                                                    </div>
                                                    <span className={cn(
                                                        "text-[15px] leading-relaxed transition-colors",
                                                        selected ? "text-violet-900 font-medium" : "text-gray-700"
                                                    )}>
                                                        {opt.content}
                                                    </span>
                                                    {selected && (
                                                        <IconCheck size={18} className="ml-auto text-violet-500 shrink-0" />
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {currentQ.type === 'SHORT_ANSWER' && (
                                    <div className="space-y-2">
                                        <textarea
                                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 p-5 text-[15px] leading-relaxed text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 resize-none"
                                            placeholder="Write your answer here..."
                                            rows={6}
                                            onChange={(e) => setAnswers({ ...answers, [currentQ.id]: { value: e.target.value, type: 'SHORT_ANSWER' } })}
                                            value={answers[currentQ.id]?.value || ''}
                                        />
                                        <div className="flex justify-end">
                                            <span className="text-xs text-gray-400">
                                                {(answers[currentQ.id]?.value || '').length} characters
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {currentQ.type === 'FILE_UPLOAD' && (
                                    <div className="space-y-3">
                                        <div className={cn(
                                            "rounded-xl border-2 border-dashed p-6 text-center transition-all",
                                            "border-gray-200 bg-gray-50/50 hover:border-violet-300 hover:bg-violet-50/30"
                                        )}>
                                            <label className="cursor-pointer flex flex-col items-center gap-3">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                                                    <IconCloudUpload size={28} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-700">Upload files</p>
                                                    <p className="text-sm text-gray-400">Click to browse — multiple files supported</p>
                                                </div>
                                                <input type="file" multiple className="hidden" onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    if (files.length > 0) {
                                                        const formData = new FormData();
                                                        formData.append('attempt_id', String(attempt.id));
                                                        formData.append('question_id', String(currentQ.id));
                                                        files.forEach(f => formData.append('answer_files', f));
                                                        attemptsApi.uploadFile(formData).then(() => {
                                                            const existing = answers[currentQ.id]?.value || '';
                                                            const names = existing ? existing + ', ' + files.map(f => f.name).join(', ') : files.map(f => f.name).join(', ');
                                                            setAnswers({ ...answers, [currentQ.id]: { value: names, type: 'FILE_UPLOAD' } });
                                                        });
                                                        e.target.value = '';
                                                    }
                                                }} />
                                            </label>
                                        </div>
                                        {answers[currentQ.id] && (
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <IconFileCheck size={18} className="text-emerald-600" />
                                                    <p className="font-semibold text-sm text-emerald-700">Files Uploaded</p>
                                                </div>
                                                <p className="text-xs text-emerald-600">{answers[currentQ.id]?.value}</p>
                                            </div>
                                        )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/50 px-6 py-4">
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQuestionIndex === 0}
                                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                            >
                                <IconArrowLeft size={16} />
                                Previous
                            </button>

                            {currentQuestionIndex < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 transition-all"
                                >
                                    Next
                                    <IconArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowReviewSummary(true)}
                                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                                >
                                    <IconSend size={16} />
                                    Review & Submit
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Review Summary Modal */}
                <AnimatePresence>
                    {showReviewSummary && (() => {
                        const answeredTotal = questions.filter(q => isAnswered(q)).length;
                        const unansweredCount = questions.length - answeredTotal;
                        const flaggedCount = questions.filter(q => flaggedQuestions.has(q.id)).length;
                        return (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                            >
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                    className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden"
                                >
                                    {/* Modal Header */}
                                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-white">
                                        <h3 className="text-lg font-bold">Review Before Submitting</h3>
                                        <div className="flex gap-4 mt-3">
                                            <span className="flex items-center gap-1.5 text-sm font-medium text-violet-100">
                                                <IconCheck size={16} /> {answeredTotal} Answered
                                            </span>
                                            <span className="flex items-center gap-1.5 text-sm font-medium text-violet-200">
                                                <IconMinus size={16} /> {unansweredCount} Skipped
                                            </span>
                                            {flaggedCount > 0 && (
                                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-300">
                                                    <IconFlagFilled size={16} /> {flaggedCount} Flagged
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question List */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <div className="space-y-1">
                                            {questions.map((q, i) => {
                                                const qAnswered = isAnswered(q);
                                                const qFlagged = flaggedQuestions.has(q.id);
                                                return (
                                                    <button
                                                        key={q.id}
                                                        onClick={() => { setCurrentQuestionIndex(i); setShowReviewSummary(false); }}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                                                    >
                                                        <span className={cn(
                                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                                            qAnswered ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400"
                                                        )}>
                                                            {i + 1}
                                                        </span>
                                                        <span className="flex-1 text-sm text-gray-700 truncate group-hover:text-gray-900">{q.content}</span>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {qFlagged && <IconFlagFilled size={13} className="text-amber-400" />}
                                                            {qAnswered ? (
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white">
                                                                    <IconCheck size={12} />
                                                                </span>
                                                            ) : (
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-gray-400">
                                                                    <IconMinus size={12} />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="border-t border-gray-100 p-4 flex gap-3">
                                        <button
                                            onClick={() => setShowReviewSummary(false)}
                                            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Go Back
                                        </button>
                                        <button
                                            onClick={() => { setShowReviewSummary(false); handleSubmitBlock(); }}
                                            disabled={submissionLoading}
                                            className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-70"
                                        >
                                            {submissionLoading ? 'Submitting...' : 'Confirm & Submit'}
                                        </button>
                                    </div>
                                </motion.div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>
            </div>
        );
    }

    return <div>Unknown View</div>;
};
