
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResultsTable, { type ExamResult } from "./results-table";

type ExaminationPerformance = {
  examination_id: string;
  examination_title: string;
  attempts: number;
  passed: number;
  failed: number;
  average_percentage: number;
};

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <p className="text-slate-600">
            Loading examination reports...
          </p>
        </main>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

async function ReportsContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verify that the current user is an approved administrator.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    profile.approval_status !== "approved"
  ) {
    redirect("/");
  }

  // Retrieve submitted examination results through the
  // administrator-only reporting function.
  const {
    data: resultData,
    error: resultsError,
  } = await supabase.rpc("admin_list_exam_results");

  if (resultsError) {
    console.error(
      "Unable to retrieve examination reports:",
      resultsError.message
    );
  }

  const results = (resultData ?? []) as ExamResult[];

  // Overall performance statistics.
  const totalAttempts = results.length;

  const passedAttempts = results.filter(
    (result) => result.passed
  ).length;

  const failedAttempts = totalAttempts - passedAttempts;

  const averagePercentage =
    totalAttempts > 0
      ? results.reduce(
          (total, result) =>
            total + Number(result.percentage || 0),
          0
        ) / totalAttempts
      : 0;

  const passRate =
    totalAttempts > 0
      ? (passedAttempts / totalAttempts) * 100
      : 0;

  // Group submitted attempts by examination.
  const examinationMap = new Map<
    string,
    ExaminationPerformance
  >();

  for (const result of results) {
    const existing = examinationMap.get(
      result.examination_id
    );

    if (existing) {
      existing.attempts += 1;

      if (result.passed) {
        existing.passed += 1;
      } else {
        existing.failed += 1;
      }

      existing.average_percentage += Number(
        result.percentage || 0
      );
    } else {
      examinationMap.set(result.examination_id, {
        examination_id: result.examination_id,
        examination_title: result.examination_title,
        attempts: 1,
        passed: result.passed ? 1 : 0,
        failed: result.passed ? 0 : 1,
        average_percentage: Number(
          result.percentage || 0
        ),
      });
    }
  }

  const examinationPerformance = Array.from(
    examinationMap.values()
  )
    .map((examination) => ({
      ...examination,
      average_percentage:
        examination.average_percentage /
        examination.attempts,
    }))
    .sort(
      (a, b) =>
        b.average_percentage - a.average_percentage
    );

  const formatPercentage = (value: number) =>
    `${value.toFixed(2)}%`;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Results and Reports
            </p>
          </div>

          <Link
            href="/admin"
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-100"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Page Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-blue-950 sm:text-3xl">
            Examination Reports
          </h2>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Monitor student performance, review examination
            outcomes, and export submitted examination results.
          </p>
        </section>

        {/* Error Message */}
        {resultsError ? (
          <section
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5"
          >
            <h3 className="font-bold text-red-900">
              Unable to Load Examination Reports
            </h3>

            <p className="mt-2 text-sm text-red-800">
              The examination results could not be retrieved.
              Please try again or contact your system administrator
              if the problem continues.
            </p>
          </section>
        ) : (
          <>
            {/* Overall Statistics */}
            <section className="mt-8">
              <h3 className="text-xl font-bold text-blue-950">
                Overall Performance
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Summary of all submitted examination attempts.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Completed Attempts
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-950">
                    {totalAttempts}
                  </p>
                </section>

                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Average Score
                  </p>

                  <p className="mt-2 text-3xl font-bold text-blue-700">
                    {formatPercentage(averagePercentage)}
                  </p>
                </section>

                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Pass Rate
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {formatPercentage(passRate)}
                  </p>
                </section>

                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Passed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-green-700">
                    {passedAttempts}
                  </p>
                </section>

                <section className="rounded-xl border bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Failed
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {failedAttempts}
                  </p>
                </section>
              </div>
            </section>

            {/* Examination Performance */}
            <section className="mt-10">
              <h3 className="text-xl font-bold text-blue-950">
                Examination Performance
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                Comparison of student results across examinations.
              </p>

              <div className="mt-5 overflow-hidden rounded-xl border bg-white shadow-sm">
                {examinationPerformance.length === 0 ? (
                  <div className="p-8 text-center">
                    <h4 className="font-semibold text-slate-900">
                      No Examination Data Available
                    </h4>

                    <p className="mt-2 text-sm text-slate-500">
                      Examination performance will appear here
                      after students submit examinations.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[850px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-5 py-4 font-semibold">
                            Examination
                          </th>

                          <th className="px-5 py-4 font-semibold">
                            Attempts
                          </th>

                          <th className="px-5 py-4 font-semibold">
                            Average Score
                          </th>

                          <th className="px-5 py-4 font-semibold">
                            Passed
                          </th>

                          <th className="px-5 py-4 font-semibold">
                            Failed
                          </th>

                          <th className="px-5 py-4 font-semibold">
                            Item Analysis
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {examinationPerformance.map(
                          (examination) => (
                            <tr
                              key={examination.examination_id}
                              className="hover:bg-slate-50"
                            >
                              <td className="px-5 py-4 font-medium text-slate-900">
                                {examination.examination_title}
                              </td>

                              <td className="px-5 py-4 text-slate-700">
                                {examination.attempts}
                              </td>

                              <td className="px-5 py-4 font-semibold text-blue-700">
                                {formatPercentage(
                                  examination.average_percentage
                                )}
                              </td>

                              <td className="px-5 py-4 font-semibold text-green-700">
                                {examination.passed}
                              </td>

                              <td className="px-5 py-4 font-semibold text-red-700">
                                {examination.failed}
                              </td>

                              <td className="px-5 py-4">
                                <Link
                                  href={`/admin/reports/item-analysis/${encodeURIComponent(
                                    examination.examination_id
                                  )}`}
                                  className="inline-flex whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                  View Item Analysis
                                </Link>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Detailed Results */}
            <section className="mt-10">
              <div className="mb-5">
                <h3 className="text-xl font-bold text-blue-950">
                  Student Examination Results
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  Search, filter, review, and export submitted
                  student examination results.
                </p>
              </div>

              <ResultsTable results={results} />
            </section>

            {/* Report Scope */}
            <section className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5">
              <h3 className="font-semibold text-blue-950">
                Reporting Information
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-900">
                This report currently includes submitted
                examinations only. Attempts that are still in
                progress are not included in these statistics.
              </p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
