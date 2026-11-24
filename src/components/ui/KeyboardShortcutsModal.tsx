import React, { useEffect, useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useRouter } from '../../lib/router';

const SHORTCUTS = [
  { key: '/', label: 'Mở nhanh tìm kiếm trong AI Library' },
  { key: '?', label: 'Mở hoặc đóng bảng phím tắt này' },
  { key: 'F', label: 'Bật / tắt Chế độ tập trung khi đang đọc bài' },
  { key: 'Esc', label: 'Đóng hộp thoại, chú giải hoặc thoát Chế độ tập trung' },
  { key: 'Enter', label: 'Gửi lượt trao đổi trong AI Labs (Shift + Enter để xuống dòng)' },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const { pathname, navigate } = useRouter();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);

      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }

      if (isTyping) return;

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        if (pathname === '/library') {
          const input = document.getElementById('library-search-input') as HTMLInputElement | null;
          if (input) {
            input.focus();
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          navigate('/library?focus=1');
        }
      }
    };

    const onOpenEvent = () => setOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('machngon:open-shortcuts', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('machngon:open-shortcuts', onOpenEvent);
    };
  }, [open, pathname, navigate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[var(--color-primary)]">
            <Keyboard className="h-5 w-5" />
            <h2 id="shortcuts-modal-title" className="font-display text-xl font-bold text-[var(--color-text)]">
              Phím tắt bàn phím
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng bảng phím tắt"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mt-4 divide-y divide-[var(--color-border)]/70">
          {SHORTCUTS.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
              <span className="text-[var(--color-text)]">{item.label}</span>
              <kbd className="shrink-0 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 font-mono-num text-xs font-semibold text-[var(--color-primary)]">
                {item.key}
              </kbd>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-primary !min-h-9 !px-4 !text-xs"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
