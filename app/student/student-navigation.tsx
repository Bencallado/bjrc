
import Link from "next/link";
import { signOut } from "./actions";

type StudentNavigationProps = {
  activePage:
    | "dashboard"
    | "examinations"
    | "results"
    | "performance"
    | "activity";
};

const navigationItems = [
  { id: "dashboard", label: "Dashboard", href: "/student" },
  {
    id: "examinations",
    label: "Examinations",
    href: "/student/examinations",
  },
  { id: "results", label: "My Results", href: "/student/results" },
  {
    id: "performance",
    label: "My Performance",
    href: "/student/performance",
  },
  {
    id: "activity",
    label: "Recent Activity",
    href: "/student/activity",
  },
] as const;

export default function StudentNavigation({
  activePage,
}: StudentNavigationProps) {
  return (
    <>
      <header className="bg-blue-950 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">BJRC</h1>
            <p className="text-xs text-blue-200 sm:text-sm">
              Billy James Review Center
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-950 transition hover:bg-blue-100"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <nav
        aria-label="Student portal navigation"
        className="border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap gap-1 py-2">
          {navigationItems.map((item) => {
            const isActive = activePage === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                  isActive
                    ? "bg-blue-950 text-white"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-950"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
