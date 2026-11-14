
"use client";

import { useActionState } from "react";
import {
  closeExamination,
  type CloseActionState,
} from "./close-actions";

type CloseControlsProps = {
  examinationId: string;
};

const initialState: CloseActionState = {};

export default function CloseControls({
  examinationId,
}: CloseControlsProps) {
  const closeAction = closeExamination.bind(
    null,
    examinationId
  );

  const [state, formAction, isPending] = useActionState(
    closeAction,
    initialState
  );

  return (
    <section className="mt-8 rounded-xl border border-red-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-bold text-red-800">
        Close Examination
      </h3>

      <p className="mt-2 text-sm text-slate-600">
        Closing this examination will prevent students
        from starting new attempts. Existing submitted
        examination results will remain preserved and accessible.
      </p>

      <form
        action={formAction}
        className="mt-5"
        onSubmit={(event) => {
          const confirmed = window.confirm(
            "Are you sure you want to close this examination? Students will no longer be able to start new attempts."
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        {state.error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {state.error}
          </div>
        )}

        {state.success && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {state.success}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Closing Examination..."
            : "Close Examination"}
        </button>

        <p className="mt-3 text-xs text-slate-500">
          You can reopen this examination later using Examination Management. Existing submitted results will remain preserved.
        </p>
      </form>
    </section>
  );
}

