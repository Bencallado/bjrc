
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentNavigation from "../student-navigation";

export const instant = false;

const SUBJECT_CATEGORIES = [
  "Hematology",
  "Molecular Biology",
  "Medical Microbiology and Parasitology",
  "Clinical Chemistry",
  "Blood Banking & Serology",
  "Clinical Microscopy",
  "Histopathologic Techniques & Medical Technology Laws",
] as const;

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

function formatManilaDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getPercentage(result: ExamResult) {
  const percentage = Number(result.percentage);

  if (!Number.isFinite(percentage)) return 0;

  return Math.min(100, Math.max(0, percentage));
}

function PerformanceBar({
  percentage,
}: {
  percentage: number;
}) {
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label="Examination percentage"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-blue-700 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-blue-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SubjectPerformance({
  subject,
  results,
}: {
  subject: string;
  results: ExamResult[];
}) {
  const average =
    results.length > 0
      ? results.reduce(
          (sum, result) => sum + getPercentage(result),
          0
        ) / results.length
      : 0;

  const passed = results.filter(
    (result) => result.passed
  ).length;

  const highest =
    results.length > 0
      ? Math.max(...results.map(getPercentage))
      : 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div>
          <h3 className="text-lg font-bold text-blue-950">
            {subject}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {results.length}{" "}
            {results.length === 1
              ? "completed examination"
              : "completed examinations"}
          </p>
        </div>

        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800">
          Average: {average.toFixed(2)}%
        </span>
      </div>

      {results.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          No completed examinations in this subject yet.
        </p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Highest Score
              </p>
              <p className="mt-1 text-xl font-bold text-blue-950">
                {highest.toFixed(2)}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">
                Passed
              </p>
              <p className="mt-1 text-xl font-bold text-green-700">
                {passed} / {results.length}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {results.map((result) => {
              const percentage = getPercentage(result);

              return (
                <div key={result.attempt_id}>
                  <div className="mb-2 flex flex-col justify-between gap-1 sm:flex-row">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {result.examination_title}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {result.subtopic || "Subtopic not specified"}
                        {" · "}
                        {formatManilaDate(result.submitted_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-950">
                        {percentage.toFixed(2)}%
                      </span>

                      <span
                        className={`text-xs font-semibold ${
                          result.passed
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {result.passed ? "Passed" : "Not Passed"}
                      </span>
                    </div>
                  </div>

                  <PerformanceBar percentage={percentage} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default async function StudentPerformancePage() {
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
      new Date(a.submitted_at).getTime() -
      new Date(b.submitted_at).getTime()
  );

  const average =
    results.length > 0
      ? results.reduce(
          (sum, result) => sum + getPercentage(result),
          0
        ) / results.length
      : 0;

  const highest =
    results.length > 0
      ? Math.max(...results.map(getPercentage))
      : 0;

  const passed = results.filter(
    (result) => result.passed
  ).length;

  const failed = results.length - passed;

  const categorizedResults = SUBJECT_CATEGORIES.map(
    (subject) => ({
      subject,
      results: sortedResults.filter(
        (result) => result.subject_category === subject
      ),
    })
  );

  const uncategorizedResults = sortedResults.filter(
    (result) => !result.subject_category
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <StudentNavigation activePage="performance" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-blue-700">
            BJRC Student Portal
          </p>

          <h2 className="mt-2 text-2xl font-bold text-blue-950 sm:text-3xl">
            My Performance
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Monitor your examination scores, track your progress,
            and identify subjects where you can improve.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            Unable to load your performance data. Please refresh
            the page or contact the administrator if the problem
            continues.
          </div>
        ) : (
          <>
            <section className="mt-6">
              <h3 className="mb-4 text-lg font-bold text-blue-950">
                Overall Performance
              </h3>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Completed Examinations"
                  value={results.length}
                  description="Total submitted examinations"
                />

                <MetricCard
                  label="Average Percentage"
                  value={`${average.toFixed(2)}%`}
                  description="Your overall average score"
                />

                <MetricCard
                  label="Highest Percentage"
                  value={`${highest.toFixed(2)}%`}
                  description="Your highest examination score"
                />

                <MetricCard
                  label="Passing Record"
                  value={`${passed} / ${results.length}`}
                  description={`${failed} examination${failed === 1 ? "" : "s"} not passed`}
                />
              </div>
            </section>

            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-blue-950">
                Examination Progress
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your completed examination scores in chronological
                order.
              </p>

              {sortedResults.length === 0 ? (
                <p className="mt-5 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Complete an examination to start tracking your
                  performance.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {sortedResults.map((result, index) => (
                    <div
                      key={result.attempt_id}
                      className="flex gap-4"
                    >
                      <div className="flex flex-col items-center">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-900">
                          {index + 1}
                        </span>

                        {index < sortedResults.length - 1 && (
                          <div className="mt-2 min-h-8 w-px flex-1 bg-slate-200" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pb-2">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-slate-900">
                              {result.examination_title}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {formatManilaDate(result.submitted_at)}
                              {" · "}
                              {result.subject_category || "Uncategorized"}
                            </p>
                          </div>

                          <p className="text-sm font-bold text-blue-950">
                            {getPercentage(result).toFixed(2)}%
                          </p>
                        </div>

                        <div className="mt-3">
                          <PerformanceBar
                            percentage={getPercentage(result)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-8">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-blue-950">
                  Performance by Subject
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review your average scores and examination
                  history for each subject category.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {categorizedResults.map(({ subject, results: subjectResults }) => (
                  <SubjectPerformance
                    key={subject}
                    subject={subject}
                    results={subjectResults}
                  />
                ))}
              </div>
            </section>

            {uncategorizedResults.length > 0 && (
              <section className="mt-8">
                <SubjectPerformance
                  subject="Uncategorized"
                  results={uncategorizedResults}
                />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
