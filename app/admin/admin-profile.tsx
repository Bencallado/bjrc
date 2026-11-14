
"use client";

import { useActionState } from "react";
import {
  updateAdminProfile,
  type AdminProfileActionState,
} from "./actions";

type AdminProfileProps = {
  fullName: string;
  email: string;
};

const initialState: AdminProfileActionState = {};

export default function AdminProfile({
  fullName,
  email,
}: AdminProfileProps) {
  const [state, formAction, isPending] = useActionState(
    updateAdminProfile,
    initialState
  );

  return (
    <section
      aria-labelledby="admin-profile-heading"
      className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {/* Section Heading */}
      <div className="mb-6">
        <h3
          id="admin-profile-heading"
          className="text-lg font-bold text-blue-950 sm:text-xl"
        >
          Administrator Profile
        </h3>

        <p className="mt-2 text-sm text-slate-600">
          Manage your administrator display name and review
          your account information.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {/* Full Name */}
        <div>
          <label
            htmlFor="admin-full-name"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Full Name
          </label>

          <input
            id="admin-full-name"
            name="full_name"
            type="text"
            defaultValue={fullName}
            minLength={2}
            maxLength={100}
            required
            autoComplete="name"
            spellCheck={false}
            placeholder="Enter your full name"
            aria-describedby="admin-name-help"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />

          <p
            id="admin-name-help"
            className="mt-2 text-xs text-slate-500"
          >
            Your name will appear on your administrator dashboard.
          </p>
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="admin-email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email Address
          </label>

          <input
            id="admin-email"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          />

          <p className="mt-2 text-xs text-slate-500">
            Your registered email address cannot be changed here.
          </p>
        </div>

        {/* Protected Account Information */}
        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Account Role
            </p>

            <div
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              aria-label="Account role: Administrator"
            >
              Administrator
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Approval Status
            </p>

            <div
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800"
              aria-label="Approval status: Approved"
            >
              Approved
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {state.error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {state.error}
          </div>
        )}

        {/* Success Feedback */}
        {state.success && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {state.success}
          </div>
        )}

        {/* Save Button */}
        <div className="border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Saving Changes..." : "Save Profile"}
          </button>
        </div>
      </form>
    </section>
  );
}
