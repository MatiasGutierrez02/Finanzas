<template>
  <div class="category-grid" role="radiogroup" aria-label="Categorías">
    <button
      v-for="category in categories"
      :key="category.id"
      class="category-option"
      :class="{ 'category-option--selected': model === category.id }"
      type="button"
      role="radio"
      :aria-checked="model === category.id"
      :aria-label="`Categoría ${category.name}${model === category.id ? ', seleccionada' : ''}`"
      @click="model = category.id"
    >
      <span class="category-icon" :style="{ backgroundColor: category.color }">
        <q-icon :name="resolveCategoryIcon(category.icon)" size="24px" />
      </span>
      <span class="category-name">{{ category.name }}</span>
      <q-icon
        v-if="model === category.id"
        class="selected-mark"
        name="check_circle"
        color="primary"
        size="18px"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '@/models/category';
import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';

defineProps<{
  categories: Category[];
}>();

const model = defineModel<string>({ required: true });
</script>

<style scoped>
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.category-option {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  min-height: 94px;
  padding: 10px 4px 8px;
  color: var(--app-text);
  font: inherit;
  background: var(--app-surface);
  border: 2px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
  -webkit-tap-highlight-color: transparent;
}

.category-option:hover {
  background: var(--app-hover);
}

.category-option:focus-visible {
  outline: 3px solid rgb(49 91 219 / 28%);
  outline-offset: 2px;
}

.category-option:active {
  transform: scale(0.97);
}

.category-option--selected {
  background: var(--app-selected);
  border-color: var(--q-primary);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  color: white;
  border-radius: 50%;
  box-shadow: 0 5px 12px rgb(24 32 51 / 14%);
}

.category-name {
  display: -webkit-box;
  width: 100%;
  margin-top: 7px;
  overflow: hidden;
  font-size: 0.76rem;
  font-weight: 500;
  line-height: 1.15;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.selected-mark {
  position: absolute;
  top: 5px;
  right: 5px;
  background: var(--app-surface);
  border-radius: 50%;
}

@media (max-width: 360px) {
  .category-grid {
    gap: 6px;
  }

  .category-option {
    padding-inline: 2px;
  }
}

@media (min-width: 600px) {
  .category-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .category-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}
</style>
