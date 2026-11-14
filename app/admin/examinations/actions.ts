
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExaminationFormState = {
  error?: string;
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

export async function createExamination(
  _previousState: ExaminationFormState,
  formData: FormData
): Promise<ExaminationFormState> {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(
      formData.get("description") ?? ""
    ).trim();
    const instructions = String(
      formData.get("instructions") ?? ""
    ).trim();

    const subjectCategory = String(
      formData.get("subject_category") ?? ""
    ).trim();

    const subtopic = String(
      formData.get("subtopic") ?? ""
    ).trim();

    const timeLimitValue = String(
      formData.get("time_limit_minutes") ?? ""
    ).trim();

    const passingScoreValue = String(
      formData.get("passing_score") ?? ""
    ).trim();

    if (!title) {
      return {
        error: "Examination title is required.",
      };
    }

    if (title.length > 200) {
      return {
        error: "Examination title must not exceed 200 characters.",
      };
    }

    if (description.length > 5000) {
      return {
        error: "Description must not exceed 5,000 characters.",
      };
    }

    if (instructions.length > 10000) {
      return {
        error: "Instructions must not exceed 10,000 characters.",
      };
    }

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
        error: "Subtopic must not exceed 200 characters.",
      };
    }

    const timeLimit = timeLimitValue
      ? Number(timeLimitValue)
      : null;

    const passingScore = passingScoreValue
      ? Number(passingScoreValue)
      : null;

    if (
      timeLimit !== null &&
      (!Number.isSafeInteger(timeLimit) || timeLimit < 1)
    ) {
      return {
        error: "Time limit must be a positive whole number.",
      };
    }

    if (
      passingScore !== null &&
      (!Number.isFinite(passingScore) ||
        passingScore < 0 ||
        passingScore > 100)
    ) {
      return {
        error: "Passing score must be between 0 and 100.",
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "Your session has expired. Please sign in again.",
      };
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
      return {
        error: "Approved administrator access is required.",
      };
    }

    const { data: examinationId, error } = await supabase.rpc(
      "admin_create_categorized_examination",
      {
        p_title: title,
        p_description: description || null,
        p_instructions: instructions || null,
        p_time_limit_minutes: timeLimit,
        p_passing_score: passingScore,
        p_subject_category: subjectCategory,
        p_subtopic: subtopic || null,
      }
    );

    if (error) {
      console.error(
        "Unable to create examination:",
        error.message
      );

      return {
        error: "Unable to create the examination. Please check your entries and try again.",
      };
    }

    if (!examinationId) {
      return {
        error: "The examination could not be created.",
      };
    }

    redirect("/admin/examinations");
  } catch (error) {
    // Next.js redirect is implemented using a thrown signal.
    // Re-throw redirect signals instead of swallowing them.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("Examination creation failed:", error);

    return {
      error: "Something went wrong while creating the examination. Please try again.",
    };
  }
}
