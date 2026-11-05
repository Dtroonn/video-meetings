'use client';

import { useEffect } from 'react';
import { isUploadActive, useMeetingFilesStore } from '../model/meeting-files-store';

/**
 * Whether a click on `anchor` would take the user to another page of the app: a plain left click
 * on a same-origin link that isn't a download, doesn't open a new tab and goes to another path.
 */
function leavesPage(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  if (anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) {
    return false;
  }
  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin && url.pathname !== window.location.pathname;
}

/**
 * Warns before the user leaves the page while files are uploading, since leaving stops them:
 * the browser's own prompt on reload, close or typing another address (`beforeunload`; browsers
 * show their own text), and `message` in a confirm dialog for links to other pages of the app,
 * which navigate without unloading. The back button isn't covered: a client-side navigation by
 * history can't be held back. Renders nothing.
 */
export function LeaveWarning({ message }: { message: string }) {
  const isUploading = useMeetingFilesStore((state) => state.uploads.some(isUploadActive));

  useEffect(() => {
    if (!isUploading) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // Capture phase on the document: runs before Next's `<Link>` handler, which React attaches
    // to the root element, so stopping the event here stops the navigation.
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || !leavesPage(event, anchor)) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, { capture: true });
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, { capture: true });
    };
  }, [isUploading, message]);

  return null;
}
