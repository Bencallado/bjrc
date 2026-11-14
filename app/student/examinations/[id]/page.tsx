
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startExamination } from "./actions";

type Examination = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  scheduled_at: string;
  closes_at: string | null;
  availability_status: "available" | "upcoming" | "closed";
  subject_category: string | null;
  subtopic: string | null;
};

function formatManilaDateTime(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

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

function ExaminationPageFallback() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-9 w-2/3 rounded bg-slate-200" />
        <div className="h-32 rounded-lg bg-slate-200" />
      </div>
    </main>
  );
}

export default async function ExaminationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ExaminationPageFallback />}>
      <ExaminationContent params={params} />
    </Suspense>
  );
}

async function ExaminationContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();

  const { id } = await params;

  if (!id || !id.trim()) {
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, approval_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/");
  }

  if (profile.role !== "student") {
    redirect("/");
  }

  if (profile.approval_status !== "approved") {
    redirect("/student/pending");
  }

  // Finalize expired attempts before displaying examination details.
  const { error: finalizationError } = await supabase.rpc(
    "student_finalize_expired_attempts"
  );

  if (finalizationError) {
    console.error(
      "Unable to finalize expired examination attempts:",
      finalizationError.message
    );
  }

  // Retrieve examinations with their subject categories and subtopics.
  const {
    data: examinationData,
    error: examinationError,
  } = await supabase.rpc(
    "student_list_available_examinations_with_subjects"
  );

  if (examinationError) {
    console.error(
      "Unable to retrieve examination details:",
      examinationError.message
    );

    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6">
        <Link
          href="/student"
          className="text-sm font-semibold text-blue-800 hover:underline"
        >
          &larr; Back to Student Dashboard
        </Link>

        <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-5">
          <h1 className="text-lg font-bold text-red-900">
            Unable to Load Examination
          </h1>
          <p className="mt-2 text-sm leading-6 text-red-800">
            We could not retrieve the examination details. Please try again
            later or contact the review center administrator.
          </p>
        </div>
      </main>
    );
  }

  const examinations: Examination[] = Array.isArray(examinationData)
    ? (examinationData as unknown as Examination[])
    : [];

  const examination = examinations.find((exam) => exam.id === id);

  if (!examination) {
    notFound();
  }

  const isAvailable = examination.availability_status === "available";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/student"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-blue-800 transition hover:text-blue-950 hover:underline"
        >
          &larr; Back to Student Dashboard
        </Link>

        <article className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-blue-950 px-5 py-7 text-white sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-200">
              Examination Details
            </p>

            <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
              {examination.title}
            </h1>

            <p className="mt-3 text-sm text-blue-100">
              Please review the examination details and instructions before
              proceeding.
            </p>
          </div>

          <div className="space-y-7 p-5 sm:p-8">
            <section>
              <h2 className="text-base font-bold text-blue-950">
                Subject Information
              </h2>

              <dl className="mt-3 grid gap-4 rounded-lg border border-blue-100 bg-blue-50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Subject Category
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {examination.subject_category || "Uncategorized"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Subtopic
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {examination.subtopic || "Not specified"}
                  </dd>
                </div>
              </dl>
            </section>

            {examination.description && (
              <section>
                <h2 className="text-base font-bold text-blue-950">
                  About This Examination
                </h2>

                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                  {examination.description}
                </p>
              </section>
            )}

            <section>
              <h2 className="text-base font-bold text-blue-950">
                Examination Information
              </h2>

              <dl className="mt-3 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Time Limit
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {examination.time_limit_minutes !== null
                      ? `${examination.time_limit_minutes} minutes`
                      : "No time limit specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Passing Score
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {examination.passing_score !== null
                      ? `${examination.passing_score}%`
                      : "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Scheduled Date
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatManilaDateTime(examination.scheduled_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Closing Date
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900">
                    {formatManilaDateTime(examination.closes_at)}
                  </dd>
                </div>
              </dl>
            </section>

            {examination.instructions && (
              <section>
                <h2 className="text-base font-bold text-blue-950">
                  Examination Instructions
                </h2>

                <div className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-slate-700">
                  {examination.instructions}
                </div>
              </section>
            )}

            <section className="border-t border-slate-200 pt-6">
              {isAvailable ? (
                <>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-900">
                      This examination is available.
                    </p>
                    <p className="mt-1 text-sm text-green-800">
                      Make sure you are ready before starting. Your
                      examination attempt will begin after you proceed.
                    </p>
                  </div>

                  <form action={startExamination} className="mt-5">
                    <input
                      type="hidden"
                      name="examinationId"
                      value={examination.id}
                    />

                    <button
                      type="submit"
                      className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                    >
                      Start Examination
                    </button>
                  </form>
                </>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-900">
                    This examination is not currently available.
                  </p>

                  <p className="mt-1 text-sm text-amber-800">
                    {examination.availability_status === "upcoming"
                      ? `This examination opens on ${formatManilaDateTime(
                          examination.scheduled_at
                        )}.`
                      : "The examination period has ended."}
                  </p>
                </div>
              )}

              <Link
                href="/student"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Return to Dashboard
              </Link>
            </section>
          </div>
        </article>

        <p className="mt-6 text-center text-xs text-slate-500">
          BJRC Student Examination Portal
        </p>
      </div>
    </main>
  );
}
