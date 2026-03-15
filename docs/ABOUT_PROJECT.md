## Inspiration

Concepta was inspired by a problem we kept seeing: learners often leave AI study sessions feeling more confident, but not necessarily more correct. Most tools can generate fluent explanations, yet very few help students identify misconceptions, practice deliberately, and verify whether understanding actually improved.

We wanted to build a learning loop that feels practical and accountable, especially for hard STEM topics where misunderstandings persist.

## What it does

Concepta is an evidence-backed learning workspace with four connected experiences:

1. Learning: generates explanation, visual, simulation, and verification outputs from one prompt.
2. Test: runs adaptive quizzes with confidence tracking and misconception-aware feedback.
3. Teach: supports guided instructional practice with AI-assisted teaching flow.
4. Metrics: shows pretest/posttest gains, topic-level trends, and exportable impact reports.

It also includes source ingestion for links and files, a mistake notebook for targeted remediation, and reliability fallbacks when model quotas or transient errors occur.

## How we built it

We built Concepta using React, TypeScript, and Vite, then integrated Gemini models for multi-modal generation.

1. We used a high-capability model path for reasoning-heavy outputs and a fast fallback path for resiliency.
2. We added an image generation pipeline plus SVG fallback behavior when image quota is exhausted.
3. We implemented retrieval-backed evidence injection, but only when the user prompt actually matches relevant concepts.
4. We designed session-based state management with local persistence for mistakes and quiz history.
5. We added export flows so judges or educators can download JSON and CSV artifacts.

For learning impact, we track improvement with:

$$
\Delta_{gain} = \overline{score}_{post} - \overline{score}_{pre}
$$

and confidence calibration with:

$$
Calibration = 1 - \left| confidence - correctness \right|
$$

## Challenges we ran into

The biggest challenges were reliability and correctness, not just UI polish:

1. Preventing unrelated domain context from leaking into generic prompts.
2. Handling image model quota errors without breaking user flow.
3. Ensuring every visible action button was actually wired to working logic.
4. Keeping dark mode and card styling consistent across all pages.
5. Preserving partial success when one generation branch fails.

Each issue required both technical fixes and product decisions about graceful degradation.

## Accomplishments that we're proud of

1. Built a full end-to-end learning loop, not just a single chat response surface.
2. Added measurable outcomes with pre/post gains, confidence signals, and topic analytics.
3. Implemented robust fallback behavior for quota and model failures.
4. Delivered a polished multi-view UX with responsive layout and consistent styling.
5. Produced judge-ready exports and documentation for demo and submission.

## What we learned

1. Educational AI quality depends on feedback loops more than one-shot answers.
2. Reliability features are core product features, not optional engineering extras.
3. Measurement changes decision-making by making progress visible.
4. Prompt design and orchestration are as important as model selection.
5. Trust improves when answers are paired with transparent evidence.

## What's next for Concepta

1. Build a backend service layer (API gateway plus worker jobs) to move critical AI workflows off the client.
2. Integrate a database for durable storage of users, sessions, quiz attempts, mistakes, and learning analytics.
3. Add true YouTube and video summarization with transcript fetch, chunking, timeline key points, and citation-linked summaries.
4. Expand retrieval coverage with indexed evidence stores and semantic search over trusted learning resources.
5. Introduce instructor dashboards for cohort-level progress tracking and intervention alerts.
6. Add multilingual learning and assessment support with localized explanations and quizzes.
7. Improve simulation templates for broader STEM domains and level-based scaffolding.
