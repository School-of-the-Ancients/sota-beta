import React, { useMemo, useState } from 'react';

import type { QuestAssessment, QuizQuestion } from '../types';

interface QuestQuizProps {
  questId: string;
  questTitle: string;
  questions: QuizQuestion[];
  onDismiss: () => void;
  onComplete: (assessment: QuestAssessment) => void;
}

const PASS_THRESHOLD = 0.7;

const QuestQuiz: React.FC<QuestQuizProps> = ({ questId, questTitle, questions, onDismiss, onComplete }) => {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedAssessment, setSubmittedAssessment] = useState<QuestAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unansweredCount = useMemo(() => {
    return questions.reduce((count, question) => {
      return answers[question.id] === undefined ? count + 1 : count;
    }, 0);
  }, [answers, questions]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (questions.length === 0) {
      setError('No quiz questions are available yet.');
      return;
    }

    if (unansweredCount > 0) {
      setError('Please answer each question before submitting.');
      return;
    }

    const total = questions.length;
    let correct = 0;
    const evidence: string[] = [];
    const improvements: string[] = [];

    questions.forEach((question) => {
      const selectedIndex = answers[question.id];
      const isCorrect = selectedIndex === question.answerIndex;
      if (isCorrect) {
        correct += 1;
        evidence.push(`Mastered: ${question.focusPoint}`);
      } else {
        const detail = `Review "${question.focusPoint}". ${question.explanation}`.trim();
        improvements.push(detail);
      }
    });

    const scoreRatio = correct / total;
    const passed = scoreRatio >= PASS_THRESHOLD;
    const percentage = Math.round(scoreRatio * 100);

    const assessment: QuestAssessment = {
      questId,
      questTitle,
      passed,
      summary: `You scored ${correct} of ${total} (${percentage}%). ${
        passed ? 'You passed the mastery quiz!' : 'More review is needed.'
      }`,
      evidence,
      improvements,
    };

    setSubmittedAssessment(assessment);
    setError(null);
    onComplete(assessment);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmittedAssessment(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl bg-gray-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-amber-700/20 border-b border-amber-500/40 px-6 py-4">
          <h2 className="text-2xl font-bold text-amber-200">{questTitle} · Mastery Quiz</h2>
          <p className="text-sm text-amber-100/80 mt-1">
            Answer each question to lock in your mastery. You can retake the quiz if you need another attempt.
          </p>
        </div>

        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          {submittedAssessment ? (
            <div className="space-y-5">
              <div
                className={`rounded-xl border px-4 py-3 ${
                  submittedAssessment.passed ? 'border-emerald-600 bg-emerald-900/20' : 'border-red-600 bg-red-900/20'
                }`}
              >
                <p className="text-lg font-semibold text-amber-100">{submittedAssessment.summary}</p>
              </div>

              {submittedAssessment.evidence.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-200 mb-2">Strengths</h3>
                  <ul className="list-disc list-inside text-gray-100 space-y-1">
                    {submittedAssessment.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {submittedAssessment.improvements.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-red-200 mb-2">Next Review Targets</h3>
                  <ul className="list-disc list-inside text-red-100 space-y-1">
                    {submittedAssessment.improvements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-lg border border-amber-500/60 text-amber-100 hover:bg-amber-600/20 transition"
                >
                  Retake quiz
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {questions.map((question, index) => (
                <fieldset key={question.id} className="border border-gray-700/80 rounded-xl p-4 space-y-3">
                  <legend className="px-2 text-sm font-semibold text-amber-200 uppercase tracking-wide">
                    Question {index + 1}
                  </legend>
                  <p className="text-lg text-gray-100 font-medium">{question.prompt}</p>
                  <div className="space-y-2">
                    {question.choices.map((choice, choiceIndex) => {
                      const inputId = `${question.id}_${choiceIndex}`;
                      const isSelected = answers[question.id] === choiceIndex;
                      return (
                        <label
                          key={inputId}
                          htmlFor={inputId}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 hover:border-amber-500/60'
                          }`}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name={question.id}
                            value={choiceIndex}
                            checked={isSelected}
                            onChange={() => handleSelectOption(question.id, choiceIndex)}
                            className="mt-1 h-4 w-4 border-gray-600 text-amber-500 focus:ring-amber-400"
                          />
                          <span className="text-gray-100 text-sm leading-relaxed">{choice}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ))}

              {error && <p className="text-sm text-red-300">{error}</p>}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition"
                >
                  Submit answers
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition"
                >
                  Close without submitting
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestQuiz;
