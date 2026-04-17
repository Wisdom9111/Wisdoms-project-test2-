import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, Trophy, HelpCircle, CheckCircle, X, Send } from 'lucide-react';
import { generateQuiz, gradeSubjectiveAnswer, GradingResult } from '../../services/geminiService';
import { QuizQuestion } from '../../types';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle: string;
  materialText: string;
}

interface GradedResult extends GradingResult {
  question: string;
  studentAnswer: string;
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, courseTitle, materialText }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [subjectiveAnswers, setSubjectiveAnswers] = useState<Record<number, string>>({});
  const [grading, setGrading] = useState(false);
  const [gradedResults, setGradedResults] = useState<GradedResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      generateQuiz(courseTitle, materialText)
        .then(data => {
          setQuestions(data);
          setLoading(false);
        })
        .catch(() => {
          alert("Failed to generate examination. Try again.");
          onClose();
        });
    } else {
      setQuestions([]);
      setCurrentStep(0);
      setMcqAnswers({});
      setSubjectiveAnswers({});
      setGradedResults([]);
      setShowResults(false);
    }
  }, [isOpen, courseTitle, materialText, onClose]);

  const handleMcqSelect = (idx: number) => {
    setMcqAnswers({ ...mcqAnswers, [currentStep]: idx });
  };

  const currentQuestion = questions[currentStep];

  const handleFinalSubmit = async () => {
    setGrading(true);
    const results: GradedResult[] = [];
    
    // Process all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.type === 'objective') {
        const isCorrect = mcqAnswers[i] === q.correctAnswer;
        results.push({
          question: q.question,
          studentAnswer: q.options?.[mcqAnswers[i]] || "No Answer",
          score: isCorrect ? 2 : 0,
          feedback: isCorrect ? "Accurate choice." : `Incorrect. The correct answer was: ${q.options?.[q.correctAnswer!]}`
        });
      } else {
        const studentAns = subjectiveAnswers[i] || "";
        const grading = await gradeSubjectiveAnswer(q.question, q.sampleAnswer!, studentAns);
        results.push({
          question: q.question,
          studentAnswer: studentAns,
          ...grading
        });
      }
    }
    
    setGradedResults(results);
    setGrading(false);
    setShowResults(true);
  };

  const totalScore = gradedResults.reduce((acc, res) => acc + res.score, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-2xl rounded-[4px] shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-mouau-green text-white">
          <div className="flex items-center gap-3">
            <Trophy size={20} className="text-mouau-gold" />
            <h2 className="font-serif font-bold text-xl uppercase tracking-widest">Practice Examination</h2>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-8 flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-mouau-green" size={48} />
              <p className="font-serif italic text-gray-500">Retrieving examination from MOUAU digital bank...</p>
            </div>
          ) : grading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-mouau-gold" size={48} />
              <p className="font-serif italic text-gray-500">AI Examiner is grading your short answers against the repository...</p>
            </div>
          ) : showResults ? (
            <div className="space-y-8">
              <div className="text-center py-6 border-b border-gray-100">
                <div className="w-24 h-24 bg-mouau-green/10 text-mouau-green rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-mouau-green shadow-xl">
                  <span className="text-4xl font-serif font-bold">{totalScore}/20</span>
                </div>
                <h3 className="text-3xl font-serif font-bold text-gray-900 uppercase">Transcript Issued</h3>
                <p className="text-gray-500 font-medium mt-2">MOUAU Computer Science Practice Results</p>
              </div>

              <div className="space-y-6">
                {gradedResults.map((res, idx) => (
                  <div key={idx} className={`p-5 border-l-4 ${res.score === 2 ? 'border-mouau-green bg-mouau-green/5' : 'border-red-400 bg-red-50'} rounded-r-[4px]`}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Question {idx + 1}</p>
                    <p className="font-serif font-bold text-gray-900 mb-2 leading-relaxed">{res.question}</p>
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-200/50">
                      <p className="text-sm">
                        <span className="font-bold text-gray-600">Your Answer:</span> 
                        <span className="ml-2 text-gray-700 italic">{res.studentAnswer || "No Answer"}</span>
                      </p>
                      <p className="text-sm">
                        <span className="font-bold text-gray-600 uppercase text-[10px] tracking-widest">AI Feedback:</span> 
                        <span className={`ml-2 font-medium ${res.score === 2 ? 'text-mouau-green' : 'text-red-600'}`}>[{res.score}/2] {res.feedback}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-mouau-green text-white py-4 rounded-[4px] font-bold uppercase tracking-widest hover:bg-[#00522b] transition-all"
              >
                Close Session
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                <span>Question {currentStep + 1} of 10</span>
                <span className={`px-3 py-1 rounded-full ${currentQuestion?.type === 'objective' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                   {currentQuestion?.type === 'objective' ? 'Objective' : 'Theory/Short Answer'}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-serif font-bold text-gray-900 leading-snug">{currentQuestion?.question}</h3>
              </div>

              {currentQuestion?.type === 'objective' ? (
                <div className="grid grid-cols-1 gap-4">
                  {currentQuestion.options?.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleMcqSelect(idx)}
                      className={`text-left p-5 rounded-[4px] border transition-all flex items-center justify-between group ${mcqAnswers[currentStep] === idx ? 'border-mouau-green bg-mouau-green/5 ring-1 ring-mouau-green' : 'border-gray-200 hover:border-mouau-green/50 hover:bg-gray-50'}`}
                    >
                      <span className={`font-medium ${mcqAnswers[currentStep] === idx ? 'text-mouau-green' : 'text-gray-700'}`}>{opt}</span>
                      {mcqAnswers[currentStep] === idx && <CheckCircle size={18} className="text-mouau-green" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    className="w-full min-h-[150px] p-5 border border-gray-200 rounded-[4px] font-serif focus:border-mouau-green outline-none transition-all placeholder:italic text-lg"
                    placeholder="Provide a concise theoretical explanation..."
                    value={subjectiveAnswers[currentStep] || ''}
                    onChange={(e) => setSubjectiveAnswers({ ...subjectiveAnswers, [currentStep]: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400 flex items-center gap-2 italic">
                    <Send size={12} />
                    Maximum score for theory is 2 points per question.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                <button
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-6 py-2 text-sm font-bold text-gray-400 disabled:opacity-30 uppercase tracking-widest"
                >
                  Previous
                </button>
                {currentStep === questions.length - 1 ? (
                  <button
                    onClick={handleFinalSubmit}
                    className="bg-mouau-green text-white px-8 py-3 rounded-[4px] font-bold uppercase tracking-widest text-xs hover:bg-[#00522b]"
                  >
                    Submit Examination
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="bg-mouau-green text-white px-8 py-3 rounded-[4px] font-bold uppercase tracking-widest text-xs hover:bg-[#00522b]"
                  >
                    Next Question
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QuizModal;
