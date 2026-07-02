import {
  IsISO8601,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsTodayOrFuture(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isTodayOrFuture',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;

          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return false;

          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          date.setUTCHours(0, 0, 0, 0);

          return date >= today;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser hoje ou uma data futura`;
        },
      },
    });
  };
}

export class ActivateRouteTemplateDto {
  @IsISO8601()
  @IsTodayOrFuture()
  startDate!: string;
}
