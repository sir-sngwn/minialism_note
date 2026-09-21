/**
 * Page & Subpage Hierarchy Management for Noir Note
 */

const PageManager = {
  getMainPage(pages) {
    let main = pages.find(p => p.isMain || p.parentId === null);
    if (!main && pages.length > 0) {
      main = pages[0];
      main.isMain = true;
      main.parentId = null;
    }
    return main;
  },

  getSubpages(pages, parentId) {
    return pages.filter(p => !p.isMain && (p.parentId === parentId || (!parentId && !p.parentId)));
  },

  createNewPage(parentId = null, title = 'Untitled') {
    return {
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      parentId: parentId || null,
      isMain: false,
      title: title,
      updatedAt: Date.now(),
      cells: [
        {
          id: 'cell_' + Math.random().toString(36).substr(2, 9),
          type: 'markdown',
          width: 'full',
          content: '## ' + title + '\n\nCapture your thoughts, ideas, and study notes here.'
        }
      ]
    };
  },

  getBreadcrumbPath(pages, activePageId) {
    const path = [];
    let current = pages.find(p => p.id === activePageId);

    while (current) {
      path.unshift({
        id: current.id,
        title: current.isMain ? 'Dashboard' : (current.title || 'Untitled'),
        isMain: !!current.isMain
      });
      if (!current.parentId) break;
      current = pages.find(p => p.id === current.parentId);
    }

    return path;
  },

  getParentPage(pages, activePageId) {
    const current = pages.find(p => p.id === activePageId);
    if (!current || !current.parentId) return null;
    return pages.find(p => p.id === current.parentId) || null;
  },

  deletePageAndDescendants(pages, pageIdToDelete) {
    const toDelete = new Set([pageIdToDelete]);
    let added = true;

    while (added) {
      added = false;
      pages.forEach(p => {
        if (p.parentId && toDelete.has(p.parentId) && !toDelete.has(p.id)) {
          toDelete.add(p.id);
          added = true;
        }
      });
    }

    const remaining = pages.filter(p => !toDelete.has(p.id));
    remaining.forEach(p => {
      if (Array.isArray(p.cells)) {
        p.cells = p.cells.filter(c => !(c.type === 'subpage' && toDelete.has(c.subpageId)));
      }
    });

    return { remainingPages: remaining, deletedCount: toDelete.size, deletedIds: Array.from(toDelete) };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageManager;
}
