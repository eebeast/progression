import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// globals are off (tests import from 'vitest'), so register RTL cleanup manually.
afterEach(() => cleanup());
