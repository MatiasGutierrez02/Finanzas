import { financesDatabase, type FinancesDatabase } from './finances-database';
import { seedDefaultCategories } from './seed/default-categories';
import { monthlyRecurrenceService } from '@/features/recurring/services/monthly-recurrence.service';
import { todayLocalDate } from '@/utils/dates';

export async function initializeDatabase(
  database: FinancesDatabase = financesDatabase,
): Promise<void> {
  await database.open();
  await seedDefaultCategories(database);
  if (database === financesDatabase) {
    await monthlyRecurrenceService.generateThrough(todayLocalDate());
  }
}
