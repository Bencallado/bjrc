
"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "bjrc-class-archives";
const MAX_EXPORT_BYTES = 50 * 1024 * 1024;
const SIGNED_URL_SECONDS = 300;

type ArchiveActionState = {
  success?: string;
  error?: string;
  downloadUrl?: string;
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getObject(value: unknown): JsonObject {
  return isObject(value) ? value : {};
}

function getArray(value: unknown): JsonObject[] {
  return Array.isArray(value)
    ? value.filter(isObject)
    : [];
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function makeCsv(payload: JsonObject): string {
  const rows: string[][] = [
    ["record_type", "record_id", "parent_id", "record_json"],
  ];

  function add(
    type: string,
    record: JsonObject,
    parentId = ""
  ) {
    const id = getString(record.id);

    rows.push([
      type,
      id,
      parentId,
      JSON.stringify(record) ?? "{}",
    ]);
  }

  const classRecord = getObject(payload.class);
  const archiveRecord = getObject(payload.archive);

  add("class", classRecord);
  add("archive", archiveRecord);

  const classId = getString(classRecord.id);

  for (const section of getArray(payload.sections)) {
    add("section", section, classId);
  }

  for (const item of getArray(payload.enrollments)) {
    const enrollment = getObject(item.enrollment);
    const enrollmentId = getString(enrollment.id);

    add("enrollment", enrollment, classId);
    add("student", getObject(item.student), enrollmentId);
    add("enrollment_section", getObject(item.section), enrollmentId);

    for (const history of getArray(item.history)) {
      add("enrollment_history", history, enrollmentId);
    }
  }

  for (const history of getArray(payload.duration_history)) {
    add("duration_history", history, classId);
  }

  for (const item of getArray(payload.examinations)) {
    const assignment = getObject(item.assignment);
    const assignmentId = getString(assignment.id);

    add("examination_assignment", assignment, classId);
    add("examination", getObject(item.examination), assignmentId);

    for (const attemptItem of getArray(item.attempts)) {
      const attempt = getObject(attemptItem.attempt);
      const attemptId = getString(attempt.id);

      add("exam_attempt", attempt, assignmentId);

      const examinationSnapshot = getObject(
        attemptItem.examination_snapshot
      );

      if (Object.keys(examinationSnapshot).length > 0) {
        add(
          "attempt_examination_snapshot",
          examinationSnapshot,
          attemptId
        );
      }

      const policySnapshot = getObject(
        attemptItem.policy_snapshot
      );

      if (Object.keys(policySnapshot).length > 0) {
        add(
          "attempt_policy_snapshot",
          policySnapshot,
          attemptId
        );
      }

      for (const answer of getArray(attemptItem.answers)) {
        add("exam_answer", answer, attemptId);
      }

      for (const snapshot of getArray(
        attemptItem.question_snapshots
      )) {
        add("question_snapshot", snapshot, attemptId);
      }

      for (const snapshot of getArray(
        attemptItem.option_snapshots
      )) {
        add("option_snapshot", snapshot, attemptId);
      }
    }
  }

  for (const acknowledgment of getArray(
    payload.instruction_acknowledgments
  )) {
    add("instruction_acknowledgment", acknowledgment);
  }

  for (const previousExport of getArray(payload.previous_exports)) {
    add("previous_export", previousExport);
  }

  return (
    rows
      .map((row) => row.map(csvEscape).join(","))
      .join("\r\n") + "\r\n"
  );
}

function makeMarkdown(payload: JsonObject): string {
  const classRecord = getObject(payload.class);
  const archiveRecord = getObject(payload.archive);

  const name = getString(classRecord.name);
  const code = getString(classRecord.class_code);

  const sections = getArray(payload.sections).length;
  const enrollments = getArray(payload.enrollments).length;
  const examinations = getArray(payload.examinations).length;

  const generatedAt = new Date().toISOString();

  return [
    "# BJRC Class Archive",
    "",
    "## Archive Information",
    "",
    `- Class: ${name}`,
    `- Class Code: ${code}`,
    `- Class ID: ${getString(classRecord.id)}`,
    `- Archive ID: ${getString(archiveRecord.id)}`,
    `- Archived At: ${getString(archiveRecord.archived_at)}`,
    `- Retention Until: ${getString(archiveRecord.retention_until)}`,
    `- Generated At: ${generatedAt}`,
    "",
    "## Record Summary",
    "",
    `- Sections: ${sections}`,
    `- Enrollments: ${enrollments}`,
    `- Examination Assignments: ${examinations}`,
    `- Enrollment History Records: ${
      getArray(payload.enrollments).reduce(
        (total, item) => total + getArray(item.history).length,
        0
      )
    }`,
    `- Duration History Records: ${
      getArray(payload.duration_history).length
    }`,
    "",
    "## Complete Archive Data",
    "",
    "The following JSON contains the complete archived payload, including student enrollment records, examination assignments, attempt histories, answers, immutable examination snapshots, policy snapshots, instruction acknowledgments, and previous export records.",
    "",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "",
    "## Integrity",
    "",
    "SHA-256 checksums are recorded separately in the BJRC database export audit records.",
    "",
    "This archive is intended for authorized administrative retention and review.",
    "",
  ].join("\n");
}

async function getApprovedAdminClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Administrator authentication required.");
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
    throw new Error("Approved administrator access required.");
  }

  return { supabase, user };
}

function getSha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function exportClassArchive(
  _previousState: ArchiveActionState,
  formData: FormData
): Promise<ArchiveActionState> {
  const classId = formData.get("class_id");

  if (!isUuid(classId)) {
    return { error: "Invalid class identifier." };
  }

  let markdownPath = "";
  let csvPath = "";
  let markdownUploaded = false;
  let csvUploaded = false;

  try {
    const { supabase } = await getApprovedAdminClient();

    const { data: payloadData, error: payloadError } =
      await supabase.rpc("admin_get_class_archive_payload", {
        p_class_id: classId,
      });

    if (payloadError) {
      throw new Error(payloadError.message);
    }

    if (!isObject(payloadData)) {
      throw new Error("Archive payload is invalid.");
    }

    const payload = payloadData;
    const archive = getObject(payload.archive);
    const classRecord = getObject(payload.class);

    if (
      getString(classRecord.id) !== classId ||
      !getString(archive.id)
    ) {
      throw new Error("Archived class data could not be verified.");
    }

    const markdown = Buffer.from(makeMarkdown(payload), "utf8");
    const csv = Buffer.from(makeCsv(payload), "utf8");

    if (
      markdown.byteLength > MAX_EXPORT_BYTES ||
      csv.byteLength > MAX_EXPORT_BYTES
    ) {
      throw new Error("An export exceeds the 50 MiB storage limit.");
    }

    const exportId = randomUUID();

    markdownPath = `${classId}/${exportId}.md`;
    csvPath = `${classId}/${exportId}.csv`;

    const markdownChecksum = getSha256(markdown);
    const csvChecksum = getSha256(csv);

    const { error: markdownError } = await supabase.storage
      .from(BUCKET)
      .upload(markdownPath, markdown, {
        contentType: "text/markdown",
        upsert: false,
      });

    if (markdownError) {
      throw new Error(
        `Markdown upload failed: ${markdownError.message}`
      );
    }

    markdownUploaded = true;

    const { error: csvError } = await supabase.storage
      .from(BUCKET)
      .upload(csvPath, csv, {
        contentType: "text/csv",
        upsert: false,
      });

    if (csvError) {
      throw new Error(`CSV upload failed: ${csvError.message}`);
    }

    csvUploaded = true;

    const { data: markdownDownload, error: markdownVerifyError } =
      await supabase.storage.from(BUCKET).download(markdownPath);

    if (markdownVerifyError || !markdownDownload) {
      throw new Error(
        "Unable to download the Markdown export for verification."
      );
    }

    const verifiedMarkdown = Buffer.from(
      await markdownDownload.arrayBuffer()
    );

    if (getSha256(verifiedMarkdown) !== markdownChecksum) {
      throw new Error("Markdown SHA-256 verification failed.");
    }

    const { data: csvDownload, error: csvVerifyError } =
      await supabase.storage.from(BUCKET).download(csvPath);

    if (csvVerifyError || !csvDownload) {
      throw new Error(
        "Unable to download the CSV export for verification."
      );
    }

    const verifiedCsv = Buffer.from(
      await csvDownload.arrayBuffer()
    );

    if (getSha256(verifiedCsv) !== csvChecksum) {
      throw new Error("CSV SHA-256 verification failed.");
    }

    const { error: recordError } = await supabase.rpc(
      "admin_record_class_archive_exports",
      {
        p_archive_id: getString(archive.id),
        p_markdown_path: markdownPath,
        p_markdown_checksum: markdownChecksum,
        p_csv_path: csvPath,
        p_csv_checksum: csvChecksum,
      }
    );

    if (recordError) {
      throw new Error(
        `Export audit recording failed: ${recordError.message}`
      );
    }

    revalidatePath("/admin/classes");

    return {
      success:
        "Markdown and CSV exports uploaded and SHA-256 verified. Both export records were saved successfully.",
    };
  } catch (error) {
    // Storage deletion is intentionally not attempted here.
    // Permanent archive objects cannot be deleted through the
    // authenticated Storage API.

    const uploadedCount =
      Number(markdownUploaded) + Number(csvUploaded);

    return {
      error:
        (error instanceof Error
          ? error.message
          : "Archive export failed.") +
        (uploadedCount > 0
          ? " An uploaded file may remain in private Storage; inspect its export record before retrying."
          : ""),
    };
  }
}

export async function getArchiveDownloadUrl(
  _previousState: ArchiveActionState,
  formData: FormData
): Promise<ArchiveActionState> {
  const exportId = formData.get("export_id");

  if (!isUuid(exportId)) {
    return { error: "Invalid export identifier." };
  }

  try {
    const { supabase } = await getApprovedAdminClient();

    const { data, error } = await supabase.rpc(
      "admin_list_class_archives"
    );

    if (error) {
      throw new Error(error.message);
    }

    const archives = Array.isArray(data) ? data : [];

    let matchingExport: JsonObject | null = null;

    for (const archiveItem of archives) {
      const item = getObject(archiveItem);

      for (const exportItem of getArray(item.exports)) {
        if (getString(exportItem.id) === exportId) {
          matchingExport = exportItem;
          break;
        }
      }

      if (matchingExport) break;
    }

    if (!matchingExport) {
      throw new Error("Archive export record not found.");
    }

    if (!getString(matchingExport.verified_at)) {
      throw new Error("This export has not been verified.");
    }

    const path = getString(matchingExport.storage_path);

    if (!path) {
      throw new Error("Archive storage path is missing.");
    }

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(
        signedError?.message ?? "Unable to create download link."
      );
    }

    return {
      success: "Secure download link created. It expires in five minutes.",
      downloadUrl: signedData.signedUrl,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create archive download link.",
    };
  }
}

export async function deleteEligibleClassArchive(
  _previousState: ArchiveActionState,
  formData: FormData
): Promise<ArchiveActionState> {
  const archiveId = formData.get("archive_id");
  const confirmationCode = formData.get("confirmation_code");

  if (!isUuid(archiveId)) {
    return { error: "Invalid archive identifier." };
  }

  if (
    typeof confirmationCode !== "string" ||
    !confirmationCode.trim()
  ) {
    return { error: "Enter the exact class code to confirm deletion." };
  }

  try {
    const { supabase } = await getApprovedAdminClient();

    // Retrieve the archive through the administrator-only RPC.
    const { data, error } = await supabase.rpc(
      "admin_list_class_archives"
    );

    if (error) {
      throw new Error(error.message);
    }

    const archives = Array.isArray(data) ? data : [];

    let matchingItem: JsonObject | null = null;

    for (const archiveItem of archives) {
      const item = getObject(archiveItem);
      const archive = getObject(item.archive);

      if (getString(archive.id) === archiveId) {
        matchingItem = item;
        break;
      }
    }

    if (!matchingItem) {
      throw new Error("Archive record not found.");
    }

    const archive = getObject(matchingItem.archive);
    const classRecord = getObject(matchingItem.class);
    const classId = getString(classRecord.id);
    const classCode = getString(classRecord.class_code);

    if (!classId || !classCode) {
      throw new Error("Class identity could not be verified.");
    }

    if (confirmationCode.trim() !== classCode) {
      throw new Error("The confirmation class code does not match.");
    }

    if (getString(archive.status) !== "deletion_eligible") {
      throw new Error(
        "This archive is not marked as eligible for deletion."
      );
    }

    const retentionUntil = Date.parse(
      getString(archive.retention_until)
    );

    if (
      !Number.isFinite(retentionUntil) ||
      retentionUntil > Date.now()
    ) {
      throw new Error("The two-year retention period has not expired.");
    }

    const exports = getArray(matchingItem.exports);

    if (exports.length < 2) {
      throw new Error("Both verified export formats are required.");
    }

    const verifiedFormats = new Set<string>();

    // Verify every recorded export object independently.
    for (const exportRecord of exports) {
      const format = getString(exportRecord.format);
      const path = getString(exportRecord.storage_path);
      const checksum = getString(exportRecord.checksum);

      if (
        !["md", "csv"].includes(format) ||
        !path.startsWith(`${classId}/`) ||
        !path.endsWith(`.${format}`)
      ) {
        throw new Error("An export path or format is invalid.");
      }

      if (!getString(exportRecord.verified_at)) {
        throw new Error(
          "Every recorded export must have verified status."
        );
      }

      if (!/^[0-9a-f]{64}$/.test(checksum)) {
        throw new Error(
          `The ${format.toUpperCase()} checksum is invalid.`
        );
      }

      const { data: file, error: downloadError } =
        await supabase.storage.from(BUCKET).download(path);

      if (downloadError || !file) {
        throw new Error(
          `Unable to retrieve permanent ${format.toUpperCase()} backup.`
        );
      }

      const contents = Buffer.from(await file.arrayBuffer());

      if (
        contents.byteLength === 0 ||
        contents.byteLength > MAX_EXPORT_BYTES
      ) {
        throw new Error(
          `The ${format.toUpperCase()} backup has an invalid size.`
        );
      }

      const actualChecksum = getSha256(contents);

      if (actualChecksum !== checksum) {
        throw new Error(
          `SHA-256 verification failed for the ${format.toUpperCase()} backup.`
        );
      }

      verifiedFormats.add(format);
    }

    if (
      !verifiedFormats.has("md") ||
      !verifiedFormats.has("csv")
    ) {
      throw new Error(
        "Both Markdown and CSV backups must be verified."
      );
    }

    // The database function rechecks authorization, retention,
    // eligibility and export records inside its transaction.
    // It preserves export paths and checksums in the deletion audit.
    // It does not delete any Storage objects.
    const { data: deletionResult, error: deletionError } =
      await supabase.rpc("admin_delete_eligible_class_archive", {
        p_archive_id: archiveId,
      });

    if (deletionError) {
      throw new Error(deletionError.message);
    }

    if (
      !isObject(deletionResult) ||
      deletionResult.success !== true
    ) {
      throw new Error("The database did not confirm class deletion.");
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin");

    return {
      success:
        `Class "${classRecord.name}" was deleted from operational database records. ` +
        `${exports.length} verified backup file(s) remain in private Storage. ` +
        "The permanent deletion audit was recorded.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Class archive deletion failed.",
    };
  }
}
