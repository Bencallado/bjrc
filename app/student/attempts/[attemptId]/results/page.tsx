
import { redirect } from "next/navigation";
import { connection } from "next/server";
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
  started_at: string;
  submitted_at: string;
  score: number;
  total_points: number;
  percentage: number;
  passing_score: number;
  passed: boolean;
  question_id: string;
  question_text: string;
  question_points: number;
  question_order: number;
  option_id: string | null;
  option_text: string | null;
  option_order: number | null;
  is_selected: boolean;
  is_correct: boolean;
  is_answered: boolean;
  points_earned: number;
};

type ResultQuestion = {
  questionId: string;
  questionText: string;
  points: number;
  questionOrder: number;
  isAnswered: boolean;
  pointsEarned: number;
  options: {
    optionId: string;
    optionText: string;
    optionOrder: number;
    isSelected: boolean;
    isCorrect: boolean;
  }[];
};

export default async function ExaminationResultsPage({
  params,
}: PageProps) {
  await connection();

  const { attemptId } = await params;

  const supabase = await createClient();

  // 1. Verify the signed-in student.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Retrieve the submitted examination results.
  const { data, error } = await supabase.rpc(
    "student_get_exam_results",
    {
      p_attempt_id: attemptId,
    }
  );

  if (error) {
    console.error(
      "[BJRC RESULTS RPC ERROR]",
      error.message
    );

    throw new Error(
      "The examination results could not be loaded. Please verify that this examination has been submitted."
    );
  }

  if (!data || data.length === 0) {
    console.error(
      "[BJRC RESULTS EMPTY RESPONSE]",
      { attemptId }
    );

    throw new Error(
      "No examination results were found for this submitted attempt."
    );
  }

  const rows = data as ResultRow[];
  const result = rows[0];

  // 3. Group answer choices under their respective questions.
  const questionMap = new Map<string, ResultQuestion>();

  for (const item of rows) {
    if (!questionMap.has(item.question_id)) {
      questionMap.set(item.question_id, {
        questionId: item.question_id,
        questionText: item.question_text,
        points: Number(item.question_points),
        questionOrder: item.question_order,
        isAnswered: item.is_answered,
        pointsEarned: Number(item.points_earned),
        options: [],
      });
    }

    if (item.option_id && item.option_text !== null) {
      questionMap.get(item.question_id)!.options.push({
        optionId: item.option_id,
        optionText: item.option_text,
        optionOrder: item.option_order ?? 0,
        isSelected: item.is_selected,
        isCorrect: item.is_correct,
      });
    }
  }

  const questions = Array.from(questionMap.values()).sort(
    (a, b) => a.questionOrder - b.questionOrder
  );

  // 4. Calculate the examination summary.
  const score = Number(result.score);
  const totalPoints = Number(result.total_points);
  const percentage = Number(result.percentage);
  const passingScore = Number(result.passing_score);

  // 5. Display the examination results.
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Page heading */}
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">
            BJRC Student Examination
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Examination Results
          </h1>

          <p className="mt-2 text-slate-600">
            {result.examination_title}
          </p>
        </section>

        {/* Overall result */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-center">

            <div
              className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold ${
                result.passed
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {result.passed ? "✓" : "✕"}
            </div>

            <h2
              className={`mt-4 text-2xl font-bold ${
                result.passed
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {result.passed
                ? "Congratulations! You Passed!"
                : "Examination Not Passed"}
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              {result.passed
                ? "You have achieved the required passing score."
                : "You did not reach the required passing score."}
            </p>

            <p className="mt-6 text-5xl font-extrabold text-slate-900">
              {percentage.toFixed(2)}%
            </p>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Overall Percentage
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">
                Score
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {score} / {totalPoints}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">
                Passing Score
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {passingScore}%
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">
                Questions
              </p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {questions.length}
              </p>
            </div>

          </div>
        </section>

        {/* Question-by-question review */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Answer Review
          </h2>

          <div className="space-y-5">
            {questions.map((question, index) => (
              <article
                key={question.questionId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                  <p className="font-semibold text-blue-800">
                    Question {index + 1}
                  </p>

                  <span className="text-sm font-medium text-slate-500">
                    {question.pointsEarned} / {question.points} points
                  </span>

                </div>

                <h3 className="mt-3 text-lg font-semibold leading-relaxed text-slate-900">
                  {question.questionText}
                </h3>

                <div className="mt-5 space-y-3">
                  {question.options.map((option) => (
                    <div
                      key={option.optionId}
                      className={`rounded-lg border p-4 ${
                        option.isCorrect
                          ? "border-green-300 bg-green-50"
                          : option.isSelected
                            ? "border-red-300 bg-red-50"
                            : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">

                        <p className="text-sm leading-relaxed text-slate-800">
                          {option.optionText}
                        </p>

                        <div className="shrink-0 text-right">
                          {option.isCorrect && (
                            <span className="text-xs font-bold text-green-700">
                              Correct Answer
                            </span>
                          )}

                          {option.isSelected && (
                            <p className="mt-1 text-xs font-bold text-blue-700">
                              Your Answer
                            </p>
                          )}
                        </div>

                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4">
                  {question.isAnswered ? (
                    <p className="text-sm font-medium text-slate-700">
                      You answered this question.
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-red-600">
                      This question was left unanswered.
                    </p>
                  )}
                </div>

              </article>
            ))}
          </div>
        </section>

        {/* Completion information */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">
            Examination Completed
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Your examination has been submitted and graded successfully.
            Your results are displayed above.
          </p>

          <p className="mt-3 text-xs text-slate-500">
            Submitted:{" "}
            {new Date(result.submitted_at).toLocaleString()}
          </p>
        </section>

        {/* Return to Student Dashboard */}
        <section className="flex justify-center pb-6">
          <Link
            href="/student"
            className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            ← Back to Student Dashboard
          </Link>
        </section>

      </div>
    </main>
  );
}
