
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function startExamination(formData: FormData) {
  const examinationId = formData.get("examinationId");

  if (
    typeof examinationId !== "string" ||
    !examinationId.trim()
  ) {
    throw new Error("A valid examination ID is required.");
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
    "student_start_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    console.error("Unable to start examination:", error.message);
    throw new Error(error.message);
  }

  const attempt = Array.isArray(data) ? data[0] : data;

  if (!attempt?.attempt_id) {
    throw new Error("The examination attempt could not be created.");
  }

  redirect(`/student/attempts/${attempt.attempt_id}`);
}
