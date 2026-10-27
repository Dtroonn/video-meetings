import { Module } from '@nestjs/common';
import { CreateUserHandler } from './commands/create-user/create-user.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id/get-user-by-id.handler';
import { GetUserCredentialsByEmailHandler } from './queries/get-user-credentials-by-email/get-user-credentials-by-email.handler';
import { GetUsersByIdsHandler } from './queries/get-users-by-ids/get-users-by-ids.handler';
import { UsersController } from './users.controller';

// Nothing is exported: other modules use users through CommandBus/QueryBus with the command and
// query classes from this folder.
@Module({
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    GetUserByIdHandler,
    GetUserCredentialsByEmailHandler,
    GetUsersByIdsHandler,
  ],
})
export class UsersModule {}
