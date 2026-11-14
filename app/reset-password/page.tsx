
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function checkRecoverySession() {
      const { data, error } = await supabase.auth.getUser();

      if (!error && data.user) {
        setSessionValid(true);
      } else {
        setSessionValid(false);
      }

      setCheckingSession(false);
    }

    checkRecoverySession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (newPassword.length < 8) {
      setErrorMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error || !data.user) {
        setErrorMessage(
          error?.message ||
            "Unable to update your password. Please request a new reset link."
        );
        return;
      }

      await supabase.auth.signOut();

      setSessionValid(false);
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage(
        "Your password has been successfully updated. You can now sign in using your new password."
      );
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-950">BJRC</h1>

          <p className="mt-2 text-sm text-slate-500">
            Billy James Review Center
          </p>

          <h2 className="mt-8 text-2xl font-bold text-slate-900">
            Reset Password
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create a new password for your BJRC account.
          </p>
        </div>

        {checkingSession ? (
          <p className="mt-8 text-center text-sm text-slate-600">
            Verifying your password reset session...
          </p>
        ) : successMessage ? (
          <div className="mt-8 space-y-5">
            <p
              role="status"
              className="rounded-lg bg-green-50 p-4 text-sm leading-6 text-green-800"
            >
              {successMessage}
            </p>

            <Link
              href="/login"
              className="block w-full rounded-lg bg-blue-950 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-900"
            >
              Go to Login
            </Link>
          </div>
        ) : !sessionValid ? (
          <div className="mt-8 space-y-5">
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-700"
            >
              Your password reset session is invalid or has expired. Please
              request a new password reset link.
            </p>

            <Link
              href="/forgot-password"
              className="block w-full rounded-lg bg-blue-950 px-4 py-3 text-center font-semibold text-white transition hover:bg-blue-900"
            >
              Request a New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New Password
              </label>

              <input
                id="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter your new password"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm New Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                placeholder="Confirm your new password"
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-950 px-4 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        )}

        {!successMessage && (
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-900 hover:underline"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
