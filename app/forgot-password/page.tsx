
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/recover`,
        }
      );

      if (error) {
        setErrorMessage(
          "Unable to process your request. Please try again later."
        );
        return;
      }

      setSuccessMessage(
        "If an account exists with that email address, a password-reset link will be sent. Please check your inbox."
      );
    } catch {
      setErrorMessage(
        "Something went wrong. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-950">
            BJRC
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Billy James Review Center
          </p>

          <h2 className="mt-8 text-2xl font-bold text-slate-900">
            Forgot Password?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enter your registered email address. We will send
            instructions to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              placeholder="you@example.com"
            />
          </div>

          {successMessage && (
            <p
              role="status"
              className="rounded-lg bg-green-50 p-3 text-sm leading-6 text-green-800"
            >
              {successMessage}
            </p>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-950 px-4 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-blue-900 hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}
