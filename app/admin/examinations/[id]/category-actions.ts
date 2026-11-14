
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CategoryActionState = {
  error?: string;
  success?: string;
};

const SUBJECT_CATEGORIES = [
  "Hematology",
  "Molecular Biology",
  "Medical Microbiology and Parasitology",
  "Clinical Chemistry",
  "Blood Banking & Serology",
  "Clinical Microscopy",
  "Histopathologic Techniques & Medical Technology Laws",
] as const;

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

export async function updateExaminationCategory(
  examinationId: string,
  _previousState: CategoryActionState,
  formData: FormData
): Promise<CategoryActionState> {
  const subjectCategory = String(
    formData.get("subject_category") ?? ""
  ).trim();

  const subtopic = String(
    formData.get("subtopic") ?? ""
  ).trim();

  if (
    !SUBJECT_CATEGORIES.includes(
      subjectCategory as (typeof SUBJECT_CATEGORIES)[number]
    )
  ) {
    return {
      error: "Please select a valid subject category.",
    };
  }

  if (subtopic.length > 200) {
    return {
      error: "The subtopic must not exceed 200 characters.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_update_examination_category",
    {
      p_examination_id: examinationId,
      p_subject_category: subjectCategory,
      p_subtopic: subtopic || null,
    }
  );

  if (error) {
    console.error(
      "Unable to update examination category:",
      error
    );

    return {
      error: error.message,
    };
  }

  revalidatePath("/admin/examinations");
  revalidatePath(`/admin/examinations/${examinationId}`);

  return {
    success: "Examination subject and subtopic updated successfully.",
  };
}
