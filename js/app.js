/**
 * Main Application Orchestrator for Noir Note
 * Full English Edition with Refined Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let state = StorageManager.loadData();
  let saveTimeout = null;
  let insertTargetIndex = null;

  // DOM Elements
  const navBackContainer = document.getElementById('nav-back-container');
  const btnNavBack = document.getElementById('btn-nav-back');
  const navBackTitle = document.getElementById('nav-back-title');
  const breadcrumbTrail = document.getElementById('breadcrumb-trail');
  const pageTitleInput = document.getElementById('page-title');
  const footerPageInfo = document.getElementById('footer-page-info');

  // Main Page View Elements
  const mainPageView = document.getElementById('main-page-view');
  const mainSubpageGrid = document.getElementById('main-subpage-grid');
  const btnAddMainSubpage = document.getElementById('btn-add-main-subpage');

  // Subpage Document View Elements
  const subpageDocView = document.getElementById('subpage-doc-view');
  const cellsContainer = document.getElementById('cells-container');

  // Bottom Footer Actions (MD Export, Backup, Restore)
  const btnExportMd = document.getElementById('btn-export-md');
  const btnBackupJson = document.getElementById('btn-backup-json');
  const btnRestoreTrigger = document.getElementById('btn-restore-json-trigger');
  const inputRestoreFile = document.getElementById('input-restore-file');

  // Insert Modal & Toast
  const insertModal = document.getElementById('insert-modal');
  const btnCloseInsertModal = document.getElementById('btn-close-insert-modal');
  const toastContainer = document.getElementById('toast-container');

  // Toast Notification
  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 1800);
  }

  // Auto-Save (Debounced)
  function triggerSave(immediate = false) {
    if (saveTimeout) clearTimeout(saveTimeout);
    if (immediate) {
      const curPage = getCurrentPage();
      if (curPage) curPage.updatedAt = Date.now();
      StorageManager.saveData(state);
    } else {
      saveTimeout = setTimeout(() => {
        const curPage = getCurrentPage();
        if (curPage) curPage.updatedAt = Date.now();
        StorageManager.saveData(state);
      }, 350);
    }
  }

  // Current active page
  function getCurrentPage() {
    let page = state.pages.find(p => p.id === state.activePageId);
    if (!page && state.pages.length > 0) {
      page = PageManager.getMainPage(state.pages);
      state.activePageId = page.id;
    }
    return page;
  }

  // Auto-resize page title textarea
  function autoResizeTitle() {
    if (!pageTitleInput) return;
    pageTitleInput.style.height = 'auto';
    pageTitleInput.style.height = pageTitleInput.scrollHeight + 'px';
  }

  // Smooth Navigation between Pages
  function navigateToPage(pageId) {
    const target = state.pages.find(p => p.id === pageId);
    if (!target) return;
    state.activePageId = pageId;
    triggerSave(true);
    renderCurrentPage();

    const scrollContainer = document.querySelector('.editor-scroll-container');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Render Main Page Grid (ONLY SUBPAGE BUTTONS)
  function renderMainPageGrid(mainPage) {
    if (!mainSubpageGrid) return;
    mainSubpageGrid.innerHTML = '';

    // Find all subpages belonging to main page
    const subpages = PageManager.getSubpages(state.pages, mainPage.id);

    if (subpages.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'main-empty-hint';
      emptyHint.textContent = 'No pages yet. Hover below to add your first page.';
      mainSubpageGrid.appendChild(emptyHint);
      return;
    }

    subpages.forEach(sub => {
      const card = document.createElement('div');
      card.className = 'main-subpage-card';

      const cellCount = sub.cells ? sub.cells.length : 0;
      const date = new Date(sub.updatedAt || Date.now());
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const blockText = cellCount === 1 ? '1 block' : `${cellCount} blocks`;

      card.innerHTML = `
        <div class="main-card-top">
          <div class="main-card-title">${sub.title || 'Untitled'}</div>
          <button class="main-card-del-btn" title="Delete page">&times;</button>
        </div>
        <div class="main-card-bottom">
          <span>${blockText} • ${dateStr}</span>
          <span class="main-card-arrow">Open →</span>
        </div>
      `;

      // Enter subpage on click
      card.onclick = () => {
        navigateToPage(sub.id);
      };

      // Delete subpage button
      const delBtn = card.querySelector('.main-card-del-btn');
      if (delBtn) {
        delBtn.onclick = (e) => {
          e.stopPropagation();
          const confirmed = confirm(`Delete "${sub.title || 'Untitled'}"?`);
          if (confirmed) {
            const { remainingPages } = PageManager.deletePageAndDescendants(state.pages, sub.id);
            state.pages = remainingPages;
            triggerSave(true);
            renderCurrentPage();
            showToast('Page deleted');
          }
        };
      }

      mainSubpageGrid.appendChild(card);
    });
  }

  // Render Subpage Cells View
  function renderSubpageCells(page) {
    if (!cellsContainer) return;
    cellsContainer.innerHTML = '';
    const cells = page.cells || [];

    cells.forEach((cell, idx) => {
      // Divider before cell
      const divider = CellManager.createInsertDivider(idx, (index) => {
        openInsertModal(index);
      });
      cellsContainer.appendChild(divider);

      // Cell Element
      const cellEl = CellManager.createCellElement(cell, idx, {
        getPageById: (id) => state.pages.find(p => p.id === id),
        onOpenSubpage: (subpageId) => {
          navigateToPage(subpageId);
        },
        onUpdate: (updatedCell, debounced = false) => {
          triggerSave(!debounced);
        },
        onMoveUp: (cellId) => {
          moveCell(cellId, -1);
        },
        onMoveDown: (cellId) => {
          moveCell(cellId, 1);
        },
        onDuplicate: (cellId) => {
          duplicateCell(cellId);
        },
        onDelete: (cellId) => {
          deleteCell(cellId);
        },
        onInsertBelow: (cellId, type) => {
          const cIndex = page.cells.findIndex(c => c.id === cellId);
          insertNewCell(cIndex + 1, type);
        }
      });
      cellsContainer.appendChild(cellEl);
    });

    // Final trailing divider
    const lastDivider = CellManager.createInsertDivider(cells.length, (index) => {
      openInsertModal(index);
    });
    cellsContainer.appendChild(lastDivider);
  }

  // Render Active Page
  function renderCurrentPage() {
    const page = getCurrentPage();
    if (!page) return;

    if (pageTitleInput) {
      pageTitleInput.value = page.title || '';
      autoResizeTitle();
    }

    if (page.isMain) {
      // 1. Main Page Mode: Only subpage cards
      navBackContainer.style.display = 'none';
      mainPageView.style.display = 'block';
      subpageDocView.style.display = 'none';
      renderMainPageGrid(page);

      if (footerPageInfo) {
        const subCount = state.pages.filter(p => !p.isMain).length;
        footerPageInfo.textContent = `Workspace • ${subCount} ${subCount === 1 ? 'page' : 'pages'}`;
      }
    } else {
      // 2. Document View Mode: Cell editor + return link
      navBackContainer.style.display = 'flex';
      mainPageView.style.display = 'none';
      subpageDocView.style.display = 'block';

      // Breadcrumb / Back button
      const path = PageManager.getBreadcrumbPath(state.pages, page.id);
      const parent = path.length > 1 ? path[path.length - 2] : null;
      navBackTitle.textContent = parent ? (parent.title || 'Dashboard') : 'Dashboard';
      breadcrumbTrail.textContent = path.map(p => p.title).join(' / ');

      renderSubpageCells(page);

      if (footerPageInfo) {
        const cellCount = page.cells ? page.cells.length : 0;
        const blockText = cellCount === 1 ? '1 block' : `${cellCount} blocks`;
        footerPageInfo.textContent = `${page.title || 'Untitled'} • ${blockText}`;
      }
    }
  }

  // Back Navigation Click
  if (btnNavBack) {
    btnNavBack.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = PageManager.getParentPage(state.pages, state.activePageId);
      if (parent) {
        navigateToPage(parent.id);
      } else {
        const main = PageManager.getMainPage(state.pages);
        if (main) navigateToPage(main.id);
      }
    });
  }

  // Add Page from Main Page
  if (btnAddMainSubpage) {
    btnAddMainSubpage.addEventListener('click', () => {
      const main = PageManager.getMainPage(state.pages);
      const newSub = PageManager.createNewPage(main.id, 'Untitled');
      state.pages.push(newSub);
      triggerSave(true);
      navigateToPage(newSub.id);
      if (pageTitleInput) {
        pageTitleInput.focus();
        pageTitleInput.select();
      }
      showToast('New page created');
    });
  }

  // Cell Manipulation Helpers
  function moveCell(cellId, direction) {
    const page = getCurrentPage();
    if (!page) return;
    const idx = page.cells.findIndex(c => c.id === cellId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= page.cells.length) return;

    const [moved] = page.cells.splice(idx, 1);
    page.cells.splice(targetIdx, 0, moved);
    triggerSave(true);
    renderCurrentPage();
  }

  function duplicateCell(cellId) {
    const page = getCurrentPage();
    if (!page) return;
    const idx = page.cells.findIndex(c => c.id === cellId);
    if (idx < 0) return;

    const original = page.cells[idx];
    const cloned = JSON.parse(JSON.stringify(original));
    cloned.id = 'cell_' + Math.random().toString(36).substr(2, 9);

    if (original.type === 'subpage') {
      const origSubpage = state.pages.find(p => p.id === original.subpageId);
      const newSubpage = PageManager.createNewPage(page.id, (origSubpage ? origSubpage.title : 'Page') + ' (Copy)');
      if (origSubpage && origSubpage.cells) {
        newSubpage.cells = JSON.parse(JSON.stringify(origSubpage.cells));
      }
      state.pages.push(newSubpage);
      cloned.subpageId = newSubpage.id;
    }

    page.cells.splice(idx + 1, 0, cloned);
    triggerSave(true);
    renderCurrentPage();
    showToast('Block duplicated');
  }

  function deleteCell(cellId) {
    const page = getCurrentPage();
    if (!page) return;

    const targetCell = page.cells.find(c => c.id === cellId);
    if (targetCell && targetCell.type === 'subpage') {
      const confirmed = confirm('Delete this nested page and all its contents?');
      if (!confirmed) return;
      const { remainingPages } = PageManager.deletePageAndDescendants(state.pages, targetCell.subpageId);
      state.pages = remainingPages;
    }

    page.cells = page.cells.filter(c => c.id !== cellId);
    triggerSave(true);
    renderCurrentPage();
    showToast('Block deleted');
  }

  function createEmptyCell(type, parentPageId) {
    const id = 'cell_' + Math.random().toString(36).substr(2, 9);
    switch (type) {
      case 'columns':
        return {
          id,
          type: 'columns',
          width: 'full',
          left: { type: 'markdown', content: '' },
          right: { type: 'code', lang: 'python', content: '' }
        };
      case 'subpage': {
        const newSubpage = PageManager.createNewPage(parentPageId, 'Untitled');
        state.pages.push(newSubpage);
        return { id, type: 'subpage', width: 'full', subpageId: newSubpage.id };
      }
      case 'markdown':
        return { id, type, width: 'full', content: '' };
      case 'code':
        return { id, type, width: 'full', lang: 'python', content: '' };
      case 'checklist':
        return { id, type, width: 'full', items: [{ id: 'it_' + Date.now(), text: '', done: false }] };
      case 'callout':
        return { id, type, width: 'full', content: '' };
      case 'toggle':
        return { id, type, width: 'full', title: '', content: '' };
      default:
        return { id, type: 'markdown', width: 'full', content: '' };
    }
  }

  function insertNewCell(index, type) {
    const page = getCurrentPage();
    if (!page) return;
    if (!page.cells) page.cells = [];

    const newCell = createEmptyCell(type, page.id);
    if (index >= 0 && index <= page.cells.length) {
      page.cells.splice(index, 0, newCell);
    } else {
      page.cells.push(newCell);
    }

    triggerSave(true);
    renderCurrentPage();

    if (type === 'subpage') {
      showToast('New page block added');
    } else {
      setTimeout(() => {
        const cellEl = cellsContainer.querySelector(`[data-cell-id="${newCell.id}"]`);
        if (cellEl) {
          cellEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const focusable = cellEl.querySelector('textarea, input[type="text"]');
          if (focusable) focusable.focus();
        }
      }, 50);
    }
  }

  // Page Title Change
  if (pageTitleInput) {
    pageTitleInput.addEventListener('input', () => {
      autoResizeTitle();
      const page = getCurrentPage();
      if (page) {
        page.title = pageTitleInput.value;
        triggerSave(false);
      }
    });
  }

  // Bottom Add Cell Toolbar buttons
  document.querySelectorAll('.bottom-add-cell-bar .add-cell-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const page = getCurrentPage();
      const insertIdx = page && page.cells ? page.cells.length : 0;
      insertNewCell(insertIdx, type);
    });
  });

  // Divider Quick Insert Modal
  function openInsertModal(index) {
    insertTargetIndex = index;
    if (insertModal) insertModal.classList.add('open');
  }

  function closeInsertModal() {
    if (insertModal) insertModal.classList.remove('open');
    insertTargetIndex = null;
  }

  if (btnCloseInsertModal) {
    btnCloseInsertModal.addEventListener('click', closeInsertModal);
  }
  if (insertModal) {
    insertModal.addEventListener('click', (e) => {
      if (e.target === insertModal) closeInsertModal();
    });
  }

  document.querySelectorAll('[data-insert-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.insertType;
      if (insertTargetIndex !== null) {
        insertNewCell(insertTargetIndex, type);
      }
      closeInsertModal();
    });
  });

  // Export as Markdown
  if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
      const page = getCurrentPage();
      if (page) {
        StorageManager.exportPageAsMarkdown(page, state.pages);
        showToast('Markdown (.md) downloaded');
      }
    });
  }

  // Backup JSON
  if (btnBackupJson) {
    btnBackupJson.addEventListener('click', () => {
      StorageManager.exportAsJSON(state);
      showToast('Backup saved');
    });
  }

  // Restore JSON
  if (btnRestoreTrigger && inputRestoreFile) {
    btnRestoreTrigger.addEventListener('click', () => {
      inputRestoreFile.click();
    });

    inputRestoreFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const imported = StorageManager.importFromJSON(event.target.result);
        if (imported) {
          state = imported;
          renderCurrentPage();
          showToast('Data restored successfully');
        }
      };
      reader.readAsText(file);
      inputRestoreFile.value = '';
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInsertModal();
    }
  });

  // Initial Boot
  renderCurrentPage();
});
