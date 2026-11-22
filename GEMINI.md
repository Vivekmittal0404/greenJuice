# Project Rules & Invariants

## Production Deployment Context
- Production Domain: https://www.juicewala.shop/

## Strict Text Preservation Rule
- **NEVER change or alter any text written on the website**: Do NOT modify, replace, rewrite, translate, or remove any existing text, headlines, product titles, subtitles, descriptions, badges, ingredients, button labels, or copywriting on the website without explicit user instruction.
- **Preserve Copy Invariants**: When implementing new features, fixing bugs, or updating component logic, keep all existing user-facing strings and copy 100% intact.

## Communication Language Policy
- **Language Requirement**: Always respond strictly in **Hinglish** (Hindi written using English/Roman alphabet) or **English**.
- **No Devanagari / Pure Hindi**: Never respond using pure Hindi or Devanagari script.
- **Scope**: Applies across all explanations, summaries, status updates, queries, and replies.

## Strict Git Commit & Push Policy (Explicit Request Only)
- **No Automatic Git Commits**: NEVER execute `git commit` unless the user explicitly commands it in their message (e.g., "commit this", "please commit with message...").
- **No Automatic Git Push**: NEVER execute `git push` or publish commits to GitHub / remote branches unless the user explicitly instructs to push (e.g., "push to github", "run git push").
- **Local Changes Workflow**: After modifying files or passing tests, leave changes in the local working directory. Inform the user and await their explicit command before staging, committing, or pushing.
