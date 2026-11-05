import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DiscardExpiredUploadsCommand } from '../commands/discard-expired-uploads/discard-expired-uploads.command';

/**
 * Discards expired pending uploads every hour, so their partial data doesn't stay on disk.
 * Starting an upload also discards an expired match itself, so expiry doesn't wait for this job.
 */
@Injectable()
export class ExpiredUploadsCleanupService {
  private readonly logger = new Logger(ExpiredUploadsCleanupService.name);

  constructor(private readonly commandBus: CommandBus) {}

  @Cron(CronExpression.EVERY_HOUR)
  async discardExpiredUploads(): Promise<void> {
    try {
      const count = await this.commandBus.execute(new DiscardExpiredUploadsCommand());
      if (count > 0) {
        this.logger.log(`Discarded ${count} expired upload(s)`);
      }
    } catch (error) {
      // The next run tries again.
      this.logger.error(`Could not discard expired uploads: ${String(error)}`);
    }
  }
}
