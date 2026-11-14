
import { connection } from "next/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function StudentPendingPage() {
  await connection();

  const supabase = await createClient();

  // 1. Verify the signed-in user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Retrieve the user's profile.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, role, approval_status")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <h1 className="text-3xl font-bold text-blue-950">
            BJRC
          </h1>
          <h2 className="mt-8 text-xl font-bold text-red-700">
            Profile Not Available
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            We could not retrieve your account profile.
            Please contact the BJRC administrator.
          </p>
        </div>
      </main>
    );
  }

  // 3. Send approved users to their correct portal.
  if (profile.approval_status === "approved") {
    if (profile.role === "student") {
      redirect("/student");
    }

    if (profile.role === "admin") {
      redirect("/admin");
    }

    redirect("/");
  }

  // 4. Display the pending or rejected account status.
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-blue-950">
          BJRC
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Billy James Review Center
        </p>

        <h2 className="mt-8 text-2xl font-bold text-slate-900">
          Welcome, {profile.full_name || "User"}!
        </h2>

        {profile.approval_status === "pending" && (
          <>
            <p className="mt-4 text-lg font-semibold text-amber-700">
              Account Pending Approval
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your email has been verified successfully.
              Your account is awaiting administrator approval.
              Portal access will be enabled after approval.
            </p>
          </>
        )}

        {profile.approval_status === "rejected" && (
          <>
            <p className="mt-4 text-lg font-semibold text-red-700">
              Account Not Approved
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your account was not approved.
              Please contact the BJRC administrator for assistance.
            </p>
          </>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="font-medium text-blue-900 hover:underline"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
