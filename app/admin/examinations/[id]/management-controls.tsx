
"use client";

import { useActionState, useState } from "react";
import {
  moveExaminationToTrash,
  reopenExamination,
  unpublishExamination,
  updateExaminationSchedule,
  type ManagementActionState,
} from "./management-actions";

type ExaminationManagementControlsProps = {
  examinationId: string;
  status: string;
  scheduledAt: string | null;
  closesAt: string | null;
};

const initialState: ManagementActionState = {};

function toManilaDateTimeInput(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return (
    `${values.year}-${values.month}-${values.day}` +
    `T${values.hour}:${values.minute}`
  );
}

export default function ManagementControls({
  examinationId,
  status,
  scheduledAt,
  closesAt,
}: ExaminationManagementControlsProps) {
  const [unpublishState, unpublishAction, unpublishing] =
    useActionState(
      unpublishExamination.bind(null, examinationId),
      initialState
    );

  const [reopenState, reopenAction, reopening] =
    useActionState(
      reopenExamination.bind(null, examinationId),
      initialState
    );

  const [scheduleState, scheduleAction, updatingSchedule] =
    useActionState(
      updateExaminationSchedule.bind(null, examinationId),
      initialState
    );

  const [trashState, trashAction, movingToTrash] =
    useActionState(
      moveExaminationToTrash.bind(null, examinationId),
      initialState
    );

  const [showScheduleEditor, setShowScheduleEditor] =
    useState(false);

  const canUnpublish =
    status === "published" || status === "scheduled";

  const canReopen = status === "closed";

  const canEditSchedule =
    status === "published" || status === "scheduled";

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Examination Management
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage publication, scheduling, reopening, and
          examination storage.
        </p>
      </div>

      {canUnpublish && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-900">
            Unpublish Examination
          </h3>
          <p className="mt-1 text-sm text-amber-800">
            Return this examination to Draft. It will no
            longer be available in the student examination
            catalogue. Existing student attempts and results
            are preserved.
          </p>

          <form
            action={unpublishAction}
            className="mt-3"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Unpublish this examination and return it to Draft?"
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={unpublishing}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {unpublishing ? "Unpublishing..." : "Unpublish"}
            </button>
          </form>

          {unpublishState.error && (
            <p className="mt-2 text-sm text-red-700">
              {unpublishState.error}
            </p>
          )}

          {unpublishState.success && (
            <p className="mt-2 text-sm text-green-700">
              {unpublishState.success}
            </p>
          )}
        </div>
      )}

      {canReopen && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="font-semibold text-green-900">
            Reopen Examination
          </h3>
          <p className="mt-1 text-sm text-green-800">
            Reopen this closed examination. It will become
            Published without a closing deadline. You can
            set a new closing deadline afterward.
          </p>

          <form
            action={reopenAction}
            className="mt-3"
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "Reopen this examination and make it available to eligible students?"
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={reopening}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reopening ? "Reopening..." : "Reopen Examination"}
            </button>
          </form>

          {reopenState.error && (
            <p className="mt-2 text-sm text-red-700">
              {reopenState.error}
            </p>
          )}

          {reopenState.success && (
            <p className="mt-2 text-sm text-green-700">
              {reopenState.success}
            </p>
          )}
        </div>
      )}

      {canEditSchedule && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-blue-900">
                Examination Schedule
              </h3>
              <p className="mt-1 text-sm text-blue-800">
                Change the publication time or closing deadline.
                All times use Philippine time.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowScheduleEditor((current) => !current)
              }
              className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-100"
            >
              {showScheduleEditor ? "Cancel" : "Edit Schedule"}
            </button>
          </div>

          {showScheduleEditor && (
            <form
              action={scheduleAction}
              className="mt-4 space-y-4"
            >
              <div>
                <label
                  htmlFor="scheduled_at"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  Publication Date and Time
                </label>
                <input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                  defaultValue={toManilaDateTimeInput(
                    scheduledAt
                  )}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Leave blank to retain the existing publication
                  time.
                </p>
              </div>

              <div>
                <label
                  htmlFor="closes_at"
                  className="mb-1 block text-sm font-medium text-gray-800"
                >
                  Closing Date and Time
                </label>
                <input
                  id="closes_at"
                  name="closes_at"
                  type="datetime-local"
                  defaultValue={toManilaDateTimeInput(
                    closesAt
                  )}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                />
                <p className="mt-1 text-xs text-gray-600">
                  Leave blank to remove the closing deadline.
                </p>
              </div>

              <button
                type="submit"
                disabled={updatingSchedule}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingSchedule
                  ? "Saving Schedule..."
                  : "Save Schedule"}
              </button>
            </form>
          )}

          {scheduleState.error && (
            <p className="mt-2 text-sm text-red-700">
              {scheduleState.error}
            </p>
          )}

          {scheduleState.success && (
            <p className="mt-2 text-sm text-green-700">
              {scheduleState.success}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">
          Move to Trash
        </h3>
        <p className="mt-1 text-sm text-red-800">
          Remove this examination from active examination
          management. Its questions, student attempts, and
          results will be preserved. You can restore it from
          Trash.
        </p>

        <form
          action={trashAction}
          className="mt-3"
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Move this examination to Trash? Existing student attempts and results will be preserved."
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            disabled={movingToTrash}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {movingToTrash ? "Moving to Trash..." : "Move to Trash"}
          </button>
        </form>

        {trashState.error && (
          <p className="mt-2 text-sm text-red-700">
            {trashState.error}
          </p>
        )}

        {trashState.success && (
          <p className="mt-2 text-sm text-green-700">
            {trashState.success}
          </p>
        )}
      </div>
    </section>
  );
}
