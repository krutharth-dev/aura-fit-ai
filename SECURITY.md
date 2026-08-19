# Security policy

## Reporting

Please report suspected vulnerabilities privately to the repository owner rather than opening a public issue. Include the affected route, reproduction steps and impact. Do not include API keys, personal health information or other secrets.

## Supported version

Security fixes are applied to the latest `main` branch and current hosted deployment.

## Application boundaries

- AURA FIT is educational fitness and wellness software, not a medical device, diagnostic service or clinical decision-support system.
- Health and injury responses may explain possibilities, warning signs and next steps but must not claim a diagnosis, prescribe medication or replace an examination.
- Nutrition responses may adapt general sports-nutrition guidance to user goals and preferences but must not prescribe a medical diet, override clinician-directed restrictions or support dangerous weight loss or disordered eating.
- Urgent symptoms override every other intent and route to immediate local emergency guidance.
- Secrets remain server-side and `.env*` files are excluded from version control.
- Chat input and history are length-limited and sanitized.
- Sign-in and sign-up are delegated to the platform-managed ChatGPT identity flow; AURA FIT never stores passwords.
- Guest chats are temporary and are never written to durable conversation history.
- Fitness profiles and durable history require sign-in and are owner-scoped in D1; profiles should contain only training-relevant limitations the user chooses to save.
- Signed-in ownership keys are derived server-side from trusted identity headers using SHA-256; raw email addresses are not written to conversation records.
- Conversation creation, reads, renames and deletes require authentication and enforce account ownership server-side.
- Privacy-safe analytics exclude chat text, email addresses, ownership keys, IP addresses and fitness details, and are retained for no more than 30 days.
- Error monitoring stores sanitised operational codes rather than exception messages or user content.
- Public chat requests use a distributed D1 rate limit with a bounded per-instance fallback.
- Users can permanently delete a saved conversation and all associated messages.
- Upstream requests are time-bounded and have deterministic fallbacks.
- The hosted application does not accept file or image uploads.
- Responses include defensive browser security headers.

If urgent symptoms are present, contact local emergency services rather than relying on this application.

## Open-source boundary

The source code is available under the MIT License. Forks and deployments are responsible for their own clinical, privacy, security and regulatory review. Removing safety guardrails or presenting the software as medical diagnosis is outside the intended use of AURA FIT.
