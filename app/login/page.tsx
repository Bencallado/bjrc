
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setErrorMessage(loginError.message);
        return;
      }

      const user = authData.user;

      if (!user) {
        setErrorMessage("Unable to retrieve your account. Please try again.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, approval_status")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setErrorMessage(
          "Your account profile could not be found. Please contact the administrator."
        );
        return;
      }

      if (profile.role === "admin") {
        if (profile.approval_status !== "approved") {
          setErrorMessage(
            "Your administrator account is not approved. Please contact support."
          );
          return;
        }

        router.replace("/admin");
        router.refresh();
        return;
      }

      if (profile.role === "student") {
        if (profile.approval_status === "approved") {
          router.replace("/student");
        } else {
          router.replace("/student/pending");
        }

        router.refresh();
        return;
      }

      setErrorMessage("Your account has an unrecognized role.");
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
            Student / Administrator Login
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in using your registered email and password.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
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

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your password"
            />

            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-900 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </div>

          {errorMessage && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-950 px-4 py-3 font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Do not have a student account?{" "}
          <Link
            href="/register"
            className="font-semibold text-blue-900 hover:underline"
          >
            Register here
          </Link>
        </p>

        <div className="mt-6 text-center">
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
