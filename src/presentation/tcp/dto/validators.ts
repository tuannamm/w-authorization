import {
  registerDecorator,
  ValidateIf,
  type ValidationArguments,
} from 'class-validator';

function rule(
  name: string,
  check: (value: unknown, args: ValidationArguments) => boolean,
): PropertyDecorator {
  return (target, propertyKey) =>
    registerDecorator({
      name,
      target: target.constructor,
      propertyName: String(propertyKey),
      validator: { validate: check },
    });
}
export const IsNonBlank = () =>
  rule('nonBlank', (v) => typeof v === 'string' && !!v.trim());
// Null and explicitly supplied undefined remain invalid.
export function OptionalField(): PropertyDecorator {
  return (target, key) =>
    ValidateIf((object) => Object.prototype.hasOwnProperty.call(object, key))(
      target,
      key as string,
    );
}
export const AtLeastOneField = (fields: readonly string[]) =>
  rule('atLeastOneField', (_, args) =>
    fields.some((key) =>
      Object.prototype.hasOwnProperty.call(args.object, key),
    ),
  );
