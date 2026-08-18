<template>
  <q-layout view="hHh lpR fFf">
    <q-header class="app-header" bordered>
      <q-toolbar class="app-toolbar q-px-md">
        <q-btn
          v-if="route.meta.showBack"
          flat
          round
          dense
          icon="arrow_back"
          aria-label="Volver"
          @click="goBack"
        />
        <q-toolbar-title class="text-weight-bold">Finanzas</q-toolbar-title>
        <q-btn
          v-if="route.name !== 'settings'"
          flat
          round
          dense
          icon="settings"
          aria-label="Configuración"
          :to="{ name: 'settings' }"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

async function goBack(): Promise<void> {
  if (window.history.state?.back) {
    router.back();
    return;
  }

  await router.push({ name: 'dashboard' });
}
</script>

<style scoped>
.app-header {
  background: var(--app-surface);
  color: var(--app-text);
}

.app-toolbar {
  width: min(100%, 820px);
  min-height: 56px;
  margin: 0 auto;
  padding-top: env(safe-area-inset-top);
}

.app-toolbar :deep(.q-btn) {
  min-width: 44px;
  min-height: 44px;
}
</style>
