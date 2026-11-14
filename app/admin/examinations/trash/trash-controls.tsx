
"use client";

import { useActionState } from "react";
import {
  restoreExamination,
  permanentlyDeleteExamination,
  type TrashActionState,
} from "./actions";

type TrashControlsProps = {
  examinationId: string;
  attemptCount: number;
};

const initialState: TrashActionState = {};

export default function TrashControls({
  examinationId,
  attemptCount,
}: TrashControlsProps) {
  const [restoreState, restoreAction, restoring] =
    useActionState(
      restoreExamination.bind(null, examinationId),
      initialState
    );

  const [
    deleteState,
    deleteAction,
    deleting,
  ] = useActionState(
    permanentlyDeleteExamination.bind(
      null,
      examinationId
    ),
    initialState
  );

  const canPermanentlyDelete = attemptCount === 0;

  return (
    <div className="space-y-3">
      <form
        action={restoreAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Restore this examination to its previous status?"
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          disabled={restoring}
          className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {restoring ? "Restoring..." : "Restore Examination"}
        </button>
      </form>

      {restoreState.error && (
        <p className="text-sm text-red-700">
          {restoreState.error}
        </p>
      )}

      {restoreState.success && (
        <p className="text-sm text-green-700">
          {restoreState.success}
        </p>
      )}

      {canPermanentlyDelete ? (
        <>
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  "WARNING: Permanently delete this examination? This action cannot be undone."
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={deleting}
              className="w-full rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deleting..."
                : "Permanently Delete"}
            </button>
          </form>

          {deleteState.error && (
            <p className="text-sm text-red-700">
              {deleteState.error}
            </p>
          )}

          {deleteState.success && (
            <p className="text-sm text-green-700">
              {deleteState.success}
            </p>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">
            Permanent deletion unavailable
          </p>
          <p className="mt-1 text-xs text-amber-800">
            This examination has {attemptCount} student
            attempt(s). Its attempts and results must be
            preserved.
          </p>
        </div>
      )}
    </div>
  );
}
