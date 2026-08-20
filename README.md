# AWE A2Z

AWE A2Z is a public, searchable archive of ideas and thoughts.

## Core model

- Anyone can browse the archive.
- Anyone can submit a **complete idea** from the website UI.
- Submissions are anonymous by design.
- Every published idea receives a unique ID and its own public webpage.
- Contributions are intended to be freely reusable by everyone.
- **AWE does not claim ownership of ideas published in A2Z.**
- The public archive is read directly from `AWEArchiveDB/a2zdb.json` via the GitHub raw URL.

## Database

Canonical database:
`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2zdb.json`

All normal browsing, search, categories, counters and idea pages are **static** and read this raw JSON directly. They do not call a Cloudflare Function.

## Cloudflare Pages

The frontend is static HTML/CSS/JS. A tiny Pages Function is used **only when the user presses Publish**. This keeps normal site traffic independent of the publishing Function.

Create a Cloudflare Pages project from this repository and add this **secret**:

`GITHUB_TOKEN` — a GitHub token with only the minimum required permission to update `ARARAT33/AWEArchiveDB`.

The function lives at `functions/api/ideas.js` and handles `POST /api/ideas`.

## Rate limiting and publishing capacity

A2Z enforces a hard application publishing cap of **100,000 published ideas per UTC day**. The static homepage calculates today's published count directly from the raw database and shows the live count and remaining capacity. When 100,000 is reached, the publishing UI closes and the Function rejects further publications until the next UTC day.

Abuse controls are also enforced at the Cloudflare Function layer:

- **10 ideas per IP per rolling hour bucket**;
- **50 ideas per IP per UTC day**.

For these IP limits, create a Cloudflare KV namespace and bind it to the Function as `RATE_LIMIT_KV`. The binding configuration is shown in `wrangler.toml`. If the KV binding is absent, the GitHub publishing function still works, but IP rate limiting is not enforced; for production, configure the KV binding.

### Important distinction

The 100,000/day number above is the **A2Z application publishing cap**. It is intentionally aligned with the Free-plan Workers/Pages Functions request budget discussed for this architecture, but it is not a claim that Cloudflare will always expose exactly 100,000 requests/day under every current product/plan configuration. The Cloudflare dashboard is the authoritative source for the account's actual service quota.

## Publishing flow

1. User writes the complete idea.
2. The browser sends one publish request to `/api/ideas`.
3. Cloudflare validates the request and rate limits.
4. The Function reads the current `a2zdb.json` through GitHub API.
5. It appends the new anonymous idea and commits the updated JSON through GitHub API.
6. The Function returns the new ID.
7. The user is sent to their permanent public idea page.

The GitHub token never appears in browser JavaScript.

## Individual idea pages

Every idea is available at:

`idea.html?id=<ID>`

The page shows the complete idea, its ID, the public-use/no-AWE-ownership statement, and a removal-report action.

## Removal reports

If someone believes a specific idea should be removed because of copyright or other rights issues, unlawful material, private information, malicious content, or another valid reason, they should email the exact ID and the reason to:

`araratavetisyan777999@gmail.com`

AWE reviews the report. A valid problem results in removal; an unsubstantiated report does not automatically remove the idea.

## Idea Lab

`idea-lab.html` provides thousands of combinatorial idea-generation paths from domains, problem lenses, creative moves and audiences. It is a creative prompt engine, not a claim that generated directions are original or owned by AWE.

## Required database shape

The canonical `a2zdb.json` should be a JSON array:

```json
[
  {
    "id": "1",
    "title": "Example idea",
    "idea": "The complete idea text.",
    "category": "Technology",
    "author": "Anonymous",
    "anonymous": true,
    "created": "2026-08-21T00:00:00.000Z",
    "public_domain": true,
    "ownership": "AWE does not claim ownership of this idea"
  }
]
```

## Content principle

A2Z is an idea archive, not a copyright-registration service. Contributors confirm that their submission is original and release it for free public use. The platform should not be used to submit copied books, articles, proprietary code, personal data, illegal material, or content the contributor does not have the right to publish.
