import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/features/dashboard/pages/DashboardPage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        meta: { showBack: true },
        component: () => import('@/features/settings/pages/SettingsPage.vue'),
      },
      {
        path: 'settings/fixed-expenses',
        name: 'fixed-expenses',
        meta: { showBack: true },
        component: () => import('@/features/fixed-expenses/pages/FixedExpensesPage.vue'),
      },
      {
        path: 'settings/subscriptions',
        name: 'subscriptions',
        meta: { showBack: true },
        component: () => import('@/features/recurring/pages/SubscriptionsPage.vue'),
      },
      {
        path: 'settings/categories',
        name: 'categories-settings',
        meta: { showBack: true },
        component: () => import('@/features/categories/pages/CategoriesSettingsPage.vue'),
      },
      {
        path: 'categories/:categoryId',
        name: 'category-detail',
        meta: { showBack: true },
        component: () => import('@/features/categories/pages/CategoryDetailPage.vue'),
      },
      {
        path: 'transactions/new',
        name: 'transaction-create',
        meta: { showBack: true },
        component: () => import('@/features/transactions/pages/TransactionEditorPage.vue'),
      },
      {
        path: 'transactions/:id',
        name: 'transaction-detail',
        meta: { showBack: true },
        component: () => import('@/features/transactions/pages/TransactionDetailPage.vue'),
      },
      {
        path: 'transactions/:id/edit',
        name: 'transaction-edit',
        meta: { showBack: true },
        component: () => import('@/features/transactions/pages/TransactionEditorPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
