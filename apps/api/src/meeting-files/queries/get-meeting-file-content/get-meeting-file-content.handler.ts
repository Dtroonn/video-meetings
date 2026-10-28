import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { StorageService } from '@/storage/storage.service';
import type { MeetingFileContent } from '../../meeting-files.types';
import { MeetingFilesService } from '../../services/meeting-files.service';
import { GetMeetingFileContentQuery } from './get-meeting-file-content.query';

@QueryHandler(GetMeetingFileContentQuery)
export class GetMeetingFileContentHandler implements IQueryHandler<
  GetMeetingFileContentQuery,
  MeetingFileContent
> {
  constructor(
    private readonly storage: StorageService,
    private readonly files: MeetingFilesService,
  ) {}

  async execute({ id, userId }: GetMeetingFileContentQuery): Promise<MeetingFileContent> {
    const { file } = await this.files.findVisibleFile(id, userId);
    const { size, stream } = await this.storage.openRead(file.storageKey);
    return { name: file.name, size, stream };
  }
}
