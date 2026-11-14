
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ClassesManager, {
  type ClassManagementData,
} from "./classes-manager";
import ArchiveManager, {
  type ArchiveListItem,
} from "./archive-manager";
import DeletionAuditManager from "./deletion-audit-manager";

export const instant = false;

export default async function ClassesPage() {
  await connection();

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

  const [
    { data: managementData, error: managementError },
    { data: archiveData, error: archiveError },
    { data: auditData, error: auditError },
  ] = await Promise.all([
    supabase.rpc("admin_get_class_management_data"),
    supabase.rpc("admin_list_class_archives"),
    supabase.rpc("admin_list_class_deletion_audit"),
  ]);

  const typedManagementData =
    managementData as ClassManagementData | null;

  const typedArchives =
    archiveData as ArchiveListItem[] | null;

  const typedAuditRecords =
    auditData as Array<{
      id: string;
      archive_id: string;
      class_id: string;
      class_name: string;
      class_code: string;
      deleted_by: string;
      deleted_at: string;
      retention_until: string;
      retained_exports: Array<{
        export_id: string;
        format: string;
        storage_path: string;
        checksum: string;
        exported_at: string;
        verified_at: string;
      }>;
      class_snapshot: Record<string, unknown>;
    }> | null;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-blue-950 px-6 py-5 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-sm text-blue-200">
              Class and Section Management
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 hover:bg-blue-100"
          >
            Administrator Portal
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <h2 className="text-3xl font-bold text-blue-950">
            Class Management
          </h2>
          <p className="mt-2 text-slate-600">
            Create classes, organize sections, enroll students, and
            assign examinations.
          </p>
        </div>

        {managementError ? (
          <div
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">
              Unable to load class management data
            </h3>
            <p className="mt-2 text-sm">
              {managementError.message}
            </p>
          </div>
        ) : !typedManagementData ? (
          <div className="mt-8 rounded-xl border bg-white p-6">
            No class management data is available.
          </div>
        ) : (
          <ClassesManager data={typedManagementData} />
        )}

        {archiveError ? (
          <div
            role="alert"
            className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">
              Unable to load class archives
            </h3>
            <p className="mt-2 text-sm">
              {archiveError.message}
            </p>
          </div>
        ) : (
          <ArchiveManager archives={typedArchives ?? []} />
        )}

        {auditError ? (
          <div
            role="alert"
            className="mt-10 rounded-xl border border-red-200 bg-red-50 p-6 text-red-800"
          >
            <h3 className="font-bold">
              Unable to load permanent deletion audit
            </h3>
            <p className="mt-2 text-sm">
              {auditError.message}
            </p>
          </div>
        ) : (
          <DeletionAuditManager records={typedAuditRecords ?? []} />
        )}

        <p className="mt-10 text-sm text-slate-500">
          Signed in as {user.email}
        </p>
      </div>
    </main>
  );
}
