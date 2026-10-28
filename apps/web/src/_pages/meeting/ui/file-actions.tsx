'use client';

import { ArrowDownToLine, TrashBin } from '@gravity-ui/icons';
import { AlertDialog, Button, Spinner } from '@heroui/react';
import { buttonVariants } from '@heroui/styles';
import type { MeetingFileResponse } from '@video-meetings/contracts';
import { AxiosError } from 'axios';
import { useState, type MouseEvent } from 'react';
import { formatMessage, type Dictionary } from '@/shared/i18n';
import { meetingFileDownloadUrl, refreshSessionForDownload } from '../api/download-meeting-file';
import { useMeetingFilesStore } from '../model/meeting-files-store';

type FilesTexts = Dictionary['meeting']['page']['files'];

/** Saves the file at `url` with the name the api sends (`Content-Disposition`), not navigating. */
function saveFrom(url: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  link.click();
}

/**
 * The props of a link that downloads `file`. A plain click first refreshes the session (see
 * `refreshSessionForDownload`), then saves the file; clicks with a modifier key (new tab, save as)
 * are left to the browser.
 */
function downloadLinkProps(file: MeetingFileResponse) {
  const url = meetingFileDownloadUrl(file.id);
  return {
    href: url,
    download: true,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      // Never rejects, so it can run without awaiting.
      refreshSessionForDownload().then(() => saveFrom(url));
    },
  };
}

/** The file's name as a download link; its text is the name, the icon button next to it says "Download". */
export function FileDownloadLink({ file }: { file: MeetingFileResponse }) {
  return (
    <a
      {...downloadLinkProps(file)}
      title={file.name}
      className="focus-visible:status-focused truncate rounded-sm font-medium underline-offset-2 outline-none hover:underline"
    >
      {file.name}
    </a>
  );
}

/** An icon button (a link styled as one) that downloads the file, shown before the delete button. */
export function FileDownloadButton({ file, t }: { file: MeetingFileResponse; t: FilesTexts }) {
  const label = formatMessage(t.download, { name: file.name });
  return (
    <a
      {...downloadLinkProps(file)}
      aria-label={label}
      title={label}
      className={buttonVariants({ isIconOnly: true, size: 'sm', variant: 'ghost' })}
    >
      <ArrowDownToLine aria-hidden className="size-4" />
    </a>
  );
}

/**
 * A delete button for one file, asking for confirmation in a dialog. Once deleted, the file leaves
 * the list (and this button with it); a failure is shown in the dialog, which stays open.
 */
export function DeleteFileButton({ file, t }: { file: MeetingFileResponse; t: FilesTexts }) {
  const deleteFile = useMeetingFilesStore((state) => state.deleteFile);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const texts = t.deleteDialog;

  const onOpenChange = (open: boolean) => {
    // Closing mid-request would hide its outcome.
    if (isPending) return;
    setIsOpen(open);
    setError(null);
  };

  const confirm = () => {
    setIsPending(true);
    setError(null);
    deleteFile(file.id)
      .then(() => setIsOpen(false))
      .catch((reason: unknown) => {
        const forbidden = reason instanceof AxiosError && reason.response?.status === 403;
        setError(forbidden ? texts.forbidden : texts.failed);
      })
      .finally(() => setIsPending(false));
  };

  return (
    <>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={formatMessage(t.delete, { name: file.name })}
        onPress={() => setIsOpen(true)}
      >
        <TrashBin aria-hidden className="size-4" />
      </Button>
      {/* HeroUI ignores Escape in alert dialogs by default; here it's a plain "Cancel". */}
      <AlertDialog.Backdrop
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        isKeyboardDismissDisabled={isPending}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{texts.title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-2">
              <p className="wrap-break-word">{formatMessage(texts.body, { name: file.name })}</p>
              {error && (
                <p role="alert" className="text-danger text-sm">
                  {error}
                </p>
              )}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" isDisabled={isPending}>
                {texts.cancel}
              </Button>
              <Button variant="danger" isPending={isPending} onPress={confirm}>
                {({ isPending: pending }) => (
                  <>
                    {pending && <Spinner color="current" size="sm" />}
                    {texts.confirm}
                  </>
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
