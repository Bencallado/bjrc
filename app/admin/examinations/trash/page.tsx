
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrashControls from "./trash-controls";

type TrashedExamination = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  scheduled_at: string | null;
  closes_at: string | null;
  subject_category: string | null;
  subtopic: string | null;
  deleted_at: string;
  deleted_by: string | null;
  attempt_count: number;
  in_progress_attempt_count: number;
};

function formatManilaDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusStyle(status: string) {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700";

    case "scheduled":
      return "bg-blue-100 text-blue-800";

    case "published":
      return "bg-green-100 text-green-800";

    case "closed":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ExaminationTrashPage() {
  return (
    <Suspense
      fallback={
        <main className="p-10">
          Loading examination Trash...
        </main>
      }
    >
      <ExaminationTrashContent />
    </Suspense>
  );
}

async function ExaminationTrashContent() {
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

  const {
    data: examinationData,
    error,
  } = await supabase.rpc(
    "admin_list_trashed_examinations"
  );

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-bold text-red-900">
            Unable to Load Trash
          </h2>

          <p className="mt-2 text-sm text-red-800">
            {error.message}
          </p>

          <Link
            href="/admin/examinations"
            className="mt-4 inline-block font-semibold text-blue-800 underline"
          >
            Return to Examinations
          </Link>
        </div>
      </main>
    );
  }

  const examinations =
    (examinationData ?? []) as TrashedExamination[];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              BJRC
            </h1>

            <p className="text-sm text-blue-200">
              Examination Trash
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

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <section className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-blue-950">
            Deleted Examinations
          </h2>

          <p className="mt-2 text-slate-600">
            Examinations moved here are hidden from the
            student catalogue. Restore them whenever needed.
            Existing student attempts and results are preserved.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Total in Trash
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-950">
                {examinations.length}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                Student Attempts
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-950">
                {examinations.reduce(
                  (total, exam) =>
                    total + Number(exam.attempt_count),
                  0
                )}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">
                In-progress Attempts
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-950">
                {examinations.reduce(
                  (total, exam) =>
                    total +
                    Number(exam.in_progress_attempt_count),
                  0
                )}
              </p>
            </div>
          </div>
        </section>

        {examinations.length === 0 ? (
          <section className="rounded-xl border bg-white p-12 text-center shadow-sm">
            <h3 className="text-xl font-bold text-blue-950">
              Trash is Empty
            </h3>

            <p className="mt-2 text-slate-600">
              No examinations have been moved to Trash.
            </p>

            <Link
              href="/admin/examinations"
              className="mt-5 inline-block rounded-lg bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              View Examinations
            </Link>
          </section>
        ) : (
          <div className="space-y-5">
            {examinations.map((exam) => (
              <section
                key={exam.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${getStatusStyle(
                          exam.status
                        )}`}
                      >
                        {exam.status}
                      </span>

                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase text-red-800">
                        In Trash
                      </span>
                    </div>

                    <h3 className="mt-3 text-xl font-bold text-blue-950">
                      {exam.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600">
                      {exam.description ||
                        "No description provided."}
                    </p>

                    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-slate-500">
                          Subject
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {exam.subject_category ||
                            "Not categorized"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Subtopic
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {exam.subtopic || "Not specified"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Moved to Trash
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatManilaDateTime(
                            exam.deleted_at
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Total Student Attempts
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {exam.attempt_count}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          In-progress Attempts
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {exam.in_progress_attempt_count}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">
                          Previous Publication Date
                        </p>

                        <p className="mt-1 font-semibold text-slate-900">
                          {formatManilaDateTime(
                            exam.scheduled_at
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-64">
                    <TrashControls
                      examinationId={exam.id}
                      attemptCount={Number(
                        exam.attempt_count
                      )}
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
