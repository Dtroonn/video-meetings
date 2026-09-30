import { Module } from '@nestjs/common';
import { CreateUserHandler } from './commands/create-user/create-user.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id/get-user-by-id.handler';
import { GetUserCredentialsByEmailHandler } from './queries/get-user-credentials-by-email/get-user-credentials-by-email.handler';

// Nothing is exported: other modules use users through CommandBus/QueryBus with the command and
// query classes from this folder.
@Module({
  providers: [CreateUserHandler, GetUserByIdHandler, GetUserCredentialsByEmailHandler],
})
export class UsersModule {}
