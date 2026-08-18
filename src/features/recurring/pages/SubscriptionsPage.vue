<template>
  <q-page class="subscriptions-page q-pa-md">
    <main class="subscriptions-content">
      <p class="text-overline text-primary q-mb-xs">CONFIGURACIÓN</p>
      <h1 class="text-h5 text-weight-bold q-mt-none q-mb-sm">Suscripciones</h1>
      <p class="text-body2 text-grey-7 q-mt-none q-mb-lg">
        Las ocurrencias automáticas se registran el primer día de cada mes.
      </p>

      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="42px" />
      </div>
      <q-banner v-else-if="errorMessage" class="error-banner" rounded>
        {{ errorMessage }}
        <template #action><q-btn flat no-caps label="Reintentar" @click="load" /></template>
      </q-banner>
      <q-card v-else-if="subscriptions.length === 0" flat bordered class="subscription-card">
        <q-card-section class="text-center q-py-xl">
          <q-icon name="autorenew" color="grey-5" size="48px" />
          <div class="text-subtitle1 text-weight-medium q-mt-sm">No hay suscripciones</div>
          <div class="text-body2 text-grey-7">Crealas desde una nueva transacción.</div>
        </q-card-section>
      </q-card>

      <section v-else class="subscription-list" aria-label="Lista de suscripciones">
        <q-card
          v-for="subscription in subscriptions"
          :key="subscription.rule.id"
          flat
          bordered
          class="subscription-card"
        >
          <q-card-section class="row items-start no-wrap q-gutter-md">
            <span class="category-icon" :style="{ backgroundColor: subscription.category.color }">
              <q-icon :name="resolveCategoryIcon(subscription.category.icon)" size="24px" />
            </span>
            <div class="col min-width-zero">
              <div class="row items-center justify-between q-col-gutter-sm">
                <div class="text-subtitle1 text-weight-bold ellipsis">
                  {{ subscription.category.name }}
                </div>
                <q-chip
                  dense
                  :color="subscription.rule.isActive ? 'positive' : 'grey-7'"
                  text-color="white"
                  :label="subscription.rule.isActive ? 'Activa' : 'Pausada'"
                />
              </div>
              <div class="text-h6 text-weight-bold q-mt-xs">
                {{ formatArs(subscription.rule.amountCents) }}
              </div>
              <div v-if="subscription.rule.comment" class="text-body2 text-grey-7 q-mt-xs">
                {{ subscription.rule.comment }}
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">
                <template v-if="subscription.nextOccurrenceDate">
                  Próxima ocurrencia: {{ formatLocalDate(subscription.nextOccurrenceDate) }}
                </template>
                <template v-else>Sin nuevas ocurrencias mientras esté pausada.</template>
              </div>
            </div>
          </q-card-section>

          <q-separator />
          <q-card-actions align="right" class="q-pa-sm">
            <q-btn
              v-if="subscription.rule.isActive"
              flat
              no-caps
              color="warning"
              icon="pause"
              label="Pausar"
              :loading="workingId === subscription.rule.id"
              @click="confirmPause(subscription)"
            />
            <q-btn
              v-else
              flat
              no-caps
              color="positive"
              icon="play_arrow"
              label="Reanudar"
              :loading="workingId === subscription.rule.id"
              @click="resume(subscription)"
            />
            <q-btn
              flat
              no-caps
              color="negative"
              icon="delete_outline"
              label="Cancelar"
              :disable="workingId !== null"
              @click="confirmCancel(subscription)"
            />
          </q-card-actions>
        </q-card>
      </section>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

import { resolveCategoryIcon } from '@/features/categories/utils/category-icons';
import { formatLocalDate } from '@/utils/dates';
import { formatArs } from '@/utils/money';

import {
  subscriptionManagementService,
  type ManagedSubscription,
} from '../services/subscription-management.service';

const $q = useQuasar();
const subscriptions = ref<ManagedSubscription[]>([]);
const loading = ref(true);
const workingId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);

async function load(): Promise<void> {
  loading.value = true;
  errorMessage.value = null;
  try {
    subscriptions.value = await subscriptionManagementService.list();
  } catch (error) {
    errorMessage.value = message(error, 'No pudimos cargar las suscripciones.');
  } finally {
    loading.value = false;
  }
}

function confirmPause(subscription: ManagedSubscription): void {
  $q.dialog({
    title: 'Pausar suscripción',
    message:
      'Se eliminarán sus ocurrencias futuras ya generadas. Los movimientos de hoy y anteriores se conservarán.',
    cancel: { flat: true, label: 'Volver' },
    ok: { color: 'warning', label: 'Pausar', unelevated: true },
    persistent: true,
  }).onOk(() => void pause(subscription));
}

function confirmCancel(subscription: ManagedSubscription): void {
  $q.dialog({
    title: 'Cancelar suscripción',
    message:
      'La regla se cancelará definitivamente y se eliminarán sus ocurrencias futuras. El historial se conservará.',
    cancel: { flat: true, label: 'Volver' },
    ok: { color: 'negative', label: 'Cancelar suscripción', unelevated: true },
    persistent: true,
  }).onOk(() => void cancel(subscription));
}

async function pause(subscription: ManagedSubscription): Promise<void> {
  await run(subscription, async () => {
    const removed = await subscriptionManagementService.pause(subscription.rule.id);
    $q.notify({
      type: 'positive',
      message:
        removed === 1
          ? 'Suscripción pausada. Se eliminó 1 ocurrencia futura.'
          : `Suscripción pausada. Se eliminaron ${removed} ocurrencias futuras.`,
    });
  });
}

async function resume(subscription: ManagedSubscription): Promise<void> {
  await run(subscription, async () => {
    await subscriptionManagementService.resume(subscription.rule.id);
    $q.notify({ type: 'positive', message: 'Suscripción reanudada.' });
  });
}

async function cancel(subscription: ManagedSubscription): Promise<void> {
  await run(subscription, async () => {
    await subscriptionManagementService.cancel(subscription.rule.id);
    $q.notify({ type: 'positive', message: 'Suscripción cancelada.' });
  });
}

async function run(subscription: ManagedSubscription, action: () => Promise<void>): Promise<void> {
  workingId.value = subscription.rule.id;
  try {
    await action();
    subscriptions.value = await subscriptionManagementService.list();
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: message(error, 'No pudimos actualizar la suscripción.'),
    });
  } finally {
    workingId.value = null;
  }
}

function message(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

onMounted(load);
</script>

<style scoped>
.subscriptions-page {
  background: var(--app-background);
}

.subscriptions-content {
  width: min(100%, 680px);
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 2rem);
}

.subscription-list {
  display: grid;
  gap: 12px;
}

.subscription-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}

.category-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  color: white;
  border-radius: 50%;
}

.min-width-zero {
  min-width: 0;
}

.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}
</style>
