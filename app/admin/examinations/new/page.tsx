
"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createExamination,
  type ExaminationFormState,
} from "../actions";

const initialState: ExaminationFormState = {};

const SUBJECT_CATEGORIES = [
  "Hematology",
  "Molecular Biology",
  "Medical Microbiology and Parasitology",
  "Clinical Chemistry",
  "Blood Banking & Serology",
  "Clinical Microscopy",
  "Histopathologic Techniques & Medical Technology Laws",
];

export default function NewExaminationPage() {
  const [state, formAction, isPending] = useActionState(
    createExamination,
    initialState
  );

  const [title, setTitle] = useState("");
  const [subjectCategory, setSubjectCategory] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [passingScore, setPassingScore] = useState("");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Create Examination
            </p>
          </div>

          <Link
            href="/admin/examinations"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100"
          >
            Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-blue-950">
            Create New Examination
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Enter the basic information for your new examination.
          </p>

          <form action={formAction} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Examination Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                maxLength={200}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Example: Civil Service Professional Examination"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

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
                value={subjectCategory}
                onChange={(event) =>
                  setSubjectCategory(event.target.value)
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
                value={subtopic}
                onChange={(event) => setSubtopic(event.target.value)}
                placeholder="Example: Complete Blood Count (CBC)"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Optional. Enter a specific topic under the selected subject. Maximum 200 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                maxLength={5000}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the examination..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="instructions"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Examination Instructions
              </label>

              <textarea
                id="instructions"
                name="instructions"
                rows={5}
                maxLength={10000}
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="Enter the instructions students must follow..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="time_limit_minutes"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Time Limit (Minutes)
                </label>

                <input
                  id="time_limit_minutes"
                  name="time_limit_minutes"
                  type="number"
                  min="1"
                  step="1"
                  value={timeLimit}
                  onChange={(event) => setTimeLimit(event.target.value)}
                  placeholder="Example: 60"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Leave blank for no time limit.
                </p>
              </div>

              <div>
                <label
                  htmlFor="passing_score"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Passing Score (%)
                </label>

                <input
                  id="passing_score"
                  name="passing_score"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={passingScore}
                  onChange={(event) =>
                    setPassingScore(event.target.value)
                  }
                  placeholder="Example: 75"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Enter a score between 0 and 100.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">
              <h3 className="font-semibold text-blue-950">
                Examination Settings
              </h3>

              <ul className="mt-3 space-y-2 text-sm text-blue-900">
                <li>• Question type: Single-answer multiple choice</li>
                <li>• Answer choices: Four options (A–D)</li>
                <li>• Attempts: Unlimited</li>
                <li>• Question order: Sequential</li>
                <li>• Points: One point per correct answer by default</li>
              </ul>
            </div>

            {state.error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {state.error}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/admin/examinations"
                className="rounded-lg border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-blue-950 px-6 py-3 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isPending
                  ? "Saving Examination..."
                  : "Save Examination"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
