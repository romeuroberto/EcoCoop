import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { CooperativeModule } from './modules/cooperative/cooperative.module';
import { MaterialCategoriesModule } from './modules/material-categories/material-categories.module';
import { MaterialSubcategoriesModule } from './modules/material-subcategories/material-subcategories.module';
import { MemberRolesModule } from './modules/member-roles/member-roles.module';
import { MembersModule } from './modules/members/members.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    AuthModule,
    CooperativeModule,
    ProfilesModule,
    UsersModule,
    MemberRolesModule,
    MembersModule,
    MaterialCategoriesModule,
    MaterialSubcategoriesModule,
    UnitsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
