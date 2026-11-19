import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/prisma/prisma.service';
import { UpdatePasswordHashCommand } from './update-password-hash.command';

@CommandHandler(UpdatePasswordHashCommand)
export class UpdatePasswordHashHandler implements ICommandHandler<
  UpdatePasswordHashCommand,
  boolean
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, currentHash, newHash }: UpdatePasswordHashCommand): Promise<boolean> {
    // A single conditional update, so the check and the write can't be separated by another change.
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, passwordHash: currentHash },
      data: { passwordHash: newHash },
    });
    return count > 0;
  }
}
