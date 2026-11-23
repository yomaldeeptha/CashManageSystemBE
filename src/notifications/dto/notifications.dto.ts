import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAlertEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  mobilePushEnabled?: boolean;

  @IsOptional()
  @IsObject()
  channels?: {
    email?: boolean;
    systemAlert?: boolean;
    mobilePush?: boolean;
  };
}
