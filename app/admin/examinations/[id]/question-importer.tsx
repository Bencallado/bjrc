
"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";

type ExistingQuestion = {
  question_text: string;
};

type ImportQuestion = {
  id: string;
  sourceRow: number;
  questionText: string;
  points: string;
  choices: string[];
  correctIndex: number;
  selected: boolean;
  retainDuplicate: boolean;
  explanation?: string;
  sourcePage?: number | null;
  aiGenerated?: boolean;
};

type ImportQuestionerProps = {
  examinationId: string;
  existingQuestions: ExistingQuestion[];
};

type ImportRecord = Record<string, unknown>;

type GeneratedQuestionResponse = {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
};

type ApiErrorResponse = {
  success?: boolean;
  error?: string;
};

const LETTERS = ["A", "B", "C", "D"] as const;

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getRecordValue(
  record: ImportRecord,
  ...names: string[]
): string {
  for (const name of names) {
    const value = record[name];

    if (value !== undefined && value !== null) {
      return cellText(value);
    }
  }

  return "";
}

function validateHeaders(headers: string[]): void {
  const normalized = headers.map(normalizeHeader);

  if (
    !normalized.includes("question") &&
    !normalized.includes("question_text")
  ) {
    throw new Error('Missing required column: "question".');
  }

  if (
    !normalized.includes("correct_answer") &&
    !normalized.includes("answer")
  ) {
    throw new Error('Missing required column: "correct_answer".');
  }
}

function makeQuestion(
  record: ImportRecord,
  sourceRow: number
): ImportQuestion {
  const questionText = getRecordValue(
    record,
    "question",
    "question_text"
  );

  const points = getRecordValue(record, "points") || "1";

  const correctAnswer = getRecordValue(
    record,
    "correct_answer",
    "answer"
  );

  const choices = LETTERS.map((letter) =>
    getRecordValue(
      record,
      `option_${letter.toLowerCase()}`,
      `choice_${letter.toLowerCase()}`,
      letter.toLowerCase()
    )
  );

  const matches = choices
    .map((choice, index) =>
      choice &&
      normalizeText(choice) === normalizeText(correctAnswer)
        ? index
        : -1
    )
    .filter((index) => index >= 0);

  let correctIndex = matches.length === 1 ? matches[0] : -1;

  if (
    correctAnswer &&
    matches.length === 0 &&
    choices.filter(Boolean).length < 4
  ) {
    const emptyIndex = choices.findIndex(
      (choice) => !choice.trim()
    );

    if (emptyIndex >= 0) {
      choices[emptyIndex] = correctAnswer;
      correctIndex = emptyIndex;
    }
  }

  return {
    id: crypto.randomUUID(),
    sourceRow,
    questionText,
    points,
    choices,
    correctIndex,
    selected: true,
    retainDuplicate: false,
  };
}

function parseMarkdown(content: string): ImportRecord[] {
  const headingPattern =
    /^##\s+Question(?:\s+\d+)?\s*$/gim;

  const headings = [...content.matchAll(headingPattern)];

  if (headings.length === 0) {
    throw new Error(
      'No question headings found. Use "## Question 1" for each question.'
    );
  }

  return headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end =
      index + 1 < headings.length
        ? headings[index + 1].index ?? content.length
        : content.length;

    const block = content.slice(start, end);
    const lines = block.split(/\r?\n/);

    const record: ImportRecord = {
      question: "",
      points: "1",
      correct_answer: "",
    };

    const choices: Record<string, string> = {};
    let currentField = "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) continue;

      const questionMatch = trimmed.match(
        /^Question:\s*(.*)$/i
      );

      const pointsMatch = trimmed.match(
        /^Points:\s*(.*)$/i
      );

      const answerMatch = trimmed.match(
        /^(?:Correct Answer|Answer):\s*(.*)$/i
      );

      const choiceMatch = trimmed.match(
        /^([A-D])[\.\)]\s*(.*)$/i
      );

      if (questionMatch) {
        record.question = questionMatch[1];
        currentField = "question";
      } else if (pointsMatch) {
        record.points = pointsMatch[1];
        currentField = "";
      } else if (answerMatch) {
        record.correct_answer = answerMatch[1];
        currentField = "";
      } else if (choiceMatch) {
        choices[choiceMatch[1].toLowerCase()] =
          choiceMatch[2];
        currentField = "";
      } else if (/^Choices:\s*$/i.test(trimmed)) {
        currentField = "";
      } else if (currentField === "question") {
        record.question =
          `${record.question} ${trimmed}`.trim();
      }
    }

    for (const letter of LETTERS) {
      record[`option_${letter.toLowerCase()}`] =
        choices[letter.toLowerCase()] ?? "";
    }

    return record;
  });
}

function parseQuizlet(content: string): ImportRecord[] {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("The Quizlet text file is empty.");
  }

  return lines.map((line, index) => {
    const columns = line.split("\t");

    if (columns.length !== 2) {
      throw new Error(
        `Quizlet line ${index + 1} must contain exactly two tab-separated columns.`
      );
    }

    const question = columns[0].trim();
    const correctAnswer = columns[1].trim();

    if (!question || !correctAnswer) {
      throw new Error(
        `Quizlet line ${index + 1} has an empty question or answer.`
      );
    }

    return {
      question,
      correct_answer: correctAnswer,
      points: "1",
    };
  });
}

function similarity(left: string, right: string): number {
  const leftWords = new Set(
    normalizeText(left).split(/\s+/).filter(Boolean)
  );

  const rightWords = new Set(
    normalizeText(right).split(/\s+/).filter(Boolean)
  );

  if (leftWords.size < 3 || rightWords.size < 3) {
    return 0;
  }

  let intersection = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) intersection++;
  }

  return (
    intersection /
    (leftWords.size + rightWords.size - intersection)
  );
}

function getQuestionIssues(
  question: ImportQuestion
): string[] {
  const issues: string[] = [];

  if (!question.questionText.trim()) {
    issues.push("Question text is required.");
  } else if (question.questionText.trim().length > 10000) {
    issues.push("Question text exceeds 10,000 characters.");
  }

  const points = Number(question.points);

  if (
    !question.points.trim() ||
    !Number.isFinite(points) ||
    points < 1
  ) {
    issues.push("Points must be a number of at least 1.");
  }

  if (question.choices.length !== 4) {
    issues.push("Exactly four answer choices are required.");
  }

  if (question.choices.some((choice) => !choice.trim())) {
    issues.push("All four answer choices are required.");
  }

  if (
    question.choices.some(
      (choice) => choice.trim().length > 2000
    )
  ) {
    issues.push("An answer choice exceeds 2,000 characters.");
  }

  const normalizedChoices = question.choices
    .map(normalizeText)
    .filter(Boolean);

  if (
    new Set(normalizedChoices).size !== normalizedChoices.length
  ) {
    issues.push("Two or more answer choices are identical.");
  }

  if (
    !Number.isInteger(question.correctIndex) ||
    question.correctIndex < 0 ||
    question.correctIndex > 3 ||
    !question.choices[question.correctIndex]?.trim()
  ) {
    issues.push("Select exactly one correct answer.");
  }

  return issues;
}

async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data =
      await response.json() as ApiErrorResponse;

    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function QuestionImporter({
  examinationId,
  existingQuestions,
}: ImportQuestionerProps) {
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isReading, setIsReading] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [generationStatus, setGenerationStatus] = useState("");
  const [questionCount, setQuestionCount] = useState("10");

  const duplicateInfo = useMemo(() => {
    return questions.map((question, index) => {
      const normalized = normalizeText(question.questionText);

      const existingExact = existingQuestions.some(
        (existing) =>
          normalizeText(existing.question_text) === normalized
      );

      const earlierExact = questions
        .slice(0, index)
        .some(
          (earlier) =>
            normalizeText(earlier.questionText) === normalized
        );

      const similarExisting = existingQuestions.some(
        (existing) => {
          const score = similarity(
            question.questionText,
            existing.question_text
          );

          return score >= 0.75 && score < 1;
        }
      );

      const similarEarlier = questions
        .slice(0, index)
        .some((earlier) => {
          const score = similarity(
            question.questionText,
            earlier.questionText
          );

          return score >= 0.75 && score < 1;
        });

      return {
        exact: existingExact || earlierExact,
        similar: similarExisting || similarEarlier,
      };
    });
  }, [questions, existingQuestions]);

  const readyCount = questions.filter(
    (question, index) =>
      question.selected &&
      getQuestionIssues(question).length === 0 &&
      (!duplicateInfo[index].exact || question.retainDuplicate)
  ).length;

  function updateQuestion(
    id: string,
    updater: (question: ImportQuestion) => ImportQuestion
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? updater(question) : question
      )
    );
  }

  function clearPreview() {
    setQuestions([]);
    setFileName("");
    setPdfFileName("");
    setMessage("");
    setError("");
    setGenerationStatus("");
  }

  async function handleFile(file: File) {
    setError("");
    setMessage("");
    setGenerationStatus("");
    setQuestions([]);
    setFileName(file.name);
    setIsReading(true);

    try {
      const extension = file.name
        .split(".")
        .pop()
        ?.toLowerCase();

      let records: ImportRecord[] = [];

      if (extension === "csv") {
        records = await new Promise<ImportRecord[]>(
          (resolve, reject) => {
            Papa.parse<ImportRecord>(file, {
              header: true,
              skipEmptyLines: "greedy",
              transformHeader: normalizeHeader,
              complete: (result) => {
                if (result.errors.length > 0) {
                  reject(new Error(result.errors[0].message));
                  return;
                }

                const headers = result.meta.fields ?? [];
                validateHeaders(headers);

                resolve(
                  result.data.filter((record) =>
                    Object.values(record).some(
                      (value) => cellText(value) !== ""
                    )
                  )
                );
              },
              error: (parseError) => reject(parseError),
            });
          }
        );
      } else if (extension === "xlsx") {
        const worksheets = await readXlsxFile(file);
        const rows = (worksheets[0]?.data ?? []) as unknown[][];

        if (rows.length < 2) {
          throw new Error(
            "The Excel worksheet must contain a header row and at least one question."
          );
        }

        const headers = rows[0].map((value) =>
          normalizeHeader(cellText(value))
        );

        validateHeaders(headers);

        records = rows
          .slice(1)
          .filter((row) =>
            row.some((value) => cellText(value) !== "")
          )
          .map((row) => {
            const record: ImportRecord = {};

            headers.forEach((header, index) => {
              if (header) {
                record[header] = cellText(row[index]);
              }
            });

            return record;
          });
      } else if (extension === "txt" || extension === "tsv") {
        records = parseQuizlet(await file.text());
      } else if (
        extension === "md" ||
        extension === "markdown"
      ) {
        records = parseMarkdown(await file.text());
      } else {
        throw new Error(
          "Unsupported file format. Choose CSV, XLSX, TXT, TSV, or Markdown."
        );
      }

      if (records.length === 0) {
        throw new Error(
          "No questions were found in the selected file."
        );
      }

      if (records.length > 100) {
        throw new Error(
          `The file contains ${records.length} questions. The maximum per batch is 100.`
        );
      }

      const parsedQuestions = records.map((record, index) =>
        makeQuestion(record, index + 1)
      );

      setQuestions(parsedQuestions);

      setMessage(
        `${parsedQuestions.length} question(s) loaded for review.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to read this file."
      );
    } finally {
      setIsReading(false);
    }
  }

  async function handleScannedPdf(file: File) {
    setError("");
    setMessage("");
    setGenerationStatus("");
    setQuestions([]);
    setFileName("");
    setPdfFileName(file.name);
    setIsGenerating(true);

    try {
      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        throw new Error("Please select a PDF document.");
      }

      if (file.size > 20 * 1024 * 1024) {
        throw new Error(
          "PDF file exceeds the 20 MB upload limit."
        );
      }

      if (file.size === 0) {
        throw new Error("The selected PDF file is empty.");
      }

      const formData = new FormData();
      formData.append("file", file);

      setGenerationStatus(
        "Step 1 of 2: Extracting text from PDF using PaddleOCR..."
      );

      const ocrResponse = await fetch(
        `/api/admin/examinations/${examinationId}/ocr`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!ocrResponse.ok) {
        throw new Error(
          await readApiError(
            ocrResponse,
            "PDF text extraction failed."
          )
        );
      }

      const ocrResult = await ocrResponse.json();

      if (
        !ocrResult.success ||
        typeof ocrResult.text !== "string" ||
        !ocrResult.text.trim()
      ) {
        throw new Error(
          "No readable text was extracted from this PDF."
        );
      }

      const pageCount = Number(ocrResult.page_count || 0);

      setGenerationStatus(
        `Step 2 of 2: ${ocrResult.total_characters ?? ocrResult.text.length} characters extracted from ${pageCount || "the"} page(s). Generating questions with Qwen...`
      );

      const generationResponse = await fetch(
        `/api/admin/examinations/${examinationId}/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: ocrResult.text,
            question_count: Number(questionCount),
          }),
        }
      );

      if (!generationResponse.ok) {
        throw new Error(
          await readApiError(
            generationResponse,
            "AI question generation failed."
          )
        );
      }

      const generationResult = await generationResponse.json();

      if (
        !generationResult.success ||
        !Array.isArray(generationResult.questions)
      ) {
        throw new Error(
          "The AI returned an invalid question response."
        );
      }

      const generatedQuestions =
        generationResult.questions as GeneratedQuestionResponse[];

      if (generatedQuestions.length === 0) {
        throw new Error(
          "The AI could not generate questions from this document."
        );
      }

      const importedQuestions: ImportQuestion[] =
        generatedQuestions.map((generated, index) => {
          const choices = [
            generated.options.A,
            generated.options.B,
            generated.options.C,
            generated.options.D,
          ];

          const correctIndex = LETTERS.indexOf(
            generated.correct_answer
          );

          if (correctIndex < 0) {
            throw new Error(
              `AI question ${index + 1} has an invalid correct answer.`
            );
          }

          return {
            id: crypto.randomUUID(),
            sourceRow: index + 1,
            questionText: generated.question,
            points: "1",
            choices,
            correctIndex,
            selected: true,
            retainDuplicate: false,
            explanation: generated.explanation || "",
            aiGenerated: true,
          };
        });

      setQuestions(importedQuestions);
      setFileName(file.name);

      setMessage(
        `${importedQuestions.length} AI-generated question(s) loaded for administrator review.`
      );

      setGenerationStatus(
        `Completed: ${importedQuestions.length} question(s) generated using ${generationResult.model || "local Ollama"}.`
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to process the scanned PDF."
      );

      setGenerationStatus("");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-blue-200 bg-white p-8 shadow-sm">
      <div>
        <h3 className="text-2xl font-bold text-blue-950">
          Bulk Question Import
        </h3>

        <p className="mt-2 text-slate-600">
          Import questions from existing files or generate
          editable questions from scanned examination PDFs.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-purple-200 bg-purple-50 p-6">
        <div>
          <h4 className="text-lg font-bold text-purple-950">
            AI Question Generation from Scanned PDF
          </h4>

          <p className="mt-2 text-sm text-purple-900">
            Upload a scanned examination PDF. PaddleOCR extracts
            the document text, then your local Qwen model
            generates multiple-choice questions.
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor={`pdf-question-count-${examinationId}`}
            className="mb-2 block text-sm font-semibold text-purple-950"
          >
            Number of questions to generate
          </label>

          <input
            id={`pdf-question-count-${examinationId}`}
            type="number"
            min="1"
            max="50"
            value={questionCount}
            disabled={isGenerating}
            onChange={(event) =>
              setQuestionCount(event.target.value)
            }
            className="w-full rounded-lg border border-purple-300 bg-white px-4 py-3 text-slate-900 sm:max-w-xs"
          />

          <p className="mt-1 text-xs text-purple-800">
            Maximum: 50 questions per generation.
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor={`scanned-pdf-${examinationId}`}
            className="block text-sm font-semibold text-purple-950"
          >
            Select scanned PDF
          </label>

          <input
            id={`scanned-pdf-${examinationId}`}
            type="file"
            accept=".pdf,application/pdf"
            disabled={isGenerating || isReading}
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleScannedPdf(file);
              }

              event.target.value = "";
            }}
            className="mt-3 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-purple-900"
          />

          <p className="mt-2 text-xs text-slate-600">
            PDF only. Maximum file size: 20 MB.
          </p>
        </div>

        {pdfFileName && (
          <p className="mt-3 text-sm text-purple-900">
            Selected PDF: {pdfFileName}
          </p>
        )}

        {isGenerating && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 rounded-lg border border-purple-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-purple-700 border-t-transparent" />

              <span className="font-semibold text-purple-950">
                Processing document...
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700">
              {generationStatus}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Please keep this page open. OCR and AI generation
              may take several minutes.
            </p>
          </div>
        )}

        {!isGenerating && generationStatus && !error && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
          >
            {generationStatus}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-6">
        <h4 className="font-semibold text-blue-950">
          Import Existing Question Files
        </h4>

        <p className="mt-2 text-sm text-slate-600">
          Supported formats: CSV, XLSX, TXT, TSV, Markdown.
        </p>

        <input
          id={`question-import-${examinationId}`}
          type="file"
          accept=".csv,.xlsx,.txt,.tsv,.md,.markdown"
          disabled={isReading || isGenerating}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleFile(file);
            }

            event.target.value = "";
          }}
          className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-950 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-900"
        />

        {isReading && (
          <p className="mt-3 text-sm font-semibold text-blue-800">
            Reading file...
          </p>
        )}

        {fileName && (
          <p className="mt-3 text-sm text-slate-600">
            Selected file: {fileName}
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {questions.length > 0 && (
        <>
          <div className="mt-6 flex flex-col justify-between gap-3 border-b pb-5 sm:flex-row sm:items-center">
            <div>
              <h4 className="font-bold text-blue-950">
                Import Preview
              </h4>

              <p className="mt-1 text-sm text-slate-600">
                {questions.length} question(s) found. {readyCount} ready.
              </p>
            </div>

            <button
              type="button"
              onClick={clearPreview}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear Preview
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {questions.map((question, index) => {
              const issues = getQuestionIssues(question);
              const duplicate = duplicateInfo[index];

              return (
                <article
                  key={question.id}
                  className="rounded-xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        checked={question.selected}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            selected: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-blue-950"
                      />
                      Include Question {index + 1}
                    </label>

                    <div className="flex flex-wrap items-center gap-2">
                      {question.aiGenerated && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                          AI Generated
                        </span>
                      )}

                      <span className="text-xs text-slate-500">
                        Source row {question.sourceRow}
                      </span>
                    </div>
                  </div>

                  {question.aiGenerated && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <strong>AI-suggested answer — verify manually.</strong>

                      <p className="mt-1">
                        The selected correct answer was suggested
                        by Qwen. Check it against the original
                        examination material.
                      </p>

                      {question.explanation && (
                        <div className="mt-3 border-t border-amber-200 pt-3">
                          <strong>AI explanation:</strong>

                          <p className="mt-1 whitespace-pre-wrap">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {duplicate.exact && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <strong>Exact duplicate:</strong> This question
                      already exists in the examination or appears
                      earlier in this import.

                      <label className="mt-3 flex items-center gap-2 font-medium">
                        <input
                          type="checkbox"
                          checked={question.retainDuplicate}
                          onChange={(event) =>
                            updateQuestion(question.id, (current) => ({
                              ...current,
                              retainDuplicate: event.target.checked,
                            }))
                          }
                        />
                        I have reviewed this duplicate and intentionally
                        want to retain it.
                      </label>
                    </div>
                  )}

                  {duplicate.similar && !duplicate.exact && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <strong>Possible similar question:</strong> Review
                      this question for duplication. It may still be
                      included if it is intentionally different.
                    </div>
                  )}

                  {issues.length > 0 && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      <strong>Needs attention:</strong>

                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Question Text
                      </label>

                      <textarea
                        value={question.questionText}
                        maxLength={10000}
                        rows={3}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            questionText: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Points
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={question.points}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            points: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 sm:max-w-xs"
                      />
                    </div>

                    <div>
                      <h5 className="font-semibold text-slate-800">
                        Answer Choices
                      </h5>

                      <p className="mt-1 text-sm text-slate-500">
                        Edit the choices and select exactly one correct
                        answer.
                      </p>

                      <div className="mt-3 space-y-3">
                        {LETTERS.map((letter, choiceIndex) => (
                          <div
                            key={letter}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                          >
                            <span className="font-bold text-blue-950">
                              {letter}.
                            </span>

                            <input
                              type="text"
                              maxLength={2000}
                              value={question.choices[choiceIndex] ?? ""}
                              onChange={(event) =>
                                updateQuestion(
                                  question.id,
                                  (current) => {
                                    const nextChoices = [
                                      ...current.choices,
                                    ];

                                    nextChoices[choiceIndex] =
                                      event.target.value;

                                    return {
                                      ...current,
                                      choices: nextChoices,
                                    };
                                  }
                                )
                              }
                              placeholder={`Enter choice ${letter}`}
                              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            />

                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                              <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={
                                  question.correctIndex === choiceIndex
                                }
                                onChange={() =>
                                  updateQuestion(
                                    question.id,
                                    (current) => ({
                                      ...current,
                                      correctIndex: choiceIndex,
                                    })
                                  )
                                }
                                className="h-4 w-4 accent-blue-950"
                              />
                              Correct
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end border-t pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((current) =>
                          current.filter(
                            (item) => item.id !== question.id
                          )
                        )
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      Remove Question
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Administrator review required.</strong>

            <p className="mt-2">
              AI-generated answers are suggestions and may contain
              errors. Verify every question and correct answer against
              the original source document. This preview does not save
              questions to the database.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
