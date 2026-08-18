<template>
  <q-form class="transaction-form" @submit.prevent="submit">
    <q-btn-toggle
      v-model="form.type"
      class="full-width"
      spread
      no-caps
      unelevated
      toggle-color="primary"
      :color="$q.dark.isActive ? 'grey-9' : 'grey-2'"
      :text-color="$q.dark.isActive ? 'grey-3' : 'grey-8'"
      :options="typeOptions"
      aria-label="Tipo de transacción"
    />

    <q-input
      v-model="form.amount"
      class="amount-input q-mt-lg"
      outlined
      autofocus
      inputmode="decimal"
      prefix="$"
      label="Monto"
      hint="Pesos argentinos"
      :rules="[(value) => value.trim().length > 0 || 'Ingresá un monto']"
    />

    <div class="text-subtitle2 q-mt-md q-mb-sm">Categoría</div>
    <q-field
      :model-value="form.categoryId"
      borderless
      class="category-field"
      :rules="[(value) => value.length > 0 || 'Seleccioná una categoría']"
    >
      <template #control>
        <CategoryGridSelector v-model="form.categoryId" :categories="categories" />
      </template>
    </q-field>

    <q-input
      v-model="form.comment"
      class="q-mt-sm"
      outlined
      autogrow
      maxlength="240"
      counter
      label="Comentario (opcional)"
    />

    <q-input
      v-model="form.date"
      class="q-mt-sm"
      outlined
      type="date"
      label="Fecha"
      stack-label
      :rules="[(value) => value.length > 0 || 'Seleccioná una fecha']"
    />

    <q-card flat bordered class="schedule-card q-mb-md">
      <q-card-section class="q-py-sm">
        <div class="text-subtitle2 q-px-sm q-pt-xs">Repetición</div>
        <div class="schedule-options" role="group" aria-label="Modalidad del movimiento">
          <q-toggle
            :model-value="form.schedule === 'subscription'"
            label="Suscripción"
            :disable="mode === 'edit'"
            @update:model-value="setSchedule('subscription', $event)"
          />
          <q-toggle
            :model-value="form.schedule === 'installments'"
            label="Cuotas"
            :disable="mode === 'edit'"
            @update:model-value="setSchedule('installments', $event)"
          />
        </div>
        <q-input
          v-if="form.schedule === 'installments'"
          v-model="form.installmentCount"
          class="q-mt-sm"
          outlined
          dense
          type="number"
          min="2"
          max="120"
          label="Cantidad de cuotas"
          :disable="mode === 'edit'"
          :rules="[(value) => validateInstallmentCount(value)]"
        />
        <div v-if="mode === 'edit' && form.schedule !== 'none'" class="text-caption text-grey-7">
          Los cambios se aplicarán solamente a este movimiento.
        </div>
      </q-card-section>
    </q-card>

    <q-banner v-if="errorMessage" class="error-banner q-mb-md" rounded>
      {{ errorMessage }}
    </q-banner>

    <q-btn
      class="full-width submit-button"
      color="primary"
      unelevated
      no-caps
      size="lg"
      type="submit"
      :loading="saving"
      :label="mode === 'create' ? 'Guardar transacción' : 'Guardar cambios'"
    />
  </q-form>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useQuasar } from 'quasar';

import type { Category } from '@/models/category';
import { todayLocalDate } from '@/utils/dates';
import CategoryGridSelector from '@/features/categories/components/CategoryGridSelector.vue';

import type { TransactionFormValue } from '../models/transaction-form';

const props = defineProps<{
  categories: Category[];
  defaultType: TransactionFormValue['type'];
  defaultCategoryId: string | undefined;
  errorMessage: string | null;
  initialValue: TransactionFormValue | undefined;
  mode: 'create' | 'edit';
  saving: boolean;
}>();

const emit = defineEmits<{
  submit: [value: TransactionFormValue];
}>();
const $q = useQuasar();

const typeOptions = [
  { label: 'Gasto', value: 'expense' },
  { label: 'Ingreso', value: 'income' },
];

const form = reactive<TransactionFormValue>({
  type: props.defaultType,
  amount: '',
  categoryId: props.defaultCategoryId ?? '',
  comment: '',
  date: todayLocalDate(),
  schedule: 'none',
  installmentCount: '2',
});

watch(
  () => props.initialValue,
  (value) => {
    if (value !== undefined) {
      Object.assign(form, value);
    }
  },
  { immediate: true },
);

function submit(): void {
  emit('submit', { ...form });
}

function setSchedule(value: 'subscription' | 'installments', enabled: boolean): void {
  form.schedule = enabled ? value : 'none';
}

function validateInstallmentCount(value: string): true | string {
  const count = Number(value);
  return Number.isInteger(count) && count >= 2 && count <= 120
    ? true
    : 'Ingresá entre 2 y 120 cuotas';
}
</script>

<style scoped>
.transaction-form {
  width: 100%;
}

.amount-input :deep(input) {
  font-size: 1.75rem;
  font-weight: 700;
}

.category-field :deep(.q-field__control),
.category-field :deep(.q-field__native) {
  min-height: 0;
  padding: 0;
}

.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}

.submit-button {
  min-height: 52px;
  border-radius: 14px;
}

.schedule-card {
  border-radius: 14px;
  background: var(--app-surface);
}

.schedule-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.schedule-options :deep(.q-toggle) {
  min-height: 48px;
}

@media (max-width: 360px) {
  .schedule-options {
    grid-template-columns: 1fr;
  }
}
</style>
