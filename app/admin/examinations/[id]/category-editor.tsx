
"use client";

import { useActionState, useState } from "react";
import {
  updateExaminationCategory,
  type CategoryActionState,
} from "./category-actions";

const SUBJECT_CATEGORIES = [
  "Hematology",
  "Molecular Biology",
  "Medical Microbiology and Parasitology",
  "Clinical Chemistry",
  "Blood Banking & Serology",
  "Clinical Microscopy",
  "Histopathologic Techniques & Medical Technology Laws",
];

const initialState: CategoryActionState = {};

type CategoryEditorProps = {
  examinationId: string;
  subjectCategory: string | null;
  subtopic: string | null;
};

export default function CategoryEditor({
  examinationId,
  subjectCategory,
  subtopic,
}: CategoryEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [currentSubject, setCurrentSubject] = useState(
    subjectCategory ?? ""
  );

  const [currentSubtopic, setCurrentSubtopic] = useState(
    subtopic ?? ""
  );

  const updateCategory = updateExaminationCategory.bind(
    null,
    examinationId
  );

  const [state, formAction, isPending] = useActionState(
    updateCategory,
    initialState
  );

  function cancelEditing() {
    setCurrentSubject(subjectCategory ?? "");
    setCurrentSubtopic(subtopic ?? "");
    setIsEditing(false);
  }

  function handleEdit() {
    setCurrentSubject(subjectCategory ?? "");
    setCurrentSubtopic(subtopic ?? "");
    setIsEditing(true);
  }

  return (
    <section className="mt-8 rounded-xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-xl font-bold text-blue-950">
            Subject and Subtopic
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Manage the subject category and subtopic for this examination.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900"
          >
            <span aria-hidden="true">✎</span>
            Edit Subject and Subtopic
          </button>
        )}
      </div>

      {state.success ? (
        <div
          role="status"
          className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {state.success}
        </div>
      ) : null}

      {!isEditing ? (
        <div className="mt-6 grid gap-5 border-t pt-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-500">
              Subject Category
            </p>

            <p className="mt-2 font-semibold text-blue-950">
              {currentSubject || "Not assigned"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">
              Subtopic
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {currentSubtopic || "Not specified"}
            </p>
          </div>
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-5 border-t pt-6">
          <div>
            <label
              htmlFor="subject_category"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subject Category
            </label>

            <select
              id="subject_category"
              name="subject_category"
              required
              value={currentSubject}
              onChange={(event) =>
                setCurrentSubject(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            >
              <option value="" disabled>
                Select a subject category
              </option>

              {SUBJECT_CATEGORIES.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="subtopic"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subtopic
            </label>

            <input
              id="subtopic"
              name="subtopic"
              type="text"
              maxLength={200}
              value={currentSubtopic}
              onChange={(event) =>
                setCurrentSubtopic(event.target.value)
              }
              placeholder="Example: Complete Blood Count (CBC)"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            />

            <p className="mt-1 text-xs text-slate-500">
              Optional. Maximum 200 characters.
            </p>
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {state.error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-950 px-6 py-3 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isPending
                ? "Saving Changes..."
                : "Save Subject and Subtopic"}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={isPending}
              className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
