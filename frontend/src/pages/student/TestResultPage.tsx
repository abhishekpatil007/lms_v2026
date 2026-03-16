import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { attemptsApi } from '@/api/endpoints/attempts';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    IconArrowLeft,
    IconCheck,
    IconX,
    IconClock,
    IconTrophy,
    IconChevronDown,
    IconChevronUp,
    IconTarget,
    IconCircleCheck,
    IconCircleX,
} from '@tabler/icons-react';

// ---------------------------------------------------------------------------
// Score Ring SVG
// ---------------------------------------------------------------------------
const ScoreRing = ({ percentage }: { percentage: number }) => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const gradientId = 'score-gradient';
    const colors =
        percentage >= 70
            ? { from: '#10b981', to: '#059669' }
            : percentage >= 40
              ? { from: '#f59e0b', to: '#d97706' }
              : { from: '#ef4444', to: '#dc2626' };

    return (
        <svg width={140} height={140} className="transform -rotate-90">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={colors.from} />
                    <stop offset="100%" stopColor={colors.to} />
                </linearGradient>
            </defs>
            <circle
                cx={70}
                cy={70}
                r={radius}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth={12}
            />
            <motion.circle
                cx={70}
                cy={70}
                r={radius}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            />
        </svg>
    );
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
const StatCard = ({
    label,
    count,
    icon: Icon,
    variant,
}: {
    label: string;
    count: number;
    icon: React.ElementType;
    variant: 'green' | 'red' | 'gray';
}) => {
    const palette = {
        green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', text: 'text-emerald-700', border: 'border-emerald-100' },
        red: { bg: 'bg-red-50', icon: 'bg-red-100 text-red-600', text: 'text-red-700', border: 'border-red-100' },
        gray: { bg: 'bg-gray-50', icon: 'bg-gray-200 text-gray-500', text: 'text-gray-600', border: 'border-gray-100' },
    };
    const p = palette[variant];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn('flex items-center gap-3 sm:gap-4 rounded-2xl border p-3 sm:p-4 md:p-5', p.bg, p.border)}
        >
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', p.icon)}>
                <Icon size={22} />
            </div>
            <div>
                <p className={cn('text-xl sm:text-2xl font-extrabold', p.text)}>{count}</p>
                <p className="text-xs font-medium text-gray-500">{label}</p>
            </div>
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Answer Card
// ---------------------------------------------------------------------------
const AnswerCard = ({ answer, index }: { answer: any; index: number }) => {
    const [open, setOpen] = useState(false);

    const isCorrect = answer?.is_correct;
    const accentColor =
        isCorrect === true ? 'emerald' : isCorrect === false ? 'red' : 'gray';

    const StatusIcon =
        isCorrect === true ? IconCircleCheck : isCorrect === false ? IconCircleX : IconClock;

    const marksAwarded = answer?.marks_awarded ?? '—';
    const maxMarks = answer?.max_marks ?? answer?.marks ?? '?';
    const questionText = answer?.question_text ?? answer?.question ?? answer?.content ?? '';
    const questionType = answer?.question_type ?? answer?.type ?? '';

    const studentAnswer = (() => {
        if (questionType === 'MCQ' || questionType === 'mcq') {
            const selectedId = answer?.selected_option_id;
            const selected = answer?.options?.find((o: any) => o.id === selectedId);
            return selected?.option_text ?? selected?.content ?? 'No option selected';
        }
        if (answer?.text_answer) return answer.text_answer;
        if (answer?.file_url) return answer.file_url;
        return 'No answer provided';
    })();

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.03 }}
            className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
            >
                <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    isCorrect === true && 'bg-emerald-100 text-emerald-700',
                    isCorrect === false && 'bg-red-100 text-red-700',
                    isCorrect == null && 'bg-gray-100 text-gray-500',
                )}>
                    {index + 1}
                </span>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {questionText || `Question ${index + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider",
                            questionType === 'MCQ' || questionType === 'mcq' ? 'text-blue-500' : 'text-purple-500'
                        )}>
                            {questionType}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className={cn(
                        "rounded-lg px-2.5 py-1 text-xs font-bold",
                        accentColor === 'emerald' ? "bg-emerald-50 text-emerald-700" :
                        accentColor === 'red' ? "bg-red-50 text-red-700" :
                        "bg-gray-50 text-gray-500"
                    )}>
                        {marksAwarded}/{maxMarks}
                    </div>
                    <StatusIcon
                        size={20}
                        className={cn(
                            isCorrect === true ? 'text-emerald-500' :
                            isCorrect === false ? 'text-red-500' :
                            'text-gray-300'
                        )}
                    />
                    <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <IconChevronDown size={18} className="text-gray-400" />
                    </motion.div>
                </div>
            </button>

            {/* Expandable body */}
            {open && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4"
                >
                    {questionText && (
                        <div className="rounded-xl bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Question</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{questionText}</p>
                        </div>
                    )}

                    {/* MCQ options */}
                    {(questionType === 'MCQ' || questionType === 'mcq') && answer?.options?.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Options</p>
                            {answer.options.map((opt: any, optIdx: number) => {
                                const isSelected = opt.id === answer?.selected_option_id;
                                const isOptCorrect = opt?.is_correct;
                                return (
                                    <div
                                        key={opt.id}
                                        className={cn(
                                            'flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-sm transition-all',
                                            isSelected && isOptCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' :
                                            isSelected && !isOptCorrect ? 'border-red-300 bg-red-50 text-red-800' :
                                            isOptCorrect ? 'border-emerald-200 bg-emerald-50/40 text-emerald-700' :
                                            'border-gray-100 text-gray-500',
                                        )}
                                    >
                                        <span className={cn(
                                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
                                            isSelected && isOptCorrect ? "bg-emerald-200 text-emerald-700" :
                                            isSelected && !isOptCorrect ? "bg-red-200 text-red-700" :
                                            isOptCorrect ? "bg-emerald-100 text-emerald-600" :
                                            "bg-gray-100 text-gray-400"
                                        )}>
                                            {String.fromCharCode(65 + optIdx)}
                                        </span>
                                        <span className="flex-1">{opt?.option_text ?? opt?.content ?? '—'}</span>
                                        {isSelected && isOptCorrect && <IconCheck size={16} className="text-emerald-600 shrink-0" />}
                                        {isSelected && !isOptCorrect && <IconX size={16} className="text-red-600 shrink-0" />}
                                        {!isSelected && isOptCorrect && <IconCheck size={16} className="text-emerald-400 shrink-0" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Text / file answer */}
                    {questionType !== 'MCQ' && questionType !== 'mcq' && (
                        <div className="rounded-xl bg-gray-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Your Answer</p>
                            {answer?.file_url ? (
                                <a href={answer.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-600 underline font-medium">
                                    View uploaded file
                                </a>
                            ) : (
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{studentAnswer}</p>
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
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
                console.error('Error fetching result:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [attemptId]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="relative h-10 w-10">
                    <div className="h-10 w-10 rounded-full border-[3px] border-gray-200" />
                    <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-[3px] border-transparent border-t-violet-500" />
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 gap-4">
                <p className="text-gray-500 text-lg font-medium">Results not available yet</p>
                <button onClick={() => navigate('/student/tests')} className="text-sm font-medium text-violet-600 hover:text-violet-800">
                    Back to Tests
                </button>
            </div>
        );
    }

    const answers: any[] = result?.answers ?? [];
    const totalScore = result?.attempt?.total_score ?? result?.total_score ?? 0;
    const maxScore =
        result?.attempt?.max_score ??
        result?.max_score ??
        (answers.reduce((sum: number, a: any) => sum + (a?.max_marks ?? a?.marks ?? 0), 0) || 1);
    const percentage = Math.round((totalScore / maxScore) * 100);
    const testTitle = result?.test?.title ?? result?.test_title ?? 'Test Result';

    const correct = answers.filter((a) => a?.is_correct === true).length;
    const incorrect = answers.filter((a) => a?.is_correct === false).length;
    const pending = answers.filter((a) => a?.is_correct === null || a?.is_correct === undefined).length;

    const gradeColor = percentage >= 70 ? 'emerald' : percentage >= 40 ? 'amber' : 'red';
    const gradeLabel = percentage >= 70 ? 'Excellent' : percentage >= 40 ? 'Good Effort' : 'Needs Work';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20 p-4 sm:p-6 md:p-10">
            <div className="mx-auto max-w-4xl space-y-6">
                {/* Back button */}
                <motion.button
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate('/student/tests')}
                    className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-gray-700 transition-colors"
                >
                    <IconArrowLeft size={18} />
                    Back to Tests
                </motion.button>

                {/* Hero Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/40 overflow-hidden"
                >
                    {/* Accent bar */}
                    <div className={cn(
                        "h-1.5 bg-gradient-to-r",
                        gradeColor === 'emerald' ? "from-emerald-400 to-teal-500" :
                        gradeColor === 'amber' ? "from-amber-400 to-orange-500" :
                        "from-red-400 to-rose-500"
                    )} />

                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:gap-10">
                            {/* Score ring */}
                            <div className="relative shrink-0">
                                <ScoreRing percentage={percentage} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <IconTrophy
                                        size={18}
                                        className={cn(
                                            gradeColor === 'emerald' ? 'text-emerald-500' :
                                            gradeColor === 'amber' ? 'text-amber-500' :
                                            'text-red-500'
                                        )}
                                    />
                                    <span className="text-2xl font-extrabold text-gray-900">{percentage}%</span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="text-center md:text-left flex-1">
                                <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl tracking-tight">
                                    {testTitle}
                                </h1>
                                <p className="mt-2 text-lg text-gray-500">
                                    Score: <span className="font-bold text-gray-900">{totalScore}</span> / {maxScore}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                                    <span className={cn(
                                        'rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-wider',
                                        gradeColor === 'emerald' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' :
                                        gradeColor === 'amber' ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-200' :
                                        'bg-red-50 text-red-600 ring-1 ring-red-200'
                                    )}>
                                        {gradeLabel}
                                    </span>
                                    {(result?.attempt?.status ?? result?.status) && (
                                        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500 ring-1 ring-gray-200 uppercase tracking-wider">
                                            {result?.attempt?.status ?? result?.status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <StatCard label="Correct" count={correct} icon={IconCircleCheck} variant="green" />
                    <StatCard label="Incorrect" count={incorrect} icon={IconCircleX} variant="red" />
                    <StatCard label="Pending" count={pending} icon={IconClock} variant="gray" />
                </div>

                {/* Answer Review */}
                {answers.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">Answer Review</h2>
                            <span className="text-xs font-medium text-gray-400">{answers.length} questions</span>
                        </div>
                        {answers.map((ans: any, idx: number) => (
                            <AnswerCard key={ans?.question_id ?? idx} answer={ans} index={idx} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
