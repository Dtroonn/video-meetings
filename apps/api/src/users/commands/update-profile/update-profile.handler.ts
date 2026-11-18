import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { PublicUser } from '@/users/users.types';
import { UpdateProfileCommand } from './update-profile.command';

const RECORD_NOT_FOUND = 'P2025';

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<
  UpdateProfileCommand,
  PublicUser | null
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, changes }: UpdateProfileCommand): Promise<PublicUser | null> {
    const { name, dateOfBirth, gender } = changes;
    try {
      // `undefined` leaves a column untouched, `null` clears it. The `where` is only ever the
      // caller's own id, so a request can't reach another user's row.
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          name,
          // A `YYYY-MM-DD` string parses as UTC midnight, which the `date` column stores as is.
          dateOfBirth:
            dateOfBirth === undefined || dateOfBirth === null ? dateOfBirth : new Date(dateOfBirth),
          gender,
        },
        omit: { passwordHash: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw error;
    }
  }
}
