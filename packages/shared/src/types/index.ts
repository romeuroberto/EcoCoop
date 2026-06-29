export enum ProfileType {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SORTER = 'SORTER',
  DRIVER = 'DRIVER',
  MEMBER = 'MEMBER',
  BUYER = 'BUYER',
}

export interface LoginResponseDto {
  accessToken: string;
  profile: ProfileType;
  redirectTo: string;
}

/**
 * Phase 1 shape — buyerId intentionally absent until Phase 4 (buyer portal).
 */
export interface CurrentUserDto {
  id: string;
  email: string;
  profileId: string;
  profileType: ProfileType;
  permissions: Array<{ module: string; action: string }>;
}
