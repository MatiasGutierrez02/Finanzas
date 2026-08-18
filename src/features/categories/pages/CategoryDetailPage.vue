<template>
  <q-page class="category-page q-pa-md">
    <main class="category-content">
      <div v-if="loading" class="row justify-center q-py-xl">
        <q-spinner color="primary" size="42px" />
      </div>

      <q-banner v-else-if="errorMessage || !snapshot" class="error-banner" rounded>
        {{ errorMessage ?? 'No pudimos cargar la categoría.' }}
        <template #action><q-btn flat no-caps label="Reintentar" @click="load" /></template>
      </q-banner>

      <template v-else>
        <header class="category-header row items-center no-wrap q-gutter-md">
          <span class="category-icon" :style="{ backgroundColor: snapshot.category.color }">
            <q-icon :name="resolveCategoryIcon(snapshot.category.icon)" size="30px" />
          </span>
          <div>
            <div class="text-caption text-grey-7">
              {{ query.type === 'expense' ? 'Gastos' : 'Ingresos' }}
            </div>
            <h1 class="text-h5 text-weight-bold q-my-none">{{ snapshot.category.name }}</h1>
            <div class="text-body2 text-grey-7">{{ periodLabel }}</div>
          </div>
        </header>

        <q-card v-if="snapshot.groups.length > 0" flat bordered class="movements-card q-mt-lg">
          <section v-for="(group, index) in snapshot.groups" :key="group.date">
            <q-separator v-if="index > 0" />
            <div class="date-heading text-subtitle2 text-weight-bold">
              {{ formatLocalDayMonth(group.date) }}
            </div>
            <q-list separator>
              <q-item
                v-for="transaction in group.transactions"
                :key="transaction.id"
                clickable
                v-ripple
                :to="transactionDetailLocation(transaction.id)"
              >
                <q-item-section>
                  <q-item-label class="text-subtitle1 text-weight-bold">
                    {{ formatArs(transaction.amountCents) }}
                  </q-item-label>
                  <q-item-label v-if="transaction.comment" caption lines="2">
                    {{ transaction.comment }}
                  </q-item-label>
                  <q-item-label v-else caption>Sin comentario</q-item-label>
                  <q-item-label v-if="transaction.installmentNumber" caption>
                    Cuota {{ transaction.installmentNumber }}/{{ transaction.installmentCount }}
                  </q-item-label>
                  <q-item-label v-else-if="transaction.recurringRuleId" caption>
                    Suscripción mensual
                  </q-item-label>
                </q-item-section>
                <q-item-section side><q-icon name="chevron_right" /></q-item-section>
              </q-item>
            </q-list>
          </section>
        </q-card>

        <q-card v-else flat bordered class="empty-card q-mt-lg text-center q-pa-xl">
          <q-icon name="receipt_long" size="52px" color="grey-4" />
          <h2 class="text-h6 q-mb-xs">No hay movimientos en este período</h2>
          <p class="text-body2 text-grey-7 q-mt-none">Podés agregar el primero desde el botón +.</p>
        </q-card>

        <q-page-sticky position="bottom-right" :offset="[20, 20]">
          <q-btn
            fab
            color="primary"
            icon="add"
            aria-label="Nueva transacción"
            :to="createLocation"
          />
        </q-page-sticky>
      </template>
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useCategoryDetail } from '../composables/use-category-detail';
import { resolveCategoryIcon } from '../utils/category-icons';
import {
  buildCategoryCreateQuery,
  buildCategoryRouteContext,
  parseCategoryRouteQuery,
} from '../utils/category-route-context';
import { formatPeriodLabel } from '@/utils/date-range';
import { formatLocalDayMonth, todayLocalDate } from '@/utils/dates';
import { formatArs } from '@/utils/money';

const route = useRoute();

const query = parseCategoryRouteQuery(route.params.categoryId, route.query, todayLocalDate());
const routeContext = buildCategoryRouteContext(query);
const { errorMessage, load, loading, snapshot } = useCategoryDetail(query);
const periodLabel = computed(() => formatPeriodLabel(query.period, query.referenceDate));
const createLocation = {
  name: 'transaction-create',
  query: buildCategoryCreateQuery(query.categoryId, routeContext),
};

function transactionDetailLocation(id: string) {
  return {
    name: 'transaction-detail',
    params: { id },
    query: { ...routeContext, category: query.categoryId },
  };
}
</script>

<style scoped>
.category-page {
  background: var(--app-background);
}
.category-content {
  width: min(100%, 680px);
  margin: 0 auto;
  padding-bottom: 88px;
}
.category-header {
  padding: 8px 4px;
}
.category-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  color: white;
  border-radius: 50%;
  box-shadow: 0 7px 16px rgb(24 32 51 / 16%);
}
.movements-card,
.empty-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}
.date-heading {
  padding: 16px 16px 8px;
  text-transform: capitalize;
}
.error-banner {
  color: var(--app-error-text);
  background: var(--app-error-bg);
}

.category-header > div:last-child {
  min-width: 0;
}

.category-header h1 {
  overflow-wrap: anywhere;
}
</style>
