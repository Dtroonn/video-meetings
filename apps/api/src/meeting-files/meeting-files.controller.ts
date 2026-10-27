import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { UPLOAD_CHUNK_SIZE } from '@video-meetings/contracts';
import type { Request } from 'express';
import type { AuthenticatedUser } from '@/auth/auth.types';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import { CompleteUploadCommand } from './commands/complete-upload/complete-upload.command';
import { StartUploadCommand } from './commands/start-upload/start-upload.command';
import { UploadChunkCommand } from './commands/upload-chunk/upload-chunk.command';
import { CompleteMeetingFileUploadResponseDto } from './dto/complete-meeting-file-upload-response.dto';
import { GetMeetingFilesRequestDto } from './dto/get-meeting-files-request.dto';
import { MeetingFileResponseDto } from './dto/meeting-file-response.dto';
import { StartMeetingFileUploadRequestDto } from './dto/start-meeting-file-upload-request.dto';
import { StartMeetingFileUploadResponseDto } from './dto/start-meeting-file-upload-response.dto';
import { UploadMeetingFileChunkRequestDto } from './dto/upload-meeting-file-chunk-request.dto';
import { UploadMeetingFileChunkResponseDto } from './dto/upload-meeting-file-chunk-response.dto';
import { GetMeetingFilesQuery } from './queries/get-meeting-files/get-meeting-files.query';

/**
 * Checks the framing of a chunk request before its body is read: a raw octet-stream body (Nest's
 * JSON/urlencoded parsers leave it unread, so it reaches the handler as a stream) with a known,
 * non-zero length of at most `UPLOAD_CHUNK_SIZE`.
 */
const chunkLength = (req: Request): number => {
  if (!req.is('application/octet-stream')) {
    throw new UnsupportedMediaTypeException('Send the chunk as application/octet-stream');
  }
  const header = req.headers['content-length'];
  if (header === undefined) {
    throw new HttpException('Content-Length is required', HttpStatus.LENGTH_REQUIRED);
  }
  const length = Number(header);
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new BadRequestException('The chunk is empty');
  }
  if (length > UPLOAD_CHUNK_SIZE) {
    throw new PayloadTooLargeException(`A chunk may be at most ${UPLOAD_CHUNK_SIZE} bytes`);
  }
  return length;
};

// Every route requires an access token (global `AccessTokenGuard`).
@Controller('meeting/files')
export class MeetingFilesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /** A meeting's completed files, oldest first. */
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() { meetingId }: GetMeetingFilesRequestDto,
  ): Promise<MeetingFileResponseDto[]> {
    const files = await this.queryBus.execute(new GetMeetingFilesQuery(meetingId, user.id));
    return files.map((file) => new MeetingFileResponseDto(file));
  }

  @Post('uploads')
  async startUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() { meetingId, name, type, size }: StartMeetingFileUploadRequestDto,
  ): Promise<StartMeetingFileUploadResponseDto> {
    const upload = await this.commandBus.execute(
      new StartUploadCommand(user.id, meetingId, name, type, size),
    );
    return new StartMeetingFileUploadResponseDto(upload);
  }

  @Post('uploads/:id/chunks')
  @HttpCode(HttpStatus.OK)
  async uploadChunk(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() { offset }: UploadMeetingFileChunkRequestDto,
    @Req() req: Request,
  ): Promise<UploadMeetingFileChunkResponseDto> {
    const upload = await this.commandBus.execute(
      new UploadChunkCommand(id, user.id, offset, chunkLength(req), req),
    );
    return new UploadMeetingFileChunkResponseDto(upload);
  }

  @Post('uploads/:id/complete')
  @HttpCode(HttpStatus.OK)
  async completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CompleteMeetingFileUploadResponseDto> {
    const file = await this.commandBus.execute(new CompleteUploadCommand(id, user.id));
    return new CompleteMeetingFileUploadResponseDto(file);
  }
}
