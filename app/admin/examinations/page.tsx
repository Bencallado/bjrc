import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Examination = {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  status: string;
  created_at: string;
  subject_category: string | null;
  subtopic: string | null;
};

function getStatusBadge(status: string) {
  const normalizedStatus = status.trim().toLowerCase();

  switch (normalizedStatus) {
    case "draft":
      return {
        label: "DRAFT",
        className:
          "border border-amber-200 bg-amber-100 text-amber-800",
      };

    case "scheduled":
      return {
        label: "SCHEDULED",
        className:
          "border border-blue-200 bg-blue-100 text-blue-800",
      };

    case "published":
      return {
        label: "PUBLISHED",
        className:
          "border border-green-200 bg-green-100 text-green-800",
      };

    case "closed":
      return {
        label: "CLOSED",
        className:
          "border border-slate-200 bg-slate-100 text-slate-700",
      };

    default:
      return {
        label: status.trim() || "UNKNOWN",
        className:
          "border border-gray-200 bg-gray-100 text-gray-700",
      };
  }
}

export default function ExaminationsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-10">
          Loading BJRC Examination Management...
        </main>
      }
    >
      <ExaminationsContent />
    </Suspense>
  );
}

async function ExaminationsContent() {
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
    error: examinationError,
  } = await supabase.rpc(
    "admin_list_examinations_with_subjects"
  );

  const examinations =
    (examinationData ?? []) as Examination[];

  const getCount = (status: string) =>
    examinations.filter(
      (exam) =>
        exam.status.trim().toLowerCase() === status
    ).length;

  const draftCount = getCount("draft");
  const scheduledCount = getCount("scheduled");
  const publishedCount = getCount("published");
  const closedCount = getCount("closed");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Examination Management
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Administrator Portal
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-3xl font-bold text-blue-950">
              Examination Management
            </h2>

            <p className="mt-2 text-slate-600">
              Create, organize, and manage BJRC examinations.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/examinations/trash"
              className="rounded-lg border border-red-200 bg-white px-5 py-3 text-center font-semibold text-red-800 hover:bg-red-50"
            >
              Examination Trash
            </Link>

            <Link
              href="/admin/examinations/new"
              className="rounded-lg bg-blue-950 px-5 py-3 text-center font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-950"
            >
              + Create Examination
            </Link>
          </div>
        </div>

        {examinationError ? (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">
              Unable to load examinations
            </h3>

            <p className="mt-2 text-sm">
              {examinationError.message}
            </p>
          </div>
        ) : (
          <>
            <section
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Examination status summary"
            >
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-800">
                  Draft Examinations
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-950">
                  {draftCount}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-800">
                  Scheduled Examinations
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-950">
                  {scheduledCount}
                </p>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <p className="text-sm font-medium text-green-800">
                  Published Examinations
                </p>
                <p className="mt-2 text-3xl font-bold text-green-950">
                  {publishedCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-600">
                  Closed Examinations
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {closedCount}
                </p>
              </div>
            </section>

            {examinations.length === 0 ? (
              <section className="mt-8 rounded-xl border bg-white p-10 text-center shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">
                  No Examinations Yet
                </h3>

                <p className="mt-3 text-slate-600">
                  You have not created any examinations.
                  Create your first examination to get started.
                </p>

                <Link
                  href="/admin/examinations/new"
                  className="mt-6 inline-block rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900"
                >
                  Create Your First Examination
                </Link>
              </section>
            ) : (
              <div className="mt-8 overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-slate-50 px-6 py-4">
                  <h3 className="font-bold text-slate-900">
                    All Examinations
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    View each examination&apos;s subject, subtopic,
                    and publication status.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="px-6 py-4">Examination</th>
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Subtopic</th>
                        <th className="px-6 py-4">Time Limit</th>
                        <th className="px-6 py-4">Passing Score</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Created</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {examinations.map((exam) => {
                        const statusBadge = getStatusBadge(
                          exam.status
                        );

                        return (
                          <tr
                            key={exam.id}
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 font-medium text-slate-900">
                              <Link
                                href={`/admin/examinations/${exam.id}`}
                                className="text-blue-700 hover:text-blue-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                              >
                                {exam.title}
                              </Link>
                            </td>

                            <td className="px-6 py-4">
                              {exam.subject_category ? (
                                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900">
                                  {exam.subject_category}
                                </span>
                              ) : (
                                <span className="text-amber-700">
                                  Uncategorized
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-slate-600">
                              {exam.subtopic || "Not specified"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                              {exam.time_limit_minutes
                                ? `${exam.time_limit_minutes} minutes`
                                : "No limit"}
                            </td>

                            <td className="px-6 py-4 text-slate-600">
                              {exam.passing_score ?? "Not set"}
                            </td>

                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${statusBadge.className}`}
                                aria-label={`Examination status: ${statusBadge.label}`}
                              >
                                {statusBadge.label}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                              {new Date(
                                exam.created_at
                              ).toLocaleDateString("en-PH", {
                                timeZone: "Asia/Manila",
                              })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-8">
          <p className="text-sm text-slate-500">
            Signed in as {user.email}
          </p>
        </div>
      </div>
    </main>
  );
}
