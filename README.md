# MollaDevops

Personal revision website for DevOps and MLOps tools, built with [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) and published automatically to GitHub Pages.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
mkdocs serve          # open http://127.0.0.1:8000
```

## Publish

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the site and deploys it to GitHub Pages.
One-time setup: **Repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Add a new tool

1. Create a folder: `docs/<tool>/` with an `index.md` (overview) and one Markdown file per topic.
2. Add the tool to the `nav:` section of `mkdocs.yml` (copy the Terraform block as a template).
3. Add a card for it on `docs/index.md`.
4. Commit and push — the site rebuilds automatically.

## Structure

```text
docs/
├── index.md              # Home page (tool cards)
├── assets/extra.css
└── terraform/            # One folder per tool
    ├── index.md
    └── 01-...md … 18-...md
```
