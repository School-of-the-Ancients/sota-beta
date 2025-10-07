import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Quest, QuizQuestion, QuizResult, QuestAssessment } from '../types';
import { useApiKey } from '../hooks/useApiKey';

interface QuestQuizProps {
  quest: Quest;
  assessment?: QuestAssessment | null;
  onExit: () => void;
  onComplete: (result: QuizResult) => void;
}

const PASS_THRESHOLD = 0.6;
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 5;

const validateQuestions = (data: unknown): QuizQuestion[] => {
  if (!data || typeof data !== 'object' || !('questions' in data)) {
    throw new Error('Quiz response missing questions.');
  }

  const parsed = (data as { questions: QuizQuestion[] }).questions;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Quiz response returned no questions.');
  }

  return parsed
    .map((question, index) => {
      if (!question || typeof question !== 'object') {
        throw new Error(`Question ${index + 1} is invalid.`);
      }

      const options = Array.isArray(question.options) ? question.options : [];
      if (options.length < 3) {
        throw new Error(`Question ${index + 1} needs at least 3 options.`);
      }

      const answerIndex = Number(question.answer);
      if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
        throw new Error(`Question ${index + 1} has an invalid answer index.`);
      }

      return {
        id: question.id || `q_${index + 1}`,
        prompt: question.prompt?.trim() || `Question ${index + 1}`,
        options,
        answer: answerIndex,
        objectiveTag: question.objectiveTag?.trim() || undefined,
      };
    })
    .slice(0, MAX_QUESTIONS);
};

const QuestQuiz: React.FC<QuestQuizProps> = ({ quest, assessment, onExit, onComplete }) => {
  const { apiKey } = useApiKey();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const questionCount = useMemo(() => {
    const focusCount = Array.isArray(quest.focusPoints) ? quest.focusPoints.length : 0;
    const desired = Math.max(focusCount, MIN_QUESTIONS);
    return Math.min(desired, MAX_QUESTIONS);
  }, [quest.focusPoints]);

  const resetState = useCallback(() => {
    setError(null);
    setResult(null);
    setAnswers({});
  }, []);

  const buildFallbackQuestions = useCallback((): QuizQuestion[] => {
    const points = Array.isArray(quest.focusPoints) ? quest.focusPoints : [];
    const fallbackCount = Math.min(Math.max(points.length, MIN_QUESTIONS), MAX_QUESTIONS);

    if (fallbackCount === 0) {
      return [
        {
          id: 'fallback_1',
          prompt: `Which statement best reflects the quest objective: ${quest.objective}?`,
          options: [
            `It encourages learners to internalize: ${quest.objective}`,
            'It asks learners to memorize unrelated historical trivia.',
            'It focuses on logistical details outside the quest scope.',
            'It discourages learners from applying knowledge in real life.',
          ],
          answer: 0,
        },
        {
          id: 'fallback_2',
          prompt: 'Why is it important to reflect on how you will apply this quest in your own life?',
          options: [
            'Because applying ideas personally is core to mastery of this quest.',
            'Because it replaces the need to understand the underlying ideas.',
            'Because it proves you can recite facts verbatim.',
            'Because it helps you avoid exploring the topic further.',
          ],
          answer: 0,
        },
        {
          id: 'fallback_3',
          prompt: 'What should you do when a concept from this quest feels abstract?',
          options: [
            'Ask for concrete examples or analogies that connect to your experience.',
            'Ignore the confusion and move on quickly.',
            'Switch topics to something unrelated.',
            'Let the mentor keep talking without asking questions.',
          ],
          answer: 0,
        },
      ];
    }

    return Array.from({ length: fallbackCount }).map((_, index) => {
      const focusPoint = points[index % points.length];
      const label = focusPoint?.trim() || `Focus point ${index + 1}`;
      return {
        id: `fallback_${index + 1}`,
        prompt: `Which option best captures this focus point: ${label}?`,
        options: [
          label,
          'A concept that distracts from the quest objective.',
          'A statement that contradicts the mentor guidance.',
          'An unrelated historical anecdote.',
        ],
        answer: 0,
        objectiveTag: label,
      };
    });
  }, [quest.focusPoints, quest.objective]);

  useEffect(() => {
    let isCancelled = false;

    const loadQuiz = async () => {
      setIsLoading(true);
      resetState();

      if (!apiKey) {
        setError('Add your Google API key in Settings to generate tailored quiz questions.');
        setQuestions(buildFallbackQuestions());
        setIsLoading(false);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an expert tutor creating a short mastery quiz. Design ${questionCount} multiple-choice questions (3-4 answer choices each) to evaluate whether a learner has mastered the quest "${quest.title}". The quest objective is: "${quest.objective}". Focus on these key learning points: ${quest.focusPoints.join('; ')}. Each question must test one learning point.

Return JSON with this schema:
{
  "questions": [
    {
      "id": string,
      "prompt": string,
      "options": string[3-4],
      "answer": number, // index of the correct option
      "objectiveTag": string // short label referencing the focus point
    }
  ]
}
Ensure questions are rigorous but clear, avoid trick questions, and keep the answer index within bounds.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      prompt: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      answer: { type: Type.NUMBER },
                      objectiveTag: { type: Type.STRING },
                    },
                    required: ['prompt', 'options', 'answer'],
                  },
                },
              },
              required: ['questions'],
            },
          },
        });

        if (isCancelled) {
          return;
        }

        const parsed = JSON.parse(response.text || '{}');
        const validated = validateQuestions(parsed);
        setQuestions(validated.slice(0, questionCount));
      } catch (err) {
        console.error('Failed to generate quiz questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz questions.');
        setQuestions(buildFallbackQuestions());
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadQuiz();

    return () => {
      isCancelled = true;
    };
  }, [apiKey, buildFallbackQuestions, questionCount, quest.focusPoints, quest.objective, quest.title, refreshToken, resetState]);

  const handleSelect = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (result) {
      return;
    }

    const unanswered = questions.filter((question) => {
      const value = answers[question.id];
      return value === null || value === undefined;
    });
    if (unanswered.length > 0) {
      setError('Please answer every question before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let correct = 0;
      const missedTags: string[] = [];

      questions.forEach((question) => {
        const selected = answers[question.id];
        const isCorrect = selected === question.answer;
        if (isCorrect) {
          correct += 1;
        } else if (question.objectiveTag) {
          missedTags.push(question.objectiveTag);
        }
      });

      const total = questions.length;
      const scoreRatio = total === 0 ? 0 : correct / total;
      const passed = scoreRatio >= PASS_THRESHOLD;

      const quizResult: QuizResult = {
        questId: quest.id,
        correct,
        total,
        scoreRatio,
        passed,
        missedObjectiveTags: missedTags,
      };

      setResult(quizResult);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (isLoading) {
      return;
    }
    setRefreshToken((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isLoading && questions.length > 0 && Object.keys(answers).length === 0) {
      const initialAnswers: Record<string, number | null> = {};
      questions.forEach((question) => {
        initialAnswers[question.id] = null;
      });
      setAnswers(initialAnswers);
    }
  }, [isLoading, questions]);

  const completionMessage = useMemo(() => {
    if (!result) {
      return '';
    }
    if (result.passed) {
      return 'Great work! You passed the mastery check and fully completed this quest.';
    }
    return 'The quiz flagged a few areas for review. Revisit those topics and try again when ready.';
  }, [result]);

  const renderQuestion = (question: QuizQuestion, index: number) => {
    const selected = answers[question.id];
    const hasResult = Boolean(result);
    const isCorrect = hasResult && selected === question.answer;

    return (
      <div
        key={question.id}
        className={`p-4 rounded-lg border ${
          hasResult
            ? isCorrect
              ? 'bg-emerald-900/30 border-emerald-700'
              : 'bg-red-900/20 border-red-700'
            : 'bg-gray-800/60 border-gray-700'
        }`}
      >
        <p className="text-sm uppercase tracking-wide text-gray-400 mb-2">Question {index + 1}</p>
        <h3 className="text-lg font-semibold text-amber-200 mb-3">{question.prompt}</h3>
        <div className="space-y-2">
          {question.options.map((option, optionIndex) => {
            const isSelected = selected === optionIndex;
            const shouldHighlight = Boolean(result) && optionIndex === question.answer;
            const optionClasses = [
              'flex items-start gap-3 p-3 rounded-md border transition-colors duration-200',
              isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-gray-700 hover:border-amber-500/60',
            ];

            if (shouldHighlight) {
              optionClasses.push('border-emerald-500 bg-emerald-500/10');
            }

            return (
              <label key={optionIndex} className={optionClasses.join(' ')}>
                <input
                  type="radio"
                  name={question.id}
                  value={optionIndex}
                  checked={isSelected || false}
                  onChange={() => handleSelect(question.id, optionIndex)}
                  disabled={Boolean(result)}
                  className="mt-1 h-4 w-4 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-sm text-gray-200">{option}</span>
              </label>
            );
          })}
        </div>
        {result && !isCorrect && (
          <p className="mt-3 text-sm text-red-200">
            Correct answer: {question.options[question.answer]}
          </p>
        )}
        {question.objectiveTag && (
          <p className="mt-2 text-xs uppercase tracking-wide text-teal-300">
            Focus: {question.objectiveTag}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-900/80 border border-gray-700 rounded-2xl p-6 shadow-2xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-amber-300 mb-1">Mastery Quiz</p>
          <h2 className="text-3xl font-bold text-amber-100">{quest.title}</h2>
          <p className="text-sm text-gray-300 mt-2 max-w-2xl">{quest.objective}</p>
          {assessment?.summary && (
            <p className="text-xs text-gray-400 mt-2">Mentor summary: {assessment.summary}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="self-end text-sm font-semibold text-gray-300 hover:text-amber-200"
        >
          Exit quiz
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-md border border-red-700 bg-red-900/30 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {questions.map((question, index) => renderQuestion(question, index))}
          </div>

          {result ? (
            <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/60 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Your score</p>
                  <h3 className="text-2xl font-bold text-amber-200">
                    {result.correct} / {result.total} correct ({Math.round(result.scoreRatio * 100)}%)
                  </h3>
                  <p className={`mt-2 font-semibold ${result.passed ? 'text-emerald-300' : 'text-red-300'}`}>
                    {result.passed ? 'Passed' : 'Needs review'}
                  </p>
                </div>
                <div className="text-sm text-gray-300 max-w-md">
                  {completionMessage}
                </div>
              </div>

              {result.missedObjectiveTags.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-red-200 mb-2">Review these focus areas</p>
                  <div className="flex flex-wrap gap-2">
                    {result.missedObjectiveTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-red-600 bg-red-900/40 px-3 py-1 text-xs text-red-100"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-lg border border-amber-500/70 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/10"
                >
                  Retry quiz
                </button>
                <button
                  type="button"
                  onClick={() => result && onComplete(result)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-50"
                >
                  Return to hub
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                type="button"
                onClick={onExit}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700/60"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-5 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Scoring…' : 'Submit answers'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuestQuiz;
