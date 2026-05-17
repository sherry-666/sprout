# Sprout — Claude Code Rules

## Doc Sync (Mandatory)

**Before finishing any task**, check whether your changes affect the PRD or TDD:

| Type of change | Update required |
|---|---|
| New user-facing feature or behaviour | `doc/prd.md` |
| New/changed API endpoint | `doc/tdd.md` — Section 5 |
| New/changed data model field or collection | `doc/tdd.md` — Section 4 |
| New dependency, env var, or deployment detail | `doc/tdd.md` — Sections 2, 9 |
| New frontend convention (CSS class, pattern) | `doc/tdd.md` — Section 8 |
| Removed or renamed anything user-visible | Both docs |
| Intentionally incomplete work (stubbed UI, `null` fields, missing backend) | Add a `*(TODO)*` section to both docs explaining what is missing and why |

If a code change is not reflected in the docs, the task is **not done**.

## What counts as "reflected"

- PRD: describes *what* the feature does and *why*, from a user perspective. Update journeys if flows change.
- TDD: describes *how* it works — data shape, endpoint contract, known quirks, constraints. Be specific enough that a new engineer could implement it from the doc alone.

## Known Quirks to Keep in Mind

- `_id` and `institution_id` fields are stored as **strings** in MongoDB (Pydantic v2 PyObjectId serialises to string on `model_dump()`). Never query with `ObjectId(id)` — always use the plain string.
- `uvicorn --reload` does **not** watch `.env` changes. Restart the server after editing `.env`.
- The SendGrid `sendgrid` package must be installed in the venv (`pip install sendgrid`). It is in `requirements.txt` but may not be in the venv if dependencies weren't freshly installed.
