<script setup lang="ts">
import { IconMotorbike, IconCurrencyDollar, IconCash, IconTrendingUp, IconPlus, IconCircleCheck, IconClipboardList, IconChartBar } from '@tabler/icons-vue'

const { data: summary, pending: summaryPending } = await useFetch('/api/dashboard/summary')
const { data: charts, pending: chartsPending } = await useFetch('/api/dashboard/charts')

const formatCurrency = (value: number, currency: string = 'IDR') => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('id-ID').format(value)
}

const kpiCards = computed(() => [
  {
    title: 'Motor Tersedia',
    value: summary.value?.motorcycles?.available || 0,
    icon: IconMotorbike,
    color: 'primary',
    subtitle: `${summary.value?.motorcycles?.total || 0} total motor`,
  },
  {
    title: 'Pendapatan Bulan Ini',
    value: formatCurrency(summary.value?.monthly?.income || 0),
    icon: IconCurrencyDollar,
    color: 'success',
    subtitle: 'Income',
  },
  {
    title: 'Pengeluaran Bulan Ini',
    value: formatCurrency(summary.value?.monthly?.outcome || 0),
    icon: IconCash,
    color: 'error',
    subtitle: 'Outcome',
  },
  {
    title: 'Profit Bersih',
    value: formatCurrency(summary.value?.monthly?.netProfit || 0),
    icon: IconTrendingUp,
    color: (summary.value?.monthly?.netProfit || 0) >= 0 ? 'success' : 'error',
    subtitle: 'Bulan ini',
  },
])
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">Dashboard</h1>
        <p class="text-base-content/60">Selamat datang di HD Sales</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/motorcycles/create" class="btn btn-primary">
          <IconPlus class="w-5 h-5 mr-2" :stroke-width="1.5" />
          Tambah Motor
        </NuxtLink>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="(card, index) in kpiCards"
        :key="index"
        class="card bg-base-200 card-hover border border-base-300"
      >
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div :class="`p-3 rounded-lg bg-${card.color}/10`">
              <component :is="card.icon" :class="`w-6 h-6 text-${card.color}`" :stroke-width="1.5" />
            </div>
          </div>
          <div class="mt-3">
            <h3 class="text-sm font-medium text-base-content/60">{{ card.title }}</h3>
            <p class="text-2xl font-bold mt-1">{{ card.value }}</p>
            <p class="text-xs text-base-content/40 mt-1">{{ card.subtitle }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Cash Flow Trend -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Cash Flow Trend</h2>
          <div v-if="chartsPending" class="flex items-center justify-center h-64">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th class="text-right">Income</th>
                  <th class="text-right">Outcome</th>
                  <th class="text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in charts?.cashFlowTrend" :key="row.month">
                  <td>{{ row.month }}</td>
                  <td class="text-right text-success">{{ formatCurrency(row.income) }}</td>
                  <td class="text-right text-error">{{ formatCurrency(row.outcome) }}</td>
                  <td :class="['text-right font-bold', row.net >= 0 ? 'text-success' : 'text-error']">
                    {{ formatCurrency(row.net) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Status Distribution -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Status Motor</h2>
          <div class="flex flex-col gap-4 mt-4">
            <div v-for="item in charts?.statusDistribution" :key="item.status" class="flex items-center gap-4">
              <div :class="[
                'badge badge-lg',
                item.status === 'INSPECTION' ? 'badge-warning' : '',
                item.status === 'AVAILABLE' ? 'badge-success' : '',
                item.status === 'SOLD' ? 'badge-info' : '',
              ]">
                {{ item.status }}
              </div>
              <div class="flex-1">
                <progress
                  class="progress"
                  :class="[
                    item.status === 'INSPECTION' ? 'progress-warning' : '',
                    item.status === 'AVAILABLE' ? 'progress-success' : '',
                    item.status === 'SOLD' ? 'progress-info' : '',
                  ]"
                  :value="item.count"
                  :max="summary?.motorcycles?.total || 1"
                ></progress>
              </div>
              <span class="font-bold">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Profit & Cost Breakdown -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Profit by Motorcycle -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Profit per Motor (Recent)</h2>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Motor</th>
                  <th class="text-right">Profit</th>
                  <th class="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in charts?.profitByMotorcycle" :key="item.label">
                  <td>{{ item.label }}</td>
                  <td :class="['text-right', item.profit >= 0 ? 'text-success' : 'text-error']">
                    {{ formatCurrency(item.profit, 'USD') }}
                  </td>
                  <td class="text-right">{{ item.margin?.toFixed(1) }}%</td>
                </tr>
                <tr v-if="!charts?.profitByMotorcycle?.length">
                  <td colspan="3" class="text-center text-base-content/40">Belum ada data</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Cost Breakdown -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Breakdown Biaya</h2>
          <div class="space-y-3 mt-4">
            <div v-for="item in charts?.costBreakdown" :key="item.component" class="flex items-center justify-between">
              <span class="badge badge-outline">{{ item.component }}</span>
              <span class="font-mono">{{ formatCurrency(item.total) }}</span>
            </div>
            <div v-if="!charts?.costBreakdown?.length" class="text-center text-base-content/40 py-4">
              Belum ada data
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <h2 class="card-title mb-4">Quick Actions</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NuxtLink to="/motorcycles/create" class="btn btn-outline btn-primary">
            <IconPlus class="w-5 h-5" :stroke-width="1.5" />
            Tambah Motor
          </NuxtLink>
          <NuxtLink to="/motorcycles?status=AVAILABLE" class="btn btn-outline btn-success">
            <IconCircleCheck class="w-5 h-5" :stroke-width="1.5" />
            Motor Ready
          </NuxtLink>
          <NuxtLink to="/sales" class="btn btn-outline btn-info">
            <IconClipboardList class="w-5 h-5" :stroke-width="1.5" />
            Riwayat Sales
          </NuxtLink>
          <NuxtLink to="/cashflow" class="btn btn-outline btn-warning">
            <IconChartBar class="w-5 h-5" :stroke-width="1.5" />
            Laporan Cash
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
