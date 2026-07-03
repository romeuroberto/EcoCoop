import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { BuyersModule } from './modules/buyers/buyers.module';
import { CooperativeModule } from './modules/cooperative/cooperative.module';
import { MaterialCategoriesModule } from './modules/material-categories/material-categories.module';
import { MaterialSubcategoriesModule } from './modules/material-subcategories/material-subcategories.module';
import { MemberRolesModule } from './modules/member-roles/member-roles.module';
import { MembersModule } from './modules/members/members.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { UnitsModule } from './modules/units/units.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { EpiTypesModule } from './modules/epi-types/epi-types.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { CollectionPointsModule } from './modules/collection-points/collection-points.module';
import { CollectionRoutesModule } from './modules/collection-routes/collection-routes.module';
import { RawMaterialEntriesModule } from './modules/raw-material-entries/raw-material-entries.module';
import { RawMaterialBalanceModule } from './modules/raw-material-balance/raw-material-balance.module';
import { RouteTemplatesModule } from './modules/route-templates/route-templates.module';
import { SortingOperationsModule } from './modules/sorting-operations/sorting-operations.module';
import { ReadyStockModule } from './modules/ready-stock/ready-stock.module';
import { ReadyStockAdjustmentsModule } from './modules/ready-stock-adjustments/ready-stock-adjustments.module';
import { SalesModule } from './modules/sales/sales.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    AuthModule,
    CooperativeModule,
    ProfilesModule,
    UsersModule,
    MemberRolesModule,
    MembersModule,
    MaterialCategoriesModule,
    MaterialSubcategoriesModule,
    UnitsModule,
    BuyersModule,
    VehiclesModule,
    EpiTypesModule,
    CostCentersModule,
    CollectionPointsModule,
    CollectionRoutesModule,
    RawMaterialEntriesModule,
    RawMaterialBalanceModule,
    RouteTemplatesModule,
    SortingOperationsModule,
    ReadyStockModule,
    ReadyStockAdjustmentsModule,
    SalesModule,
    AccountsReceivableModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
