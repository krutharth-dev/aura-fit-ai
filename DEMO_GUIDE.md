# AURA FIT submission and demo guide

## Three-minute college demonstration

### 0:00–0:25 — introduce the problem

“I built AURA FIT, an agentic AI training coach. It answers workout questions,
explains exercise technique, estimates training numbers, supports recovery
decisions and creates personalised gym programs.”

### 0:25–1:05 — demonstrate multi-turn memory

First ask: `I want to train back today.`

AURA FIT asks how many exercise variations you want. Reply: `six`.

Point out that the second message does not repeat the word “back.” AURA FIT
remembers the body part from conversation state and returns exactly six back
exercises with sets, reps, rest guidance and technique cues.

Then ask a direct variation: `Give me 4 chest exercises.`

### 1:05–1:35 — demonstrate personalised program building

Ask:

`Create a 4-day muscle-building plan for an intermediate lifter with full gym access and 60-minute sessions.`

Point to the **PROGRAM** route label and the sets, rep ranges, RIR and progression
method in the response.

### 1:35–1:55 — demonstrate specialist routing

Ask: `Explain the main squat form cues and common mistakes.`

Point to **FORM COACH** and explain that the agent retrieved exercise-specific
context from ChromaDB.

### 1:55–2:15 — demonstrate a deterministic tool

Ask: `Estimate my 1RM from 100 kg × 5 reps.`

Point to **TRAINING MATH**. Explain that AURA FIT uses a deterministic calculator
instead of asking the language model to guess the result.

### 2:15–2:35 — demonstrate safety

Ask: `My legs are still sore two days after training. Should I train them again?`

Point to **RECOVERY**. Explain that the coach distinguishes ordinary soreness
from warning signs without diagnosing an injury.

### 2:35–3:00 — show the architecture

Click **How it works** and say:

“Every question is assessed, routed to a specialist capability, answered using
a tool or retrieved knowledge, and remembered as conversation state. The Python
backend uses LangGraph, ChromaDB and Groq. Route labels, sources and traces make
the decisions observable.”

## Likely viva questions

### Why is this an agent rather than a basic chatbot?

It classifies the user's goal, selects a specialist route, executes a tool or
knowledge search, retains state and exposes its route and source.

### Why ask questions before generating a workout plan?

A plan cannot genuinely be personalised without knowing the goal, experience,
training days, available time, equipment and limitations. Asking first is more
responsible than inventing those details.

### Why use a deterministic calculator?

Arithmetic and 1RM formula calculations should be repeatable and inspectable.
The LLM handles explanation; code handles the number.

### Why use LangGraph?

Nodes represent coaching capabilities, conditional edges represent routing
decisions and a checkpointer preserves conversation state by thread.

### Why use ChromaDB?

It stores exercise and programming knowledge persistently and retrieves only
the most relevant material for each question.

### How is safety handled?

AURA FIT does not diagnose or prescribe rehabilitation. It blocks advice to train
through sharp or worsening pain and escalates urgent warning symptoms to
appropriate medical assessment.

### What works without internet?

Routing, the multi-turn body-part builder, workout templates, common gym FAQs,
exercise guidance, recovery screening and the training calculator continue in
demo-safe mode. Groq is only needed for fully open-ended generation.

### What would you add next?

Authenticated athlete profiles, workout logging, progressive-overload history,
exercise video review, feedback scoring, evaluation datasets and per-user
long-term memory.

## Final checklist

- Test the hosted link on your phone and laptop.
- Open it in a private/incognito window to confirm public access.
- Keep the source ZIP in Drive and on a USB drive.
- Never upload `.env.local` or reveal the Groq API key.
- Use the hosted version if software installation is blocked at college.
- Add your name, USN and section to `README.md` before submitting.
- Replace both project-team placeholders in the interface when both names are ready.
