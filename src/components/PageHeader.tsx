import { cn } from '@/lib/utils';

interface PageHeaderProps {
  left?: React.ReactNode;
  title?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  children?: React.ReactNode; // optional extra row (e.g. progress bar)
}

export function PageHeader({ left, title, right, className, children }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 border-b border-border bg-card/70 backdrop-blur-[20px] backdrop-saturate-[1.8]',
        className,
      )}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <div className="flex w-12 shrink-0 items-center justify-start">{left}</div>
        <div className="flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.02em]">
          {title}
        </div>
        <div className="flex w-12 shrink-0 items-center justify-end">{right}</div>
      </div>
      {children}
    </header>
  );
}
