# Finanzas

Aplicación personal de finanzas, mobile-first y offline-first. Permite registrar gastos e
ingresos, analizar períodos y ahorro histórico, administrar suscripciones y cuotas, y resguardar
la información mediante backups JSON. Está construida como PWA instalable y no requiere backend
ni conexión para operar después de la primera carga correcta.

El proyecto también busca demostrar una arquitectura frontend mantenible y preparada para sumar,
en el futuro, sincronización con una API sin acoplar la interfaz a la persistencia local.

## Funcionalidades

- CRUD de gastos e ingresos con importes almacenados como centavos enteros.
- Dashboard por día, semana (lunes a domingo), mes, trimestre o año.
- Distribución por categorías con gráficos doughnut y detalle de movimientos.
- Ahorro anual derivado de ingresos menos gastos, incluyendo déficits mensuales.
- Suscripciones mensuales idempotentes y compras en cuotas atómicas.
- 19 categorías iniciales con colores e iconos determinísticos.
- Exportación e importación atómica de backups validados.
- Tema claro u oscuro según la preferencia del sistema.
- Instalación PWA y funcionamiento sin conexión mediante app shell precacheado.

## Stack

- Vue 3, Composition API y TypeScript estricto
- Quasar Framework, Material Icons locales y Vue Router
- Pinia para estado de aplicación e interfaz
- Dexie.js sobre IndexedDB para persistencia
- Chart.js y vue-chartjs para visualizaciones empaquetadas localmente
- Vite y Quasar CLI en modo PWA
- Workbox `GenerateSW` para el Service Worker
- Vitest, fake-indexeddb y Vue Test Utils
- ESLint y Prettier

No se utilizan CDN, servicios externos ni backend.

## Arquitectura

El código está organizado principalmente por feature. La dependencia de datos sigue este flujo:

```text
UI → composables / store → services → repository contracts → Dexie → IndexedDB
```

Los componentes no acceden a Dexie. Los contratos de repository aíslan la persistencia y permiten
incorporar más adelante repositorios remotos sin reescribir la UI. IndexedDB es la fuente de verdad;
Pinia conserva solamente contexto de navegación y estado efímero.

Los importes se representan como enteros en centavos y se muestran con `Intl.NumberFormat` en ARS.
Las fechas de dominio usan `YYYY-MM-DD` local para evitar desplazamientos por conversiones UTC. La
lógica de rangos y navegación temporal está centralizada.

## Persistencia y reglas programadas

`FinanzasDB` es una base Dexie versionada. Contiene las tablas `transactions`, `categories`,
`recurringRules` y `settings`, con índices por fecha, tipo, categoría y referencias programadas.
Las categorías se inicializan con un seed idempotente que conserva personalizaciones posteriores.

Las suscripciones se materializan al abrir la aplicación y al consultar períodos. Cada ocurrencia
usa una clave única formada por regla y mes; si el día configurado no existe, se usa el último día
del mes. Las cuotas comparten un `installmentGroupId`, se numeran `1/N` y se crean en una única
transacción de base de datos. El monto ingresado representa el valor de cada cuota.

## Offline-first y PWA

El build PWA incluye el app shell, JavaScript, CSS, fuentes, Material Icons, Chart.js, manifest e
iconos. Workbox precachea estos recursos con `GenerateSW`; la información personal permanece en
IndexedDB. Al iniciar, la aplicación solicita almacenamiento persistente cuando el navegador lo
ofrece, pero funciona aunque la solicitud no esté disponible o sea rechazada.

La actualización del Service Worker no fuerza el reemplazo inmediato de una versión abierta. Los
clientes existentes terminan su sesión con assets coherentes y la nueva versión se activa después.
La verificación automatizada del artefacto comprueba el manifest, el Service Worker, el precache y
la ausencia de dependencias críticas externas.

## Backups

Configuración permite exportar un archivo `finanzas-backup-AAAA-MM-DD.json` con versión de esquema,
fecha de exportación, versión de la app, movimientos, categorías, reglas recurrentes y ajustes.
La importación valida tipos, IDs, fechas, montos y referencias antes de pedir confirmación. La
restauración reemplaza el estado local de forma atómica, de modo que un error no deja datos parciales.
Las claves de ocurrencias y grupos de cuotas se preservan para impedir duplicados posteriores.

## Requisitos e instalación

- Node.js 22.12+, 24 o 26+
- npm compatible con la versión de Node elegida

```bash
npm install
npm run dev
```

El servidor de desarrollo se inicia con Quasar/Vite. Para probar instalación y Service Worker debe
usarse el build de producción servido desde un origen seguro (`localhost` o HTTPS).

## Comandos

```bash
npm run typecheck      # TypeScript de la aplicación y del registro PWA
npm run lint           # ESLint
npm test               # Suite Vitest
npm run format:check   # Verificación de Prettier
npm run build          # Build PWA en dist/pwa
npm run verify:pwa     # Auditoría del artefacto PWA generado
npm run build:spa      # Build SPA opcional
```

## Testing

La estrategia prioriza lógica con riesgo real: dinero, rangos temporales, navegación entre
períodos, agregaciones, ahorro, IDs, recurrencias, cuotas y backup/restore atómico. Los tests de
persistencia usan IndexedDB simulado; no se busca cobertura alta mediante pruebas visuales triviales.
La instalación, reapertura y operaciones en modo avión deben verificarse además en un dispositivo
Android/Chrome real.

## Estructura

```text
src/
├── boot/             # Inicialización de base y almacenamiento persistente
├── css/              # Tema global responsive y variables visuales
├── db/               # Dexie, esquema, migraciones y seeds
├── features/         # Dashboard, categorías, transacciones, recurrencias, ahorro y settings
├── layouts/          # Shell principal
├── models/           # Tipos compartidos del dominio
├── repositories/     # Contratos e implementaciones Dexie
├── router/           # Rutas lazy-loaded
├── stores/           # Estado efímero Pinia
└── utils/            # Fechas, dinero e IDs
src-pwa/              # Manifest y ciclo de registro del Service Worker
scripts/              # Auditoría del build PWA
test/                 # Pruebas de dominio y persistencia
```

## Decisiones técnicas

- Hash routing facilita que las rutas internas reabran offline sin configuración del servidor.
- `GenerateSW` es suficiente porque la aplicación no necesita lógica personalizada de red.
- UUID se genera con Web Crypto y un fallback criptográfico compatible, nunca con `Math.random()`.
- El ahorro no se persiste: siempre se recalcula desde movimientos históricos para evitar desvíos.
- Los déficits forman parte del total anual, pero no se convierten en segmentos negativos del gráfico.
- Las recurrencias y cuotas son modelos explícitos para permitir en el futuro editar una ocurrencia o
  una serie completa.

## Mejoras futuras

- API .NET y sincronización cloud mediante repositorios remotos.
- Autenticación y resolución de conflictos multidispositivo.
- Edición o eliminación de “esta y futuras” para series programadas.
- Categorías personalizables e iconos propios.
- Empaquetado con Capacitor y publicación en tiendas.

Estas extensiones no forman parte de la versión actual y la aplicación continúa siendo totalmente
local y de un solo usuario.
