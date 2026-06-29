# This script will help keep the GitHub Pages fresh.
# It makes some assumptions about the local layout of repos and directories,
# which are hopefuly clear enough from the logic.

from pathlib import Path
import subprocess
import tempfile

# change these if the repo names on local disk change
# (and we assume that both repos are side-by-side)
FEELINGS_DIR_NAME = 'feelings'

# these should change less often or never
THIS_SCRIPT = __file__
THIS_REPO_DIR = (Path(THIS_SCRIPT) / '..' / '..').resolve()
CONTAINING_DIR = THIS_REPO_DIR / '..'
FEELINGS_REPO_DIR = (CONTAINING_DIR / FEELINGS_DIR_NAME).resolve()
FEELINGS_SRC_DIR = FEELINGS_REPO_DIR / 'feelings'

FEELINGS_TARGET_DIR = THIS_REPO_DIR / 'feelings'

# checks to make sure we've got the structures we expect
assert THIS_REPO_DIR.is_dir()
assert FEELINGS_SRC_DIR.is_dir()

print(f"{THIS_REPO_DIR=}")
print(f"{FEELINGS_SRC_DIR=}")

def run_git(work_dir, *args):
    """Run a Git subcommand, return its stdout if it's successful, raise if it exits non-zero"""
    proc = subprocess.run(
        ["git", *args],
        capture_output=True,
        text=True,
        cwd=work_dir,
    )
    if proc.returncode != 0:
        raise SystemError(proc)
    return proc.stdout

dirty = False if run_git(THIS_REPO_DIR, "status", "--short").strip() == "" else True
if dirty:
    print("ERROR: 🔧 Repo has uncommitted changes; commit or stash them first.")
    raise SystemExit(1)

feelings_branch = run_git(FEELINGS_REPO_DIR, "symbolic-ref", "--short", "HEAD").strip()
if feelings_branch != 'main':
    print("WARNING: ❤️ Feelings repo is not at main")
    print(f"It's at `{feelings_branch}`")
    input("Ctrl-C to cancel, otherwise press Enter to accept...")

feelings_id = run_git(FEELINGS_REPO_DIR, "rev-parse", "HEAD").strip()

input("Last chance to bail (Ctrl-C to stop, Enter to go)...")

print("Copying Feelings")
with tempfile.TemporaryDirectory() as tmpdir:
    FEELINGS_TARGET_DIR.replace(tmpdir)
    FEELINGS_SRC_DIR.copy(FEELINGS_TARGET_DIR)

has_changes = False if run_git(THIS_REPO_DIR, "status", "--short").strip() == "" else True

if not has_changes:
    print("No changes, so no commit needed.")

print("Preparing commit")
run_git(FEELINGS_TARGET_DIR, "add", ".")

commit_msg = f"""Updating Feelings search

moodswingsdata/feelings
id {feelings_id}
ref {feelings_branch}
"""
print("Commiting changes")
print("-" * 40)
print(commit_msg)
print("-" * 40)
run_git(THIS_REPO_DIR, "commit", "-m", commit_msg)
