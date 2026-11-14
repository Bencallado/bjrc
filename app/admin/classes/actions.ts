
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClassActionState = {
  success?: string;
  error?: string;
};

async function callAdminRpc(
  functionName: string,
  parameters: Record<string, unknown>
): Promise<ClassActionState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Your session has expired. Please sign in again." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, approval_status")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      profile.role !== "admin" ||
      profile.approval_status !== "approved"
    ) {
      return { error: "Approved administrator access is required." };
    }

    const { error } = await supabase.rpc(
      functionName as never,
      parameters as never
    );

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/classes");
    revalidatePath("/admin");
    revalidatePath("/student");

    return { success: "Operation completed successfully." };
  } catch {
    return { error: "An unexpected error occurred. Please try again." };
  }
}

function requiredText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function requiredUuid(formData: FormData, name: string): string {
  const value = requiredText(formData, name);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  ) {
    throw new Error(`Invalid ${name.replaceAll("_", " ")}.`);
  }

  return value;
}

function requiredManilaDateTime(
  formData: FormData,
  name: string
): string {
  const value = requiredText(formData, name);

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error(`Invalid ${name.replaceAll("_", " ")}.`);
  }

  const date = new Date(`${value}:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${name.replaceAll("_", " ")}.`);
  }

  return date.toISOString();
}

async function handle(
  formData: FormData,
  operation: () => Promise<ClassActionState>
): Promise<ClassActionState> {
  try {
    const result = await operation();

    return result;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Invalid form information.",
    };
  }
}

export async function createClass(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_create_class", {
      p_name: requiredText(formData, "name"),
      p_class_code: requiredText(formData, "class_code"),
      p_starts_at: requiredManilaDateTime(formData, "starts_at"),
      p_expires_at: requiredManilaDateTime(formData, "expires_at"),
    })
  );
}

export async function createClassSection(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_create_class_section", {
      p_class_id: requiredUuid(formData, "class_id"),
      p_section_name: requiredText(formData, "section_name"),
    })
  );
}

export async function enrollStudent(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_enroll_student", {
      p_class_id: requiredUuid(formData, "class_id"),
      p_section_id: requiredUuid(formData, "section_id"),
      p_student_id: requiredUuid(formData, "student_id"),
    })
  );
}

export async function transferStudent(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_transfer_student", {
      p_enrollment_id: requiredUuid(formData, "enrollment_id"),
      p_new_section_id: requiredUuid(formData, "new_section_id"),
      p_notes: requiredText(formData, "notes") || null,
    })
  );
}

export async function assignExamination(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_assign_examination_to_class", {
      p_class_id: requiredUuid(formData, "class_id"),
      p_examination_id: requiredUuid(formData, "examination_id"),
    })
  );
}

export async function revokeExamination(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_revoke_class_examination", {
      p_assignment_id: requiredUuid(formData, "assignment_id"),
    })
  );
}

export async function extendClass(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_extend_class", {
      p_class_id: requiredUuid(formData, "class_id"),
      p_new_expiry: requiredManilaDateTime(formData, "new_expiry"),
      p_notes: requiredText(formData, "notes") || null,
    })
  );
}

export async function closeClass(
  _previousState: ClassActionState,
  formData: FormData
): Promise<ClassActionState> {
  return handle(formData, async () =>
    callAdminRpc("admin_close_class", {
      p_class_id: requiredUuid(formData, "class_id"),
    })
  );
}
