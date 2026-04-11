const KEY = 'friendmap_drafts';

export function getDrafts() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}

export function saveDraft(draft) {
  const drafts = getDrafts().filter(d => d.id !== draft.id);
  drafts.unshift(draft);
  localStorage.setItem(KEY, JSON.stringify(drafts.slice(0, 20)));
}

export function removeDraft(id) {
  const drafts = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(KEY, JSON.stringify(drafts));
}
