import type { CategoryId, IsoTimestamp } from './common';

export interface Category {
  id: CategoryId;
  name: string;
  color: `#${string}`;
  icon: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}
