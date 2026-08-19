# AURA FIT demonstration guide

## Three-minute hosted demo

### 0:00–0:25 — introduce the problem

“AURA FIT is an open-source, safety-aware AI fitness and wellness coach. It builds constrained workout programs and answers broad questions about training, technique, sports nutrition, supplements, recovery and workout-related health while exposing how each request was handled.”

### 0:25–1:00 — show memory

Choose **Train a body part**, select **Chest** from the suggested replies, then choose **5**. Explain that the final reply does not repeat “chest,” yet the coach uses recent conversation state and returns exactly five chest exercises. The same guided flow works for every listed muscle group rather than being fixed to one workout. Expand **View agent trace**.

Then click **New conversation**, choose another coaching workflow and switch between both saved chats in the sidebar. Use search to find one, then reload the page to demonstrate durable D1-backed history.

Show **Sign in / Sign up**. Explain that AURA FIT delegates authentication to ChatGPT rather than storing passwords. Guest chats are browser-scoped and are attached to the account when that guest signs in; signed-in chats then sync across devices.

### 1:00–1:35 — show constrained planning

Ask `Create a 4-day muscle-building plan for an intermediate lifter with full gym access, 60-minute sessions and no limitations.` Point out the exact day count, profile summary, sets, effort and progression. Mention that missing profile details trigger a question instead of guessed personalization.

### 1:35–2:00 — show a deterministic tool

Ask `Estimate my 1RM from 100 kg × 5 reps.` Explain that repeatable calculations are performed in code, not guessed by a language model.

### 2:00–2:25 — show safety priority

Ask `I have chest pain, but how long should I rest between sets?` Explain that urgent safety guidance wins even when the same message contains a normal gym question.

Then briefly ask `How much protein should I eat for muscle gain?` and `Could my swollen ankle be a workout injury?` Point out the dedicated **NUTRITION** and **HEALTH GUIDE** routes. Explain that AURA FIT can personalise educational guidance but will not diagnose, prescribe medication or create a medical diet.

### 2:25–3:00 — explain the architecture honestly

Open **How it works**. Point out the MIT-licensed open-source repository, completed project-team details and repository link. Say: “The public app uses specialist TypeScript routes, managed identity and D1 account history so it remains reliable without exposing secrets. The full local version adds FastAPI, LangGraph, ChromaDB and optional Groq generation. Both preserve safety escalation and return the chosen route, source and execution trace.”

## Full-agent local demo

Run `npm run dev:full`, then repeat the form prompt `Explain squat form`. Show the FastAPI `/health` and `/docs` routes if asked about backend operation.

## Likely viva questions

**Why is it agentic?** It assesses intent, applies safety policy, routes to a specialist capability, runs a deterministic tool or knowledge retrieval, retains session state and exposes a trace.

**Why deterministic programs?** Day count, equipment and session length are product constraints. A validated scaffold prevents a language model from silently changing them.

**Why LangGraph?** Nodes model specialist capabilities, conditional edges represent routing and a checkpointer preserves thread state.

**Why ChromaDB?** It stores fitness material locally and retrieves relevant context rather than injecting the full knowledge base into every prompt.

**What works offline?** Routing, body-part workouts, program scaffolds, common gym questions, form guidance, recovery screening, nutrition and supplement fundamentals, non-diagnostic health guidance and calculations.

**Is it open source?** Yes. The public repository includes an MIT License, so the code can be used, modified and distributed while retaining the licence notice.

**How is safety handled?** The coach does not diagnose or prescribe rehabilitation. It refuses to guess around reported limitations and escalates urgent symptoms ahead of other intents.

## Final check

- Open the public link on phone and laptop.
- Run every demo interaction above, including the guided body-part choices.
- Confirm the requested plan contains the exact day count.
- Expand at least one agent trace.
- Confirm guest mode and the managed sign-in/sign-up entry point both render.
- Confirm both team members, corrected USNs, section CSE-B and the repository link render under **How it works**.
- Confirm the nutrition and injury starters display and return the correct specialist routes.
- Confirm the repository contains `LICENSE` and describes the medical and nutrition safety boundaries.
- Keep `.env.local` private.
- Keep the repository and hosted link ready as separate evidence.
