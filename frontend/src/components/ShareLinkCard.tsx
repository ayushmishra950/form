import { useState } from 'react';
import { CheckIcon, CopyIcon } from './Icons';
import { Button } from './ui/Primitives';
import { cn } from '../lib/utils';

interface ShareLinkCardProps {
  url: string;
  className?: string;
}

/** Read-only URL with a copy button — shown after a form is published. */
export function ShareLinkCard({ url, className }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard is blocked (insecure origin / permissions) — the input is
      // already selectable, so the user can still copy it by hand.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        readOnly
        value={url}
        aria-label="Public form link"
        onFocus={(event) => event.target.select()}
        className="w-full truncate rounded-lg border bg-[color:var(--surface-page)] px-3 py-2 font-mono text-xs outline-none focus:border-brand-500"
      />
      <Button variant="secondary" size="sm" onClick={() => void copy()} className="shrink-0">
        {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}
