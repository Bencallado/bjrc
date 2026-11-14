import { Suspense } from "react";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuestionEditor, {
  type ExamQuestion,
} from "./question-editor";
import QuestionImporter from "./question-importer";
import PublicationControls from "./publication-controls";
import CloseControls from "./close-controls";
import CategoryEditor from "./category-editor";
import ManagementControls from "./management-controls";

type Examination = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  status: string;
  created_at: string;
  scheduled_at: string | null;
  closes_at: string | null;
  subject_category: string | null;
  subtopic: string | null;
};

type QuestionRow = {
  question_id: string;
  question_text: string;
  points: number;
  question_order: number;
  option_id: string | null;
  option_text: string | null;
  is_correct: boolean | null;
  option_order: number | null;
};

function formatManilaDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ExaminationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="p-10">
          Loading examination details...
        </main>
      }
    >
      <ExaminationDetailsContent params={params} />
    </Suspense>
  );
}

async function ExaminationDetailsContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
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

  const { data: examinationData, error } =
    await supabase.rpc(
      "admin_list_examinations_with_subjects"
    );

  if (error) {
    return (
      <main className="p-10">
        Unable to load examination details: {error.message}
      </main>
    );
  }

  const examinations =
    (examinationData ?? []) as Examination[];

  const examination = examinations.find(
    (exam) => exam.id === id
  );

  if (!examination) {
    notFound();
  }

  const {
    data: questionData,
    error: questionError,
  } = await supabase.rpc(
    "admin_list_exam_questions",
    {
      p_examination_id: id,
    }
  );

  const questionRows =
    (questionData ?? []) as QuestionRow[];

  const questionMap = new Map<string, ExamQuestion>();

  for (const row of questionRows) {
    let question = questionMap.get(row.question_id);

    if (!question) {
      question = {
        question_id: row.question_id,
        question_text: row.question_text,
        points: row.points,
        question_order: row.question_order,
        options: [],
      };

      questionMap.set(row.question_id, question);
    }

    if (
      row.option_id &&
      row.option_text !== null &&
      row.is_correct !== null &&
      row.option_order !== null
    ) {
      question.options.push({
        option_id: row.option_id,
        option_text: row.option_text,
        is_correct: row.is_correct,
        option_order: row.option_order,
      });
    }
  }

  const questions = Array.from(questionMap.values());

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>

            <p className="text-sm text-blue-200">
              Examination Details
            </p>
          </div>

          <Link
            href="/admin/examinations"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100"
          >
            Back to Examinations
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-800">
                {examination.status}
              </span>

              <h2 className="mt-4 text-3xl font-bold text-blue-950">
                {examination.title}
              </h2>

              <p className="mt-3 text-slate-600">
                {examination.description ||
                  "No description provided."}
              </p>
            </div>

            <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-900">
              Examination Details
            </span>
          </div>

          <div className="mt-8 grid gap-5 border-t pt-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-500">
                Time Limit
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {examination.time_limit_minutes
                  ? `${examination.time_limit_minutes} minutes`
                  : "No time limit"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Passing Score
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {examination.passing_score !== null
                  ? `${examination.passing_score}%`
                  : "Not set"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Date Created
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {new Date(
                  examination.created_at
                ).toLocaleDateString("en-PH", {
                  timeZone: "Asia/Manila",
                })}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 border-t pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">
                Publication Date and Time
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatManilaDateTime(
                  examination.scheduled_at
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Closing Date and Time
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {examination.closes_at
                  ? formatManilaDateTime(
                      examination.closes_at
                    )
                  : "No closing date"}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="font-bold text-blue-950">
              Examination Instructions
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-slate-600">
              {examination.instructions ||
                "No instructions provided."}
            </p>
          </div>
        </section>

        <CategoryEditor
          examinationId={id}
          subjectCategory={examination.subject_category}
          subtopic={examination.subtopic}
        />

        {examination.status === "draft" && (
          <PublicationControls examinationId={id} />
        )}

        {(examination.status === "published" ||
          examination.status === "scheduled") && (
          <CloseControls examinationId={id} />
        )}

        <ManagementControls
          examinationId={id}
          status={examination.status}
          scheduledAt={examination.scheduled_at}
          closesAt={examination.closes_at}
        />

        {questionError ? (
          <section
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">
              Unable to Load Questions
            </h3>

            <p className="mt-2 text-sm">
              {questionError.message}
            </p>
          </section>
        ) : examination.status === "draft" ? (
          <>
            <QuestionImporter
              examinationId={id}
              existingQuestions={questions.map((question) => ({
                question_text: question.question_text,
              }))}
            />

            <QuestionEditor
              examinationId={id}
              questions={questions}
            />
          </>
        ) : (
          <section className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-blue-950">
              Question Management
            </h3>

            <p className="mt-2 text-slate-600">
              This examination is no longer a draft.
              Question editing is disabled.
            </p>

            <p className="mt-3 font-semibold text-blue-900">
              Total Questions: {questions.length}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
