
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentNavigation from "./student-navigation";

export const instant = false;

const navigationCards = [
  {
    title: "Examinations",
    description:
      "Browse available examinations, explore subjects, and take your scheduled tests.",
    href: "/student/examinations",
    action: "Browse Examinations",
  },
  {
    title: "My Results",
    description:
      "Review your examination scores and results organized by subject.",
    href: "/student/results",
    action: "View My Results",
  },
  {
    title: "My Performance",
    description:
      "Monitor your average scores, progress, and performance in each subject.",
    href: "/student/performance",
    action: "View Performance",
  },
  {
    title: "Recent Activity",
    description:
      "Review your examination submission history and previous attempts.",
    href: "/student/activity",
    action: "View Activity",
  },
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

type StudentClassSection = {
  class_id: string;
  class_name: string;
  class_code: string;
  section_id: string;
  section_name: string;
  enrolled_at: string;
  starts_at: string;
  expires_at: string;
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

function formatManilaDate(value: string | null) {
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
  }).format(date);
}

function formatNumber(value: number | string) {
  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function DashboardStat({
  label,
  value,
  description,
  color,
}: {
  label: string;
  value: string | number;
  description: string;
  color: "blue" | "indigo" | "green" | "purple";
}) {
  const colors = {
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-950",
    green: "border-green-200 bg-green-50 text-green-950",
    purple: "border-purple-200 bg-purple-50 text-purple-950",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${colors[color]}`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>

      <p className="mt-3 text-3xl font-bold">{value}</p>

      <p className="mt-2 text-xs opacity-75">{description}</p>
    </div>
  );
}

function AssignedClassCard({
  assignment,
}: {
  assignment: StudentClassSection;
}) {
  return (
    <article className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Assigned Class
          </p>

          <h4 className="mt-2 break-words text-lg font-bold text-blue-950">
            {assignment.class_name}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Class Code: {assignment.class_code}
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          Active
        </span>
      </div>

      <div className="mt-5 rounded-lg bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
          Your Assigned Section
        </p>

        <p className="mt-2 break-words text-xl font-bold text-blue-950">
          {assignment.section_name}
        </p>
      </div>

      <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-slate-500">Enrollment Date</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatManilaDate(assignment.enrolled_at)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Class Validity</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatManilaDate(assignment.starts_at)} –{" "}
            {formatManilaDate(assignment.expires_at)}
          </p>
        </div>
      </div>
    </article>
  );
}

function RecentSubmissionCard({
  result,
}: {
  result: ExamResult;
}) {
  const percentage = Number(result.percentage);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-blue-300">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {result.subject_category || "Uncategorized"}
          </p>

          <h4 className="mt-2 break-words font-bold text-blue-950">
            {result.examination_title}
          </h4>

          <p className="mt-1 text-sm text-slate-500">
            Subtopic: {result.subtopic || "Not specified"}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Submitted: {formatManilaDateTime(result.submitted_at)}
          </p>
        </div>

        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            result.passed
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {result.passed ? "Passed" : "Not Passed"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
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
            {Number.isFinite(percentage)
              ? `${percentage.toFixed(2)}%`
              : "0.00%"}
          </p>
        </div>

        <Link
          href={`/student/attempts/${result.attempt_id}/results`}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
        >
          View Result
        </Link>
      </div>
    </article>
  );
}

async function StudentContent() {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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

  // Finalize this student's expired examination attempts first.
  const { error: finalizationError } = await supabase.rpc(
    "student_finalize_expired_attempts"
  );

  if (finalizationError) {
    console.error(
      "Unable to finalize expired examination attempts:",
      finalizationError.message
    );
  }

  // Retrieve the student's currently active class and section assignments.
  const {
    data: classSectionData,
    error: classSectionError,
  } = await supabase.rpc("student_get_my_class_sections");

  const classSections: StudentClassSection[] = Array.isArray(
    classSectionData
  )
    ? (classSectionData as unknown as StudentClassSection[])
    : [];

  if (classSectionError) {
    console.error(
      "Unable to load assigned classes and sections:",
      classSectionError.message
    );
  }

  // Retrieve examinations with their subject categories.
  const {
    data: examinationData,
    error: examinationError,
  } = await supabase.rpc(
    "student_list_available_examinations_with_subjects"
  );

  const examinations: Examination[] = Array.isArray(
    examinationData
  )
    ? (examinationData as unknown as Examination[])
    : [];

  // Retrieve submitted results with their subject categories.
  const {
    data: resultData,
    error: resultError,
  } = await supabase.rpc(
    "student_list_exam_results_with_subjects"
  );

  const results: ExamResult[] = Array.isArray(
    resultData
  )
    ? (resultData as unknown as ExamResult[])
    : [];

  if (resultError) {
    console.error(
      "Unable to load examination results:",
      resultError.message
    );
  }

  if (examinationError) {
    console.error(
      "Unable to load examinations:",
      examinationError.message
    );
  }

  const upcomingExaminations = examinations.filter(
    (exam) => exam.availability_status === "upcoming"
  );

  const completedExaminations = results.length;

  const validPercentages = results
    .map((result) => Number(result.percentage))
    .filter(
      (percentage) =>
        Number.isFinite(percentage) &&
        percentage >= 0 &&
        percentage <= 100
    );

  const averageScore =
    validPercentages.length > 0
      ? validPercentages.reduce(
          (total, percentage) => total + percentage,
          0
        ) / validPercentages.length
      : 0;

  const passedExaminations = results.filter(
    (result) => result.passed
  ).length;

  const fullName = profile.full_name || "Student";
  const email = user.email || "Email unavailable";

  const recentResults = [...results]
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() -
        new Date(a.submitted_at).getTime()
    )
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-50">
      <StudentNavigation activePage="dashboard" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Welcome */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold text-blue-700">
            BJRC Student Portal
          </p>

          <h2 className="mt-2 break-words text-2xl font-bold text-blue-950 sm:text-3xl">
            Welcome back, {fullName}!
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Welcome to your learning dashboard. Continue your
            examination preparation, review your results, and
            monitor your academic progress.
          </p>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Registered Email
              </p>

              <p className="mt-2 break-all text-sm font-semibold text-slate-900">
                {email}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Account Status
              </p>

              <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Approved
              </span>
            </div>
          </div>
        </section>

        {/* Assigned Classes and Sections */}
        <section className="mt-8">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-blue-950">
              My Assigned Class &amp; Section
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Your currently active class and section assignments.
            </p>
          </div>

          {classSectionError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
            >
              Unable to load your assigned class and section.
              Please refresh the page or contact the administrator.
            </div>
          ) : classSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h4 className="font-bold text-blue-950">
                No Active Class or Section Assigned
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You currently have no active class and section
                assignments. Please contact your administrator
                for assistance.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {classSections.map((assignment) => (
                <AssignedClassCard
                  key={`${assignment.class_id}-${assignment.section_id}`}
                  assignment={assignment}
                />
              ))}
            </div>
          )}
        </section>

        {/* Overview */}
        <section className="mt-8">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-blue-950">
              Dashboard Overview
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              A quick summary of your examination activity and progress.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardStat
              label="Completed Examinations"
              value={resultError ? "—" : completedExaminations}
              description="Successfully submitted examinations"
              color="blue"
            />

            <DashboardStat
              label="Average Score"
              value={
                resultError
                  ? "—"
                  : `${averageScore.toFixed(2)}%`
              }
              description="Average of your submitted results"
              color="indigo"
            />

            <DashboardStat
              label="Examinations Passed"
              value={resultError ? "—" : passedExaminations}
              description="Examinations you successfully passed"
              color="green"
            />

            <DashboardStat
              label="Upcoming Examinations"
              value={
                examinationError
                  ? "—"
                  : upcomingExaminations.length
              }
              description="Scheduled to open in the future"
              color="purple"
            />
          </div>
        </section>

        {/* Separate student pages */}
        <section className="mt-10">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-blue-950">
              Student Portal
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Choose a section to continue.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {navigationCards.map((card) => (
              <article
                key={card.href}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <h4 className="text-lg font-bold text-blue-950">
                  {card.title}
                </h4>

                <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>

                <Link
                  href={card.href}
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  {card.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Recent submissions */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h3 className="text-xl font-bold text-blue-950">
                Recent Submissions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Your five most recently submitted examinations.
              </p>
            </div>

            <Link
              href="/student/activity"
              className="inline-flex min-h-10 w-fit items-center text-sm font-semibold text-blue-800 hover:text-blue-950"
            >
              View All Activity →
            </Link>
          </div>

          {resultError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
            >
              Unable to load your recent submissions. Please
              refresh the page or try again later.
            </div>
          ) : recentResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <h4 className="font-bold text-blue-950">
                No Submitted Examinations Yet
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Your examination results and recent submissions
                will appear here after you complete an examination.
              </p>

              <Link
                href="/student/examinations"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Browse Examinations
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentResults.map((result) => (
                <RecentSubmissionCard
                  key={result.attempt_id}
                  result={result}
                />
              ))}
            </div>
          )}
        </section>

        {finalizationError && (
          <div
            role="alert"
            className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            Some expired examination attempts could not be
            finalized automatically. Please refresh the page or
            contact the administrator if the issue continues.
          </div>
        )}
      </div>
    </main>
  );
}

export default async function StudentPage() {
  return <StudentContent />;
}
