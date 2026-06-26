# This script will help keep the GitHub Pages fresh.
# It makes some assumptions about the local layout of repos and directories,
# which are hopefuly clear enough from the logic.

import filecmp
from pathlib import Path
import subprocess
import tempfile

# change these if the repo names on local disk change
# (and we assume that all three repos are side-by-side)
FEELINGS_DIR_NAME = 'feelings'
PIPELINE_DIR_NAME = 'pipeline'

# these should change less often or never
THIS_SCRIPT = __file__
THIS_REPO_DIR = (Path(THIS_SCRIPT) / '..' / '..').resolve()
CONTAINING_DIR = THIS_REPO_DIR / '..'
FEELINGS_REPO_DIR = (CONTAINING_DIR / FEELINGS_DIR_NAME).resolve()
FEELINGS_SRC_DIR = FEELINGS_REPO_DIR / 'feelings'
PIPELINE_REPO_DIR = (CONTAINING_DIR / PIPELINE_DIR_NAME).resolve()
PIPELINE_OUTPUTS_DIR = PIPELINE_REPO_DIR / 'out'
# meta.json appears under "YAML_FILES" so that it's not compared with files in Feelings
YAML_FILES = ['editions.yaml', 'cards.yaml', 'printings.yaml', 'meta.yaml', 'meta.json']
JSON_FILES = ['editions.json', 'cards.json', 'printings.json']

FEELINGS_TARGET_DIR = THIS_REPO_DIR / 'feelings'
EDITION1_TARGET_DIR = THIS_REPO_DIR / 'msw'

# checks to make sure we've got the structures we expect
assert THIS_REPO_DIR.is_dir()
assert FEELINGS_SRC_DIR.is_dir()
assert PIPELINE_OUTPUTS_DIR.is_dir()
for yaml in YAML_FILES:
    assert (PIPELINE_OUTPUTS_DIR / yaml).is_file()
for json in JSON_FILES:
    assert (PIPELINE_OUTPUTS_DIR / json).is_file()
assert FEELINGS_TARGET_DIR.is_dir()
assert EDITION1_TARGET_DIR.is_dir()

# make sure Feelings has matching data files
for json in JSON_FILES:
    assert filecmp.cmp(
        FEELINGS_SRC_DIR / 'data' / json,
        PIPELINE_OUTPUTS_DIR / json,
        shallow=False,
    )

print(f"{THIS_REPO_DIR=}")
print(f"{FEELINGS_SRC_DIR=}")
print(f"{PIPELINE_OUTPUTS_DIR=}")

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

feelings_branch = run_git(FEELINGS_REPO_DIR, "symbolic-ref", "--short", "HEAD").strip()
if feelings_branch != 'main':
    print("WARNING: ❤️ Feelings repo is not at main")
    print(f"It's at `{feelings_branch}`")
    input("Ctrl-C to cancel, otherwise press Enter to accept...")

feelings_id = run_git(FEELINGS_REPO_DIR, "rev-parse", "HEAD").strip()

pipeline_branch = run_git(PIPELINE_REPO_DIR, "symbolic-ref", "--short", "HEAD").strip()
if pipeline_branch != 'main':
    print("WARNING: 🔧 Pipeline repo is not at main")
    print(f"It's at `{pipeline_branch}`")
    input("Ctrl-C to cancel, otherwise press Enter to accept...")

pipeline_id = run_git(PIPELINE_REPO_DIR, "rev-parse", "HEAD").strip()

print()
print("Assumption: you recently generated the outputs in the pipeline directory.")
print("If that isn't true, bail out and do that first.")
input("Last chance to bail (Ctrl-C to stop, Enter to go)...")

print("Copying YAML data")
for yaml in YAML_FILES:
    print(f"- {yaml}")
    (PIPELINE_OUTPUTS_DIR / yaml).copy(EDITION1_TARGET_DIR / yaml)

print("Copying JSON data")
for json in JSON_FILES:
    print(f"- {json}")
    (PIPELINE_OUTPUTS_DIR / json).copy(EDITION1_TARGET_DIR / json)

print("Copying Feelings")
with tempfile.TemporaryDirectory() as tmpdir:
    FEELINGS_TARGET_DIR.replace(tmpdir)
    FEELINGS_SRC_DIR.copy(FEELINGS_TARGET_DIR)

print("Preparing commit")
run_git(EDITION1_TARGET_DIR, "add", ".")
run_git(FEELINGS_TARGET_DIR, "add", ".")

commit_msg = f"""Updating data files and Feelings search

moodswingsdata/moodswingsdatapipeline {pipeline_id}
moodswingsdata/feelings {feelings_id}
"""
print("Commiting changes")
print("-" * 40)
print(commit_msg)
print("-" * 40)
run_git(THIS_REPO_DIR, "commit", "-m", commit_msg)
