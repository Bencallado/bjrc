
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string | null
) {
  if (
    !attemptId.trim() ||
    !questionId.trim() ||
    (selectedOptionId !== null && !selectedOptionId.trim())
  ) {
    throw new Error("Valid examination answer details are required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase.rpc(
    "student_save_exam_answer",
    {
      p_attempt_id: attemptId,
      p_question_id: questionId,
      p_selected_option_id: selectedOptionId,
    }
  );

  if (error) {
    console.error("Unable to save examination answer:", error.message);
    throw new Error(error.message);
  }

  if (data !== true) {
    throw new Error("The examination answer could not be saved.");
  }

  return { success: true };
}

export async function submitExam(
  attemptId: string,
  automatic = false
) {
  if (!attemptId.trim()) {
    throw new Error("A valid examination attempt ID is required.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Automatic timeout: use the database-authoritative finalizer.
  if (automatic) {
    const { error: finalizeError } = await supabase.rpc(
      "student_finalize_expired_attempts"
    );

    if (finalizeError) {
      console.error(
        "Unable to finalize expired examinations:",
        finalizeError.message
      );
    }

    // Retrieve the finalized attempt's results.
    const { data: existingResults, error: resultsError } =
      await supabase.rpc("student_get_exam_results", {
        p_attempt_id: attemptId,
      });

    if (!resultsError && existingResults?.length > 0) {
      redirect(`/student/attempts/${attemptId}/results`);
    }

    if (resultsError) {
      console.error(
        "Unable to retrieve automatically finalized results:",
        resultsError.message
      );
    }

    throw new Error(
      "The examination could not be automatically finalized. Please try again."
    );
  }

  // Manual submission: retain the deadline-enforced RPC.
  const { data, error } = await supabase.rpc(
    "student_submit_examination",
    {
      p_attempt_id: attemptId,
    }
  );

  if (!error) {
    const result = Array.isArray(data) ? data[0] : data;

    if (result && result.submitted_at != null) {
      redirect(`/student/attempts/${attemptId}/results`);
    }
  }

  // Check whether an earlier request already submitted the examination.
  const { data: existingResults, error: resultsError } =
    await supabase.rpc("student_get_exam_results", {
      p_attempt_id: attemptId,
    });

  if (!resultsError && existingResults?.length > 0) {
    redirect(`/student/attempts/${attemptId}/results`);
  }

  if (error) {
    console.error(
      "Unable to submit examination:",
      error.message
    );
  }

  if (resultsError) {
    console.error(
      "Unable to retrieve existing examination results:",
      resultsError.message
    );
  }

  throw new Error(
    "The examination could not be submitted or its existing results could not be retrieved. Please try again."
  );
}
