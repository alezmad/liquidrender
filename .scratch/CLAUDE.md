# Scratch Folder - Temporary Experiments

## Purpose

This folder is for temporary experiments, throwaway code, and quick tests during development.

## Rules

- **Safe to delete** - Everything here is disposable
- **Never reference in production** - No imports from `.scratch/` in actual code
- **No preservation needed** - Git can ignore this folder
- **Quick iteration** - Use for testing ideas before committing to real implementation

## Example Uses

- Sample Excel/CSV/JSON files for testing parsers
- Quick schema drafts
- API response snapshots
- Component prototypes
- Debug outputs

## For AI Agents

You may read and write files here freely. This is a sandbox for experimentation. However:
- Never suggest importing from `.scratch/` into production code
- Never treat files here as source of truth
- Assume everything here is temporary and experimental
