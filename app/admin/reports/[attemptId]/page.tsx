
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

type ResultRow = {
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
  question_id: string;
  question_text: string;
  question_points: number | string;
  question_order: number;
  option_id: string | null;
  option_text: string | null;
  option_order: number | null;
  is_selected: boolean;
  is_correct: boolean;
  is_answered: boolean;
  points_earned: number | string;
};

type QuestionReview = {
  question_id: string;
  question_text: string;
  question_points: number;
  question_order: number;
  points_earned: number;
  is_answered: boolean;
  options: {
    option_id: string;
    option_text: string;
    option_order: number;
    is_selected: boolean;
    is_correct: boolean;
  }[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatNumber(value: number | string) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(2).replace(/\.00$/, "")
    : "0";
}

export default async function AdminResultDetailsPage({
  params,
}: PageProps) {
  await connection();

  const { attemptId } = await params;

  // Validate the examination attempt UUID.
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(attemptId)) {
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

  // Retrieve individual examination details using
  // the administrator-only Supabase function.
  const {
    data,
    error: resultsError,
  } = await supabase.rpc("admin_get_exam_result_details", {
    p_attempt_id: attemptId,
  });

  if (resultsError) {
    console.error(
      "Unable to retrieve examination result details:",
      resultsError.message
    );

    throw new Error(
      "Unable to retrieve the examination result details."
    );
  }

  const rows = (data ?? []) as ResultRow[];

  if (rows.length === 0) {
    notFound();
  }

  const first = rows[0];

  // Group examination options by question.
  const questionMap = new Map<string, QuestionReview>();

  for (const row of rows) {
    let question = questionMap.get(row.question_id);

    if (!question) {
      question = {
        question_id: row.question_id,
        question_text: row.question_text,
        question_points: Number(row.question_points || 0),
        question_order: row.question_order,
        points_earned: Number(row.points_earned || 0),
        is_answered: row.is_answered,
        options: [],
      };

      questionMap.set(row.question_id, question);
    }

    if (row.option_id && row.option_text !== null) {
      question.options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        option_order: row.option_order ?? 0,
        is_selected: row.is_selected,
        is_correct: row.is_correct,
      });
    }
  }

  const questions = Array.from(questionMap.values()).sort(
    (a, b) => a.question_order - b.question_order
  );

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Individual Examination Result
            </p>
          </div>

          <Link
            href="/admin/reports"
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-100"
          >
            Back to Reports
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Page Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-blue-950">
            Individual Examination Result
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Review the student&apos;s answers and examination performance.
          </p>
        </section>

        {/* Examination Information */}
        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-blue-950">
            Examination Information
          </h3>

          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Student</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {first.student_name || "Unnamed Student"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Examination</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {first.examination_title}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Started</dt>
              <dd className="mt-1 text-slate-900">
                {formatDate(first.started_at)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">Submitted</dt>
              <dd className="mt-1 text-slate-900">
                {formatDate(first.submitted_at)}
              </dd>
            </div>
          </dl>
        </section>

        {/* Examination Summary */}
        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-blue-950">
            Examination Summary
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Result</p>
              <p
                className={`mt-2 text-xl font-bold ${
                  first.passed ? "text-green-700" : "text-red-700"
                }`}
              >
                {first.passed ? "PASSED" : "FAILED"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Score</p>
              <p className="mt-2 text-xl font-bold text-blue-950">
                {formatNumber(first.score)} /{" "}
                {formatNumber(first.total_points)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Percentage</p>
              <p className="mt-2 text-xl font-bold text-blue-700">
                {formatNumber(first.percentage)}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Passing Score</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatNumber(first.passing_score)}%
              </p>
            </div>
          </div>

          <div className="mt-5 border-t pt-5">
            <p className="text-sm text-slate-500">
              Questions Reviewed
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {questions.length}
            </p>
          </div>
        </section>

        {/* Answer Review */}
        <section className="mt-8">
          <h3 className="text-xl font-bold text-blue-950">
            Student Answer Review
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Review each question, the student&apos;s selected answer,
            and the correct answer.
          </p>

          <div className="mt-5 space-y-5">
            {questions.map((question) => (
              <article
                key={question.question_id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="font-semibold text-slate-900">
                    Question {question.question_order}:{" "}
                    {question.question_text}
                  </h4>

                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    {formatNumber(question.points_earned)} /{" "}
                    {formatNumber(question.question_points)} points
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {question.options
                    .sort(
                      (a, b) => a.option_order - b.option_order
                    )
                    .map((option) => (
                      <div
                        key={option.option_id}
                        className={`rounded-lg border p-4 ${
                          option.is_correct
                            ? "border-green-300 bg-green-50"
                            : option.is_selected
                              ? "border-blue-300 bg-blue-50"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-slate-800">
                            {option.option_order}.{" "}
                            {option.option_text}
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {option.is_correct && (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                                Correct Answer
                              </span>
                            )}

                            {option.is_selected && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                                Student&apos;s Answer
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {!question.is_answered && (
                  <p className="mt-4 text-sm font-medium text-red-600">
                    This question was left unanswered.
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Return to Reports */}
        <div className="mt-8">
          <Link
            href="/admin/reports"
            className="inline-flex rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            Back to Examination Reports
          </Link>
        </div>
      </div>
    </main>
  );
}
