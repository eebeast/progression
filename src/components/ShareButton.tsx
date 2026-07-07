import * as React from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  /** The plain text to share. */
  text: string;
  className?: string;
}

/** Copy text to the clipboard, with a best-effort fallback for old browsers. */
async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  el.remove();
}

/**
 * Shares a workout recap. Uses the native share sheet when available
 * (`navigator.share`, typically mobile); otherwise copies to the clipboard and
 * shows a brief inline confirmation.
 */
export function ShareButton({ text, className }: ShareButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // User dismissed the share sheet, or it failed — nothing to do.
      }
      return;
    }
    try {
      await copyToClipboard(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — leave the button in its resting state.
    }
  };

  return (
    <div className={className}>
      <Button variant="secondary" className="w-full" onClick={share}>
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? 'Copied to clipboard' : 'Share'}
      </Button>
    </div>
  );
}
