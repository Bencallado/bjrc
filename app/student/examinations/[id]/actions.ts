
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startExamination(formData: FormData) {
  const examinationId = formData.get("examinationId");
  const acknowledgment = formData.get("acknowledgeInstructions");

  if (
    typeof examinationId !== "string" ||
    !examinationId.trim()
  ) {
    throw new Error("A valid examination ID is required.");
  }

  // Require an explicit student acknowledgment.
  if (acknowledgment !== "on") {
    throw new Error(
      "Please review and acknowledge the examination instructions."
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Record acknowledgment of the current instruction version.
  const { error: acknowledgmentError } = await supabase.rpc(
    "student_acknowledge_exam_instructions",
    {
      p_examination_id: examinationId,
    }
  );

  if (acknowledgmentError) {
    console.error(
      "Unable to acknowledge examination instructions:",
      acknowledgmentError.message
    );

    throw new Error(
      "Unable to record your acknowledgment. Please try again."
    );
  }

  // Start the examination after acknowledgment is recorded.
  const { data, error } = await supabase.rpc(
    "student_start_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    console.error(
      "Unable to start examination:",
      error.message
    );

    throw new Error(error.message);
  }

  const attempt = Array.isArray(data) ? data[0] : data;

  if (!attempt?.attempt_id) {
    throw new Error(
      "The examination attempt could not be created."
    );
  }

  redirect(`/student/attempts/${attempt.attempt_id}`);
}
