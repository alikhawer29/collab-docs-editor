function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(value: string) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

function inlineToMarkdown(html: string) {
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<u>([\s\S]*?)<\/u>/gi, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/?p>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(`<li><p>${renderInline(lines[index].replace(/^[-*]\s+/, ""))}</p></li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li><p>${renderInline(lines[index].replace(/^\d+\.\s+/, ""))}</p></li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^[-*]\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return html.join("") || "<p></p>";
}

export function textToHtml(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) return "<p></p>";
  return normalized
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function htmlToMarkdown(html: string) {
  const blocks: string[] = [];
  const pattern = /<(h1|h2|h3|p|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const tag = match[1];
    const inner = match[3];
    if (tag === "h1") blocks.push(`# ${inlineToMarkdown(inner)}\n`);
    else if (tag === "h2") blocks.push(`## ${inlineToMarkdown(inner)}\n`);
    else if (tag === "h3") blocks.push(`### ${inlineToMarkdown(inner)}\n`);
    else if (tag === "p") blocks.push(`${inlineToMarkdown(inner)}\n`);
    else if (tag === "ul" || tag === "ol") {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)];
      const lines = items.map((item, itemIndex) => {
        const prefix = tag === "ul" ? "-" : `${itemIndex + 1}.`;
        return `${prefix} ${inlineToMarkdown(item[1])}`;
      });
      if (lines.length) blocks.push(`${lines.join("\n")}\n`);
    }
  }

  const markdown = blocks.join("\n").trim();
  if (markdown) return `${markdown}\n`;
  const fallback = inlineToMarkdown(html);
  return fallback ? `${fallback}\n` : "";
}
