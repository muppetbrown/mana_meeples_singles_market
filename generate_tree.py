"""
Generate a Markdown directory tree for your project.
Run directly in VS Code using the ▶ 'Run Python File' button.
"""

import os

# === CONFIGURATION ===
TARGET_DIR = os.path.dirname(os.path.abspath(__file__))  # current folder
OUTPUT_FILE = os.path.join(TARGET_DIR, "directory_structure.md")
IGNORE = {".git", "__pycache__", ".vscode", "venv", "node_modules"}  # folders to skip
# ======================


def generate_markdown_tree(start_path, indent=0):
    """Recursively generate Markdown tree lines."""
    markdown_lines = []
    try:
        items = sorted(
            item for item in os.listdir(start_path)
            if item not in IGNORE and not item.startswith(".")
        )
    except PermissionError:
        return markdown_lines  # skip folders you can't access

    for item in items:
        item_path = os.path.join(start_path, item)
        prefix = "  " * indent + ("- **" + item + "**" if os.path.isdir(item_path) else "- " + item)
        markdown_lines.append(prefix)
        if os.path.isdir(item_path):
            markdown_lines.extend(generate_markdown_tree(item_path, indent + 1))
    return markdown_lines


def save_markdown_tree(start_path, output_file):
    """Write the directory structure to a Markdown file."""
    lines = [f"# Directory Structure for `{os.path.basename(start_path)}`\n"]
    lines.extend(generate_markdown_tree(start_path))
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"✅ Directory tree saved to: {output_file}")


if __name__ == "__main__":
    save_markdown_tree(TARGET_DIR, OUTPUT_FILE)
