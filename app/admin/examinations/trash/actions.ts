
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type TrashActionState = {
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

// Revalidate pages affected by Trash operations.
function revalidateTrashPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/examinations");
  revalidatePath("/admin/examinations/trash");
}

// Restore a previously trashed examination.
export async function restoreExamination(
  examinationId: string,
  _previousState: TrashActionState,
  _formData: FormData
): Promise<TrashActionState> {
  // Required by the useActionState signature.
  void _previousState;
  void _formData;

  if (
    typeof examinationId !== "string" ||
    !examinationId.trim()
  ) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_restore_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateTrashPages();

  revalidatePath(
    `/admin/examinations/${examinationId}`
  );

  return {
    success:
      "Examination successfully restored to its previous status.",
  };
}

// Permanently delete a previously trashed examination.
export async function permanentlyDeleteExamination(
  examinationId: string,
  _previousState: TrashActionState,
  _formData: FormData
): Promise<TrashActionState> {
  // Required by the useActionState signature.
  void _previousState;
  void _formData;

  if (
    typeof examinationId !== "string" ||
    !examinationId.trim()
  ) {
    return {
      error: "A valid examination ID is required.",
    };
  }

  const supabase = await verifyAdministrator();

  const { error } = await supabase.rpc(
    "admin_permanently_delete_examination",
    {
      p_examination_id: examinationId,
    }
  );

  if (error) {
    return {
      error: error.message,
    };
  }

  revalidateTrashPages();

  return {
    success: "Examination permanently deleted.",
  };
}
