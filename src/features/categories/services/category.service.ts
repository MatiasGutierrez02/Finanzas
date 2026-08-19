import type { Category } from '@/models/category';
import type { IsoTimestamp } from '@/models/common';
import type { CategoryRepository } from '@/repositories/contracts/category.repository';
import { repositories } from '@/repositories';
import { nowIsoTimestamp } from '@/utils/dates';
import { newCategoryId } from '@/utils/ids';

export const CUSTOM_CATEGORY_ICON = 'category';
export const CUSTOM_CATEGORY_COLORS = [
  '#D81B60',
  '#8E24AA',
  '#5E35B1',
  '#3949AB',
  '#1E88E5',
  '#039BE5',
  '#00ACC1',
  '#00897B',
  '#43A047',
  '#7CB342',
  '#C0CA33',
  '#F9A825',
  '#FB8C00',
  '#F4511E',
  '#6D4C41',
  '#546E7A',
  '#AD1457',
  '#4527A0',
  '#1565C0',
  '#00838F',
  '#2E7D32',
  '#9E9D24',
  '#EF6C00',
  '#C62828',
] as const;

export class CategoryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CategoryValidationError';
  }
}

export class CategoryInUseError extends Error {
  constructor() {
    super('La categoría está en uso. Cambiá primero sus movimientos y suscripciones.');
    this.name = 'CategoryInUseError';
  }
}

interface Dependencies {
  repository: CategoryRepository;
  createId?: typeof newCategoryId;
  now?: () => IsoTimestamp;
}

function fallbackColor(index: number): `#${string}` {
  const hue = (index * 137.508) % 360;
  const saturation = 62;
  const lightness = 46;
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    const a = (saturation / 100) * Math.min(lightness / 100, 1 - lightness / 100);
    return Math.round(255 * (lightness / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return `#${[channel(0), channel(8), channel(4)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export class CategoryService {
  constructor(private readonly dependencies: Dependencies) {}

  getById(id: Category['id']): Promise<Category | undefined> {
    return this.dependencies.repository.getById(id);
  }

  list(): Promise<Category[]> {
    return this.dependencies.repository.getAll();
  }

  async listActive(): Promise<Category[]> {
    return (await this.list()).filter(({ isActive }) => isActive);
  }

  async create(name: string): Promise<Category> {
    const categories = await this.list();
    const normalizedName = this.validateName(name, categories);
    const usedColors = new Set(categories.map(({ color }) => color.toUpperCase()));
    let color: `#${string}` | undefined = CUSTOM_CATEGORY_COLORS.find(
      (candidate) => !usedColors.has(candidate),
    );
    let fallbackIndex = categories.length;
    while (color === undefined) {
      const candidate = fallbackColor(fallbackIndex++);
      if (!usedColors.has(candidate)) color = candidate;
    }
    const timestamp = (this.dependencies.now ?? nowIsoTimestamp)();
    const category: Category = {
      id: (this.dependencies.createId ?? newCategoryId)(),
      name: normalizedName,
      color,
      icon: CUSTOM_CATEGORY_ICON,
      isSystem: false,
      isActive: true,
      sortOrder: Math.max(-1, ...categories.map(({ sortOrder }) => sortOrder)) + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.dependencies.repository.put(category);
    return category;
  }

  async rename(id: Category['id'], name: string): Promise<Category> {
    const categories = await this.list();
    const category = categories.find((item) => item.id === id);
    if (category === undefined) throw new CategoryValidationError('La categoría no existe.');
    if (category.isSystem)
      throw new CategoryValidationError('Las categorías del sistema no se pueden editar.');
    const updated = {
      ...category,
      name: this.validateName(
        name,
        categories.filter((item) => item.id !== id),
      ),
      updatedAt: (this.dependencies.now ?? nowIsoTimestamp)(),
    };
    await this.dependencies.repository.put(updated);
    return updated;
  }

  async remove(id: Category['id']): Promise<void> {
    const category = await this.getById(id);
    if (category === undefined) throw new CategoryValidationError('La categoría no existe.');
    if (category.isSystem)
      throw new CategoryValidationError('Las categorías del sistema no se pueden eliminar.');
    if (!(await this.dependencies.repository.removeIfUnused(id))) throw new CategoryInUseError();
  }

  private validateName(name: string, categories: Category[]): string {
    const normalized = name.trim();
    if (normalized.length === 0) throw new CategoryValidationError('Ingresá un nombre.');
    if (normalized.length > 40)
      throw new CategoryValidationError('El nombre no puede superar los 40 caracteres.');
    if (
      categories.some(
        ({ name: current }) =>
          current.localeCompare(normalized, 'es', { sensitivity: 'accent' }) === 0,
      )
    ) {
      throw new CategoryValidationError('Ya existe una categoría con ese nombre.');
    }
    return normalized;
  }
}

export const categoryService = new CategoryService({ repository: repositories.categories });
