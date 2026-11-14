
import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  join,
  resolve,
} from "node:path";
import { tmpdir } from "node:os";

import { createClient } from "@/lib/supabase/server";

const execFileAsync = promisify(execFile);

export const maxDuration = 300;

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const OCR_TIMEOUT = 600_000;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OCRResult = {
  success: boolean;
  page_count?: number;
  total_characters?: number;
  pages?: Array<{
    page: number;
    text: string;
    character_count: number;
  }>;
  text?: string;
  warning?: string | null;
  error?: string;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  let temporaryDirectory: string | null = null;

  try {
    // 1. Validate examination ID.
    const { id: examinationId } = await context.params;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(examinationId)) {
      return jsonError("Invalid examination ID.", 400);
    }

    // 2. Authenticate the administrator.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("Authentication required.", 401);
    }

    // 3. Verify administrator role and approval.
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
      return jsonError(
        "Approved administrator access required.",
        403
      );
    }

    // 4. Verify that the examination exists and is a draft.
    const {
      data: examinations,
      error: examinationError,
    } = await supabase.rpc(
      "admin_list_examinations_with_subjects"
    );

    if (examinationError) {
      console.error(
        "OCR examination lookup failed:",
        examinationError
      );

      return jsonError(
        "Unable to verify examination.",
        500
      );
    }

    const examinationList = Array.isArray(examinations)
      ? examinations as Array<Record<string, unknown>>
      : [];

    const examination = examinationList.find(
      (item) => item.id === examinationId
    );

    if (!examination) {
      return jsonError("Examination not found.", 404);
    }

    if (examination.status !== "draft") {
      return jsonError(
        "OCR is only available for draft examinations.",
        409
      );
    }

    // 5. Read and validate uploaded PDF.
    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (
      !uploadedFile ||
      typeof uploadedFile === "string" ||
      typeof uploadedFile.arrayBuffer !== "function"
    ) {
      return jsonError(
        "Please upload a PDF file using the 'file' field.",
        400
      );
    }

    if (!uploadedFile.name.toLowerCase().endsWith(".pdf")) {
      return jsonError("Only PDF files are supported.", 400);
    }

    if (uploadedFile.size === 0) {
      return jsonError("The uploaded PDF is empty.", 400);
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return jsonError(
        "PDF exceeds the 20 MB upload limit.",
        413
      );
    }

    const pdfBuffer = Buffer.from(
      await uploadedFile.arrayBuffer()
    );

    if (pdfBuffer.subarray(0, 5).toString() !== "%PDF-") {
      return jsonError(
        "The uploaded file is not a valid PDF.",
        400
      );
    }

    // 6. Prepare temporary PDF storage.
    temporaryDirectory = await mkdtemp(
      join(tmpdir(), "bjrc-ocr-")
    );

    const pdfPath = join(
      temporaryDirectory,
      "uploaded-document.pdf"
    );

    await writeFile(pdfPath, pdfBuffer);

    // 7. Locate the existing PaddleOCR installation.
    const projectDirectory = process.cwd();

    const pythonPath = resolve(
      projectDirectory,
      ".venv-paddleocr",
      "Scripts",
      "python.exe"
    );

    const scriptPath = resolve(
      projectDirectory,
      "scripts",
      "ocr_pdf.py"
    );

    // 8. Execute PaddleOCR.
    let stdout: string;
    let stderr: string;

    try {
      const result = await execFileAsync(
        pythonPath,
        [scriptPath, pdfPath],
        {
          timeout: OCR_TIMEOUT,
          maxBuffer: 20 * 1024 * 1024,
          windowsHide: true,
          encoding: "utf8",
        }
      );

      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: unknown) {
      const executionError = error as Error & {
        stdout?: string;
        stderr?: string;
      };

      if (executionError.stderr) {
        console.error(
          "PaddleOCR execution log:",
          executionError.stderr
        );
      }

      if (executionError.stdout) {
        try {
          const failedResult = JSON.parse(
            executionError.stdout
          ) as OCRResult;

          if (failedResult.error) {
            return jsonError(
              failedResult.error,
              422
            );
          }
        } catch {
          // Fall through to the generic error.
        }
      }

      console.error(
        "PaddleOCR execution failed:",
        executionError.message
      );

      return jsonError(
        "OCR processing failed. Check the local Python environment and server logs.",
        500
      );
    }

    if (stderr) {
      console.log("PaddleOCR progress:", stderr);
    }

    // 9. Parse OCR JSON.
    let result: OCRResult;

    try {
      result = JSON.parse(stdout) as OCRResult;
    } catch {
      console.error(
        "Invalid PaddleOCR JSON response:",
        stdout.slice(0, 1000)
      );

      return jsonError(
        "OCR returned an invalid response.",
        500
      );
    }

    if (!result.success) {
      return jsonError(
        result.error || "OCR processing failed.",
        422
      );
    }

    // 10. Return extracted text for administrator review.
    return NextResponse.json({
      success: true,
      examination_id: examinationId,
      filename: uploadedFile.name,
      page_count: result.page_count ?? 0,
      total_characters: result.total_characters ?? 0,
      pages: result.pages ?? [],
      text: result.text ?? "",
      warning: result.warning ?? null,
    });
  } catch (error) {
    console.error("OCR API error:", error);

    return jsonError(
      "An unexpected error occurred during OCR processing.",
      500
    );
  } finally {
    // 11. Always remove temporary uploaded documents.
    if (temporaryDirectory) {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      }).catch((error) => {
        console.error(
          "Failed to clean temporary OCR files:",
          error
        );
      });
    }
  }
}

