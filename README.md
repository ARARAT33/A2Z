# AWE A2Z

AWE A2Z is a public, searchable archive of ideas and thoughts.

## Core model

- Anyone can browse the archive.
- Anyone can submit an original idea from the website UI.
- Submissions are anonymous.
- Contributions are intended to be freely reusable by everyone.
- The public archive is read from `AWEArchiveDB/a2zdb.json`.

## Database

Canonical database:
`https://raw.githubusercontent.com/ARARAT33/AWEArchiveDB/refs/heads/main/a2zdb.json`

## Cloudflare Pages

The frontend is static HTML/CSS/JS. A tiny Pages Function is used only for secure writes because a GitHub token must never be shipped to browser JavaScript.

Create a Cloudflare Pages project from this repository and add this secret/environment variable:

`GITHUB_TOKEN` — a GitHub token with the minimum required permission to update `ARARAT33/AWEArchiveDB`.

The function lives at `functions/api/ideas.js` and receives `POST /api/ideas`.

### Required database shape

The canonical `a2zdb.json` should be a JSON array:

```json
[
  {
    "id": "unique-id",
    "title": "Example idea",
    "idea": "The idea text.",
    "category": "Technology",
    "author": "Anonymous",
    "created": "2026-08-21T00:00:00.000Z"
  }
]
```

## Content principle

A2Z is an idea archive, not a copyright-registration service. Contributors confirm that their submission is original and release it for free public use. The platform should not be used to submit copied books, articles, proprietary code, personal data, illegal material, or content the contributor does not have the right to publish.
