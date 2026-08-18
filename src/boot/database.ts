import { defineBoot } from '#q-app';

import { initializeDatabase } from '@/db/initialize-database';

export default defineBoot(async () => {
  await initializeDatabase();
});
