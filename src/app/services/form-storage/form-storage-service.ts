import { Injectable } from '@angular/core';
import { SubscriptionType } from '../../models/subscription-type/subscription-type';

const DB_NAME = 'flisol_forms';
const DB_VERSION = 1;
const STORE_NAME = 'files';

@Injectable({
  providedIn: 'root',
})
export class FormStorageService {
  // ── IndexedDB ──────────────────────────────────────────────────────────────
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveFile(key: string, file: File): Promise<void> {
    const data = await file.arrayBuffer();
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ name: file.name, type: file.type, data }, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadFile(key: string): Promise<File | null> {
    const db = await this.openDB();
    const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const r = req.result;
        resolve(r ? new File([r.data], r.name, { type: r.type }) : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteFile(key: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearFilesByPrefix(prefix: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      (req.result as string[])
        .filter((k) => typeof k === 'string' && k.startsWith(prefix))
        .forEach((k) => store.delete(k));
    };
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── localStorage ──────────────────────────────────────────────────────────
  save(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      /* quota exceeded */
    }
  }

  load<T>(key: string, fallback: T): T {
    try {
      const val = localStorage.getItem(key);
      return val ? (JSON.parse(val) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  clear(key: string): void {
    localStorage.removeItem(key);
  }

  async clearAll(): Promise<void> {
    [
      'flisol_form_participant',
      'flisol_form_speakers',
      'flisol_form_talks',
      'flisol_form_collaborator',
      'flisol_form_collaborator_disp',
      'flisol_form_collaborator_grupos',
    ].forEach((k) => localStorage.removeItem(k));
    await this.clearFilesByPrefix('flisol_speaker_');
  }

  getActiveSubscriptionType(): SubscriptionType | null {
    if (localStorage.getItem('flisol_form_participant')) {
      return 'participant';
    }

    if (localStorage.getItem('flisol_form_speakers') || localStorage.getItem('flisol_form_talks')) {
      return 'speaker';
    }

    if (
      localStorage.getItem('flisol_form_collaborator') ||
      localStorage.getItem('flisol_form_collaborator_disp') ||
      localStorage.getItem('flisol_form_collaborator_grupos')
    ) {
      return 'collaborator';
    }

    return null;
  }
}
