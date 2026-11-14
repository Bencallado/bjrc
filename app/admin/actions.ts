
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AdminProfileActionState = {
  success?: string;
  error?: string;
};

export async function updateAdminProfile(
  _previousState: AdminProfileActionState,
  formData: FormData
): Promise<AdminProfileActionState> {
  try {
    const fullName = String(formData.get("full_name") ?? "").trim();

    if (!fullName) {
      return {
        error: "Please enter your full name.",
      };
    }

    const supabase = await createClient();

    // Verify the authenticated user.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        error: "Your session has expired. Please sign in again.",
      };
    }

    // Verify administrator authorization.
    const { data: profile, error: profileError } = await supabase
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
        error: "You are not authorized to update this profile.",
      };
    }

    // Update only the authenticated administrator's own name.
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        error: "Unable to update your profile. Please try again.",
      };
    }

    revalidatePath("/admin");

    return {
      success: "Your administrator profile has been updated successfully.",
    };
  } catch {
    return {
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function setStudentApproval(
  studentId: string,
  approvalStatus: "approved" | "rejected"
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.rpc(
      "admin_set_student_approval",
      {
        p_student_id: studentId,
        p_approval_status: approvalStatus,
      }
    );

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    revalidatePath("/admin");

    return {
      success: true,
      message:
        approvalStatus === "approved"
          ? "Student approved successfully."
          : "Student rejected successfully.",
    };
  } catch {
    return {
      success: false,
      message: "Something went wrong. Please try again.",
    };
  }
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
