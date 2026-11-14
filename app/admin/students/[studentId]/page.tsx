
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

type StudentDetailsRow = {
  student_id: string;
  full_name: string;
  email: string;
  approval_status: string;
  registered_at: string;
  attempt_id: string | null;
  examination_id: string | null;
  examination_title: string | null;
  started_at: string | null;
  submitted_at: string | null;
  attempt_status: string | null;
  score: number | string | null;
  total_points: number | string | null;
  percentage: number | string | null;
  passing_score: number | string | null;
  passed: boolean | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value: number | string | null) {
  if (value === null) {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(2).replace(/\.00$/, "")
    : "—";
}

function statusClasses(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default async function StudentDetailsPage({
  params,
}: PageProps) {
  await connection();

  const { studentId } = await params;

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(studentId)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verify approved administrator access.
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

  // Retrieve the selected student's profile and examination history.
  const { data, error } = await supabase.rpc(
    "admin_get_student_details",
    {
      p_student_id: studentId,
    }
  );

  if (error) {
    console.error(
      "Unable to retrieve student details:",
      error.message
    );

    throw new Error(
      "Unable to retrieve student details. Please try again."
    );
  }

  const rows = (data ?? []) as StudentDetailsRow[];

  if (rows.length === 0) {
    notFound();
  }

  const student = rows[0];

  const attempts = rows.filter(
    (row) => row.attempt_id !== null
  );

  const submittedAttempts = attempts.filter(
    (row) =>
      row.attempt_status === "submitted" &&
      row.submitted_at !== null
  );

  const passedAttempts = submittedAttempts.filter(
    (row) => row.passed === true
  );

  const failedAttempts = submittedAttempts.filter(
    (row) => row.passed === false
  );

  const averagePercentage =
    submittedAttempts.length > 0
      ? submittedAttempts.reduce(
          (total, row) => total + Number(row.percentage ?? 0),
          0
        ) / submittedAttempts.length
      : null;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Student Management
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

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Page Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-blue-950 sm:text-3xl">
            Student Details
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Review student account information and examination history.
          </p>
        </section>

        {/* Student Profile */}
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-blue-950">
              Student Profile
            </h3>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(
                student.approval_status
              )}`}
            >
              {student.approval_status}
            </span>
          </div>

          <dl className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">
                Full Name
              </dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {student.full_name || "Unnamed Student"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Email Address
              </dt>
              <dd className="mt-1 break-all font-semibold text-slate-900">
                {student.email || "Email unavailable"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Registration Date
              </dt>
              <dd className="mt-1 text-slate-900">
                {formatDate(student.registered_at)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">
                Student Account ID
              </dt>
              <dd className="mt-1 break-all text-xs text-slate-600">
                {student.student_id}
              </dd>
            </div>
          </dl>
        </section>

        {/* Examination Statistics */}
        <section className="mt-8">
          <h3 className="text-xl font-bold text-blue-950">
            Examination Performance
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Attempts
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-950">
                {attempts.length}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Passed
              </p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {passedAttempts.length}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Failed
              </p>
              <p className="mt-2 text-3xl font-bold text-red-700">
                {failedAttempts.length}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Average Percentage
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-700">
                {averagePercentage === null
                  ? "—"
                  : `${formatNumber(averagePercentage)}%`}
              </p>
            </div>
          </div>
        </section>

        {/* Examination History */}
        <section className="mt-10">
          <h3 className="text-xl font-bold text-blue-950">
            Examination History
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            All recorded examination attempts for this student.
          </p>

          {attempts.length === 0 ? (
            <div className="mt-5 rounded-xl border bg-white p-8 text-center shadow-sm">
              <p className="font-semibold text-slate-800">
                No examination attempts found.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                This student has not started an examination yet.
              </p>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <caption className="sr-only">
                    Examination attempts and results for this student
                  </caption>

                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-5 py-4 font-semibold">
                        Examination
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Started
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Submitted
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Score
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Percentage
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Result / Status
                      </th>
                      <th className="px-5 py-4 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {attempts.map((attempt) => (
                      <tr
                        key={attempt.attempt_id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {attempt.examination_title ||
                            "Examination unavailable"}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(attempt.started_at)}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(attempt.submitted_at)}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {attempt.score === null
                            ? "—"
                            : `${formatNumber(attempt.score)} / ${formatNumber(
                                attempt.total_points
                              )}`}
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {attempt.percentage === null
                            ? "—"
                            : `${formatNumber(attempt.percentage)}%`}
                        </td>

                        <td className="px-5 py-4">
                          {attempt.attempt_status === "submitted" ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                attempt.passed
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {attempt.passed ? "Passed" : "Failed"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold capitalize text-amber-800">
                              {attempt.attempt_status || "Unknown"}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {attempt.attempt_id &&
                          attempt.attempt_status === "submitted" &&
                          attempt.submitted_at ? (
                            <Link
                              href={`/admin/reports/${encodeURIComponent(
                                attempt.attempt_id
                              )}`}
                              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              View Result
                            </Link>
                          ) : (
                            <span className="text-slate-400">
                              Not available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Return to Dashboard */}
        <div className="mt-8">
          <Link
            href="/admin"
            className="inline-flex rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            Back to Student Management
          </Link>
        </div>
      </div>
    </main>
  );
}
