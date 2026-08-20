# AWE A2Z

AWE A2Z is a public, searchable archive of ideas and thoughts.

## Core model

- Anyone can browse the archive.
- Anyone can submit a **complete idea** from the website UI.
- Submissions are anonymous by design.
- Every published idea receives a unique ID and its own public webpage.
- Contributions are intended to be freely reusable by everyone.
- **AWE does not claim ownership of ideas published in A2Z.**
- The public archive is read from `AWEArchiveDB/a2zdb.json`.

## Database

Canonical database:
`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2zdb.json`

## Cloudflare Pages

The frontend is static HTML/CSS/JS. A tiny Pages Function is used only for secure writes because a GitHub token must never be shipped to browser JavaScript.

Create a Cloudflare Pages project from this repository and add this **secret**:

`GITHUB_TOKEN` — a GitHub token with only the minimum required permission to update `ARARAT33/AWEArchiveDB`.

The function lives at `functions/api/ideas.js` and receives `POST /api/ideas`.

## Publishing

The user writes the complete idea, selects a category, optionally stays anonymous, accepts the public-use confirmation, and publishes. The function assigns the next numeric ID, appends the record to `a2zdb.json`, commits it through the GitHub API, and returns the ID.

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
    "ownership": "AWE claims no ownership of this idea"
  }
]
```

## Content principle

A2Z is an idea archive, not a copyright-registration service. Contributors confirm that their submission is original and release it for free public use. The platform should not be used to submit copied books, articles, proprietary code, personal data, illegal material, or content the contributor does not have the right to publish.
