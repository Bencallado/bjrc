
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Examination = {
  id: string;
  title: string;
  time_limit_minutes: number | null;
  passing_score: number | null;
  status: string;
  created_at: string;
};

type FilterStatus = "all" | "draft" | "published" | "closed";

export default function ExaminationFilter({
  examinations,
}: {
  examinations: Examination[];
}) {
  const [activeFilter, setActiveFilter] =
    useState<FilterStatus>("all");

  const filteredExaminations = useMemo(() => {
    if (activeFilter === "all") {
      return examinations;
    }

    return examinations.filter(
      (exam) =>
        exam.status.trim().toLowerCase() === activeFilter
    );
  }, [examinations, activeFilter]);

  const counts = useMemo(
    () => ({
      all: examinations.length,
      draft: examinations.filter(
        (exam) => exam.status.trim().toLowerCase() === "draft"
      ).length,
      published: examinations.filter(
        (exam) => exam.status.trim().toLowerCase() === "published"
      ).length,
      closed: examinations.filter(
        (exam) => exam.status.trim().toLowerCase() === "closed"
      ).length,
    }),
    [examinations]
  );

  const filters: {
    value: FilterStatus;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "draft", label: "Draft", count: counts.draft },
    {
      value: "published",
      label: "Published",
      count: counts.published,
    },
    { value: "closed", label: "Closed", count: counts.closed },
  ];

  function getStatusBadge(status: string) {
    switch (status.trim().toLowerCase()) {
      case "draft":
        return "border-amber-200 bg-amber-100 text-amber-800";
      case "published":
        return "border-green-200 bg-green-100 text-green-800";
      case "closed":
        return "border-slate-200 bg-slate-100 text-slate-700";
      default:
        return "border-gray-200 bg-gray-100 text-gray-700";
    }
  }

  return (
    <section aria-label="Filter examinations">
      <div
        className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-4 sm:px-6"
        aria-label="Examination status filters"
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              aria-pressed={isActive}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                isActive
                  ? "border-blue-950 bg-blue-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {filter.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredExaminations.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <h4 className="font-semibold text-slate-900">
            No {activeFilter === "all" ? "" : activeFilter + " "}
            examinations found
          </h4>

          <p className="mt-2 text-sm text-slate-500">
            There are currently no examinations in this category.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-6 py-4">Examination</th>
                <th className="px-6 py-4">Time Limit</th>
                <th className="px-6 py-4">Passing Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredExaminations.map((exam) => (
                <tr
                  key={exam.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <Link
                      href={`/admin/examinations/${exam.id}`}
                      className="text-blue-700 hover:text-blue-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                    >
                      {exam.title}
                    </Link>
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {exam.time_limit_minutes
                      ? `${exam.time_limit_minutes} minutes`
                      : "No limit"}
                  </td>

                  <td className="px-6 py-4 text-slate-600">
                    {exam.passing_score ?? "Not set"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-wide ${getStatusBadge(exam.status)}`}
                    >
                      {exam.status.trim().toUpperCase() || "UNKNOWN"}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                    {new Date(exam.created_at).toLocaleDateString()}
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
