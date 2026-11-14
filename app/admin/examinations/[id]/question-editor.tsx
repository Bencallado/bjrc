
"use client";

import { useActionState, useState, useTransition } from "react";
import {
  saveExamQuestion,
  deleteExamQuestion,
  type QuestionActionState,
} from "./question-actions";

type ExamOption = {
  option_id: string;
  option_text: string;
  is_correct: boolean;
  option_order: number;
};

export type ExamQuestion = {
  question_id: string;
  question_text: string;
  points: number;
  question_order: number;
  options: ExamOption[];
};

type QuestionEditorProps = {
  examinationId: string;
  questions: ExamQuestion[];
};

const initialState: QuestionActionState = {};

export default function QuestionEditor({
  examinationId,
  questions,
}: QuestionEditorProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-2xl font-bold text-blue-950">
            Question Management
          </h3>

          <p className="mt-2 text-slate-600">
            Add and manage questions and their four answer choices.
          </p>

          <p className="mt-2 text-sm font-semibold text-blue-900">
            Total Questions: {questions.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900"
        >
          {showForm ? "Close Form" : "+ Add Question"}
        </button>
      </div>

      {showForm && (
        <QuestionForm
          examinationId={examinationId}
          question={null}
          onCancel={() => setShowForm(false)}
        />
      )}

      {questions.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center">
          <h4 className="font-semibold text-slate-800">
            No Questions Added Yet
          </h4>

          <p className="mt-2 text-sm text-slate-600">
            Start building this examination by adding your first question.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {questions.map((question) => (
            <QuestionItem
              key={question.question_id}
              examinationId={examinationId}
              question={question}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function QuestionItem({
  examinationId,
  question,
}: {
  examinationId: string;
  question: ExamQuestion;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this question and its four answer choices?"
    );

    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");

    startTransition(async () => {
      const result = await deleteExamQuestion(
        examinationId,
        question.question_id
      );

      if (result.error) {
        setDeleteError(result.error);
      } else {
        setDeleteSuccess(result.success ?? "Question deleted.");
        window.location.reload();
      }
    });
  }

  if (editing) {
    return (
      <QuestionForm
        examinationId={examinationId}
        question={question}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
            Question {question.question_order} · {question.points} point(s)
          </p>

          <h4 className="mt-2 whitespace-pre-wrap font-semibold text-slate-900">
            {question.question_text}
          </h4>

          <div className="mt-4 space-y-2">
            {question.options.map((option, index) => (
              <div
                key={option.option_id}
                className={`rounded-lg border p-3 text-sm ${
                  option.is_correct
                    ? "border-green-300 bg-green-50 text-green-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="mr-2 font-bold">
                  {["A", "B", "C", "D"][index]}.
                </span>

                {option.option_text}

                {option.is_correct && (
                  <span className="ml-2 font-semibold">
                    (Correct Answer)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {deleteError}
        </p>
      )}

      {deleteSuccess && (
        <p className="mt-4 text-sm text-green-700">
          {deleteSuccess}
        </p>
      )}
    </article>
  );
}

function QuestionForm({
  examinationId,
  question,
  onCancel,
}: {
  examinationId: string;
  question: ExamQuestion | null;
  onCancel: () => void;
}) {
  const action = saveExamQuestion.bind(
    null,
    examinationId,
    question?.question_id ?? null
  );

  const [state, formAction, isPending] = useActionState(
    action,
    initialState
  );

  const options = ["A", "B", "C", "D"];

  // Safely identify the existing correct answer.
  const correctOptionIndex =
    question?.options.findIndex(
      (option) => option.is_correct
    ) ?? -1;

  const [correctAnswer, setCorrectAnswer] = useState(
    correctOptionIndex >= 0
      ? options[correctOptionIndex]
      : "A"
  );

  return (
    <form
      action={formAction}
      className="mt-6 space-y-5 rounded-xl border border-blue-200 bg-blue-50 p-6"
    >
      <h4 className="text-lg font-bold text-blue-950">
        {question ? "Edit Question" : "Add New Question"}
      </h4>

      <div>
        <label
          htmlFor={`question-${question?.question_id ?? "new"}`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Question Text
        </label>

        <textarea
          id={`question-${question?.question_id ?? "new"}`}
          name="question_text"
          rows={4}
          maxLength={10000}
          required
          defaultValue={question?.question_text ?? ""}
          placeholder="Enter your examination question..."
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div>
        <label
          htmlFor={`points-${question?.question_id ?? "new"}`}
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Points
        </label>

        <input
          id={`points-${question?.question_id ?? "new"}`}
          name="points"
          type="number"
          min="1"
          step="0.01"
          required
          defaultValue={question?.points ?? 1}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
        />
      </div>

      <div>
        <h5 className="font-semibold text-slate-800">
          Answer Choices
        </h5>

        <p className="mt-1 text-sm text-slate-600">
          Enter all four choices and select exactly one correct answer.
        </p>

        <div className="mt-4 space-y-4">
          {options.map((letter, index) => (
            <div
              key={letter}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
            >
              <label
                htmlFor={`option-${letter}-${question?.question_id ?? "new"}`}
                className="font-bold text-blue-950 sm:w-8"
              >
                {letter}.
              </label>

              <input
                id={`option-${letter}-${question?.question_id ?? "new"}`}
                name={`option_${letter}`}
                type="text"
                required
                maxLength={2000}
                defaultValue={
                  question?.options[index]?.option_text ?? ""
                }
                placeholder={`Enter answer choice ${letter}`}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="radio"
                  name="correct_answer"
                  value={letter}
                  checked={correctAnswer === letter}
                  onChange={() => setCorrectAnswer(letter)}
                  required
                  className="h-4 w-4 accent-blue-950"
                />
                Correct
              </label>
            </div>
          ))}
        </div>
      </div>

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {state.error}
        </div>
      )}

      {state.success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {state.success}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-blue-200 pt-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isPending
            ? "Saving Question..."
            : question
              ? "Update Question"
              : "Save Question"}
        </button>
      </div>
    </form>
  );
}
