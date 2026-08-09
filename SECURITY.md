# Security policy

## Reporting

Please report suspected vulnerabilities privately to the repository owner rather than opening a public issue. Include the affected route, reproduction steps and impact. Do not include API keys, personal health information or other secrets.

## Supported version

Security fixes are applied to the latest `main` branch and current hosted deployment.

## Application boundaries

- AURA FIT is educational fitness software, not a medical device.
- Secrets remain server-side and `.env*` files are excluded from version control.
- Chat input and history are length-limited and sanitized.
- Sign-in and sign-up are delegated to the platform-managed ChatGPT identity flow; AURA FIT never stores passwords.
- Guest chats are isolated by an unguessable, HttpOnly, SameSite browser identifier.
- Fitness profiles are owner-scoped in D1, transfer from the current guest device only after sign-in and should contain only training-relevant limitations the user chooses to save.
- Signed-in ownership keys are derived server-side from trusted identity headers using SHA-256; raw email addresses are not written to conversation records.
- Conversation reads, renames and deletes enforce guest or account ownership server-side.
- Public chat requests use a distributed D1 rate limit with a bounded per-instance fallback.
- Users can permanently delete a saved conversation and all associated messages.
- Upstream requests are time-bounded and have deterministic fallbacks.
- The hosted application does not accept file or image uploads.
- Responses include defensive browser security headers.

If urgent symptoms are present, contact local emergency services rather than relying on this application.
