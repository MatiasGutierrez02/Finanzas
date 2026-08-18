export type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type CategoryId = Brand<string, 'CategoryId'>;
export type InstallmentGroupId = Brand<string, 'InstallmentGroupId'>;
export type LocalDate = Brand<string, 'LocalDate'>;
export type MoneyCents = Brand<number, 'MoneyCents'>;
export type RecurringRuleId = Brand<string, 'RecurringRuleId'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type YearMonth = Brand<string, 'YearMonth'>;

export type IsoTimestamp = Brand<string, 'IsoTimestamp'>;
