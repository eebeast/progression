import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShareButton } from '@/components/ShareButton';

afterEach(() => vi.unstubAllGlobals());

describe('ShareButton', () => {
  it('uses the native share sheet when available', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, userAgent: 'test' });

    render(<ShareButton text="my recap" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    expect(share).toHaveBeenCalledWith({ text: 'my recap' });
  });

  it('falls back to the clipboard and confirms when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText }, userAgent: 'test' });

    render(<ShareButton text="my recap" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('my recap');
  });
});
