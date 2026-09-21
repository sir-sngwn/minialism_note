/**
 * Supabase Cloud Storage & Data Management for Noir Note
 * Real-time CRUD with local cache fallback
 */

const STORAGE_CACHE_PREFIX = 'noir_cache_user_';

const StorageManager = {
  getClient() {
    const svc = (typeof SupabaseService !== 'undefined') ? SupabaseService : (typeof global !== 'undefined' ? global.SupabaseService : null);
    if (svc && svc.getClient) {
      return svc.getClient();
    }
    return null;
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
          title: username ? `${username.split('@')[0]}'s Workspace` : 'Workspace',
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
        // 3. Subpage 2: System Architecture & OS
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

  // Local cache management
  saveToLocalCache(state, userKey) {
    if (!userKey || !state) return;
    try {
      localStorage.setItem(STORAGE_CACHE_PREFIX + userKey, JSON.stringify(state));
    } catch (e) {}
  },

  loadFromLocalCache(userKey) {
    if (!userKey) return null;
    try {
      const raw = localStorage.getItem(STORAGE_CACHE_PREFIX + userKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Loads notes from Supabase database for the given user.
   * If the user is new (0 notes in DB), seeds initial default workspace into Supabase.
   */
  async loadData(user) {
    const userId = user ? user.id : null;
    const userEmail = user ? user.email : null;

    if (!userId) {
      return this.getDefaultState();
    }

    const client = this.getClient();
    if (!client) {
      // Offline or credentials not yet configured: fallback to local cache
      const cached = this.loadFromLocalCache(userId);
      return cached || this.getDefaultState(userEmail);
    }

    try {
      const { data, error } = await client
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase loadData error:', error);
        const cached = this.loadFromLocalCache(userId);
        return cached || this.getDefaultState(userEmail);
      }

      // Existing user with notes
      if (data && data.length > 0) {
        const pages = data.map(row => ({
          id: row.id,
          title: row.title || 'Untitled',
          parentId: row.parent_id || null,
          isMain: !!row.is_main,
          updatedAt: new Date(row.updated_at || Date.now()).getTime(),
          cells: Array.isArray(row.cells) ? row.cells : []
        }));

        const mainPage = pages.find(p => p.isMain) || pages[0];
        const state = {
          activePageId: mainPage ? mainPage.id : null,
          pages: pages
        };

        this.saveToLocalCache(state, userId);
        return state;
      }

      // First-time user: seed default workspace to Supabase
      const defaultState = this.getDefaultState(userEmail);
      await this.initUserNotesInSupabase(userId, defaultState.pages);
      this.saveToLocalCache(defaultState, userId);
      return defaultState;
    } catch (err) {
      console.error('Supabase loadData exception:', err);
      const cached = this.loadFromLocalCache(userId);
      return cached || this.getDefaultState(userEmail);
    }
  },

  /**
   * Batch insert initial default pages for a newly registered user
   */
  async initUserNotesInSupabase(userId, pages) {
    const client = this.getClient();
    if (!client || !userId || !Array.isArray(pages)) return false;

    try {
      const rows = pages.map(p => ({
        id: p.id,
        user_id: userId,
        title: p.title || 'Untitled',
        parent_id: p.parentId || null,
        is_main: !!p.isMain,
        cells: p.cells || [],
        updated_at: new Date().toISOString()
      }));

      const { error } = await client.from('notes').insert(rows);
      if (error) {
        console.error('Failed to seed default notes in Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception seeding notes in Supabase:', e);
      return false;
    }
  },

  /**
   * Save / Upsert a single note in Supabase
   */
  async saveNote(note, userId) {
    if (!note || !userId) return false;

    const client = this.getClient();
    if (!client) return false;

    try {
      const row = {
        id: note.id,
        user_id: userId,
        title: note.title || 'Untitled',
        parent_id: note.parentId || null,
        is_main: !!note.isMain,
        cells: note.cells || [],
        updated_at: new Date().toISOString()
      };

      const { error } = await client.from('notes').upsert(row);
      if (error) {
        console.error('Failed to upsert note in Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception saving note in Supabase:', e);
      return false;
    }
  },

  /**
   * Delete a single note from Supabase
   */
  async deleteNote(noteId, userId) {
    if (!noteId || !userId) return false;
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete note from Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception deleting note from Supabase:', e);
      return false;
    }
  },

  /**
   * Delete multiple notes from Supabase (e.g. parent page and all descendants)
   */
  async deleteNotes(noteIds, userId) {
    if (!noteIds || !noteIds.length || !userId) return false;
    const client = this.getClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from('notes')
        .delete()
        .in('id', noteIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete notes in batch from Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception batch deleting notes from Supabase:', e);
      return false;
    }
  },

  /**
   * Save all notes / full state to Supabase
   */
  async saveAllNotes(pages, userId) {
    if (!pages || !pages.length || !userId) return false;
    const client = this.getClient();
    if (!client) return false;

    try {
      const rows = pages.map(p => ({
        id: p.id,
        user_id: userId,
        title: p.title || 'Untitled',
        parent_id: p.parentId || null,
        is_main: !!p.isMain,
        cells: p.cells || [],
        updated_at: new Date().toISOString()
      }));

      const { error } = await client.from('notes').upsert(rows);
      if (error) {
        console.error('Failed to save all notes to Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception saving all notes to Supabase:', e);
      return false;
    }
  },

  exportAsJSON(state, userEmail = null) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    const prefix = userEmail ? `noir_${userEmail.split('@')[0]}` : 'noir_notes';
    downloadAnchor.download = `${prefix}_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  },

  async importFromJSON(jsonText, user) {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && Array.isArray(parsed.pages)) {
        if (user && user.id) {
          await this.saveAllNotes(parsed.pages, user.id);
          this.saveToLocalCache(parsed, user.id);
        }
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
      const subpages = (typeof PageManager !== 'undefined')
        ? PageManager.getSubpages(allPages, page.id)
        : allPages.filter(p => p.parentId === page.id && !p.isMain);
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

if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
