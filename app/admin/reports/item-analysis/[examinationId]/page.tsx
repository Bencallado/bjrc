
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    examinationId: string;
  }>;
};

type ItemAnalysisRow = {
  examination_id: string;
  examination_title: string;
  question_id: string;
  question_text: string;
  question_order: number;
  question_points: number | string;
  total_attempts: number;
  answered_count: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  percentage_correct: number | string;
  percentage_incorrect: number | string;
  percentage_unanswered: number | string;
  correct_percentage_among_answered: number | string | null;
  most_selected_incorrect_option: string | null;
  most_selected_incorrect_count: number | string;
  most_selected_incorrect_percentage: number | string | null;
};

function formatNumber(value: number | string | null) {
  if (value === null) {
    return "N/A";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toLocaleString("en-PH", {
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value: number | string | null) {
  if (value === null) {
    return "N/A";
  }

  return `${formatNumber(value)}%`;
}

export default async function ItemAnalysisPage({
  params,
}: PageProps) {
  await connection();

  const { examinationId } = await params;

  const supabase = await createClient();

  // Verify the authenticated user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Only approved administrators may view item analysis.
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

  // Retrieve examination item analysis.
  const { data, error } = await supabase.rpc(
    "admin_get_exam_item_analysis",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    console.error(
      "Unable to retrieve examination item analysis:",
      error.message
    );

    throw new Error(
      "The examination item analysis could not be retrieved."
    );
  }

  const rows = (data ?? []) as ItemAnalysisRow[];

  if (rows.length === 0) {
    notFound();
  }

  const examinationTitle = rows[0].examination_title;

  const totalAttempts = rows[0].total_attempts;

  const totalQuestions = rows.length;

  const totalCorrect = rows.reduce(
    (sum, row) => sum + Number(row.correct_count),
    0
  );

  const totalIncorrect = rows.reduce(
    (sum, row) => sum + Number(row.incorrect_count),
    0
  );

  const totalUnanswered = rows.reduce(
    (sum, row) => sum + Number(row.unanswered_count),
    0
  );

  const formatCount = (value: number) =>
    value.toLocaleString("en-PH");

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Examination Item Analysis
            </p>
          </div>

          <Link
            href="/admin/reports"
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100"
          >
            Back to Reports
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {/* Page Introduction */}
        <section>
          <h2 className="text-2xl font-bold text-blue-950 sm:text-3xl">
            Item Analysis
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Analyze student responses and identify questions
            that may need review or improvement.
          </p>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            {examinationTitle}
          </h3>
        </section>

        {/* Summary Statistics */}
        <section>
          <h3 className="text-xl font-bold text-blue-950">
            Response Summary
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Response totals across all submitted attempts.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Submitted Attempts
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-950">
                {formatCount(totalAttempts)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Questions
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-950">
                {formatCount(totalQuestions)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Correct Responses
              </p>
              <p className="mt-2 text-3xl font-bold text-green-700">
                {formatCount(totalCorrect)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Incorrect Responses
              </p>
              <p className="mt-2 text-3xl font-bold text-red-700">
                {formatCount(totalIncorrect)}
              </p>
            </div>

            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Unanswered
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {formatCount(totalUnanswered)}
              </p>
            </div>
          </div>
        </section>

        {/* Question Analysis */}
        <section>
          <h3 className="text-xl font-bold text-blue-950">
            Question-by-Question Analysis
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            Review correct, incorrect, and unanswered responses
            for every examination question.
          </p>

          <div className="mt-5 space-y-5">
            {rows
              .slice()
              .sort(
                (a, b) =>
                  a.question_order - b.question_order
              )
              .map((question, index) => {
                const answeredCount = Number(
                  question.answered_count
                );

                const correctRate =
                  question.correct_percentage_among_answered ===
                  null
                    ? null
                    : Number(
                        question.correct_percentage_among_answered
                      );

                const unansweredRate = Number(
                  question.percentage_unanswered
                );

                const hasLowCorrectRate =
                  answeredCount > 0 &&
                  correctRate !== null &&
                  correctRate < 50;

                const hasHighNonResponse =
                  unansweredRate > 50;

                const hasIncorrectOption =
                  question.most_selected_incorrect_option !==
                    null &&
                  Number(question.most_selected_incorrect_count) > 0;

                return (
                  <article
                    key={question.question_id}
                    className="rounded-xl border bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Question {index + 1}
                        </p>

                        <h4 className="mt-2 font-semibold text-slate-900">
                          {question.question_text}
                        </h4>
                      </div>

                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                        {formatNumber(question.question_points)} points
                      </span>
                    </div>

                    {/* Question Indicators */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {hasLowCorrectRate && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                          Low Correct Rate
                        </span>
                      )}

                      {hasHighNonResponse && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          High Non-response
                        </span>
                      )}

                      {!hasLowCorrectRate &&
                        !hasHighNonResponse && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            No Alert
                          </span>
                        )}
                    </div>

                    {/* Response Counts */}
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Total Attempts
                        </p>
                        <p className="mt-1 text-xl font-bold text-slate-900">
                          {formatCount(Number(question.total_attempts))}
                        </p>
                      </div>

                      <div className="rounded-lg bg-green-50 p-3">
                        <p className="text-xs text-green-700">
                          Correct
                        </p>
                        <p className="mt-1 text-xl font-bold text-green-800">
                          {formatCount(Number(question.correct_count))}
                        </p>
                      </div>

                      <div className="rounded-lg bg-red-50 p-3">
                        <p className="text-xs text-red-700">
                          Incorrect
                        </p>
                        <p className="mt-1 text-xl font-bold text-red-800">
                          {formatCount(Number(question.incorrect_count))}
                        </p>
                      </div>

                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">
                          Unanswered
                        </p>
                        <p className="mt-1 text-xl font-bold text-amber-800">
                          {formatCount(Number(question.unanswered_count))}
                        </p>
                      </div>
                    </div>

                    {/* Response Percentages */}
                    <div className="mt-5">
                      <h5 className="text-sm font-semibold text-slate-800">
                        Response Percentages
                      </h5>

                      <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="bg-green-500"
                          style={{
                            width: `${Number(question.percentage_correct)}%`,
                          }}
                          title={`Correct: ${formatPercentage(question.percentage_correct)}`}
                        />

                        <div
                          className="bg-red-500"
                          style={{
                            width: `${Number(question.percentage_incorrect)}%`,
                          }}
                          title={`Incorrect: ${formatPercentage(question.percentage_incorrect)}`}
                        />

                        <div
                          className="bg-amber-400"
                          style={{
                            width: `${unansweredRate}%`,
                          }}
                          title={`Unanswered: ${formatPercentage(question.percentage_unanswered)}`}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                        <span>
                          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
                          Correct: {formatPercentage(question.percentage_correct)}
                        </span>

                        <span>
                          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                          Incorrect: {formatPercentage(question.percentage_incorrect)}
                        </span>

                        <span>
                          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
                          Unanswered: {formatPercentage(question.percentage_unanswered)}
                        </span>
                      </div>
                    </div>

                    {/* Correctness Among Students Who Answered */}
                    <div className="mt-5 rounded-lg border border-slate-200 p-4">
                      <p className="text-sm text-slate-600">
                        Correct response rate among students who answered
                      </p>

                      <p className="mt-1 text-2xl font-bold text-blue-800">
                        {formatPercentage(
                          question.correct_percentage_among_answered
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Based only on answered responses, excluding unanswered attempts.
                      </p>
                    </div>

                    {/* Most Frequently Selected Incorrect Option */}
                    <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                      <h5 className="text-sm font-semibold text-red-900">
                        Most Frequently Selected Incorrect Answer
                      </h5>

                      {hasIncorrectOption ? (
                        <>
                          <p className="mt-2 text-base font-semibold text-slate-900">
                            {question.most_selected_incorrect_option}
                          </p>

                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-500">
                                Selection Count
                              </p>
                              <p className="mt-1 text-xl font-bold text-red-800">
                                {formatCount(
                                  Number(
                                    question.most_selected_incorrect_count
                                  )
                                )}
                              </p>
                            </div>

                            <div className="rounded-lg bg-white p-3">
                              <p className="text-xs text-slate-500">
                                Share of Incorrect Answers
                              </p>
                              <p className="mt-1 text-xl font-bold text-red-800">
                                {formatPercentage(
                                  question.most_selected_incorrect_percentage
                                )}
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs text-red-800">
                            Percentage is calculated among students who
                            submitted an incorrect answer to this question.
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-slate-600">
                          No incorrect responses were recorded for this question.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        </section>

        {/* Interpretation Guide */}
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-950">
            Item Analysis Guide
          </h3>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
            <li>
              <strong>Low Correct Rate:</strong> Fewer than 50% of students who answered the question answered correctly.
            </li>

            <li>
              <strong>High Non-response:</strong> More than 50% of submitted attempts left the question unanswered.
            </li>

            <li>
              <strong>Correct Response Rate:</strong> Measures correctness among students who actually answered.
            </li>

            <li>
              <strong>Most Frequently Selected Incorrect Answer:</strong> Shows the incorrect option chosen by the largest number of students and its share of all incorrect responses.
            </li>

            <li>
              These indicators are preliminary review flags, not formal psychometric measures of item difficulty or discrimination.
            </li>
          </ul>
        </section>

        <div className="pb-6">
          <Link
            href="/admin/reports"
            className="inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Back to Reports
          </Link>
        </div>
      </div>
    </main>
  );
}
