/**
 * Cells & Blocks Component Engine for Noir Note
 * Full English Edition
 */

const CellManager = {
  createCellElement(cell, index, callbacks) {
    const cellEl = document.createElement('div');
    cellEl.className = 'cell' + (cell.width === 'half' ? ' half-width' : '');
    cellEl.dataset.cellId = cell.id;
    cellEl.dataset.index = index;

    // Header Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'cell-toolbar';

    const typeBadge = document.createElement('div');
    typeBadge.className = 'cell-type-badge';
    typeBadge.textContent = this.getTypeBadgeText(cell.type);

    const actions = document.createElement('div');
    actions.className = 'cell-actions';

    // Width Toggle Button
    const btnWidth = document.createElement('button');
    btnWidth.className = 'cell-btn' + (cell.width === 'half' ? ' btn-active-width' : '');
    btnWidth.title = cell.width === 'half' ? 'Switch to full width' : 'Switch to 2 columns (side by side)';
    btnWidth.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`;
    btnWidth.onclick = (e) => {
      e.stopPropagation();
      cell.width = cell.width === 'half' ? 'full' : 'half';
      if (cell.width === 'half') {
        cellEl.classList.add('half-width');
        btnWidth.classList.add('btn-active-width');
      } else {
        cellEl.classList.remove('half-width');
        btnWidth.classList.remove('btn-active-width');
      }
      callbacks.onUpdate(cell);
    };

    // Move Up Button
    const btnUp = document.createElement('button');
    btnUp.className = 'cell-btn';
    btnUp.title = 'Move up';
    btnUp.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 15l-6-6-6 6"/></svg>`;
    btnUp.onclick = (e) => {
      e.stopPropagation();
      callbacks.onMoveUp(cell.id);
    };

    // Move Down Button
    const btnDown = document.createElement('button');
    btnDown.className = 'cell-btn';
    btnDown.title = 'Move down';
    btnDown.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6"/></svg>`;
    btnDown.onclick = (e) => {
      e.stopPropagation();
      callbacks.onMoveDown(cell.id);
    };

    // Duplicate Button
    const btnDup = document.createElement('button');
    btnDup.className = 'cell-btn';
    btnDup.title = 'Duplicate';
    btnDup.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    btnDup.onclick = (e) => {
      e.stopPropagation();
      callbacks.onDuplicate(cell.id);
    };

    // Delete Button
    const btnDel = document.createElement('button');
    btnDel.className = 'cell-btn btn-delete';
    btnDel.title = 'Delete block';
    btnDel.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
    btnDel.onclick = (e) => {
      e.stopPropagation();
      callbacks.onDelete(cell.id);
    };

    actions.appendChild(btnWidth);
    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnDup);
    actions.appendChild(btnDel);

    toolbar.appendChild(typeBadge);
    toolbar.appendChild(actions);
    cellEl.appendChild(toolbar);

    // Body content by type
    const bodyEl = this.renderCellBody(cell, callbacks);
    cellEl.appendChild(bodyEl);

    // Focus tracking
    cellEl.addEventListener('focusin', () => cellEl.classList.add('focused'));
    cellEl.addEventListener('focusout', (e) => {
      if (!cellEl.contains(e.relatedTarget)) {
        cellEl.classList.remove('focused');
      }
    });

    return cellEl;
  },

  getTypeBadgeText(type) {
    switch (type) {
      case 'columns':
        return '2-COLUMNS';
      case 'subpage':
        return 'PAGE';
      case 'markdown':
        return 'MARKDOWN';
      case 'code':
        return 'CODE';
      case 'checklist':
        return 'TASKS';
      case 'callout':
        return 'NOTE';
      case 'toggle':
        return 'TOGGLE';
      default:
        return (type || '').toUpperCase();
    }
  },

  renderCellBody(cell, callbacks) {
    switch (cell.type) {
      case 'columns':
        return this.renderColumnsBlock(cell, callbacks);
      case 'subpage':
        return this.renderSubpageCell(cell, callbacks);
      case 'markdown':
        return this.renderMarkdownCell(cell, callbacks);
      case 'code':
        return this.renderCodeCell(cell, callbacks);
      case 'checklist':
        return this.renderChecklistCell(cell, callbacks);
      case 'callout':
        return this.renderCalloutCell(cell, callbacks);
      case 'toggle':
        return this.renderToggleCell(cell, callbacks);
      default:
        const div = document.createElement('div');
        div.textContent = 'Unknown block type.';
        return div;
    }
  },

  // 1. Dedicated 2-Column Block
  renderColumnsBlock(cell, callbacks) {
    if (!cell.left) cell.left = { type: 'markdown', content: '' };
    if (!cell.right) cell.right = { type: 'code', lang: 'python', content: '' };

    const container = document.createElement('div');
    container.className = 'cell-columns-block';

    const renderColumnSide = (colKey, label) => {
      const colEl = document.createElement('div');
      colEl.className = 'column-side';

      const header = document.createElement('div');
      header.className = 'column-side-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'column-side-title';
      titleSpan.textContent = label;

      const typeSelect = document.createElement('select');
      typeSelect.className = 'select-column-type';
      const types = [
        { id: 'markdown', name: 'Markdown' },
        { id: 'code', name: 'Code' },
        { id: 'checklist', name: 'Tasks' },
        { id: 'callout', name: 'Note' },
        { id: 'toggle', name: 'Toggle' }
      ];
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        if (cell[colKey].type === t.id) opt.selected = true;
        typeSelect.appendChild(opt);
      });

      typeSelect.onchange = () => {
        const prevContent = cell[colKey].content || '';
        cell[colKey] = { type: typeSelect.value, content: prevContent };
        if (typeSelect.value === 'checklist' && !cell[colKey].items) {
          cell[colKey].items = [{ id: 'it_' + Date.now(), text: '', done: false }];
        }
        callbacks.onUpdate(cell);
        colEl.replaceWith(renderColumnSide(colKey, label));
      };

      header.appendChild(titleSpan);
      header.appendChild(typeSelect);
      colEl.appendChild(header);

      const innerBody = this.renderCellBody(cell[colKey], {
        ...callbacks,
        onUpdate: () => callbacks.onUpdate(cell)
      });
      colEl.appendChild(innerBody);
      return colEl;
    };

    container.appendChild(renderColumnSide('left', 'Left Column'));
    container.appendChild(renderColumnSide('right', 'Right Column'));
    return container;
  },

  // 2. Subpage Cell
  renderSubpageCell(cell, callbacks) {
    const card = document.createElement('div');
    card.className = 'cell-subpage-card';

    const subpage = callbacks.getPageById ? callbacks.getPageById(cell.subpageId) : null;
    const titleText = subpage && subpage.title ? subpage.title : 'Untitled Page';

    card.innerHTML = `
      <div class="subpage-card-title">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${titleText}</span>
      </div>
      <div class="subpage-card-arrow">Open Page →</div>
    `;

    card.onclick = (e) => {
      e.stopPropagation();
      callbacks.onOpenSubpage(cell.subpageId);
    };

    return card;
  },

  // 3. Markdown Cell
  renderMarkdownCell(cell, callbacks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cell-markdown-container';

    const preview = document.createElement('div');
    preview.className = 'cell-markdown-preview';
    preview.innerHTML = MarkdownParser.render(cell.content || '');

    const editor = document.createElement('textarea');
    editor.className = 'cell-markdown-editor';
    editor.value = cell.content || '';
    editor.placeholder = 'Write markdown here (# Heading, **bold**, - list, > quote)...';
    editor.style.display = 'none';

    const autoResize = () => {
      editor.style.height = 'auto';
      editor.style.height = Math.max(70, editor.scrollHeight) + 'px';
    };

    const switchToEdit = () => {
      preview.style.display = 'none';
      editor.style.display = 'block';
      autoResize();
      editor.focus();
    };

    const switchToPreview = () => {
      cell.content = editor.value;
      callbacks.onUpdate(cell);
      preview.innerHTML = MarkdownParser.render(editor.value);
      editor.style.display = 'none';
      preview.style.display = 'block';
    };

    preview.addEventListener('click', switchToEdit);

    editor.addEventListener('input', () => {
      autoResize();
      cell.content = editor.value;
      callbacks.onUpdate(cell, true);
    });

    editor.addEventListener('blur', () => {
      switchToPreview();
    });

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        switchToPreview();
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        callbacks.onInsertBelow(cell.id, 'markdown');
      }
    });

    if (!cell.content || !cell.content.trim()) {
      preview.style.display = 'none';
      editor.style.display = 'block';
    }

    wrapper.appendChild(preview);
    wrapper.appendChild(editor);
    return wrapper;
  },

  // 4. Code Cell
  renderCodeCell(cell, callbacks) {
    const container = document.createElement('div');
    container.className = 'cell-code-container';

    const controls = document.createElement('div');
    controls.className = 'cell-code-controls';

    const langSelect = document.createElement('select');
    langSelect.className = 'select-lang';
    const languages = [
      { id: 'python', name: 'Python' },
      { id: 'javascript', name: 'JavaScript' },
      { id: 'typescript', name: 'TypeScript' },
      { id: 'html', name: 'HTML' },
      { id: 'css', name: 'CSS' },
      { id: 'sql', name: 'SQL' },
      { id: 'cpp', name: 'C++' },
      { id: 'java', name: 'Java' },
      { id: 'bash', name: 'Bash' },
      { id: 'json', name: 'JSON' },
      { id: 'markdown', name: 'Markdown' },
      { id: 'plaintext', name: 'Plain Text' }
    ];

    languages.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.id;
      opt.textContent = l.name;
      if (cell.lang === l.id) opt.selected = true;
      langSelect.appendChild(opt);
    });

    langSelect.addEventListener('change', () => {
      cell.lang = langSelect.value;
      callbacks.onUpdate(cell);
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy-code';
    copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>Copy</span>`;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(cell.content || '').then(() => {
        copyBtn.innerHTML = `<span>Copied</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>Copy</span>`;
        }, 1500);
      });
    };

    controls.appendChild(langSelect);
    controls.appendChild(copyBtn);

    const editor = document.createElement('textarea');
    editor.className = 'cell-code-editor';
    editor.value = cell.content || '';
    editor.placeholder = '// Type code here...';
    editor.spellcheck = false;

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        cell.content = editor.value;
        callbacks.onUpdate(cell, true);
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        callbacks.onInsertBelow(cell.id, 'code');
      }
    });

    editor.addEventListener('input', () => {
      cell.content = editor.value;
      callbacks.onUpdate(cell, true);
    });

    container.appendChild(controls);
    container.appendChild(editor);
    return container;
  },

  // 5. Checklist Cell
  renderChecklistCell(cell, callbacks) {
    if (!Array.isArray(cell.items)) {
      cell.items = [{ id: 'it_' + Date.now(), text: '', done: false }];
    }

    const container = document.createElement('div');
    container.className = 'cell-checklist-container';

    const progressTrack = document.createElement('div');
    progressTrack.className = 'checklist-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'checklist-progress-fill';
    progressTrack.appendChild(progressFill);
    container.appendChild(progressTrack);

    const updateProgress = () => {
      const total = cell.items.length;
      if (total === 0) {
        progressFill.style.width = '0%';
        return;
      }
      const doneCount = cell.items.filter(it => it.done).length;
      const pct = Math.round((doneCount / total) * 100);
      progressFill.style.width = pct + '%';
    };

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'checklist-items';

    const renderItems = () => {
      itemsContainer.innerHTML = '';
      cell.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'checklist-item-row';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'checklist-checkbox';
        cb.checked = !!item.done;
        cb.onchange = () => {
          item.done = cb.checked;
          if (item.done) {
            textInput.classList.add('completed');
          } else {
            textInput.classList.remove('completed');
          }
          updateProgress();
          callbacks.onUpdate(cell);
        };

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.className = 'checklist-text' + (item.done ? ' completed' : '');
        textInput.value = item.text || '';
        textInput.placeholder = 'Task or action item...';

        textInput.oninput = () => {
          item.text = textInput.value;
          callbacks.onUpdate(cell, true);
        };

        textInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const newItem = { id: 'it_' + Date.now(), text: '', done: false };
            cell.items.splice(idx + 1, 0, newItem);
            callbacks.onUpdate(cell);
            renderItems();
            setTimeout(() => {
              const rows = itemsContainer.querySelectorAll('.checklist-text');
              if (rows[idx + 1]) rows[idx + 1].focus();
            }, 10);
          } else if (e.key === 'Backspace' && !textInput.value && cell.items.length > 1) {
            e.preventDefault();
            cell.items.splice(idx, 1);
            callbacks.onUpdate(cell);
            renderItems();
            setTimeout(() => {
              const rows = itemsContainer.querySelectorAll('.checklist-text');
              const targetIdx = Math.max(0, idx - 1);
              if (rows[targetIdx]) rows[targetIdx].focus();
            }, 10);
          }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'checklist-del-btn';
        delBtn.innerHTML = `&times;`;
        delBtn.title = 'Delete item';
        delBtn.onclick = () => {
          cell.items.splice(idx, 1);
          if (cell.items.length === 0) {
            cell.items.push({ id: 'it_' + Date.now(), text: '', done: false });
          }
          callbacks.onUpdate(cell);
          renderItems();
        };

        row.appendChild(cb);
        row.appendChild(textInput);
        row.appendChild(delBtn);
        itemsContainer.appendChild(row);
      });
      updateProgress();
    };

    renderItems();
    container.appendChild(itemsContainer);

    const addBtn = document.createElement('button');
    addBtn.className = 'btn-add-checklist-item';
    addBtn.innerHTML = `+ Add Item`;
    addBtn.onclick = () => {
      cell.items.push({ id: 'it_' + Date.now(), text: '', done: false });
      callbacks.onUpdate(cell);
      renderItems();
      setTimeout(() => {
        const rows = itemsContainer.querySelectorAll('.checklist-text');
        if (rows[rows.length - 1]) rows[rows.length - 1].focus();
      }, 10);
    };
    container.appendChild(addBtn);

    return container;
  },

  // 6. Note / Callout Cell
  renderCalloutCell(cell, callbacks) {
    const container = document.createElement('div');
    container.className = 'cell-callout-container';

    const label = document.createElement('div');
    label.className = 'cell-callout-label';
    label.textContent = 'NOTE';

    const text = document.createElement('textarea');
    text.className = 'cell-callout-text';
    text.value = cell.content || '';
    text.placeholder = 'Key concept, takeaway, or important thought...';

    const autoResize = () => {
      text.style.height = 'auto';
      text.style.height = Math.max(50, text.scrollHeight) + 'px';
    };

    text.addEventListener('input', () => {
      autoResize();
      cell.content = text.value;
      callbacks.onUpdate(cell, true);
    });

    setTimeout(autoResize, 0);

    container.appendChild(label);
    container.appendChild(text);
    return container;
  },

  // 7. Toggle Cell
  renderToggleCell(cell, callbacks) {
    const container = document.createElement('div');
    container.className = 'cell-toggle-container';

    const header = document.createElement('div');
    header.className = 'toggle-header';

    const arrow = document.createElement('div');
    arrow.className = 'toggle-arrow';
    arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"/></svg>`;

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'toggle-title-input';
    titleInput.value = cell.title || '';
    titleInput.placeholder = 'Question or toggle title...';

    titleInput.oninput = () => {
      cell.title = titleInput.value;
      callbacks.onUpdate(cell, true);
    };

    header.appendChild(arrow);
    header.appendChild(titleInput);

    const body = document.createElement('div');
    body.className = 'toggle-body';

    const bodyTextarea = document.createElement('textarea');
    bodyTextarea.className = 'toggle-textarea';
    bodyTextarea.value = cell.content || '';
    bodyTextarea.placeholder = 'Details or answer here...';

    const autoResize = () => {
      bodyTextarea.style.height = 'auto';
      bodyTextarea.style.height = Math.max(60, bodyTextarea.scrollHeight) + 'px';
    };

    bodyTextarea.oninput = () => {
      autoResize();
      cell.content = bodyTextarea.value;
      callbacks.onUpdate(cell, true);
    };

    body.appendChild(bodyTextarea);

    let isOpen = false;
    const toggleOpen = () => {
      isOpen = !isOpen;
      if (isOpen) {
        header.classList.add('open');
        body.classList.add('open');
        autoResize();
      } else {
        header.classList.remove('open');
        body.classList.remove('open');
      }
    };

    arrow.onclick = (e) => {
      e.stopPropagation();
      toggleOpen();
    };

    container.appendChild(header);
    container.appendChild(body);
    return container;
  },

  createInsertDivider(index, onInsert) {
    const divider = document.createElement('div');
    divider.className = 'insert-divider';

    const btn = document.createElement('button');
    btn.className = 'btn-insert-trigger';
    btn.innerHTML = '+';
    btn.title = 'Insert block';
    btn.onclick = (e) => {
      e.stopPropagation();
      onInsert(index);
    };

    divider.appendChild(btn);
    return divider;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CellManager;
}
