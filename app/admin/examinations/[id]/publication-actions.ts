
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PublicationActionState = {
  error?: string;
  success?: string;
};

async function verifyAdministrator() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, approval_status")
    .eq("id", user.id)
    .single();

  if (
    error ||
    !profile ||
    profile.role !== "admin" ||
    profile.approval_status !== "approved"
  ) {
    redirect("/");
  }

  return supabase;
}

// Validate datetime-local values and interpret them
// explicitly as Philippine time (Asia/Manila).
function convertManilaDateTime(value: string): string | null {
  if (!value) {
    return null;
  }

  // Accept only YYYY-MM-DDTHH:mm.
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
  ) {
    return null;
  }

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

export async function publishExamination(
  examinationId: string,
  _previousState: PublicationActionState,
  formData: FormData
): Promise<PublicationActionState> {
  const publishMode = String(
    formData.get("publish_mode") ?? ""
  );

  const scheduledValue = String(
    formData.get("scheduled_at") ?? ""
  ).trim();

  const closingValue = String(
    formData.get("closes_at") ?? ""
  ).trim();

  if (
    publishMode !== "immediate" &&
    publishMode !== "scheduled"
  ) {
    return {
      error: "Please select a valid publication method.",
    };
  }

  let publishAt: string | null = null;

  if (publishMode === "scheduled") {
    if (!scheduledValue) {
      return {
        error: "Please provide a scheduled publication date and time.",
      };
    }

    publishAt = convertManilaDateTime(scheduledValue);

    if (!publishAt) {
      return {
        error: "The scheduled publication date and time is invalid.",
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

  const supabase = await verifyAdministrator();

  const { data, error } = await supabase.rpc(
    "admin_publish_examination",
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

  revalidatePath("/admin/examinations");
  revalidatePath(`/admin/examinations/${examinationId}`);

  return {
    success:
      data === "scheduled"
        ? "Examination scheduled successfully."
        : "Examination published successfully.",
  };
}
