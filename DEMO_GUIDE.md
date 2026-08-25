# AURA FIT demonstration guide

## Three-minute hosted demo

### 0:00–0:25 — introduce the problem

“AURA FIT is an open-source, safety-aware AI fitness and wellness coach. It builds constrained workout programs and answers broad questions about training, technique, sports nutrition, supplements, recovery and workout-related health while exposing how each request was handled.”

### 0:25–1:00 — show memory and accounts

Choose **Train a body part**, select **Chest** from the suggested replies, then choose **5**. Explain that the final reply does not repeat “chest,” yet the coach uses recent conversation state and returns exactly five chest exercises. The same guided flow works for every listed muscle group rather than being fixed to one workout. Expand **View agent trace**.

Use **Sign in / Sign up** to create a demo account. Explain that the public site uses first-party email/password accounts in Cloudflare D1: passwords are salted and hashed, session tokens are stored as hashes, and the browser receives an HttpOnly session cookie. Public sign-ups are never administrators by default.

Then click **New conversation**, choose another coaching workflow and switch between both saved chats in the sidebar. Use search to find one, then reload the page to demonstrate durable D1-backed history. Guest conversations remain temporary and are not written to durable history.

### 1:00–1:35 — show constrained planning

Ask `Create a 4-day muscle-building plan for an intermediate lifter with full gym access, 60-minute sessions and no limitations.` Point out the exact day count, profile summary, sets, effort and progression. Mention that missing profile details trigger a question instead of guessed personalization.

### 1:35–2:00 — show a deterministic tool

Ask `Estimate my 1RM from 100 kg × 5 reps.` Explain that repeatable calculations are performed in code, not guessed by a language model.

### 2:00–2:25 — show safety priority

Ask `I have chest pain, but how long should I rest between sets?` Explain that urgent safety guidance wins even when the same message contains a normal gym question.

Then briefly ask `How much protein should I eat for muscle gain?` and `Could my swollen ankle be a workout injury?` Point out the dedicated **NUTRITION** and **HEALTH GUIDE** routes. Explain that AURA FIT can personalise educational guidance but will not diagnose, prescribe medication or create a medical diet.

### 2:25–3:00 — explain the architecture honestly

Open **How it works**. Point out the MIT-licensed open-source repository, completed project-team details and repository link. Say: “The public app runs on Cloudflare Workers with first-party account sessions and D1-backed history, while the coaching layer uses specialist TypeScript routes with deterministic fallbacks. The full local version adds FastAPI, LangGraph, ChromaDB and optional Groq generation. Both preserve safety escalation and return the chosen route, source and execution trace.”

## Full-agent local demo

Run `npm run dev:full`, then repeat the form prompt `Explain squat form`. Show the FastAPI `/health` and `/docs` routes if asked about backend operation.

## Likely viva questions

**Why is it agentic?** It assesses intent, applies safety policy, routes to a specialist capability, runs a deterministic tool or knowledge retrieval, retains session state and exposes a trace.

**Why deterministic programs?** Day count, equipment and session length are product constraints. A validated scaffold prevents a language model from silently changing them.

**Why LangGraph?** Nodes model specialist capabilities, conditional edges represent routing and a checkpointer preserves thread state.

**Why ChromaDB?** It stores fitness material locally and retrieves relevant context rather than injecting the full knowledge base into every prompt.

**What works offline?** Routing, body-part workouts, program scaffolds, common gym questions, form guidance, recovery screening, nutrition and supplement fundamentals, non-diagnostic health guidance and calculations.

**Free-text workout route:** Ask `How should I combine running with leg training?`, `What should I do when my bench press plateaus?` or `What can replace a barbell deadlift at home?`. The evaluator should see practical guidance from the `training` route even when the live model is unavailable.

**Adjust an existing plan:** Immediately after the constrained plan, ask `Make that plan 30 minutes, replace Romanian deadlifts with hip thrusts and add running twice weekly.` The evaluator should see **PLAN UPDATED**, a concise change summary and the revised plan without re-entering the profile.

For extended assessment, run the 50 prompts in `docs/EVALUATOR_PROMPTS.md`.

**Is it open source?** Yes. The public repository includes an MIT License, so the code can be used, modified and distributed while retaining the licence notice.

**How is safety handled?** The coach does not diagnose or prescribe rehabilitation. It refuses to guess around reported limitations and escalates urgent symptoms ahead of other intents.

## Final check

- Open the public link on phone and laptop in a private/incognito window.
- Create a fresh account, sign out, sign back in and confirm the same saved history appears.
- Refresh `/signin`, `/signup`, `/privacy` and the main application directly to verify routing.
- Run every demo interaction above, including the guided body-part choices.
- Confirm the requested plan contains the exact day count.
- Expand at least one agent trace.
- Confirm guest mode works without durable history.
- Confirm both team members, corrected USNs, section CSE-B and the repository link render under **How it works**.
- Confirm the nutrition and injury starters display and return the correct specialist routes.
- Confirm the repository contains `LICENSE` and describes the medical and nutrition safety boundaries.
- Keep `.env.local` private.
- Keep the repository and hosted link ready as separate evidence.
