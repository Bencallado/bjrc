
"use client";

import { useActionState } from "react";
import {
  exportClassArchive,
  getArchiveDownloadUrl,
} from "./archive-actions";
import {
  deleteEligibleClassArchive,
} from "./archive-deletion-actions";

type ArchiveExport = {
  id: string;
  format: "md" | "csv";
  storage_path: string;
  checksum: string | null;
  exported_at: string;
  verified_at: string | null;
};

type ArchiveRecord = {
  id: string;
  class_id: string;
  archived_at: string;
  retention_until: string;
  status: string;
};

type ArchivedClass = {
  id: string;
  name: string;
  class_code: string;
  status: string;
};

export type ArchiveListItem = {
  archive: ArchiveRecord;
  class: ArchivedClass;
  exports: ArchiveExport[];
};

type ActionState = {
  success?: string;
  error?: string;
  downloadUrl?: string;
  auditId?: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function ExportForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(
    exportClassArchive,
    {}
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="class_id" value={classId} />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {pending ? "Generating and verifying..." : "Export Markdown + CSV"}
      </button>

      {pending && (
        <p className="text-sm text-blue-700">
          Generating files, uploading to private storage, and verifying
          checksums. Please keep this page open.
        </p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

function DownloadForm({
  exportRecord,
}: {
  exportRecord: ArchiveExport;
}) {
  const [state, action, pending] = useActionState(
    getArchiveDownloadUrl,
    {}
  );

  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {exportRecord.format.toUpperCase()} export
          </p>
          <p className="text-xs text-slate-500">
            Exported: {formatDate(exportRecord.exported_at)}
          </p>
          <p className="text-xs text-slate-500">
            Verification:{" "}
            {exportRecord.verified_at
              ? formatDate(exportRecord.verified_at)
              : "Not verified"}
          </p>
        </div>

        {exportRecord.verified_at ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            Verified
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Pending
          </span>
        )}
      </div>

      {exportRecord.checksum && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-500">
            View SHA-256 checksum
          </summary>
          <p className="mt-2 break-all font-mono text-xs">
            {exportRecord.checksum}
          </p>
        </details>
      )}

      {exportRecord.verified_at && (
        <form action={action} className="mt-3">
          <input
            type="hidden"
            name="export_id"
            value={exportRecord.id}
          />

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-blue-900 px-3 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50"
          >
            {pending ? "Preparing..." : "Generate Download Link"}
          </button>

          {state.error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {state.error}
            </p>
          )}

          {state.downloadUrl && (
            <div className="mt-3 rounded-lg bg-green-50 p-3">
              <p className="text-sm text-green-800">
                {state.success}
              </p>
              <a
                href={state.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-semibold text-blue-900 underline"
              >
                Download {exportRecord.format.toUpperCase()}
              </a>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

function DeleteArchiveForm({
  archiveId,
  classCode,
  className,
}: {
  archiveId: string;
  classCode: string;
  className: string;
}) {
  const [state, action, pending] = useActionState(
    deleteEligibleClassArchive,
    {}
  );

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <h4 className="font-semibold text-red-900">
        Permanent database deletion
      </h4>

      <p className="mt-2 text-sm text-red-800">
        This permanently deletes the archived class database records,
        including its class enrollments, sections, examination assignments,
        and class-linked examination attempts.
      </p>

      <p className="mt-2 text-sm font-semibold text-red-900">
        Verified Markdown and CSV export files will remain in private
        Storage. This action does not delete those files.
      </p>

      <form action={action} className="mt-4 space-y-3">
        <input
          type="hidden"
          name="archive_id"
          value={archiveId}
        />

        <label
          htmlFor={`confirm-${archiveId}`}
          className="block text-sm font-semibold text-red-900"
        >
          Enter the exact class code to confirm:
        </label>

        <input
          id={`confirm-${archiveId}`}
          name="confirm_class_code"
          type="text"
          required
          autoComplete="off"
          placeholder={classCode}
          className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-slate-900"
        />

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Verifying exports and deleting..." : "Permanently Delete Class Records"}
        </button>

        {pending && (
          <p className="text-sm text-red-800">
            Checking every verified export against its SHA-256 checksum.
            Do not close this page.
          </p>
        )}

        {state.error && (
          <p role="alert" className="text-sm font-medium text-red-800">
            {state.error}
          </p>
        )}

        {state.success && (
          <div role="status" className="rounded-lg bg-white p-3 text-sm">
            <p className="font-semibold text-green-800">
              {state.success}
            </p>
            {state.auditId && (
              <p className="mt-2 break-all text-xs text-slate-600">
                Deletion audit ID: {state.auditId}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default function ArchiveManager({
  archives,
}: {
  archives: ArchiveListItem[];
}) {
  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-950">
          Class Archives and Exports
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Review archived classes, generate complete Markdown and CSV
          records, and download verified exports.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Archives are retained for at least two years. Export files
          are stored in a private Supabase Storage bucket.
        </p>
      </div>

      {archives.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          No archived classes are available yet. Closed or expired
          classes are automatically archived by the scheduled process.
        </div>
      ) : (
        <div className="space-y-5">
          {archives.map((item) => {
            const markdownExports = item.exports.filter(
              (record) => record.format === "md"
            );

            const csvExports = item.exports.filter(
              (record) => record.format === "csv"
            );

            const hasVerifiedMarkdown = markdownExports.some(
              (record) => Boolean(record.verified_at)
            );

            const hasVerifiedCsv = csvExports.some(
              (record) => Boolean(record.verified_at)
            );

            const bothVerified =
              hasVerifiedMarkdown && hasVerifiedCsv;

            const eligible =
              item.archive.status === "deletion_eligible";

            return (
              <article
                key={item.archive.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                <div className="border-b bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-blue-950">
                        {item.class.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Class Code: {item.class.class_code}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        bothVerified
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {bothVerified
                        ? "Both exports verified"
                        : "Exports incomplete"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <span className="text-slate-500">
                        Archived:
                      </span>{" "}
                      {formatDate(item.archive.archived_at)}
                    </p>
                    <p>
                      <span className="text-slate-500">
                        Retention until:
                      </span>{" "}
                      {formatDate(item.archive.retention_until)}
                    </p>
                    <p>
                      <span className="text-slate-500">
                        Archive status:
                      </span>{" "}
                      {item.archive.status}
                    </p>
                    <p>
                      <span className="text-slate-500">
                        Export records:
                      </span>{" "}
                      {item.exports.length}
                    </p>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      Generate exports
                    </h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Generates both formats and verifies the uploaded
                      files before recording them.
                    </p>

                    <ExportForm classId={item.class.id} />
                  </div>

                  <div className="border-t pt-5">
                    <h4 className="mb-3 font-semibold text-slate-800">
                      Export history
                    </h4>

                    {item.exports.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No exports have been recorded.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {item.exports.map((record) => (
                          <DownloadForm
                            key={record.id}
                            exportRecord={record}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {eligible && (
                    <div className="border-t pt-5">
                      <DeleteArchiveForm
                        archiveId={item.archive.id}
                        classCode={item.class.class_code}
                        className={item.class.name}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
