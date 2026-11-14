// Parses docs/CHANGELOG.md ("## YYYY-MM-DD · Title", then "**What changed**" and "**What you need to do**"
// bullet lists) into entries for the /docs "What's new" section. Entries stay in file order (newest first).
export function parseChangelog(markdown) {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, "");
  return text.split(/^## /m).slice(1).map((block) => {
    const [heading, ...lines] = block.trim().split("\n");
    const [date, ...titleParts] = heading.split("·");
    const entry = { date: date.trim(), title: titleParts.join("·").trim(), changed: [], todo: [] };
    let list = null;
    for (const line of lines) {
      if (/^\*\*What changed\*\*/i.test(line)) list = entry.changed;
      else if (/^\*\*What you need to do\*\*/i.test(line)) list = entry.todo;
      else if (list && /^- /.test(line)) list.push(line.slice(2).trim());
    }
    return entry;
  });
}
