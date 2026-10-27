import { type MiddlewareConsumer, Module, type NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import cookieParser from 'cookie-parser';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { MeetingFilesModule } from './meeting-files/meeting-files.module';
import { MeetingsModule } from './meetings/meetings.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    CqrsModule.forRoot(),
    PrismaModule,
    StorageModule,
    AuthModule,
    MeetingsModule,
    MeetingFilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Registered here rather than with `app.useGlobalPipes()` in main.ts so it also applies to
    // apps built from AppModule in e2e tests.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule implements NestModule {
  // Here rather than `app.use()` in main.ts for the same reason as the pipe above. Fills
  // `request.cookies`, which `AccessTokenGuard` reads the access token from (middleware runs
  // before guards).
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes('*path');
  }
}
