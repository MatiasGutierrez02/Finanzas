<template>
  <q-page class="settings-page q-pa-md">
    <main class="settings-content">
      <p class="text-overline text-primary q-mb-xs">DATOS</p>
      <h1 class="text-h5 text-weight-bold q-mt-none q-mb-sm">Configuración</h1>
      <p class="text-body2 text-grey-7 q-mt-none q-mb-lg">
        Guardá una copia local o restaurá todos los datos desde un archivo JSON.
      </p>

      <q-card flat bordered class="backup-card">
        <q-linear-progress v-if="working" indeterminate color="primary" aria-label="Procesando" />
        <q-list separator>
          <q-item clickable v-ripple :disable="working" @click="exportBackup">
            <q-item-section avatar
              ><q-icon name="download" color="primary" size="28px"
            /></q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">Exportar copia de seguridad</q-item-label>
              <q-item-label caption>Descarga movimientos, categorías y configuración.</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple :disable="working" @click="chooseFile">
            <q-item-section avatar
              ><q-icon name="upload_file" color="primary" size="28px"
            /></q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">Importar copia de seguridad</q-item-label>
              <q-item-label caption>Reemplaza completamente los datos actuales.</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-banner class="warning-banner q-mt-md" rounded>
        La importación reemplaza todos los movimientos, reglas y ajustes actuales.
      </q-banner>
      <input
        ref="fileInput"
        class="hidden-input"
        type="file"
        aria-label="Seleccionar archivo de copia de seguridad"
        accept="application/json,.json"
        @change="readFile"
      />
    </main>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

import type { BackupDocument } from '../models/backup';
import { backupService } from '../services/backup.service';

const $q = useQuasar();
const router = useRouter();
const fileInput = ref<HTMLInputElement>();
const working = ref(false);

function chooseFile(): void {
  fileInput.value?.click();
}

async function exportBackup(): Promise<void> {
  working.value = true;
  try {
    const backup = await backupService.exportBackup();
    const url = URL.createObjectURL(new Blob([backup.json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.filename;
    link.click();
    URL.revokeObjectURL(url);
    $q.notify({ type: 'positive', message: 'Copia de seguridad exportada.' });
  } catch (error) {
    notifyError(error, 'No pudimos exportar la copia de seguridad.');
  } finally {
    working.value = false;
  }
}

async function readFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file === undefined) return;

  working.value = true;
  try {
    const document = backupService.parse(await file.text());
    confirmImport(document, file.name);
  } catch (error) {
    notifyError(error, 'El archivo seleccionado no es válido.');
  } finally {
    working.value = false;
  }
}

function confirmImport(document: BackupDocument, filename: string): void {
  $q.dialog({
    title: 'Reemplazar todos los datos',
    message: `Se importará ${filename}. Esta acción reemplazará la información actual.`,
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Importar y reemplazar', unelevated: true },
    persistent: true,
  }).onOk(() => void restore(document));
}

async function restore(document: BackupDocument): Promise<void> {
  working.value = true;
  try {
    await backupService.importBackup(document);
    $q.notify({ type: 'positive', message: 'Copia restaurada correctamente.' });
    await router.replace({ name: 'dashboard' });
    window.location.reload();
  } catch (error) {
    notifyError(error, 'No pudimos restaurar la copia de seguridad.');
    working.value = false;
  }
}

function notifyError(error: unknown, fallback: string): void {
  $q.notify({ type: 'negative', message: error instanceof Error ? error.message : fallback });
}
</script>

<style scoped>
.settings-page {
  background: var(--app-background);
}
.settings-content {
  width: min(100%, 680px);
  margin: 0 auto;
  padding-top: clamp(0.5rem, 3vw, 2rem);
}
.backup-card {
  overflow: hidden;
  border-radius: 20px;
  background: var(--app-surface);
}
.warning-banner {
  color: var(--app-warning-text);
  background: var(--app-warning-bg);
}
.hidden-input {
  display: none;
}
</style>
