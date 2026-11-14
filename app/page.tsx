
import Image from "next/image";
import Link from "next/link";

const learningStrategies = [
  {
    number: "01",
    title: "Feynman Technique",
    description:
      "Learn a concept by explaining it in simple language as if teaching it to a child. Identify unfamiliar terms, complicated explanations, and gaps in your understanding. Return to your references, clarify the difficult parts, and repeat until you can explain the concept naturally and confidently.",
    application:
      "Explain laboratory concepts, disease mechanisms, and diagnostic procedures using your own words.",
  },
  {
    number: "02",
    title: "Pomodoro Technique",
    description:
      "Study with focused 25-minute sessions followed by 5-minute breaks. After completing four study cycles, take a longer break of approximately 15 to 30 minutes. This approach helps maintain concentration while reducing mental fatigue.",
    application:
      "Use each study cycle to concentrate on one subject, chapter, or group of practice questions.",
  },
  {
    number: "03",
    title: "Active Recall",
    description:
      "Instead of repeatedly rereading your notes, actively retrieve information from memory. Close your references and try answering questions, defining terms, or explaining concepts without looking at the material. Check your answers afterward and strengthen areas you could not recall.",
    application:
      "Answer board-style questions and practice recalling important laboratory principles without referring to notes.",
  },
  {
    number: "04",
    title: "Spaced Repetition",
    description:
      "Review information at gradually increasing intervals rather than studying everything in one sitting. A possible schedule is after one day, three days, one week, and one month. Repeated reviews help reinforce memory and reduce forgetting.",
    application:
      "Schedule regular reviews of previously studied topics, especially difficult concepts and frequently missed questions.",
  },
  {
    number: "05",
    title: "Interleaving",
    description:
      "Mix related subjects, concepts, and problem types within a study session instead of completing one topic entirely before moving to another. Switching between topics helps you recognize differences, identify underlying principles, and choose the appropriate problem-solving approach.",
    application:
      "Alternate related questions from Clinical Chemistry, Hematology, and Medical Microbiology.",
  },
  {
    number: "06",
    title: "Blurting Method",
    description:
      "Study a topic, close your notes, and write down everything you can remember without checking your references. Afterwards, compare your output with your notes. Use another color to add forgotten information and correct mistakes.",
    application:
      "Write everything you remember about a laboratory test, its principles, clinical significance, and interpretation.",
  },
  {
    number: "07",
    title: "Leitner System",
    description:
      "Organize flashcards into boxes according to how well you know each item. Review difficult cards more frequently and move correctly answered cards into boxes reviewed less often. Return incorrectly answered cards to an earlier box for more frequent practice.",
    application:
      "Create flashcards for laboratory values, microorganisms, blood cell characteristics, and important definitions.",
  },
  {
    number: "08",
    title: "SQ3R Method",
    description:
      "Follow five steps when studying written materials: Survey, Question, Read, Recite, and Review. First examine the material, formulate questions, read actively, explain what you learned from memory, and revisit the important information.",
    application:
      "Use this method when studying textbooks, lecture notes, and comprehensive review materials.",
  },
  {
    number: "09",
    title: "Cornell Note-Taking System",
    description:
      "Divide your notes into three sections. Write detailed notes on the right, important keywords and questions on the left, and a short summary at the bottom. Use the keywords to test your memory and the summary to reinforce the main concepts.",
    application:
      "Organize lecture notes, laboratory procedures, important principles, and examination topics.",
  },
  {
    number: "10",
    title: "Mind Mapping",
    description:
      "Place a central concept in the middle of a page and connect related ideas through branches. Use keywords, subtopics, and relationships to organize complex information into a visual structure that is easier to understand and remember.",
    application:
      "Map disease classifications, metabolic pathways, laboratory processes, and relationships between concepts.",
  },
  {
    number: "11",
    title: "Dual Coding",
    description:
      "Combine verbal explanations with visual representations to improve understanding. Use diagrams, charts, timelines, illustrations, and infographics alongside written explanations. Visual and verbal information can complement each other during learning.",
    application:
      "Study cell morphology, biochemical pathways, microorganisms, and diagnostic processes using diagrams and explanations together.",
  },
];

const sampleExaminations = [
  {
    number: "01",
    title: "Clinical Chemistry",
    category: "Medical Laboratory Science",
    description:
      "Explore laboratory principles, chemical analysis, clinical laboratory testing, and the interpretation of biochemical findings.",
    topics: [
      "Clinical laboratory principles",
      "Carbohydrates and metabolism",
      "Renal and liver function tests",
      "Quality control and instrumentation",
    ],
  },
  {
    number: "02",
    title: "Hematology",
    category: "Medical Laboratory Science",
    description:
      "Review blood cell morphology, hematologic disorders, blood components, and essential hematology laboratory procedures.",
    topics: [
      "Erythrocytes and leukocytes",
      "Blood cell morphology",
      "Coagulation and hemostasis",
      "Hematologic disorders",
    ],
  },
  {
    number: "03",
    title: "Medical Microbiology",
    category: "Medical Laboratory Science",
    description:
      "Study microorganisms, infectious diseases, microbial identification, and diagnostic laboratory methods.",
    topics: [
      "Bacteriology",
      "Virology and mycology",
      "Parasitology",
      "Microbial identification",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link href="/" className="shrink-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-blue-950">
              BJRC
            </h1>
            <p className="text-xs text-slate-500">
              Billy James Review Center
            </p>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-600 sm:gap-x-6"
          >
            <a href="#about" className="transition hover:text-blue-800">
              The BJRC
            </a>
            <a href="#history" className="transition hover:text-blue-800">
              History
            </a>
            <a href="#contact" className="transition hover:text-blue-800">
              Contact
            </a>
            <a href="#strategies" className="transition hover:text-blue-800">
              Learning Strategies
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-200">
              Billy James Review Center
            </p>

            <h2 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Learn with purpose.
              <span className="block text-blue-200">
                Review with confidence.
              </span>
            </h2>

            <p className="mt-6 max-w-2xl text-base leading-8 text-blue-100 sm:text-lg">
              A personal digital review platform created to make
              learning more organized, accessible, and effective.
              Practice, strengthen your knowledge, and develop
              better study habits through purposeful learning.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="#examinations"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-bold text-blue-950 transition hover:bg-blue-50"
              >
                Explore Sample Examinations
              </a>

              <a
                href="#about"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-blue-200 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Discover the BJRC
              </a>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/20 pt-7 sm:flex-row">
              <Link
                href="/student"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-bold text-blue-950 transition hover:bg-blue-100"
              >
                Log in as Student
              </Link>

              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/50 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Log in as Administrator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About BJRC */}
      <section
        id="about"
        className="scroll-mt-24 px-5 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              About Us
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
              The BJRC
            </h2>

            <p className="mt-5 text-base leading-8 text-slate-600">
              Billy James Review Center (BJRC) is a personal digital
              learning and review platform envisioned to support
              organized studying, examination preparation, and
              continuous academic improvement.
            </p>

            <p className="mt-4 text-base leading-8 text-slate-600">
              What began as a personal initiative is being developed
              into a dedicated online learning environment, with the
              possibility of welcoming and supporting other learners
              in the future.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-xl font-bold text-blue-900">
                V
              </div>

              <h3 className="text-xl font-bold text-blue-950">
                Our Vision
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                To develop an accessible and organized digital
                learning environment that encourages students to
                prepare confidently for professional examinations
                and pursue continuous academic growth.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-900">
                M
              </div>

              <h3 className="text-xl font-bold text-blue-950">
                Our Mission
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                To provide a structured platform for reviewing,
                practicing, assessing knowledge, and encouraging
                effective learning strategies that support
                independent study and continuous improvement.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How BJRC Works */}
      <section className="border-y border-slate-200 bg-white px-5 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Learning Overview
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
              How the BJRC Works
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              A learning approach built around preparation,
              practice, assessment, and improvement.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 p-6">
              <span className="text-sm font-extrabold text-blue-700">
                STEP 01
              </span>

              <h3 className="mt-4 text-xl font-bold text-blue-950">
                Organize Your Review
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Establish a structured study routine, organize
                your learning materials, and identify the
                subjects and concepts that require attention.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 p-6">
              <span className="text-sm font-extrabold text-blue-700">
                STEP 02
              </span>

              <h3 className="mt-4 text-xl font-bold text-blue-950">
                Practice and Assess
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Strengthen your understanding through practice
                examinations and board-style questions. Use
                assessments to evaluate what you have learned.
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 p-6">
              <span className="text-sm font-extrabold text-blue-700">
                STEP 03
              </span>

              <h3 className="mt-4 text-xl font-bold text-blue-950">
                Reflect and Improve
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Review your examination results, recognize
                knowledge gaps, revisit challenging topics,
                and adjust your study strategies accordingly.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Sample Examinations */}
      <section
        id="examinations"
        className="scroll-mt-24 px-5 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                Examination Preview
              </p>

              <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
                Explore Sample Examinations
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Explore selected Medical Laboratory Science
                subjects that represent areas of study in
                professional examination preparation.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800">
              Illustrative Samples
            </span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {sampleExaminations.map((exam) => (
              <article
                key={exam.number}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-extrabold text-blue-700">
                    SUBJECT {exam.number}
                  </span>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    Sample Preview
                  </span>
                </div>

                <h3 className="mt-5 text-2xl font-bold text-blue-950">
                  {exam.title}
                </h3>

                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {exam.category}
                </p>

                <p className="mt-4 leading-7 text-slate-600">
                  {exam.description}
                </p>

                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h4 className="text-sm font-bold text-slate-800">
                    Topics Covered
                  </h4>

                  <ul className="mt-3 space-y-2">
                    {exam.topics.map((topic) => (
                      <li
                        key={topic}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="mt-1 font-bold text-blue-700">
                          ✓
                        </span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-auto border-t border-slate-100 pt-5 text-xs leading-5 text-slate-400">
                  This is an illustrative subject preview,
                  not a published examination or actual
                  examination question set.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* History */}
      <section
        id="history"
        className="scroll-mt-24 border-y border-slate-200 bg-white px-5 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Our Beginning
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
              The History of BJRC
            </h2>

            <div className="mt-6 h-1 w-20 rounded-full bg-blue-800" />
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-5">
            {/* Founder Portrait */}
            <div className="lg:col-span-2">
              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-lg">
                <Image
                  src="/bjrc-founder.jpg"
                  alt="Billy James Encallado, founder of Billy James Review Center"
                  width={600}
                  height={750}
                  priority={false}
                  className="aspect-[4/5] w-full object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 400px"
                />

                <div className="p-5 text-center">
                  <h3 className="text-xl font-extrabold text-blue-950">
                    Billy James Encallado
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-blue-800">
                    Founder of BJRC
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Medical Laboratory Science Graduate
                  </p>
                </div>
              </div>
            </div>

            {/* Founder Story */}
            <div className="space-y-5 lg:col-span-3">
              <p className="leading-8 text-slate-600">
                BJRC began with a personal vision. Its founder,
                Billy James Encallado, is a Medical Laboratory
                Science graduate preparing for the Medical
                Technologist Licensure Examination (MTLE).
              </p>

              <p className="leading-8 text-slate-600">
                During his preparation, he envisioned creating
                a personal review platform where he could
                organize study materials, practice answering
                board-style questions, evaluate his knowledge,
                and monitor his progress throughout his review.
              </p>

              <p className="leading-8 text-slate-600">
                This idea led to the development of Billy James
                Review Center (BJRC), a platform designed to
                make the review experience more organized,
                accessible, and efficient.
              </p>

              <p className="leading-8 text-slate-600">
                What started as a personal initiative is an
                opportunity to build a dedicated digital space
                for learning and examination preparation.
                With continued development, BJRC may grow
                into a platform that can also support other
                students pursuing their academic and
                professional goals.
              </p>

              <p className="border-l-4 border-blue-700 py-2 pl-5 font-semibold leading-7 text-blue-950">
                Built from a personal learning journey,
                with a vision of making purposeful review
                more accessible to others.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Strategies */}
      <section
        id="strategies"
        className="scroll-mt-24 px-5 py-16 sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Study Smarter
            </p>

            <h2 className="mt-3 text-3xl font-extrabold text-blue-950 sm:text-4xl">
              11 Effective Learning Strategies
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Effective studying involves more than spending
              long hours reading. These strategies offer
              practical ways to improve concentration,
              understanding, memory, and knowledge retention.
              Choose the methods that best support your
              individual learning needs.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {learningStrategies.map((strategy) => (
              <article
                key={strategy.number}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-sm font-extrabold text-blue-900">
                    {strategy.number}
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-blue-950">
                      {strategy.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {strategy.description}
                    </p>

                    <div className="mt-4 rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-900">
                        How to Apply It
                      </p>

                      <p className="mt-2 text-sm leading-6 text-blue-900">
                        {strategy.application}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="scroll-mt-24 bg-blue-950 px-5 py-16 text-white sm:px-6 sm:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-300">
              Get in Touch
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Contact BJRC
            </h2>

            <p className="mt-5 leading-8 text-blue-100">
              For questions, suggestions, or inquiries
              concerning the Billy James Review Center,
              you may reach us through our official
              contact email.
            </p>

            <div className="mt-8 rounded-xl border border-white/20 bg-white/10 p-6">
              <p className="text-sm font-semibold text-blue-200">
                Official Email Address
              </p>

              <a
                href="mailto:admin.bjrc@gmail.com"
                className="mt-3 inline-block break-all text-lg font-bold text-white underline decoration-blue-300 underline-offset-4 transition hover:text-blue-200 sm:text-xl"
              >
                admin.bjrc@gmail.com
              </a>

              <p className="mt-3 text-sm text-blue-200">
                Click the email address to send us a message.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-5 py-8 text-white sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-extrabold tracking-wide">
              BJRC
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Billy James Review Center
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <a href="#about" className="transition hover:text-white">
              The BJRC
            </a>
            <a href="#history" className="transition hover:text-white">
              History
            </a>
            <a href="#strategies" className="transition hover:text-white">
              Learning Strategies
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
          </div>
        </div>

        <div className="mx-auto mt-7 max-w-7xl border-t border-slate-800 pt-5 text-center text-xs text-slate-500">
          © 2026 Billy James Review Center. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
