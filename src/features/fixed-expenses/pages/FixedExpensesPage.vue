<template>
  <q-page class="fixed-expenses-page q-pa-md">
    <main class="fixed-expenses-content">
      <p class="text-overline text-primary q-mb-xs">CONFIGURACIÓN</p>
      <h1 class="text-h5 text-weight-bold q-mt-none q-mb-sm">Gastos fijos</h1>
      <p class="text-body2 text-grey-7 q-mt-none q-mb-lg">
        Una referencia mensual que no modifica tu balance.
      </p>
      <q-card flat bordered class="summary-card q-mb-md"
        ><q-card-section>
          <div class="text-caption text-grey-7">Total mensual estimado</div>
          <div class="text-h4 text-weight-bold q-mt-xs">{{ formatArs(totalCents) }}</div>
        </q-card-section></q-card
      >
      <q-banner v-if="errorMessage" class="error-banner q-mb-md" rounded
        >{{ errorMessage
        }}<template #action><q-btn flat no-caps label="Cerrar" @click="clearError" /></template
      ></q-banner>
      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="42px" />
      </div>
      <q-card v-else-if="items.length === 0" flat bordered class="expense-card"
        ><q-card-section class="text-center q-py-xl">
          <q-icon name="event_repeat" color="grey-5" size="48px" />
          <div class="text-subtitle1 text-weight-medium q-mt-sm">
            No tenés gastos fijos cargados.
          </div>
          <div class="text-body2 text-grey-7">Agregá el primero con el botón +.</div>
        </q-card-section></q-card
      >
      <section v-else class="expense-list" aria-label="Lista de gastos fijos">
        <q-card v-for="item in items" :key="item.estimate.id" flat bordered class="expense-card">
          <q-item clickable v-ripple @click="openEditor(item.estimate)">
            <q-item-section avatar
              ><span
                class="category-icon"
                :style="{ backgroundColor: item.category?.color ?? 'var(--q-primary)' }"
                ><q-icon :name="resolveCategoryIcon(item.category?.icon ?? 'event_repeat')" /></span
            ></q-item-section>
            <q-item-section
              ><q-item-label class="text-weight-medium">{{ item.estimate.name }}</q-item-label
              ><q-item-label caption>{{
                item.category?.name ?? 'Sin categoría'
              }}</q-item-label></q-item-section
            >
            <q-item-section side
              ><q-item-label class="text-subtitle1 text-weight-bold">{{
                formatArs(item.estimate.amountCents)
              }}</q-item-label></q-item-section
            >
          </q-item>
        </q-card>
      </section>
      <q-page-sticky position="bottom-right" :offset="[20, 20]"
        ><q-btn
          round
          color="primary"
          icon="add"
          size="lg"
          aria-label="Agregar gasto fijo"
          @click="openEditor(null)"
      /></q-page-sticky>
    </main>
    <q-dialog v-model="editorOpen" persistent
      ><q-card class="editor-card">
        <q-card-section class="row items-center"
          ><div class="text-h6">{{ editing ? 'Editar gasto fijo' : 'Nuevo gasto fijo' }}</div>
          <q-space /><q-btn v-close-popup flat round dense icon="close" aria-label="Cerrar"
        /></q-card-section>
        <q-form @submit.prevent="submit"
          ><q-card-section class="q-pt-none q-gutter-md">
            <q-input
              v-model="form.name"
              outlined
              autofocus
              maxlength="80"
              label="Nombre"
              :rules="[(value) => value.trim().length > 0 || 'Ingresá un nombre']"
            />
            <q-input
              v-model="form.amount"
              outlined
              inputmode="decimal"
              prefix="$"
              label="Monto mensual"
              hint="Pesos argentinos"
              :rules="[(value) => value.trim().length > 0 || 'Ingresá un monto']"
            />
            <q-select
              v-model="form.categoryId"
              outlined
              emit-value
              map-options
              clearable
              label="Categoría (opcional)"
              :options="categoryOptions"
            >
              <template #option="scope"
                ><q-item v-bind="scope.itemProps"
                  ><q-item-section avatar
                    ><q-icon :name="scope.opt.icon" :color="scope.opt.color" /></q-item-section
                  ><q-item-section>{{ scope.opt.label }}</q-item-section></q-item
                ></template
              >
            </q-select> </q-card-section
          ><q-card-actions align="between" class="q-pa-md q-pt-none">
            <q-btn
              v-if="editing"
              flat
              no-caps
              color="negative"
              label="Eliminar"
              icon="delete_outline"
              @click="confirmDelete"
            /><q-space v-else />
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              label="Guardar"
              :loading="saving"
            /> </q-card-actions
        ></q-form> </q-card
    ></q-dialog>
  </q-page>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useQuasar } from 'quasar';
import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';
import type { FixedExpenseEstimate } from '@/models/fixed-expense-estimate';
import { formatArs, formatMoneyInput } from '@/utils/money';
import { useFixedExpenses } from '../composables/use-fixed-expenses';
const $q = useQuasar();
const { categories, clearError, errorMessage, items, loading, remove, save, saving, totalCents } =
  useFixedExpenses();
const editorOpen = ref(false);
const editing = ref<FixedExpenseEstimate | null>(null);
const form = reactive({ name: '', amount: '', categoryId: null as string | null });
const categoryOptions = computed(() =>
  categories.value.map((category) => ({
    label: category.name,
    value: category.id,
    color: category.color,
    icon: resolveCategoryIcon(category.icon),
  })),
);
function openEditor(estimate: FixedExpenseEstimate | null): void {
  clearError();
  editing.value = estimate;
  Object.assign(
    form,
    estimate === null
      ? { name: '', amount: '', categoryId: null }
      : {
          name: estimate.name,
          amount: formatMoneyInput(estimate.amountCents),
          categoryId: estimate.categoryId,
        },
  );
  editorOpen.value = true;
}
async function submit(): Promise<void> {
  if (await save({ ...form }, editing.value)) {
    editorOpen.value = false;
    $q.notify({
      type: 'positive',
      message: editing.value ? 'Gasto fijo actualizado.' : 'Gasto fijo creado.',
    });
  }
}
function confirmDelete(): void {
  const estimate = editing.value;
  if (estimate === null) return;
  $q.dialog({
    title: 'Eliminar gasto fijo',
    message: `¿Querés eliminar “${estimate.name}”? Solo se borrará esta referencia mensual.`,
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true },
    persistent: true,
  }).onOk(() => void deleteEstimate(estimate));
}
async function deleteEstimate(estimate: FixedExpenseEstimate): Promise<void> {
  if (await remove(estimate)) {
    editorOpen.value = false;
    $q.notify({ type: 'positive', message: 'Gasto fijo eliminado.' });
  }
}
</script>
<style scoped>
.fixed-expenses-page {
  background: var(--app-background);
}
.fixed-expenses-content {
  width: min(100%, 680px);
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 2rem);
  padding-bottom: 80px;
}
.summary-card,
.expense-card,
.editor-card {
  border-radius: 20px;
  background: var(--app-surface);
}
.expense-list {
  display: grid;
  gap: 12px;
}
.category-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: white;
  border-radius: 50%;
}
.editor-card {
  width: min(92vw, 480px);
}
.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
</style>
