
"use client";

import { useActionState, type ReactNode } from "react";
import {
  createClass,
  createClassSection,
  enrollStudent,
  transferStudent,
  assignExamination,
  revokeExamination,
  extendClass,
  closeClass,
} from "./actions";

export type Section = {
  id: string;
  section_name: string;
  status: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  student_name: string;
  section_id: string;
  section_name: string;
  status: string;
  enrolled_at: string;
};

export type ClassExamination = {
  assignment_id: string;
  examination_id: string;
  title: string;
  exam_status: string;
  assignment_status: string;
  assigned_at: string;
};

export type ManagedClass = {
  id: string;
  name: string;
  class_code: string;
  status: string;
  starts_at: string;
  expires_at: string;
  closed_at: string | null;
  created_at: string;
  sections: Section[];
  enrollments: Enrollment[];
  examinations: ClassExamination[];
};

export type Student = {
  id: string;
  full_name: string;
};

export type Examination = {
  id: string;
  title: string;
  status: string;
};

export type ClassManagementData = {
  classes: ManagedClass[];
  students: Student[];
  examinations: Examination[];
};

type ActionState = {
  success?: string;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function Status({ value }: { value: string }) {
  const color =
    value === "active" || value === "assigned"
      ? "bg-green-100 text-green-800"
      : value === "closed" || value === "revoked"
        ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${color}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = true,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children ?? (
        <input
          name={name}
          type={type}
          required={required}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      )}
    </label>
  );
}

function ActionForm({
  action,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (pending: boolean) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-3" aria-busy={pending}>
      {children(pending)}

      {pending && (
        <p className="text-sm text-blue-700">Processing...</p>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

function SubmitButton({
  children,
  pending,
  danger = false,
}: {
  children: ReactNode;
  pending: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
        danger
          ? "bg-red-700 hover:bg-red-800"
          : "bg-blue-900 hover:bg-blue-800"
      }`}
    >
      {pending ? "Please wait..." : children}
    </button>
  );
}

export default function ClassesManager({
  data,
}: {
  data: ClassManagementData;
}) {
  const activeClasses = data.classes.filter(
    (item) => item.status === "active"
  );

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-blue-950">
          Create a Class
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Initial duration cannot exceed eight months.
        </p>

        <ActionForm action={createClass}>
          {(pending) => (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Class Name" name="name" />
                <Field label="Class Code" name="class_code" />
                <Field
                  label="Start Date and Time"
                  name="starts_at"
                  type="datetime-local"
                />
                <Field
                  label="Initial Expiry Date and Time"
                  name="expires_at"
                  type="datetime-local"
                />
              </div>

              <SubmitButton pending={pending}>
                Create Class
              </SubmitButton>
            </>
          )}
        </ActionForm>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Total Classes</p>
          <p className="mt-2 text-3xl font-bold">
            {data.classes.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Active Classes</p>
          <p className="mt-2 text-3xl font-bold">
            {activeClasses.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-slate-500">Approved Students</p>
          <p className="mt-2 text-3xl font-bold">
            {data.students.length}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h3 className="text-2xl font-bold text-blue-950">
            Existing Classes
          </h3>
          <p className="text-sm text-slate-500">
            Manage sections, enrollments, examinations, and class duration.
          </p>
        </div>

        {data.classes.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-slate-500">
            No classes have been created yet.
          </div>
        ) : (
          <div className="space-y-6">
            {data.classes.map((item) => {
              const activeEnrollments = item.enrollments.filter(
                (enrollment) => enrollment.status === "active"
              );

              const activeAssignments = item.examinations.filter(
                (exam) => exam.assignment_status === "assigned"
              );

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border bg-white shadow-sm"
                >
                  <div className="border-b bg-slate-50 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-bold text-blue-950">
                          {item.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          Code: {item.class_code}
                        </p>
                      </div>

                      <Status value={item.status} />
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <p>
                        <span className="text-slate-500">Starts:</span>{" "}
                        {formatDate(item.starts_at)}
                      </p>
                      <p>
                        <span className="text-slate-500">Expires:</span>{" "}
                        {formatDate(item.expires_at)}
                      </p>
                      <p>
                        <span className="text-slate-500">Students:</span>{" "}
                        {activeEnrollments.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-7 p-6">
                    <section>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h5 className="font-bold">Sections</h5>
                        <span className="text-xs text-slate-500">
                          Maximum 3 sections
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.sections.map((section) => (
                          <div
                            key={section.id}
                            className="rounded-lg border px-3 py-2 text-sm"
                          >
                            {section.section_name}{" "}
                            <Status value={section.status} />
                          </div>
                        ))}

                        {item.sections.length === 0 && (
                          <p className="text-sm text-slate-500">
                            No sections created.
                          </p>
                        )}
                      </div>

                      {item.status === "active" &&
                        item.sections.length < 3 && (
                          <div className="mt-4 max-w-md">
                            <ActionForm action={createClassSection}>
                              {(pending) => (
                                <>
                                  <input
                                    type="hidden"
                                    name="class_id"
                                    value={item.id}
                                  />
                                  <Field
                                    label="New Section Name"
                                    name="section_name"
                                  />
                                  <SubmitButton pending={pending}>
                                    Create Section
                                  </SubmitButton>
                                </>
                              )}
                            </ActionForm>
                          </div>
                        )}
                    </section>

                    <section>
                      <h5 className="font-bold">
                        Student Enrollment
                      </h5>

                      {item.status === "active" && (
                        <div className="mt-3 grid gap-4 lg:grid-cols-2">
                          <ActionForm action={enrollStudent}>
                            {(pending) => (
                              <>
                                <input
                                  type="hidden"
                                  name="class_id"
                                  value={item.id}
                                />

                                <Field label="Student" name="student_id">
                                  <select
                                    name="student_id"
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      Select student
                                    </option>
                                    {data.students.map((student) => (
                                      <option
                                        key={student.id}
                                        value={student.id}
                                      >
                                        {student.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </Field>

                                <Field label="Section" name="section_id">
                                  <select
                                    name="section_id"
                                    required
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>
                                      Select section
                                    </option>
                                    {item.sections
                                      .filter(
                                        (section) =>
                                          section.status === "active"
                                      )
                                      .map((section) => (
                                        <option
                                          key={section.id}
                                          value={section.id}
                                        >
                                          {section.section_name}
                                        </option>
                                      ))}
                                  </select>
                                </Field>

                                <SubmitButton pending={pending}>
                                  Enroll Student
                                </SubmitButton>
                              </>
                            )}
                          </ActionForm>

                          <ActionForm action={transferStudent}>
                            {(pending) => (
                              <>
                                <Field
                                  label="Active Enrollment"
                                  name="enrollment_id"
                                >
                                  <select
                                    name="enrollment_id"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  >
                                    <option value="" disabled>
                                      Select enrollment
                                    </option>
                                    {activeEnrollments.map((enrollment) => (
                                      <option
                                        key={enrollment.id}
                                        value={enrollment.id}
                                      >
                                        {enrollment.student_name} —{" "}
                                        {enrollment.section_name}
                                      </option>
                                    ))}
                                  </select>
                                </Field>

                                <Field
                                  label="New Section"
                                  name="new_section_id"
                                >
                                  <select
                                    name="new_section_id"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  >
                                    <option value="" disabled>
                                      Select new section
                                    </option>
                                    {item.sections
                                      .filter(
                                        (section) =>
                                          section.status === "active"
                                      )
                                      .map((section) => (
                                        <option
                                          key={section.id}
                                          value={section.id}
                                        >
                                          {section.section_name}
                                        </option>
                                      ))}
                                  </select>
                                </Field>

                                <Field
                                  label="Transfer Notes"
                                  name="notes"
                                  required={false}
                                />

                                <SubmitButton pending={pending}>
                                  Transfer Student
                                </SubmitButton>
                              </>
                            )}
                          </ActionForm>
                        </div>
                      )}

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="border-b text-slate-500">
                            <tr>
                              <th className="p-2">Student</th>
                              <th className="p-2">Section</th>
                              <th className="p-2">Status</th>
                              <th className="p-2">Enrolled</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.enrollments.map((enrollment) => (
                              <tr
                                key={enrollment.id}
                                className="border-b last:border-0"
                              >
                                <td className="p-2">
                                  {enrollment.student_name}
                                </td>
                                <td className="p-2">
                                  {enrollment.section_name}
                                </td>
                                <td className="p-2">
                                  <Status value={enrollment.status} />
                                </td>
                                <td className="p-2">
                                  {formatDate(enrollment.enrolled_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    <section>
                      <h5 className="font-bold">
                        Examination Assignments
                      </h5>

                      {item.status === "active" && (
                        <div className="mt-3 max-w-xl">
                          <ActionForm action={assignExamination}>
                            {(pending) => (
                              <>
                                <input
                                  type="hidden"
                                  name="class_id"
                                  value={item.id}
                                />

                                <Field
                                  label="Examination"
                                  name="examination_id"
                                >
                                  <select
                                    name="examination_id"
                                    required
                                    defaultValue=""
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                                  >
                                    <option value="" disabled>
                                      Select examination
                                    </option>
                                    {data.examinations
                                      .filter(
                                        (exam) =>
                                          !activeAssignments.some(
                                            (assigned) =>
                                              assigned.examination_id ===
                                              exam.id
                                          )
                                      )
                                      .map((exam) => (
                                        <option
                                          key={exam.id}
                                          value={exam.id}
                                        >
                                          {exam.title} ({exam.status})
                                        </option>
                                      ))}
                                  </select>
                                </Field>

                                <SubmitButton pending={pending}>
                                  Assign Examination
                                </SubmitButton>
                              </>
                            )}
                          </ActionForm>
                        </div>
                      )}

                      <div className="mt-4 space-y-2">
                        {item.examinations.map((exam) => (
                          <div
                            key={exam.assignment_id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{exam.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Examination status: {exam.exam_status}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <Status value={exam.assignment_status} />

                              {exam.assignment_status === "assigned" &&
                                item.status === "active" && (
                                  <ActionForm action={revokeExamination}>
                                    {(pending) => (
                                      <>
                                        <input
                                          type="hidden"
                                          name="assignment_id"
                                          value={exam.assignment_id}
                                        />
                                        <SubmitButton
                                          pending={pending}
                                          danger
                                        >
                                          Revoke
                                        </SubmitButton>
                                      </>
                                    )}
                                  </ActionForm>
                                )}
                            </div>
                          </div>
                        ))}

                        {item.examinations.length === 0 && (
                          <p className="text-sm text-slate-500">
                            No examinations assigned.
                          </p>
                        )}
                      </div>
                    </section>

                    <section className="border-t pt-5">
                      <h5 className="font-bold">Class Duration</h5>
                      <p className="mt-1 text-sm text-slate-500">
                        Extensions are limited to a cumulative maximum of
                        twelve months from the original start date.
                      </p>

                      {item.status === "active" && (
                        <div className="mt-4 max-w-md">
                          <ActionForm action={extendClass}>
                            {(pending) => (
                              <>
                                <input
                                  type="hidden"
                                  name="class_id"
                                  value={item.id}
                                />
                                <Field
                                  label="New Expiry Date and Time"
                                  name="new_expiry"
                                  type="datetime-local"
                                />
                                <Field
                                  label="Extension Notes"
                                  name="notes"
                                  required={false}
                                />
                                <SubmitButton pending={pending}>
                                  Extend Class
                                </SubmitButton>
                              </>
                            )}
                          </ActionForm>
                        </div>
                      )}

                      {item.status === "active" && (
                        <div className="mt-6 border-t border-red-100 pt-5">
                          <h5 className="font-bold text-red-800">
                            Close Class
                          </h5>
                          <p className="mt-1 text-sm text-slate-500">
                            Closing a class blocks its class-specific
                            resources. This action should only be used
                            when closure is intended.
                          </p>

                          <div className="mt-3">
                            <ActionForm action={closeClass}>
                              {(pending) => (
                                <>
                                  <input
                                    type="hidden"
                                    name="class_id"
                                    value={item.id}
                                  />
                                  <SubmitButton
                                    pending={pending}
                                    danger
                                  >
                                    Close This Class
                                  </SubmitButton>
                                </>
                              )}
                            </ActionForm>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
