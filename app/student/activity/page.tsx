
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentNavigation from "../student-navigation";

export const instant = false;

type ExamResult = {
  attempt_id: string;
  examination_id: string;
  examination_title: string;
  submitted_at: string;
  score: number | string;
  total_points: number | string;
  percentage: number | string;
  passing_score: number | string;
  passed: boolean;
  subject_category: string | null;
  subtopic: string | null;
};

function formatManilaDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatNumber(value: number | string) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function ActivityCard({ result }: { result: ExamResult }) {
  const percentage = Number(result.percentage);
  const validPercentage = Number.isFinite(percentage)
    ? percentage
    : 0;

  return (
    <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {result.subject_category || "Uncategorized"}
          </p>

          <h3 className="mt-2 break-words text-lg font-bold text-blue-950">
            {result.examination_title}
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            Subtopic: {result.subtopic || "Not specified"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Submitted: {formatManilaDateTime(result.submitted_at)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            result.passed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.passed ? "Passed" : "Not Passed"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-slate-500">Score</p>
          <p className="mt-1 font-bold text-slate-900">
            {formatNumber(result.score)} /{" "}
            {formatNumber(result.total_points)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Percentage</p>
          <p className="mt-1 font-bold text-blue-950">
            {validPercentage.toFixed(2)}%
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Passing Score</p>
          <p className="mt-1 font-bold text-slate-900">
            {formatNumber(result.passing_score)}%
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          href={`/student/attempts/${result.attempt_id}/results`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View Examination Details
        </Link>
      </div>
    </article>
  );
}

export default async function StudentActivityPage() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) redirect("/");

  if (profile.role !== "student") redirect("/");

  if (profile.approval_status !== "approved") {
    redirect("/student/pending");
  }

  const { data, error } = await supabase.rpc(
    "student_list_exam_results_with_subjects"
  );

  const results: ExamResult[] = Array.isArray(data)
    ? (data as unknown as ExamResult[])
    : [];

  const sortedResults = [...results].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() -
      new Date(a.submitted_at).getTime()
  );

  const passedCount = sortedResults.filter(
    (result) => result.passed
  ).length;

  const failedCount = sortedResults.length - passedCount;

  return (
    <main className="min-h-screen bg-slate-50">
      <StudentNavigation activePage="activity" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-blue-700">
            BJRC Student Portal
          </p>

          <h2 className="mt-2 text-2xl font-bold text-blue-950 sm:text-3xl">
            Recent Activity
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            View your examination history, submission dates,
            scores, and results.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            Unable to load your examination activity. Please
            refresh the page or contact the administrator if
            the problem continues.
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">
                  Total Submissions
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-950">
                  {sortedResults.length}
                </p>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Passed
                </p>
                <p className="mt-2 text-2xl font-bold text-green-950">
                  {passedCount}
                </p>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-800">
                  Not Passed
                </p>
                <p className="mt-2 text-2xl font-bold text-red-950">
                  {failedCount}
                </p>
              </div>
            </div>

            {sortedResults.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="font-bold text-blue-950">
                  No Recent Activity
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Your submitted examinations will appear here.
                </p>

                <Link
                  href="/student/examinations"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Browse Examinations
                </Link>
              </div>
            ) : (
              <section className="mt-8">
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-blue-950">
                    Examination History
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Showing all your submitted examinations,
                    starting with the most recent.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {sortedResults.map((result) => (
                    <ActivityCard
                      key={result.attempt_id}
                      result={result}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
