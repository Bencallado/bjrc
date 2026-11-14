
"use client";

import { useActionState, useState } from "react";
import {
  publishExamination,
  type PublicationActionState,
} from "./publication-actions";

type PublicationControlsProps = {
  examinationId: string;
};

const initialState: PublicationActionState = {};

function getManilaDateTimeValue(date: Date) {
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

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export default function PublicationControls({
  examinationId,
}: PublicationControlsProps) {
  const publishAction = publishExamination.bind(
    null,
    examinationId
  );

  const [state, formAction, isPending] = useActionState(
    publishAction,
    initialState
  );

  const [publishMode, setPublishMode] = useState<
    "immediate" | "scheduled"
  >("immediate");

  const [scheduledAt, setScheduledAt] = useState("");

  const [closesAt, setClosesAt] = useState("");

  const minimumDateTime = getManilaDateTimeValue(
    new Date()
  );

  // Require closing time to be later than publication.
  // datetime-local values can be compared as strings
  // because they use YYYY-MM-DDTHH:mm format.
  const minimumClosingDateTime =
    publishMode === "scheduled" && scheduledAt
      ? scheduledAt
      : minimumDateTime;

  const closingDateIsValid =
    !closesAt || closesAt > minimumClosingDateTime;

  return (
    <section className="mt-8 rounded-xl border border-blue-200 bg-white p-8 shadow-sm">
      <h3 className="text-2xl font-bold text-blue-950">
        Examination Publication
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Choose when this examination becomes available
        to students.
      </p>

      <form action={formAction} className="mt-6 space-y-6">
        <fieldset disabled={isPending}>
          <legend className="mb-3 font-semibold text-slate-900">
            Publication Method
          </legend>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-slate-50">
              <input
                type="radio"
                name="publish_mode"
                value="immediate"
                checked={publishMode === "immediate"}
                onChange={() => setPublishMode("immediate")}
                className="mt-1"
              />

              <span>
                <span className="block font-semibold text-slate-900">
                  Publish Immediately
                </span>

                <span className="mt-1 block text-sm text-slate-600">
                  Students can access the examination
                  as soon as it is published.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 hover:bg-slate-50">
              <input
                type="radio"
                name="publish_mode"
                value="scheduled"
                checked={publishMode === "scheduled"}
                onChange={() => setPublishMode("scheduled")}
                className="mt-1"
              />

              <span>
                <span className="block font-semibold text-slate-900">
                  Schedule Publication
                </span>

                <span className="mt-1 block text-sm text-slate-600">
                  Students can access the examination
                  automatically at your selected date and time.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        {publishMode === "scheduled" && (
          <div>
            <label
              htmlFor="scheduled_at"
              className="mb-2 block font-semibold text-slate-900"
            >
              Publication Date and Time
            </label>

            <input
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) =>
                setScheduledAt(event.target.value)
              }
              min={minimumDateTime}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              Philippine Standard Time (Asia/Manila).
            </p>
          </div>
        )}

        <div>
          <label
            htmlFor="closes_at"
            className="mb-2 block font-semibold text-slate-900"
          >
            Closing Date and Time (Optional)
          </label>

          <input
            id="closes_at"
            name="closes_at"
            type="datetime-local"
            value={closesAt}
            onChange={(event) =>
              setClosesAt(event.target.value)
            }
            min={minimumClosingDateTime}
            disabled={isPending}
            aria-invalid={!closingDateIsValid}
            aria-describedby="closing-help"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
          />

          <p
            id="closing-help"
            className="mt-2 text-xs text-slate-500"
          >
            Leave blank if the examination should not have
            a scheduled closing time. Philippine Standard Time.
            The closing time must be later than publication.
          </p>

          {!closingDateIsValid && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              The closing date and time must be later than
              the publication date and time.
            </p>
          )}
        </div>

        {state.error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {state.error}
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {state.success}
          </div>
        )}

        <div className="border-t pt-5">
          <button
            type="submit"
            disabled={isPending || !closingDateIsValid}
            className="w-full rounded-lg bg-blue-950 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending
              ? "Processing..."
              : publishMode === "scheduled"
                ? "Schedule Examination"
                : "Publish Examination"}
          </button>

          <p className="mt-3 text-xs text-slate-500">
            You can unpublish this examination later using Examination Management. Verify
            your examination questions and schedule before
            continuing.
          </p>
        </div>
      </form>
    </section>
  );
}

