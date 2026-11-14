
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setStudentApproval } from "./actions";

type Student = {
  id: string;
  full_name: string;
  email: string;
  approval_status: string;
  created_at: string;
};

type StudentsTableProps = {
  students: Student[];
};

type ApprovalFilter = "all" | "pending" | "approved" | "rejected";

const filters: {
  value: ApprovalFilter;
  label: string;
}[] = [
  { value: "all", label: "All Students" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function StudentsTable({
  students,
}: StudentsTableProps) {
  const router = useRouter();

  const [busyStudentId, setBusyStudentId] = useState<string | null>(
    null
  );
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("success");

  const [searchTerm, setSearchTerm] = useState("");
  const [approvalFilter, setApprovalFilter] =
    useState<ApprovalFilter>("all");

  const counts = useMemo(() => {
    return {
      all: students.length,
      pending: students.filter(
        (student) => student.approval_status === "pending"
      ).length,
      approved: students.filter(
        (student) => student.approval_status === "approved"
      ).length,
      rejected: students.filter(
        (student) => student.approval_status === "rejected"
      ).length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const matchesStatus =
        approvalFilter === "all" ||
        student.approval_status === approvalFilter;

      const matchesSearch =
        !normalizedSearch ||
        (student.full_name || "").toLowerCase().includes(
          normalizedSearch
        ) ||
        (student.email || "").toLowerCase().includes(
          normalizedSearch
        );

      return matchesStatus && matchesSearch;
    });
  }, [students, searchTerm, approvalFilter]);

  async function handleApproval(
    studentId: string,
    status: "approved" | "rejected"
  ) {
    const student = students.find(
      (item) => item.id === studentId
    );

    if (!student || busyStudentId !== null) {
      return;
    }

    if (status === "rejected") {
      const confirmed = window.confirm(
        `Are you sure you want to reject ${
          student.full_name || "this student"
        }'s registration?`
      );

      if (!confirmed) {
        return;
      }
    }

    setBusyStudentId(studentId);
    setMessage("");

    try {
      const result = await setStudentApproval(studentId, status);

      setMessage(result.message);
      setMessageType(result.success ? "success" : "error");

      if (result.success) {
        router.refresh();
      }
    } catch {
      setMessage("Something went wrong. Please try again.");
      setMessageType("error");
    } finally {
      setBusyStudentId(null);
    }
  }

  function formatDate(date: string) {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString();
  }

  return (
    <div className="space-y-5">
      {/* Student status filters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {filters.map((filter) => {
          const isActive = approvalFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setApprovalFilter(filter.value)}
              aria-pressed={isActive}
              className={`rounded-xl border p-4 text-left shadow-sm transition ${
                isActive
                  ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
                  : "border-slate-200 bg-white hover:border-blue-300"
              }`}
            >
              <span className="block text-sm font-medium text-slate-600">
                {filter.label}
              </span>

              <span className="mt-2 block text-2xl font-bold text-slate-900">
                {counts[filter.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
        <label
          htmlFor="student-search"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          Search Students
        </label>

        <input
          id="student-search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by student name or email..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-sm text-slate-500"
            aria-live="polite"
          >
            Showing {filteredStudents.length} of {students.length}{" "}
            students
          </p>

          {(searchTerm || approvalFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setApprovalFilter("all");
              }}
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Feedback */}
      {message && (
        <div
          role={messageType === "error" ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Student table */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-800">
            {students.length === 0
              ? "No student accounts found."
              : "No students match your search or selected filter."}
          </p>

          {students.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setApprovalFilter("all");
              }}
              className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Show All Students
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Student accounts and their registration approval status
              </caption>

              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Student Name
                  </th>

                  <th scope="col" className="px-6 py-4 font-semibold">
                    Email
                  </th>

                  <th scope="col" className="px-6 py-4 font-semibold">
                    Status
                  </th>

                  <th scope="col" className="px-6 py-4 font-semibold">
                    Registered
                  </th>

                  <th scope="col" className="px-6 py-4 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((student) => {
                  const isBusy = busyStudentId === student.id;

                  return (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {student.full_name || "Unnamed Student"}
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {student.email || "Email unavailable"}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            student.approval_status === "approved"
                              ? "bg-green-100 text-green-800"
                              : student.approval_status === "rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {student.approval_status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-600">
                        {formatDate(student.created_at)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/admin/students/${encodeURIComponent(
                              student.id
                            )}`}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            View Details
                          </Link>

                          {student.approval_status !== "approved" && (
                            <button
                              type="button"
                              disabled={isBusy || busyStudentId !== null}
                              onClick={() =>
                                handleApproval(student.id, "approved")
                              }
                              className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? "Saving..." : "Approve"}
                            </button>
                          )}

                          {student.approval_status !== "rejected" && (
                            <button
                              type="button"
                              disabled={isBusy || busyStudentId !== null}
                              onClick={() =>
                                handleApproval(student.id, "rejected")
                              }
                              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? "Saving..." : "Reject"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
