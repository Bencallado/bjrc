
import Link from "next/link";
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

function ResultCard({ result }: { result: ExamResult }) {
  const percentage = Number(result.percentage);
  const validPercentage = Number.isFinite(percentage)
    ? percentage
    : 0;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h4 className="break-words text-lg font-bold text-blue-950">
            {result.examination_title}
          </h4>

          <p className="mt-2 text-sm text-blue-800">
            Subtopic: {result.subtopic || "Not specified"}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Submitted: {formatManilaDateTime(result.submitted_at)}
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            result.passed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.passed ? "Passed" : "Not Passed"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
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

        <div>
          <p className="text-xs text-slate-500">Subject</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {result.subject_category || "Uncategorized"}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          href={`/student/attempts/${result.attempt_id}/results`}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View Full Results and Answer Review
        </Link>
      </div>
    </article>
  );
}

export default async function StudentResultsPage() {
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

  const categorizedResults = SUBJECT_CATEGORIES.map((subject) => ({
    subject,
    results: results.filter(
      (result) => result.subject_category === subject
    ),
  }));

  const uncategorizedResults = results.filter(
    (result) => !result.subject_category
  );

  const passedCount = results.filter(
    (result) => result.passed
  ).length;

  const failedCount = results.length - passedCount;

  return (
    <main className="min-h-screen bg-slate-50">
      <StudentNavigation activePage="results" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-blue-700">
            BJRC Student Portal
          </p>

          <h2 className="mt-2 text-2xl font-bold text-blue-950 sm:text-3xl">
            My Examination Results
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review your completed examinations, scores, and
            performance by subject category.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            Unable to load your examination results. Please
            refresh the page or contact the administrator if
            the problem continues.
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">
                  Completed Examinations
                </p>
                <p className="mt-2 text-2xl font-bold text-blue-950">
                  {results.length}
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

            {results.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="font-bold text-blue-950">
                  No Examination Results Yet
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Your results will appear here after you complete
                  and submit an examination.
                </p>

                <Link
                  href="/student/examinations"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Browse Examinations
                </Link>
              </div>
            ) : (
              <div className="mt-8 space-y-9">
                {categorizedResults.map(({ subject, results: subjectResults }) => (
                  <section key={subject}>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <h3 className="text-xl font-bold text-blue-950">
                        {subject}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {subjectResults.length}{" "}
                        {subjectResults.length === 1
                          ? "result"
                          : "results"}
                      </p>
                    </div>

                    {subjectResults.length === 0 ? (
                      <p className="rounded-lg border border-dashed bg-white p-5 text-sm text-slate-500">
                        No examination results in this subject yet.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {subjectResults.map((result) => (
                          <ResultCard
                            key={result.attempt_id}
                            result={result}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}

                {uncategorizedResults.length > 0 && (
                  <section>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <h3 className="text-xl font-bold text-slate-700">
                        Uncategorized
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Results from examinations that have not yet
                        been assigned a subject category.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {uncategorizedResults.map((result) => (
                        <ResultCard
                          key={result.attempt_id}
                          result={result}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
