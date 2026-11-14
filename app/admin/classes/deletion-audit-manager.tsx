
"use client";

import { useState } from "react";

type AuditRecord = {
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
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default function DeletionAuditManager({
  records,
}: {
  records: AuditRecord[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-950">
          Permanent Class Deletion Audit
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Review permanent records of deleted classes and their retained
          export files. These audit records remain after class deletion.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
          No class deletions have been recorded.
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const isExpanded = expanded === record.id;

            return (
              <article
                key={record.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-blue-950">
                      {record.class_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Class Code: {record.class_code}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    Deletion audited
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-slate-500">Deleted:</span>{" "}
                    {formatDate(record.deleted_at)}
                  </p>
                  <p>
                    <span className="text-slate-500">Retention completed:</span>{" "}
                    {formatDate(record.retention_until)}
                  </p>
                  <p>
                    <span className="text-slate-500">Retained exports:</span>{" "}
                    {record.retained_exports.length}
                  </p>
                  <p>
                    <span className="text-slate-500">Administrator ID:</span>{" "}
                    <span className="break-all font-mono text-xs">
                      {record.deleted_by}
                    </span>
                  </p>
                </div>

                <div className="mt-4 border-t pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(isExpanded ? null : record.id)
                    }
                    className="text-sm font-semibold text-blue-900 underline"
                  >
                    {isExpanded ? "Hide audit details" : "View audit details"}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Retained export records
                        </h4>

                        {record.retained_exports.map((file) => (
                          <div
                            key={file.export_id}
                            className="mt-3 rounded-lg border p-3"
                          >
                            <p className="font-semibold">
                              {file.format.toUpperCase()} export
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-slate-600">
                              {file.storage_path}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              SHA-256
                            </p>
                            <p className="break-all font-mono text-xs">
                              {file.checksum}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              Verified: {formatDate(file.verified_at)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Original class snapshot
                        </h4>
                        <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                          {JSON.stringify(record.class_snapshot, null, 2)}
                        </pre>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">
                          Permanent audit ID
                        </p>
                        <p className="break-all font-mono text-xs">
                          {record.id}
                        </p>
                      </div>
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
