
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ManagementActionState = {
  error?: string;
  success?: string;
};

// Verify that the current user is an authenticated,
// approved administrator.
async function verifyAdministrator() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } =
    await supabase
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
    redirect("/");
  }

  return supabase;
}

// Validate the examination ID.
function validateExaminationId(
  examinationId: string
): boolean {
  return (
    typeof examinationId === "string" &&
    examinationId.trim().length > 0
  );
}

// Interpret datetime-local values explicitly as Philippine time.
function convertManilaDateTime(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  // Expected format: YYYY-MM-DDTHH:mm
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return null;
  }

  // Philippine time is UTC+08:00.
  const date = new Date(`${value}:00+08:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Verify that JavaScript did not normalize an invalid date.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  const verifiedValue =
    `${values.year}-${values.month}-${values.day}` +
    `T${values.hour}:${values.minute}`;

  if (verifiedValue !== value) {
    return null;
  }

  return date.toISOString();
}

// Revalidate all relevant examination pages.
function revalidateExaminationPages(
  examinationId: string
) {
  revalidatePath("/admin");
  revalidatePath("/admin/examinations");
  revalidatePath(`/admin/examinations/${examinationId}`);
  revalidatePath("/admin/examinations/trash");
}

// Return an examination from Published to Draft.
export async function unpublishExamination(
  examinationId: string,
  _previousState: ManagementActionState,
  _formData: FormData
): Promise<ManagementActionState> {
  // Required by the useActionState signature.
  void _previousState;
  void _formData;

  if (!validateExaminationId(examinationId)) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_unpublish_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateExaminationPages(examinationId);

  return {
    success: "Examination successfully returned to Draft.",
  };
}

// Reopen a previously closed examination.
export async function reopenExamination(
  examinationId: string,
  _previousState: ManagementActionState,
  _formData: FormData
): Promise<ManagementActionState> {
  // Required by the useActionState signature.
  void _previousState;
  void _formData;

  if (!validateExaminationId(examinationId)) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_reopen_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateExaminationPages(examinationId);

  return {
    success: "Examination successfully reopened.",
  };
}

// Update the examination publication and closing schedule.
export async function updateExaminationSchedule(
  examinationId: string,
  _previousState: ManagementActionState,
  formData: FormData
): Promise<ManagementActionState> {
  // Required by the useActionState signature.
  // formData is actively used below.
  void _previousState;

  if (!validateExaminationId(examinationId)) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const scheduledValue = String(
    formData.get("scheduled_at") ?? ""
  ).trim();

  const closingValue = String(
    formData.get("closes_at") ?? ""
  ).trim();

  let publishAt: string | null = null;

  if (scheduledValue) {
    publishAt = convertManilaDateTime(scheduledValue);

    if (!publishAt) {
      return {
        error: "The publication date and time is invalid.",
      };
    }
  }

  let closesAt: string | null = null;

  if (closingValue) {
    closesAt = convertManilaDateTime(closingValue);

    if (!closesAt) {
      return {
        error: "The closing date and time is invalid.",
      };
    }
  }

  // Ensure the closing time is later than the publication time.
  if (
    publishAt &&
    closesAt &&
    new Date(closesAt).getTime() <=
      new Date(publishAt).getTime()
  ) {
    return {
      error:
        "The closing date and time must be later than the publication date and time.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_update_examination_schedule",
    {
      p_examination_id: examinationId,
      p_publish_at: publishAt,
      p_closes_at: closesAt,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateExaminationPages(examinationId);

  return {
    success: "Examination schedule updated successfully.",
  };
}

// Move an examination to the Trash.
export async function moveExaminationToTrash(
  examinationId: string,
  _previousState: ManagementActionState,
  _formData: FormData
): Promise<ManagementActionState> {
  // Required by the useActionState signature.
  void _previousState;
  void _formData;

  if (!validateExaminationId(examinationId)) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_move_examination_to_trash",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateExaminationPages(examinationId);

  return {
    success:
      "Examination moved to Trash. Its existing student attempts and results are preserved.",
  };
}
