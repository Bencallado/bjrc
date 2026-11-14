
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveExamAnswer,
  submitExam,
} from "./actions";

type ExamOption = {
  optionId: string;
  optionText: string;
  optionOrder: number;
};

type ExamQuestion = {
  questionId: string;
  questionText: string;
  points: number;
  questionOrder: number;
  selectedOptionId: string | null;
  options: ExamOption[];
};

type ExamInterfaceProps = {
  attemptId: string;
  startedAt: string;
  timeLimitMinutes: number | null;
  questions: ExamQuestion[];
};

export default function ExamInterface({
  attemptId,
  startedAt,
  timeLimitMinutes,
  questions,
}: ExamInterfaceProps) {
  const hasTimeLimit =
    timeLimitMinutes !== null && timeLimitMinutes > 0;

  const calculateRemainingTime = useCallback(() => {
    if (!hasTimeLimit || timeLimitMinutes === null) {
      return 0;
    }

    const deadline =
      new Date(startedAt).getTime() +
      timeLimitMinutes * 60 * 1000;

    return Math.max(
      0,
      Math.ceil((deadline - Date.now()) / 1000)
    );
  }, [startedAt, timeLimitMinutes, hasTimeLimit]);

  const [remainingSeconds, setRemainingSeconds] = useState(
    calculateRemainingTime
  );

  const [answers, setAnswers] = useState<
    Record<string, string | null>
  >(() => {
    const initialAnswers: Record<string, string | null> = {};

    questions.forEach((question) => {
      initialAnswers[question.questionId] =
        question.selectedOptionId;
    });

    return initialAnswers;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Prevent multiple simultaneous submission requests.
  const submissionStarted = useRef(false);

  // Update the countdown only for timed examinations.
  useEffect(() => {
    if (!hasTimeLimit) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(calculateRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemainingTime, hasTimeLimit]);

  // Save the selected answer immediately.
  async function handleAnswerChange(
    questionId: string,
    optionId: string
  ) {
    if (
      isSaving ||
      isSubmitting ||
      (hasTimeLimit && remainingSeconds <= 0)
    ) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionId,
    }));

    setIsSaving(true);
    setErrorMessage("");
    setSaveMessage("");

    try {
      await saveExamAnswer(
        attemptId,
        questionId,
        optionId
      );

      setSaveMessage("Your answer has been saved.");
    } catch (error) {
      console.error("Answer saving failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your answer."
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Submit the examination.
  const handleSubmit = useCallback(
    async (automatic = false) => {
      if (submissionStarted.current) {
        return;
      }

      if (!automatic) {
        const confirmed = window.confirm(
          "Are you sure you want to submit your examination? You cannot change your answers afterward."
        );

        if (!confirmed) {
          return;
        }
      }

      submissionStarted.current = true;
      setIsSubmitting(true);
      setErrorMessage("");

      try {
        await submitExam(attemptId, automatic);
      } catch (error) {
        console.error(
          "Examination submission failed:",
          error
        );

        submissionStarted.current = false;
        setIsSubmitting(false);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to submit your examination. Please try again."
        );
      }
    },
    [attemptId]
  );

  // Automatically submit only when a timed examination expires.
  useEffect(() => {
    if (
      hasTimeLimit &&
      remainingSeconds <= 0 &&
      !submissionStarted.current
    ) {
      void handleSubmit(true);
    }
  }, [remainingSeconds, handleSubmit, hasTimeLimit]);

  const answeredCount = Object.values(answers).filter(
    (answer) => answer !== null
  ).length;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-6">

      {/* Examination summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-sm text-slate-500">
              Examination Progress
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {answeredCount} of {questions.length} answered
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 px-5 py-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
              {hasTimeLimit ? "Time Remaining" : "Time Limit"}
            </p>

            <p
              className={`mt-1 font-mono text-3xl font-bold ${
                hasTimeLimit && remainingSeconds <= 60
                  ? "text-red-600"
                  : "text-blue-950"
              }`}
            >
              {hasTimeLimit ? formattedTime : "Unlimited"}
            </p>
          </div>

        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-700 transition-all"
            style={{
              width: `${
                questions.length > 0
                  ? (answeredCount / questions.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </section>

      {/* Save status */}
      {isSaving && (
        <p className="text-sm font-medium text-blue-700">
          Saving your answer...
        </p>
      )}

      {saveMessage && !isSaving && (
        <p className="text-sm font-medium text-green-700">
          {saveMessage}
        </p>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Examination questions */}
      {questions.map((question, index) => (
        <section
          key={question.questionId}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

            <p className="text-sm font-semibold text-blue-800">
              Question {index + 1}
            </p>

            <span className="text-sm font-medium text-slate-500">
              {question.points}{" "}
              {question.points === 1 ? "point" : "points"}
            </span>

          </div>

          <h2 className="mt-3 text-lg font-semibold leading-relaxed text-slate-900">
            {question.questionText}
          </h2>

          <div className="mt-5 space-y-3">
            {question.options.map((option) => (
              <label
                key={option.optionId}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition ${
                  answers[question.questionId] === option.optionId
                    ? "border-blue-700 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                } ${
                  isSaving ||
                  isSubmitting ||
                  (hasTimeLimit && remainingSeconds <= 0)
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name={question.questionId}
                  value={option.optionId}
                  checked={
                    answers[question.questionId] === option.optionId
                  }
                  onChange={() =>
                    handleAnswerChange(
                      question.questionId,
                      option.optionId
                    )
                  }
                  disabled={
                    isSaving ||
                    isSubmitting ||
                    (hasTimeLimit && remainingSeconds <= 0)
                  }
                  className="mt-1 h-4 w-4 accent-blue-800"
                />

                <span className="text-sm leading-relaxed text-slate-700">
                  {option.optionText}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      {/* Submission section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <h2 className="text-lg font-bold text-slate-900">
          Submit Examination
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Please review your answers before submitting. Unanswered
          questions will receive zero points.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-sm text-slate-500">
            {questions.length - answeredCount} unanswered question(s)
          </p>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={
              isSubmitting ||
              isSaving ||
              (hasTimeLimit &&
                remainingSeconds <= 0 &&
                !errorMessage)
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-950 px-6 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting
              ? "Submitting Examination..."
              : "Submit Examination"}
          </button>

        </div>
      </section>

      {isSubmitting && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center text-sm font-medium text-blue-800">
          Your examination is being submitted. Please wait.
        </div>
      )}

    </div>
  );
}
