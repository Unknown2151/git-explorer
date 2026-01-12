#!/usr/bin/env bash
set -euo pipefail

# Simple smoke test for partial-hunk staging
# Creates a temporary git repo, makes a commit, modifies a file, extracts the first hunk and tries to stage it.

TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Using temp dir: $TMP"
cd "$TMP"

git init -q

# create initial file
cat > file.txt <<'EOF'
line1
line2
line3
line4
line5
EOF

git add file.txt
git commit -q -m "initial commit"

# modify file (introduce two hunks)
awk 'NR==2{$0="changed-line2"} NR==5{$0="changed-line5"} {print}' file.txt > file.txt.tmp && mv file.txt.tmp file.txt

# show working diff
echo "Working diff:"
git --no-pager diff -- file.txt

# produce full patch
git --no-pager diff -- file.txt > full.patch

# extract first hunk (starting at first @@ up to next @@ or EOF)
awk '/^@@/ { if (h==0) {h=1; print; next} else {exit} } h==1 {print}' full.patch > hunk1_body.patch

# assemble a minimal patch with headers
{
  echo "diff --git a/file.txt b/file.txt"
  echo "--- a/file.txt"
  echo "+++ b/file.txt"
  cat hunk1_body.patch
} > hunk1.patch

# show the patch
echo "Generated hunk patch:" 
cat hunk1.patch

# If the target file isn't present in the index (untracked), mark intent-to-add so apply --cached can operate
if ! git ls-files --error-unmatch -- file.txt >/dev/null 2>&1; then
  echo "File not in index — marking intent-to-add"
  git add --intent-to-add -- file.txt || true
fi

# dry-run check against index (cached)
if git apply --check --cached -p1 --unidiff-zero - < hunk1.patch; then
  echo "git apply --check --cached succeeded"
else
  echo "git apply --check --cached failed" >&2
  exit 2
fi

# apply to index
git apply --cached -p1 --unidiff-zero - < hunk1.patch

echo "Staged changes (git diff --staged):"
git --no-pager diff --staged

echo "Smoke test completed successfully"
