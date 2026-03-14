# Concepta

Concepta is an evidence-backed learning intervention workspace focused on one specific learner wall:

Students in introductory thermodynamics struggle with core misconceptions (entropy, spontaneity, heat vs temperature, equilibrium), disengage, and fail to self-correct quickly.

## Why this matters

Many AI learning tools generate explanations but do not measure whether understanding actually improves. Concepta adds diagnostics, remediation, and measurable outcomes to answer one key question:

Would this help a struggling learner today?

## Core capabilities

- AI tutoring flow: explanation, visual generation, simulation, and verification
- Public-evidence grounding via retrieval-backed misconception dataset and linked sources
- Diagnostic quiz mode with misconception attribution per question
- Mistake notebook with targeted remediation cards and source links
- Assessment report after each quiz (accuracy, misconceptions, strengths, recommendations)
- Pretest/posttest tracking and topic-level gains
- Confidence calibration tracking (confidence vs correctness)
- Judge-ready exports:
  - JSON impact report
  - CSV attempts dataset

## Tech stack

- React + TypeScript + Vite
- Gemini API via @google/genai
- Tailwind utility classes
- Local storage persistence for quiz history and mistakes

## Project structure

- App shell and state orchestration: `App.tsx`
- AI generation and verification: `services/geminiService.ts`
- Evidence retrieval: `services/learningRetrievalService.ts`
- Misconception dataset: `data/misconceptionDataset.ts`
- Assessment flow: `components/TestSection.tsx`
- Metrics and exports: `components/MetricsSection.tsx`
- Verification evidence panel: `components/VerifySection.tsx`

## Run locally

Prerequisites:
- Node.js 18+

1. Install dependencies:
   - `npm install --legacy-peer-deps`
2. Configure environment:
   - set `GEMINI_API_KEY` in `.env.local`
3. Start dev server:
   - `npm run dev`
4. Build for production:
   - `npm run build`

## How to demo

Use the script at `docs/DEMO_SCRIPT.md`.

Recommended flow:
1. Ask a thermodynamics question in Learning.
2. Show Verification evidence sources.
3. Run a Pretest in Test mode.
4. Intentionally miss one question to trigger remediation.
5. Finish and show Assessment Report.
6. Save and open Metrics.
7. Show topic-level gains, timeline, confidence calibration.
8. Export JSON + CSV artifacts.

## How impact is measured

- Accuracy per attempt: `score / totalQuestions`
- Pre/post gain: average posttest accuracy minus average pretest accuracy
- Topic-level gain: per-topic pre/post delta
- Confidence calibration: alignment between self-reported confidence and correctness
- Misconception coverage: categories encountered in mistakes

## Public evidence used

Concepta includes retrieval-linked evidence references from open educational and institutional sources, such as:
- OpenStax
- LibreTexts
- PhET
- NIST and institutional domains

## Submission artifacts

Use these files to finalize submission packaging:
- `docs/SUBMISSION_CHECKLIST.md`
- `docs/DEMO_SCRIPT.md`

From the app, export:
- JSON report from Metrics (Export JSON)
- CSV attempts dataset from Metrics (Export CSV)

