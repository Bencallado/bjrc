
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import ExamInterface from "./exam-interface";

export const instant = false;

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

type AttemptRow = {
  attempt_id: string;
  examination_id: string;
  started_at: string;
  time_limit_minutes: number | null;
  status: string;
  question_id: string;
  selected_option_id: string | null;
};

type QuestionRow = {
  question_id: string;
  question_text: string;
  points: number;
  question_order: number;
  option_id: string;
  option_text: string;
  option_order: number;
};

type ExamQuestion = {
  questionId: string;
  questionText: string;
  points: number;
  questionOrder: number;
  selectedOptionId: string | null;
  options: {
    optionId: string;
    optionText: string;
    optionOrder: number;
  }[];
};

export default async function ExaminationAttemptPage({
  params,
}: PageProps) {
  await connection();

  const { attemptId } = await params;

  const supabase = await createClient();

  // 1. Verify the signed-in student.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. Retrieve the student's active examination attempt.
  const { data: attemptData, error: attemptError } =
    await supabase.rpc("student_get_exam_attempt", {
      p_attempt_id: attemptId,
    });

  if (attemptError || !attemptData || attemptData.length === 0) {
    console.error(
      "Unable to retrieve examination attempt:",
      attemptError?.message
    );

    throw new Error(
      "This examination attempt could not be loaded. It may already have been submitted or is unavailable."
    );
  }

  const attempts = attemptData as AttemptRow[];
  const attempt = attempts[0];

  // 3. Retrieve examination questions and answer choices.
  const { data: questionData, error: questionError } =
    await supabase.rpc("student_get_exam_questions", {
      p_attempt_id: attemptId,
    });

  if (questionError || !questionData || questionData.length === 0) {
    console.error(
      "Unable to retrieve examination questions:",
      questionError?.message
    );

    throw new Error("The examination questions could not be loaded.");
  }

  const questionRows = questionData as QuestionRow[];

  // 4. Restore previously saved answers.
  const savedAnswers = new Map<string, string | null>(
    attempts.map((item: AttemptRow) => [
      item.question_id,
      item.selected_option_id,
    ])
  );

  // 5. Group answer choices under their respective questions.
  const questionMap = new Map<string, ExamQuestion>();

  for (const item of questionRows) {
    if (!questionMap.has(item.question_id)) {
      questionMap.set(item.question_id, {
        questionId: item.question_id,
        questionText: item.question_text,
        points: Number(item.points),
        questionOrder: item.question_order,
        selectedOptionId:
          savedAnswers.get(item.question_id) ?? null,
        options: [],
      });
    }

    questionMap.get(item.question_id)!.options.push({
      optionId: item.option_id,
      optionText: item.option_text,
      optionOrder: item.option_order,
    });
  }

  const questions = Array.from(questionMap.values());

  // 6. Display the examination interface.
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">
            BJRC Student Examination
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Examination in Progress
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Your saved answers will be restored if you refresh this page.
          </p>
        </div>

        <ExamInterface
          attemptId={attemptId}
          startedAt={attempt.started_at}
          timeLimitMinutes={attempt.time_limit_minutes}
          questions={questions}
        />
      </div>
    </main>
  );
}
