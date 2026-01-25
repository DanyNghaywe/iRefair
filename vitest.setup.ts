import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend vitest's expect with jest-dom matchers
expect.extend(matchers);

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});
