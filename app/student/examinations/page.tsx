
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

type Examination = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  scheduled_at: string | null;
  closes_at: string | null;
  availability_status: "available" | "upcoming" | "closed";
  subject_category: string | null;
  subtopic: string | null;
};

function formatManilaDateTime(value: string | null) {
  if (!value) return "Not specified";

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

function StatusLabel({
  status,
}: {
  status: Examination["availability_status"];
}) {
  const styles = {
    available: "bg-green-100 text-green-800",
    upcoming: "bg-amber-100 text-amber-800",
    closed: "bg-slate-100 text-slate-700",
  };

  const labels = {
    available: "Available",
    upcoming: "Upcoming",
    closed: "Closed",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function ExaminationCard({
  examination,
}: {
  examination: Examination;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h4 className="break-words text-lg font-bold text-blue-950">
            {examination.title}
          </h4>

          <p className="mt-2 text-sm text-blue-800">
            Subtopic: {examination.subtopic || "Not specified"}
          </p>
        </div>

        <StatusLabel status={examination.availability_status} />
      </div>

      {examination.description && (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
          {examination.description}
        </p>
      )}

      <div className="mt-4 grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-slate-500">Time Limit</p>
          <p className="mt-1 font-semibold text-slate-900">
            {examination.time_limit_minutes !== null
              ? `${examination.time_limit_minutes} minutes`
              : "No time limit"}
          </p>
        </div>

        <div>
          <p className="text-slate-500">Passing Score</p>
          <p className="mt-1 font-semibold text-slate-900">
            {examination.passing_score !== null
              ? `${examination.passing_score}%`
              : "Not specified"}
          </p>
        </div>

        {examination.availability_status === "upcoming" && (
          <div className="sm:col-span-2">
            <p className="text-slate-500">Opens</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatManilaDateTime(examination.scheduled_at)}
            </p>
          </div>
        )}

        {examination.availability_status === "available" &&
          examination.closes_at && (
            <div className="sm:col-span-2">
              <p className="text-slate-500">Closes</p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatManilaDateTime(examination.closes_at)}
              </p>
            </div>
          )}

        {examination.availability_status === "closed" && (
          <div className="sm:col-span-2">
            <p className="text-slate-500">Closed</p>
            <p className="mt-1 font-semibold text-slate-900">
              {formatManilaDateTime(examination.closes_at)}
            </p>
          </div>
        )}
      </div>

      {examination.instructions && (
        <details className="mt-4 border-t pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-blue-800">
            View Examination Instructions
          </summary>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
            {examination.instructions}
          </p>
        </details>
      )}

      <div className="mt-5 border-t pt-4">
        {examination.availability_status === "available" ? (
          <Link
            href={`/student/examinations/${examination.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View Examination
          </Link>
        ) : (
          <p className="text-center text-sm text-slate-500">
            {examination.availability_status === "upcoming"
              ? "This examination is not yet available."
              : "This examination is no longer available."}
          </p>
        )}
      </div>
    </article>
  );
}

export default async function StudentExaminationsPage() {
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

  const { error: finalizationError } = await supabase.rpc(
    "student_finalize_expired_attempts"
  );

  if (finalizationError) {
    console.error(
      "Unable to finalize expired examination attempts:",
      finalizationError.message
    );
  }

  const { data, error } = await supabase.rpc(
    "student_list_available_examinations_with_subjects"
  );

  const examinations: Examination[] = Array.isArray(data)
    ? (data as unknown as Examination[])
    : [];

  const categorizedExaminations = SUBJECT_CATEGORIES.map(
    (subject) => ({
      subject,
      examinations: examinations.filter(
        (exam) => exam.subject_category === subject
      ),
    })
  );

  const uncategorizedExaminations = examinations.filter(
    (exam) => !exam.subject_category
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <StudentNavigation activePage="examinations" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <p className="text-sm font-semibold text-blue-700">
            BJRC Student Portal
          </p>

          <h2 className="mt-2 text-2xl font-bold text-blue-950 sm:text-3xl">
            Examinations
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Browse available examinations organized by subject
            category and subtopic.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            Unable to load examinations. Please refresh the page
            or contact the administrator if the problem continues.
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-medium text-green-800">
                  Available
                </p>
                <p className="mt-2 text-2xl font-bold text-green-950">
                  {examinations.filter(
                    (exam) => exam.availability_status === "available"
                  ).length}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Upcoming
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-950">
                  {examinations.filter(
                    (exam) => exam.availability_status === "upcoming"
                  ).length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-600">
                  Closed
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {examinations.filter(
                    (exam) => exam.availability_status === "closed"
                  ).length}
                </p>
              </div>
            </div>

            {examinations.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="font-bold text-blue-950">
                  No Examinations Available
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Please check again later for published examinations.
                </p>
              </div>
            ) : (
              <div className="mt-8 space-y-9">
                {categorizedExaminations.map(
                  ({ subject, examinations: subjectExaminations }) => (
                    <section key={subject}>
                      <div className="mb-4 border-b border-slate-200 pb-3">
                        <h3 className="text-xl font-bold text-blue-950">
                          {subject}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {subjectExaminations.length}{" "}
                          {subjectExaminations.length === 1
                            ? "examination"
                            : "examinations"}
                        </p>
                      </div>

                      {subjectExaminations.length === 0 ? (
                        <p className="rounded-lg border border-dashed bg-white p-5 text-sm text-slate-500">
                          No examinations in this subject yet.
                        </p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {subjectExaminations.map((exam) => (
                            <ExaminationCard
                              key={exam.id}
                              examination={exam}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  )
                )}

                {uncategorizedExaminations.length > 0 && (
                  <section>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <h3 className="text-xl font-bold text-slate-700">
                        Uncategorized
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        These examinations have not yet been assigned
                        a subject by the administrator.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {uncategorizedExaminations.map((exam) => (
                        <ExaminationCard
                          key={exam.id}
                          examination={exam}
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
