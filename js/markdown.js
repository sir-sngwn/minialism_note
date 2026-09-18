/**
 * Simple, Safe & Fast Markdown Parser & Formatter
 * Zero-dependency lightweight parser for Noir Note
 */

const MarkdownParser = {
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  render(markdownText) {
    if (!markdownText || !markdownText.trim()) {
      return '<p style="color: var(--text-yellow-dim); font-style: italic;">내용을 입력하려면 클릭하세요...</p>';
    }

    // Split text into lines
    const lines = markdownText.split(/\r?\n/);
    const htmlLines = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockBuffer = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol'
    let inTable = false;
    let tableRows = [];

    const closeList = () => {
      if (inList) {
        htmlLines.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
    };

    const closeTable = () => {
      if (inTable) {
        if (tableRows.length > 0) {
          let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:12px 0; font-size:14px;">';
          tableRows.forEach((row, idx) => {
            const isHeader = (idx === 0);
            const tag = isHeader ? 'th' : 'td';
            tableHtml += '<tr>';
            row.forEach(cell => {
              tableHtml += `<${tag} style="border:1px solid var(--border-subtle); padding:6px 10px; ${isHeader ? 'background:var(--bg-tertiary); font-weight:600;' : ''}">${MarkdownParser.formatInline(cell)}</${tag}>`;
            });
            tableHtml += '</tr>';
          });
          tableHtml += '</table>';
          htmlLines.push(tableHtml);
        }
        inTable = false;
        tableRows = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks ```
      if (line.trim().startsWith('```')) {
        closeList();
        closeTable();
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = line.trim().substring(3).trim();
          codeBlockBuffer = [];
        } else {
          inCodeBlock = false;
          const codeContent = this.escapeHtml(codeBlockBuffer.join('\n'));
          htmlLines.push(
            `<pre style="background:#060608; border:1px solid var(--border-subtle); padding:12px; border-radius:6px; overflow-x:auto; margin:10px 0;"><code class="language-${codeBlockLang}">${codeContent}</code></pre>`
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line);
        continue;
      }

      // Horizontal rule: --- or ***
      if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
        closeList();
        closeTable();
        htmlLines.push('<hr />');
        continue;
      }

      // Headers: # H1, ## H2, ### H3, #### H4
      const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        closeList();
        closeTable();
        const level = headerMatch[1].length;
        const text = this.formatInline(headerMatch[2]);
        htmlLines.push(`<h${level}>${text}</h${level}>`);
        continue;
      }

      // Blockquotes: > Quote
      if (line.startsWith('>')) {
        closeList();
        closeTable();
        const quoteText = this.formatInline(line.replace(/^>\s?/, ''));
        htmlLines.push(`<blockquote>${quoteText}</blockquote>`);
        continue;
      }

      // Tables: | col1 | col2 |
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        closeList();
        // check if separator row like |---|---|
        if (line.includes('---')) {
          continue; // ignore separator
        }
        const cells = line.split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
        inTable = true;
        tableRows.push(cells);
        continue;
      } else {
        closeTable();
      }

      // Checklists: - [ ] or - [x]
      const checklistMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
      if (checklistMatch) {
        closeList();
        const isChecked = checklistMatch[1].toLowerCase() === 'x';
        const itemText = this.formatInline(checklistMatch[2]);
        htmlLines.push(
          `<div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
            <input type="checkbox" disabled ${isChecked ? 'checked' : ''} style="accent-color: var(--text-yellow-primary);" />
            <span style="${isChecked ? 'text-decoration:line-through; color:var(--text-yellow-dim);' : ''}">${itemText}</span>
          </div>`
        );
        continue;
      }

      // Unordered Lists: - item or * item
      const ulMatch = line.match(/^[-*]\s+(.+)$/);
      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          closeList();
          inList = true;
          listType = 'ul';
          htmlLines.push('<ul>');
        }
        htmlLines.push(`<li>${this.formatInline(ulMatch[1])}</li>`);
        continue;
      }

      // Ordered Lists: 1. item
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (!inList || listType !== 'ol') {
          closeList();
          inList = true;
          listType = 'ol';
          htmlLines.push('<ol>');
        }
        htmlLines.push(`<li>${this.formatInline(olMatch[1])}</li>`);
        continue;
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        closeList();
        continue;
      }

      // Regular paragraph text
      closeList();
      htmlLines.push(`<p>${this.formatInline(line)}</p>`);
    }

    closeList();
    closeTable();

    return htmlLines.join('\n');
  },

  formatInline(text) {
    let str = this.escapeHtml(text);

    // Code inline: `code`
    str = str.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold: **text** or __text__
    str = str.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Highlight: ==text==
    str = str.replace(/==([^=]+)==/g, '<mark>$1</mark>');

    // Strikethrough: ~~text~~
    str = str.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Italic: *text* or _text_
    str = str.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    str = str.replace(/_([^_]+)_/g, '<em>$1</em>');

    // Links: [text](url)
    str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    return str;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownParser;
}
