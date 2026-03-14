/**
 * storage-keys.ts
 *
 * Single source of truth for every key used with localStorage and IndexedDB
 * throughout the application. Centralising them here prevents typo-driven
 * bugs and makes it trivial to audit what data the app persists.
 */

// ── localStorage keys ─────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  // Edition
  EDITION: 'flisol_edition',

  // Form data
  PARTICIPANT: 'flisol_form_participant',
  SPEAKERS: 'flisol_form_speakers',
  TALKS: 'flisol_form_talks',
  COLLABORATOR: 'flisol_form_collaborator',
  COLLABORATOR_SHIFTS: 'flisol_form_collaborator_disp',
  COLLABORATOR_AREAS: 'flisol_form_collaborator_grupos',

  // App preferences
  LANGUAGE: 'flisolapp.Language',
  DARK_MODE: 'flisolapp.DarkMode',
} as const;

// ── IndexedDB key prefixes ────────────────────────────────────────────────────

export const FILE_PREFIXES = {
  SPEAKER: 'flisol_speaker_',
} as const;
