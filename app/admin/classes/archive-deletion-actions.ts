
"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "bjrc-class-archives";

type ActionState = {
  success?: string;
  error?: string;
  auditId?: string;
};

type ArchiveExport = {
  id: string;
  format: string;
  storage_path: string;
  checksum: string | null;
  verified_at: string | null;
};

type ArchiveListItem = {
  archive?: {
    id?: string;
    status?: string;
    retention_until?: string;
  };
  class?: {
    id?: string;
    name?: string;
    class_code?: string;
    status?: string;
  };
  exports?: ArchiveExport[];
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getApprovedAdminClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You must be signed in to perform this action.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile?.approval_status !== "approved"
  ) {
    throw new Error("Approved administrator access is required.");
  }

  return { supabase, userId: user.id };
}

export async function deleteEligibleClassArchive(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const archiveId = getString(formData.get("archive_id")).trim();
    const confirmationCode = getString(
      formData.get("confirm_class_code")
    ).trim();

    if (!isUuid(archiveId)) {
      throw new Error("Invalid archive identifier.");
    }

    if (!confirmationCode) {
      throw new Error("Enter the exact class code to confirm deletion.");
    }

    const { supabase, userId } = await getApprovedAdminClient();

    const { data: archiveData, error: listError } = await supabase.rpc(
      "admin_list_class_archives"
    );

    if (listError) {
      throw new Error("Unable to retrieve archive information.");
    }

    if (!Array.isArray(archiveData)) {
      throw new Error("The archive list returned an invalid response.");
    }

    const item = (archiveData as ArchiveListItem[]).find(
      (entry) => entry.archive?.id === archiveId
    );

    if (!item?.archive || !item.class) {
      throw new Error("The requested archived class was not found.");
    }

    const archive = item.archive;
    const classRecord = item.class;

    const classId = getString(classRecord.id);
    const className = getString(classRecord.name);
    const classCode = getString(classRecord.class_code);

    if (!isUuid(classId) || !classCode) {
      throw new Error("The archived class information is incomplete.");
    }

    if (confirmationCode !== classCode) {
      throw new Error("The class code does not match. No records were deleted.");
    }

    if (archive.status !== "deletion_eligible") {
      throw new Error(
        "This archive has not yet been marked eligible for deletion."
      );
    }

    if (classRecord.status !== "archived") {
      throw new Error("Only archived classes can be deleted.");
    }

    const retentionUntil = Date.parse(
      getString(archive.retention_until)
    );

    if (!Number.isFinite(retentionUntil) || retentionUntil > Date.now()) {
      throw new Error("The two-year retention period has not elapsed.");
    }

    const exports = Array.isArray(item.exports) ? item.exports : [];

    const verifiedExports = exports.filter(
      (entry) => Boolean(entry.verified_at)
    );

    if (verifiedExports.length === 0) {
      throw new Error("No verified archive exports were found.");
    }

    const verifiedFormats = new Set<string>();
    const classPathPrefix = `${classId}/`;

    // Verify every export that the database deletion audit will retain.
    // Never remove Storage objects from this action.
    for (const exportRecord of verifiedExports) {
      const format = getString(exportRecord.format);
      const path = getString(exportRecord.storage_path);
      const checksum = getString(exportRecord.checksum);

      if (format !== "md" && format !== "csv") {
        throw new Error("An export has an unsupported format.");
      }

      if (
        !path.startsWith(classPathPrefix) ||
        !new RegExp(
          `^${classId}/[0-9a-f-]{36}\\.${format}$`,
          "i"
        ).test(path)
      ) {
        throw new Error("An export has an invalid Storage path.");
      }

      if (!/^[0-9a-f]{64}$/.test(checksum)) {
        throw new Error(
          `The ${format.toUpperCase()} export has an invalid SHA-256 checksum.`
        );
      }

      const { data: file, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(path);

      if (downloadError || !file) {
        throw new Error(
          `Unable to retrieve a retained ${format.toUpperCase()} export. Deletion was stopped.`
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const actualChecksum = createHash("sha256")
        .update(bytes)
        .digest("hex");

      if (actualChecksum !== checksum) {
        throw new Error(
          `The ${format.toUpperCase()} export failed checksum verification. Deletion was stopped.`
        );
      }

      verifiedFormats.add(format);
    }

    if (!verifiedFormats.has("md") || !verifiedFormats.has("csv")) {
      throw new Error(
        "Both verified Markdown and CSV exports are required before deletion."
      );
    }

    // Only the server-side service-role client can execute this RPC.
    // The database independently verifies the administrator identity.
    const adminClient = createAdminClient();

    const { data: deletionData, error: deletionError } =
      await adminClient.rpc("admin_delete_eligible_class_archive", {
        p_archive_id: archiveId,
        p_deleted_by: userId,
      });

    if (deletionError) {
      throw new Error(deletionError.message);
    }

    if (!isObject(deletionData) || deletionData.success !== true) {
      throw new Error("The database did not confirm the deletion.");
    }

    const auditId = getString(deletionData.audit_id);

    revalidatePath("/admin/classes");
    revalidatePath("/admin");

    return {
      success:
        `Class "${className}" was deleted from the database. ` +
        "Its verified Markdown and CSV exports remain in private Storage.",
      auditId,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error prevented archive deletion.",
    };
  }
}



