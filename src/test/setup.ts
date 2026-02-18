import { vi, beforeEach } from 'vitest';

// Reset mock call history between tests (but keep implementations)
beforeEach(() => {
  vi.clearAllMocks();
  localStorageStore.clear();
});

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn());

// Mock localStorage
const localStorageStore = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => localStorageStore.set(key, value)),
  removeItem: vi.fn((key: string) => localStorageStore.delete(key)),
  clear: vi.fn(() => localStorageStore.clear()),
  get length() {
    return localStorageStore.size;
  },
  key: vi.fn((index: number) => [...localStorageStore.keys()][index] ?? null),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock window.location.origin
Object.defineProperty(window, 'location', {
  value: { ...window.location, origin: 'https://contentdeck.vercel.app' },
  writable: true,
});
