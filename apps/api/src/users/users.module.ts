import { Module } from '@nestjs/common';
import { CreateUserHandler } from './commands/create-user/create-user.handler';
import { RemoveAvatarHandler } from './commands/remove-avatar/remove-avatar.handler';
import { SetAvatarHandler } from './commands/set-avatar/set-avatar.handler';
import { UpdatePasswordHashHandler } from './commands/update-password-hash/update-password-hash.handler';
import { UpdateProfileHandler } from './commands/update-profile/update-profile.handler';
import { GetAvatarHandler } from './queries/get-avatar/get-avatar.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id/get-user-by-id.handler';
import { GetUserCredentialsByEmailHandler } from './queries/get-user-credentials-by-email/get-user-credentials-by-email.handler';
import { GetUserCredentialsByIdHandler } from './queries/get-user-credentials-by-id/get-user-credentials-by-id.handler';
import { GetUsersByIdsHandler } from './queries/get-users-by-ids/get-users-by-ids.handler';
import { UsersController } from './users.controller';

// Nothing is exported: other modules use users through CommandBus/QueryBus with the command and
// query classes from this folder.
@Module({
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    GetAvatarHandler,
    GetUserByIdHandler,
    GetUserCredentialsByEmailHandler,
    GetUserCredentialsByIdHandler,
    GetUsersByIdsHandler,
    RemoveAvatarHandler,
    SetAvatarHandler,
    UpdatePasswordHashHandler,
    UpdateProfileHandler,
  ],
})
export class UsersModule {}
