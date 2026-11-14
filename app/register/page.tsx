"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Your password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "Registration submitted! Please check your email for the confirmation link. Your student account will remain pending until an administrator approves it."
      );

      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-950">
            BJRC
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Billy James Review Center
          </p>

          <h2 className="mt-6 text-2xl font-bold text-slate-900">
            Student Registration
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create your BJRC student account.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">

          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-slate-700">
              Full Name
            </label>

            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-800"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-800"
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-950 px-4 py-3 font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Student Account"}
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-blue-900 hover:underline"
          >
            Sign in here
          </Link>
        </p>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-blue-900 hover:underline"
          >
            Back to Homepage
          </Link>
        </div>

      </div>
    </main>
  );
}