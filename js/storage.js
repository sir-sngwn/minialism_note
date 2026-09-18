/**
 * Local Storage & Data Management for Noir Note
 * Full English Edition
 */

const STORAGE_KEY = 'noir_notes_workspace_v5';

const StorageManager = {
  getStorageKey(username) {
    if (username && typeof username === 'string' && username.trim()) {
      return 'noir_workspace_user_' + username.trim();
    }
    return STORAGE_KEY;
  },

  getDefaultState(username) {
    const mainPageId = 'page_main';
    const subPageId1 = 'page_sub_1';
    const subPageId2 = 'page_sub_2';
    const subPageId3 = 'page_sub_3';

    return {
      activePageId: mainPageId,
      pages: [
        // 1. Main Page (Dedicated Dashboard with Subpage Cards)
        {
          id: mainPageId,
          isMain: true,
          parentId: null,
          title: username ? `${username}'s Workspace` : 'Workspace',
          updatedAt: Date.now(),
          cells: []
        },
        // 2. Subpage 1: Algorithms & Coding
        {
          id: subPageId1,
          parentId: mainPageId,
          isMain: false,
          title: 'Algorithms & Coding',
          updatedAt: Date.now(),
          cells: [
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'markdown',
              width: 'full',
              content: '## Binary Search\n\nAn efficient algorithm for finding an element from a sorted array by repeatedly halving the search space.'
            },
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'columns',
              width: 'full',
              left: {
                type: 'markdown',
                content: '### Core Principles\n\n1. Set `low` and `high` pointers\n2. Calculate midpoint `mid`\n3. Compare target with middle value\n\n- **Time Complexity**: O(log N)\n- **Condition**: Pre-sorted collection'
              },
              right: {
                type: 'code',
                lang: 'python',
                content: 'def binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target:\n            return mid\n        elif arr[mid] < target:\n            low = mid + 1\n        else:\n            high = mid - 1\n    return -1'
              }
            },
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'checklist',
              width: 'full',
              items: [
                { id: 'it_1', text: 'Implement iterative binary search', done: true },
                { id: 'it_2', text: 'Solve LeetCode #704: Binary Search', done: false }
              ]
            }
          ]
        },
        // 3. Subpage 2: System Architecture & Notes
        {
          id: subPageId2,
          parentId: mainPageId,
          isMain: false,
          title: 'System Architecture & OS',
          updatedAt: Date.now(),
          cells: [
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'markdown',
              width: 'full',
              content: '## Core Operating System Concepts\n\nSide-by-side study notes for quick revision.'
            },
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'callout',
              width: 'half',
              content: 'Processes own dedicated virtual memory space, whereas threads share memory within the same process. Click the ◫ button above to toggle between full and 2-column widths.'
            },
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'toggle',
              width: 'half',
              title: 'Q. Difference between Process and Thread?',
              content: 'A process is an execution environment with private resources. A thread is the smallest schedulable unit of execution sharing the process code, data, and OS handles.'
            }
          ]
        },
        // 4. Subpage 3: Ideas & Knowledge Base
        {
          id: subPageId3,
          parentId: mainPageId,
          isMain: false,
          title: 'Ideas & Knowledge Base',
          updatedAt: Date.now(),
          cells: [
            {
              id: 'cell_' + Math.random().toString(36).substr(2, 9),
              type: 'markdown',
              width: 'full',
              content: '## Daily Insights\n\nJot down learnings, questions, and ideas freely.'
            }
          ]
        }
      ]
    };
  },

  loadData(username = null) {
    try {
      const key = this.getStorageKey(username);
      let raw = localStorage.getItem(key);

      // Seamless migration of pre-auth workspace to first authenticated account
      if (!raw && username) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(key, raw);
        }
      }

      if (!raw) {
        const defaultState = this.getDefaultState(username);
        this.saveData(defaultState, username);
        return defaultState;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.pages || !parsed.pages.length) {
        return this.getDefaultState(username);
      }
      return parsed;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return this.getDefaultState(username);
    }
  },

  saveData(state, username = null) {
    try {
      const key = this.getStorageKey(username);
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  exportAsJSON(state, username = null) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    const prefix = username ? `noir_${username}` : 'noir_notes';
    downloadAnchor.download = `${prefix}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  },

  importFromJSON(jsonText, username = null) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && Array.isArray(parsed.pages)) {
        this.saveData(parsed, username);
        return parsed;
      }
      throw new Error('Invalid data format.');
    } catch (e) {
      alert('Error loading backup file: ' + e.message);
      return null;
    }
  },

  exportPageAsMarkdown(page, allPages = []) {
    if (!page) return;
    let md = `# ${page.title || 'Untitled'}\n\n`;

    if (page.isMain) {
      md += `## Pages\n\n`;
      const subpages = (typeof PageManager !== 'undefined') ? PageManager.getSubpages(allPages, page.id) : allPages.filter(p => p.parentId === page.id && !p.isMain);
      subpages.forEach(sub => {
        md += `- [${sub.title || 'Page'}](#)\n`;
      });
      md += '\n';
    } else if (Array.isArray(page.cells)) {
      page.cells.forEach(cell => {
        switch (cell.type) {
          case 'columns':
            md += `### [2-Column Section]\n\n`;
            if (cell.left) md += `**[Left]**\n${cell.left.content || ''}\n\n`;
            if (cell.right) md += `**[Right]**\n${cell.right.content || ''}\n\n`;
            break;
          case 'subpage':
            const sub = allPages.find(p => p.id === cell.subpageId);
            const subTitle = sub ? sub.title : 'Page';
            md += `> [PAGE] ${subTitle}\n\n`;
            break;
          case 'markdown':
            md += `${cell.content || ''}\n\n`;
            break;
          case 'code':
            md += `\`\`\`${cell.lang || ''}\n${cell.content || ''}\n\`\`\`\n\n`;
            break;
          case 'checklist':
            if (Array.isArray(cell.items)) {
              cell.items.forEach(item => {
                md += `- [${item.done ? 'x' : ' '}] ${item.text}\n`;
              });
              md += '\n';
            }
            break;
          case 'callout':
            md += `> [NOTE] ${cell.content || ''}\n\n`;
            break;
          case 'toggle':
            md += `<details>\n<summary>${cell.title || ''}</summary>\n\n${cell.content || ''}\n</details>\n\n`;
            break;
        }
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (page.title || 'Untitled').replace(/[\\/:*?"<>|]/g, '_');
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
