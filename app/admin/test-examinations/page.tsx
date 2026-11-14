
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function TestExaminationsPage() {
  return (
    <Suspense
      fallback={
        <main className="p-10">
          Loading examination security test...
        </main>
      }
    >
      <TestContent />
    </Suspense>
  );
}

async function TestContent() {
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
    data: examinations,
    error: examinationError,
  } = await supabase.rpc("admin_list_examinations");

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-blue-950">
          BJRC Examination Security Test
        </h1>

        <p className="mt-3 text-slate-600">
          Authenticated administrator:
        </p>

        <p className="font-medium text-slate-900">
          {user.email}
        </p>

        {examinationError ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">
            <h2 className="font-bold text-red-800">
              Function Test Failed
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {examinationError.message}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-5">
            <h2 className="font-bold text-green-800">
              Function Test Successful
            </h2>

            <p className="mt-2 text-sm text-green-700">
              The authenticated administrator successfully
              executed admin_list_examinations().
            </p>

            <p className="mt-3 font-medium text-green-800">
              Examinations found: {examinations?.length ?? 0}
            </p>
          </div>
        )}

        <pre className="mt-6 overflow-x-auto rounded-lg bg-slate-900 p-5 text-sm text-white">
          {JSON.stringify(examinations ?? [], null, 2)}
        </pre>

        <a
          href="/admin"
          className="mt-6 inline-block rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900"
        >
          Return to Administrator Portal
        </a>
      </div>
    </main>
  );
}
