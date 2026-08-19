export const DATABASE_NAME = 'FinanzasDB';
export const DATABASE_VERSION = 4;

export const DATABASE_STORES = {
  transactions:
    '&id, date, type, categoryId, recurringRuleId, installmentGroupId, &occurrenceKey, [type+date], [categoryId+date], [categoryId+type+date], [recurringRuleId+date], &[installmentGroupId+installmentNumber]',
  categories: '&id, name, sortOrder',
  recurringRules: '&id, startDate, dayOfMonth, categoryId, type',
  settings: '&key',
} as const;
