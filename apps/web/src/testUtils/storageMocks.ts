// apps/web/src/testUtils/storageMocks.ts
export const makeStorage = () => {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: jest.fn((k: string) => { delete store[k]; }),
    clear: jest.fn(() => { store = {}; }),
  } as unknown as Storage;
};
