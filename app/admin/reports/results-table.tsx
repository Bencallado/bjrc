
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ExamResult = {
  attempt_id: string;
  examination_id: string;
  examination_title: string;
  student_id: string;
  student_name: string | null;
  started_at: string;
  submitted_at: string;
  score: number | string;
  total_points: number | string;
  percentage: number | string;
  passing_score: number | string;
  passed: boolean;
};

type ResultsTableProps = {
  results: ExamResult[];
};

function formatDate(value: string) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function formatNumber(value: number | string) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(2)
    : "—";
}

function escapeCsv(value: string | number) {
  let text = String(value);

  // Prevent spreadsheet formula injection.
  if (/^[\s]*[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  // Escape quotation marks and wrap every value.
  return `"${text.replace(/"/g, '""')}"`;
}

export default function ResultsTable({
  results,
}: ResultsTableProps) {
  const [search, setSearch] = useState("");
  const [selectedExamination, setSelectedExamination] =
    useState("all");
  const [selectedOutcome, setSelectedOutcome] =
    useState("all");

  // Generate examination filter options.
  const examinations = useMemo(() => {
    const uniqueExaminations = new Map<string, string>();

    for (const result of results) {
      uniqueExaminations.set(
        result.examination_id,
        result.examination_title
      );
    }

    return Array.from(uniqueExaminations.entries()).sort(
      (a, b) => a[1].localeCompare(b[1])
    );
  }, [results]);

  // Apply search and filters.
  const filteredResults = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return results.filter((result) => {
      const studentName =
        result.student_name || "Unnamed Student";

      const examinationTitle =
        result.examination_title || "Untitled Examination";

      const matchesSearch =
        !normalizedSearch ||
        studentName.toLowerCase().includes(normalizedSearch) ||
        examinationTitle.toLowerCase().includes(normalizedSearch);

      const matchesExamination =
        selectedExamination === "all" ||
        result.examination_id === selectedExamination;

      const matchesOutcome =
        selectedOutcome === "all" ||
        (selectedOutcome === "passed" && result.passed === true) ||
        (selectedOutcome === "failed" && result.passed === false);

      return (
        matchesSearch &&
        matchesExamination &&
        matchesOutcome
      );
    });
  }, [
    results,
    search,
    selectedExamination,
    selectedOutcome,
  ]);

  // Export currently filtered results.
  function exportCsv() {
    if (filteredResults.length === 0) {
      return;
    }

    const headers = [
      "Student Name",
      "Examination",
      "Score",
      "Total Points",
      "Percentage",
      "Passing Score",
      "Result",
      "Started At",
      "Submitted At",
      "Attempt ID",
    ];

    const rows = filteredResults.map((result) => [
      result.student_name || "Unnamed Student",
      result.examination_title || "Untitled Examination",
      formatNumber(result.score),
      formatNumber(result.total_points),
      formatNumber(result.percentage),
      formatNumber(result.passing_score),
      result.passed ? "Passed" : "Failed",
      formatDate(result.started_at),
      formatDate(result.submitted_at),
      result.attempt_id,
    ]);

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    link.download = `bjrc-examination-results-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Allow the browser to begin the download before cleanup.
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function clearFilters() {
    setSearch("");
    setSelectedExamination("all");
    setSelectedOutcome("all");
  }

  return (
    <section
      aria-labelledby="examination-results-heading"
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Filters and Export */}
      <div className="border-b border-slate-200 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3
              id="examination-results-heading"
              className="text-lg font-bold text-blue-950"
            >
              Examination Results
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Search, filter, review, and export submitted examination results.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredResults.length === 0}
            className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV ({filteredResults.length})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="result-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search Student or Examination
            </label>

            <input
              id="result-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Enter student or examination name..."
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="examination-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Examination
            </label>

            <select
              id="examination-filter"
              value={selectedExamination}
              onChange={(event) =>
                setSelectedExamination(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                All Examinations
              </option>

              {examinations.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="outcome-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Examination Result
            </label>

            <select
              id="outcome-filter"
              value={selectedOutcome}
              onChange={(event) =>
                setSelectedOutcome(event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">
                All Results
              </option>

              <option value="passed">
                Passed
              </option>

              <option value="failed">
                Failed
              </option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p
            className="text-sm text-slate-600"
            aria-live="polite"
          >
            Showing{" "}
            <strong>{filteredResults.length}</strong>{" "}
            of{" "}
            <strong>{results.length}</strong>{" "}
            submitted attempts
          </p>

          <button
            type="button"
            onClick={clearFilters}
            disabled={
              search === "" &&
              selectedExamination === "all" &&
              selectedOutcome === "all"
            }
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Table */}
      {filteredResults.length === 0 ? (
        <div className="p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <span className="text-2xl" aria-hidden="true">
              —
            </span>
          </div>

          <h4 className="mt-4 font-semibold text-slate-800">
            No examination results found.
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            Try changing your search terms or filters.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <caption className="sr-only">
              Submitted BJRC examination results and student performance.
            </caption>

            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th scope="col" className="px-5 py-4 font-semibold">
                  Student
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Examination
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Score
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Percentage
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Submitted
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Result
                </th>

                <th scope="col" className="px-5 py-4 font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredResults.map((result) => (
                <tr
                  key={result.attempt_id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {result.student_name || "Unnamed Student"}
                  </td>

                  <td className="max-w-xs px-5 py-4 text-slate-600">
                    {result.examination_title || "Untitled Examination"}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                    {formatNumber(result.score)} /{" "}
                    {formatNumber(result.total_points)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">
                    {formatNumber(result.percentage)}%
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    {formatDate(result.submitted_at)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        result.passed
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.passed ? "PASSED" : "FAILED"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4">
                    <Link
                      href={`/admin/reports/${encodeURIComponent(
                        result.attempt_id
                      )}`}
                      className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                      aria-label={`View examination details for ${
                        result.student_name || "unnamed student"
                      }`}
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
