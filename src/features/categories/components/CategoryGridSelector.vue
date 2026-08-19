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
    <button
      class="category-option"
      type="button"
      aria-label="Agregar categoría"
      @click="openCreate"
    >
      <span class="category-icon add-icon"><q-icon name="add" size="28px" /></span>
      <span class="category-name">Agregar</span>
    </button>
  </div>

  <q-dialog v-model="creating">
    <q-card class="create-card">
      <q-card-section><div class="text-h6">Nueva categoría</div></q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          v-model="name"
          outlined
          autofocus
          label="Nombre"
          maxlength="40"
          :error="error !== null"
          :error-message="error ?? undefined"
          @keyup.enter="create"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat no-caps label="Cancelar" />
        <q-btn unelevated no-caps color="primary" label="Crear" :loading="saving" @click="create" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Category } from '@/models/category';
import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';
import { categoryService } from '@/features/categories/services/category.service';

defineProps<{
  categories: Category[];
}>();

const model = defineModel<string>({ required: true });
const emit = defineEmits<{ created: [category: Category] }>();
const creating = ref(false);
const saving = ref(false);
const name = ref('');
const error = ref<string | null>(null);

function openCreate(): void {
  name.value = '';
  error.value = null;
  creating.value = true;
}

async function create(): Promise<void> {
  if (saving.value) return;
  saving.value = true;
  error.value = null;
  try {
    const category = await categoryService.create(name.value);
    emit('created', category);
    model.value = category.id;
    creating.value = false;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'No pudimos crear la categoría.';
  } finally {
    saving.value = false;
  }
}
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

.add-icon {
  color: var(--q-primary);
  background: var(--app-selected);
  border: 2px dashed currentColor;
  box-shadow: none;
}

.create-card {
  width: min(92vw, 420px);
  border-radius: 18px;
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
