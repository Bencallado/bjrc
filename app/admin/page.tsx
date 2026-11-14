
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StudentsTable from "./students-table";
import AdminProfile from "./admin-profile";
import { signOut } from "./actions";

type Student = {
  id: string;
  full_name: string;
  email: string;
  approval_status: string;
  created_at: string;
};

type ExaminationSummary = {
  id: string;
  status: string;
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <p className="text-slate-600">
            Loading BJRC Administrator Portal...
          </p>
        </main>
      }
    >
      <AdminContent />
    </Suspense>
  );
}

async function AdminContent() {
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

  if (profile.role !== "admin") {
    redirect("/");
  }

  if (profile.approval_status !== "approved") {
    redirect("/");
  }

  const [
    {
      data: studentData,
      error: studentError,
    },
    {
      data: examinationData,
      error: examinationError,
    },
  ] = await Promise.all([
    supabase.rpc("admin_list_students"),
    supabase.rpc("admin_list_examinations"),
  ]);

  const students = (studentData ?? []) as Student[];
  const examinations = (examinationData ?? []) as ExaminationSummary[];

  const totalStudents = students.length;

  const approvedStudents = students.filter(
    (student) => student.approval_status === "approved"
  ).length;

  const pendingStudents = students.filter(
    (student) => student.approval_status === "pending"
  ).length;

  const rejectedStudents = students.filter(
    (student) => student.approval_status === "rejected"
  ).length;

  const totalExaminations = examinations.length;

  const publishedExaminations = examinations.filter(
    (exam) => exam.status.trim().toLowerCase() === "published"
  ).length;

  const scheduledExaminations = examinations.filter(
    (exam) => exam.status.trim().toLowerCase() === "scheduled"
  ).length;

  const draftExaminations = examinations.filter(
    (exam) => exam.status.trim().toLowerCase() === "draft"
  ).length;

  const closedExaminations = examinations.filter(
    (exam) => exam.status.trim().toLowerCase() === "closed"
  ).length;

  const adminName = profile.full_name || "Administrator";
  const adminEmail = user.email || "Email unavailable";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Administrator Portal
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-100"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-blue-700">
            Welcome back!
          </p>

          <h2 className="mt-2 break-words text-2xl font-bold text-slate-900 sm:text-3xl">
            {adminName}
          </h2>

          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Welcome to the BJRC Administration Dashboard.
          </p>

          <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">
                Administrator Email
              </p>
              <p className="mt-1 break-all font-medium text-slate-900">
                {adminEmail}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">
                Account Status
              </p>
              <span className="mt-1 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Approved
              </span>
            </div>
          </div>
        </section>

        <AdminProfile
          fullName={profile.full_name}
          email={adminEmail}
        />

        <section className="mt-8" aria-label="Student approval alerts">
          {studentError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6"
            >
              <h3 className="font-bold text-red-900">
                Student Approval Status Unavailable
              </h3>
              <p className="mt-2 text-sm text-red-800">
                Unable to retrieve pending student registrations.
                Please check Student Management.
              </p>
              <Link
                href="#student-management"
                className="mt-4 inline-flex font-semibold text-red-900 underline underline-offset-2 hover:text-red-700"
              >
                Go to Student Management
              </Link>
            </div>
          ) : pendingStudents > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                      ACTION REQUIRED
                    </span>
                    <span className="text-sm font-medium text-amber-800">
                      Student Registration
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-amber-950">
                    {pendingStudents}{" "}
                    {pendingStudents === 1 ? "student is" : "students are"}{" "}
                    awaiting approval.
                  </h3>
                  <p className="mt-2 text-sm text-amber-800">
                    Review pending student accounts and approve
                    or reject their registrations.
                  </p>
                </div>
                <Link
                  href="#student-management"
                  className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 sm:w-auto"
                >
                  Review Pending Students →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                  ✓
                </span>
                <div>
                  <h3 className="font-bold text-green-900">
                    All Student Registrations Reviewed
                  </h3>
                  <p className="mt-1 text-sm text-green-800">
                    There are currently no pending student approvals.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8" aria-label="Examination alerts">
          {examinationError ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 sm:p-6"
            >
              <h3 className="font-bold text-red-900">
                Examination Status Unavailable
              </h3>
              <p className="mt-2 text-sm text-red-800">
                Unable to retrieve examination statuses.
                Please check Examination Management.
              </p>
              <Link
                href="/admin/examinations"
                className="mt-4 inline-flex font-semibold text-red-900 underline underline-offset-2 hover:text-red-700"
              >
                Go to Examination Management
              </Link>
            </div>
          ) : draftExaminations > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                      REVIEW RECOMMENDED
                    </span>
                    <span className="text-sm font-medium text-amber-800">
                      Examination Management
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-amber-950">
                    {draftExaminations}{" "}
                    {draftExaminations === 1
                      ? "examination is"
                      : "examinations are"}{" "}
                    currently in draft.
                  </h3>
                  <p className="mt-2 text-sm text-amber-800">
                    Review your draft examinations and publish
                    them when they are ready.
                  </p>
                </div>
                <Link
                  href="/admin/examinations"
                  className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-amber-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 sm:w-auto"
                >
                  Review Draft Examinations →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-700">
                  ✓
                </span>
                <div>
                  <h3 className="font-bold text-green-900">
                    No Draft Examinations
                  </h3>
                  <p className="mt-1 text-sm text-green-800">
                    There are currently no examinations in draft.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-bold text-blue-950 sm:text-2xl">
            Student Account Statistics
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Overview of registered student accounts.
          </p>

          {studentError ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Unable to load student statistics.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Students", value: totalStudents, color: "text-blue-950" },
                { label: "Approved Students", value: approvedStudents, color: "text-green-700" },
                { label: "Pending Students", value: pendingStudents, color: "text-amber-600" },
                { label: "Rejected Students", value: rejectedStudents, color: "text-red-700" },
              ].map((item) => (
                <section key={item.label} className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-bold text-blue-950 sm:text-2xl">
            Examination Overview
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Overview of examinations created and managed in BJRC.
          </p>

          {examinationError ? (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Unable to load examination statistics.
              Please check the administrator examination database function.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total Examinations", value: totalExaminations, color: "text-blue-950" },
                { label: "Published Examinations", value: publishedExaminations, color: "text-green-700" },
                { label: "Scheduled Examinations", value: scheduledExaminations, color: "text-blue-700" },
                { label: "Draft Examinations", value: draftExaminations, color: "text-amber-600" },
                { label: "Closed Examinations", value: closedExaminations, color: "text-slate-700" },
              ].map((item) => (
                <section key={item.label} className="rounded-xl border bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </section>
              ))}
            </div>
          )}
        </section>

        <section
          id="student-management"
          className="mt-10 scroll-mt-6"
        >
          <div className="mb-5">
            <h3 className="text-xl font-bold text-blue-950 sm:text-2xl">
              Student Management
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Review student accounts and manage approval status.
            </p>
          </div>

          {studentError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
              Unable to load student accounts. Please check the
              administrator database function.
            </div>
          ) : (
            <StudentsTable students={students} />
          )}
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-bold text-blue-950 sm:text-2xl">
            Administration Tools
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Access BJRC management and reporting features.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* Class and Section Management */}
            <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md sm:p-6">
              <h4 className="font-bold text-blue-950">
                Class and Section Management
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Create classes, manage sections, enroll and transfer
                students, assign examinations, and manage class duration.
              </p>
              <Link
                href="/admin/classes"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto"
              >
                Manage Classes →
              </Link>
            </section>

            {/* Examination Management */}
            <section className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-6">
              <h4 className="font-bold text-blue-950">
                Examination Management
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Create, organize, schedule, publish, close,
                and manage examinations.
              </p>
              <Link
                href="/admin/examinations"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
              >
                Manage Examinations →
              </Link>
            </section>

            {/* Examination Trash */}
            <section className="rounded-xl border border-red-100 bg-white p-5 shadow-sm transition hover:border-red-300 hover:shadow-md sm:p-6">
              <h4 className="font-bold text-red-900">
                Examination Trash
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Restore examinations moved to Trash or permanently
                delete eligible examinations.
              </p>
              <Link
                href="/admin/examinations/trash"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 sm:w-auto"
              >
                Open Examination Trash →
              </Link>
            </section>

            {/* Reports and Analytics */}
            <section className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md sm:p-6">
              <h4 className="font-bold text-blue-950">
                Reports and Analytics
              </h4>
              <p className="mt-2 text-sm text-slate-500">
                Review student performance, examination results,
                pass rates, and detailed reports.
              </p>
              <Link
                href="/admin/reports"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
              >
                View Reports and Analytics →
              </Link>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
