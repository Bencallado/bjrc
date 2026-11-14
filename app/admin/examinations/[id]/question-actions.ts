
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type QuestionActionState = {
  error?: string;
  success?: string;
};

type AnswerOption = {
  option_text: string;
  is_correct: boolean;
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

export async function saveExamQuestion(
  examinationId: string,
  questionId: string | null,
  _previousState: QuestionActionState,
  formData: FormData
): Promise<QuestionActionState> {
  const questionText = String(
    formData.get("question_text") ?? ""
  ).trim();

  const pointsValue = String(
    formData.get("points") ?? "1"
  ).trim();

  const points = Number(pointsValue);

  const options: AnswerOption[] = ["A", "B", "C", "D"].map(
    (letter) => ({
      option_text: String(
        formData.get(`option_${letter}`) ?? ""
      ).trim(),
      is_correct:
        formData.get("correct_answer") === letter,
    })
  );

  if (!questionText) {
    return { error: "Question text is required." };
  }

  if (
    !Number.isFinite(points) ||
    points < 1
  ) {
    return {
      error: "Points must be at least 1.",
    };
  }

  if (options.some((option) => !option.option_text)) {
    return {
      error: "All four answer choices are required.",
    };
  }

  if (
    options.filter((option) => option.is_correct).length !== 1
  ) {
    return {
      error: "Please select exactly one correct answer.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_save_exam_question",
    {
      p_examination_id: examinationId,
      p_question_id: questionId,
      p_question_text: questionText,
      p_points: points,
      p_options: options,
    }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/examinations/${examinationId}`);

  return {
    success: questionId
      ? "Question updated successfully."
      : "Question added successfully.",
  };
}

export async function deleteExamQuestion(
  examinationId: string,
  questionId: string
): Promise<QuestionActionState> {
  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_delete_exam_question",
    {
      p_question_id: questionId,
    }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/examinations/${examinationId}`);

  return {
    success: "Question deleted successfully.",
  };
}
