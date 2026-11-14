
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CloseActionState = {
  error?: string;
  success?: string;
};

export async function closeExamination(
  examinationId: string,
  _previousState: CloseActionState,
  _formData: FormData
): Promise<CloseActionState> {
  // Required by the useActionState signature but unused in this action.
  void _previousState;
  void _formData;

  // Validate the examination ID.
  if (
    typeof examinationId !== "string" ||
    !examinationId.trim()
  ) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await createClient();

  // Verify the currently authenticated user.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verify that the user is an approved administrator.
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

  // Execute the database-controlled examination closure.
  const { data, error } = await supabase.rpc(
    "admin_close_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  if (data !== true) {
    return {
      error: "The examination could not be closed.",
    };
  }

  // Refresh the examination listing and detail pages.
  revalidatePath("/admin/examinations");
  revalidatePath(`/admin/examinations/${examinationId}`);

  return {
    success: "Examination closed successfully.",
  };
}
