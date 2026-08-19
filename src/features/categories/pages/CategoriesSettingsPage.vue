<template>
  <q-page class="categories-page q-pa-md">
    <main class="categories-content">
      <p class="text-overline text-primary q-mb-xs">CONFIGURACIÓN</p>
      <h1 class="text-h5 text-weight-bold q-mt-none q-mb-sm">Categorías</h1>
      <p class="text-body2 text-grey-7 q-mt-none q-mb-lg">
        Administrá las categorías creadas por vos.
      </p>

      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="42px" />
      </div>
      <q-banner v-else-if="errorMessage" class="error-banner" rounded>{{ errorMessage }}</q-banner>
      <q-card v-else flat bordered class="categories-card">
        <q-list separator>
          <q-item v-for="category in categories" :key="category.id">
            <q-item-section avatar>
              <span class="category-icon" :style="{ backgroundColor: category.color }">
                <q-icon :name="resolveCategoryIcon(category.icon)" size="22px" />
              </span>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ category.name }}</q-item-label>
              <q-item-label caption>{{
                category.isSystem ? 'Categoría del sistema' : 'Categoría personalizada'
              }}</q-item-label>
            </q-item-section>
            <q-item-section v-if="!category.isSystem" side>
              <div class="row no-wrap">
                <q-btn
                  flat
                  round
                  color="primary"
                  icon="edit"
                  :aria-label="`Editar ${category.name}`"
                  @click="edit(category)"
                />
                <q-btn
                  flat
                  round
                  color="negative"
                  icon="delete_outline"
                  :aria-label="`Eliminar ${category.name}`"
                  @click="confirmRemove(category)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import type { Category } from '@/models/category';
import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';
import { categoryService } from '@/features/categories/services/category.service';

const $q = useQuasar();
const categories = ref<Category[]>([]);
const loading = ref(true);
const errorMessage = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    categories.value = await categoryService.list();
  } catch (error) {
    errorMessage.value = message(error, 'No pudimos cargar las categorías.');
  } finally {
    loading.value = false;
  }
}

function edit(category: Category): void {
  $q.dialog({
    title: 'Editar categoría',
    prompt: { model: category.name, type: 'text', maxlength: 40 },
    cancel: true,
    persistent: true,
  }).onOk((name: string) => void rename(category, name));
}

async function rename(category: Category, name: string): Promise<void> {
  try {
    await categoryService.rename(category.id, name);
    await load();
    $q.notify({ type: 'positive', message: 'Categoría actualizada.' });
  } catch (error) {
    $q.notify({ type: 'negative', message: message(error, 'No pudimos editarla.') });
  }
}

function confirmRemove(category: Category): void {
  $q.dialog({
    title: 'Eliminar categoría',
    message: `Se eliminará ${category.name} si no está en uso.`,
    cancel: true,
    persistent: true,
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(() => void remove(category));
}

async function remove(category: Category): Promise<void> {
  try {
    await categoryService.remove(category.id);
    await load();
    $q.notify({ type: 'positive', message: 'Categoría eliminada.' });
  } catch (error) {
    $q.notify({ type: 'negative', message: message(error, 'No pudimos eliminarla.') });
  }
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
onMounted(load);
</script>

<style scoped>
.categories-page {
  background: var(--app-background);
}
.categories-content {
  width: min(100%, 680px);
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 2rem);
}
.categories-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}
.category-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  color: white;
  border-radius: 50%;
}
.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
</style>
