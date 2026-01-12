Smoke test scripts

- `smoke_hunk_test.sh`: Creates a temporary git repository, makes changes, extracts a single hunk, and attempts to apply it to the index via `git apply --check --cached` and `git apply --cached`.

To run locally (bash):

```bash
./scripts/smoke_hunk_test.sh
```

The GitHub Actions workflow `.github/workflows/smoke.yml` will also run this script on push/PR.
