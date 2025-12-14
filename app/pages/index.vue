<script setup lang="ts">
import { IconMotorbike, IconCurrencyDollar, IconCash, IconTrendingUp, IconPlus, IconCircleCheck, IconClipboardList, IconChartBar, IconReportAnalytics } from '@tabler/icons-vue'

const { data: summary, pending: summaryPending } = await useFetch('/api/dashboard/summary')
const { data: charts, pending: chartsPending } = await useFetch('/api/dashboard/charts')
const { data: motorStats } = await useFetch('/api/reports/motor-stats')

// Safe computed for motor stats to avoid undefined errors
const safeMotorStats = computed(() => ({
  ON_PROGRESS: motorStats.value?.stats?.ON_PROGRESS ?? 0,
  AVAILABLE: motorStats.value?.stats?.AVAILABLE ?? 0,
  SOLD: motorStats.value?.stats?.SOLD ?? 0,
  total: motorStats.value?.total ?? 0,
}))

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
        <p class="text-base-content/60">Selamat datang di DIGARASI ID</p>
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

      <!-- Status Distribution with Donut Chart -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Status Motor</h2>
          
          <!-- Donut Chart -->
          <div v-if="safeMotorStats.total > 0" class="flex flex-col md:flex-row items-center gap-6 mt-4">
            <!-- SVG Donut -->
            <div class="relative w-48 h-48">
              <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
                <!-- Background circle -->
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="12"
                  class="text-base-300"
                />
                <!-- On Progress -->
                <circle
                  v-if="safeMotorStats.ON_PROGRESS > 0"
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="#FBBD23"
                  stroke-width="12"
                  :stroke-dasharray="`${(safeMotorStats.ON_PROGRESS / safeMotorStats.total) * 251.2} 251.2`"
                  stroke-dashoffset="0"
                />
                <!-- Available -->
                <circle
                  v-if="safeMotorStats.AVAILABLE > 0"
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="#36D399"
                  stroke-width="12"
                  :stroke-dasharray="`${(safeMotorStats.AVAILABLE / safeMotorStats.total) * 251.2} 251.2`"
                  :stroke-dashoffset="`${-(safeMotorStats.ON_PROGRESS / safeMotorStats.total) * 251.2}`"
                />
                <!-- Sold -->
                <circle
                  v-if="safeMotorStats.SOLD > 0"
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="#3ABFF8"
                  stroke-width="12"
                  :stroke-dasharray="`${(safeMotorStats.SOLD / safeMotorStats.total) * 251.2} 251.2`"
                  :stroke-dashoffset="`${-((safeMotorStats.ON_PROGRESS + safeMotorStats.AVAILABLE) / safeMotorStats.total) * 251.2}`"
                />
              </svg>
              <!-- Center text -->
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-bold">{{ safeMotorStats.total }}</span>
                <span class="text-xs text-base-content/60">Total</span>
              </div>
            </div>
            
            <!-- Legend -->
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-warning"></span>
                <span>On Progress</span>
                <span class="font-bold">{{ safeMotorStats.ON_PROGRESS }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-success"></span>
                <span>Tersedia</span>
                <span class="font-bold">{{ safeMotorStats.AVAILABLE }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-info"></span>
                <span>Terjual</span>
                <span class="font-bold">{{ safeMotorStats.SOLD }}</span>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-base-content/40">
            Belum ada data motor
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
        <div class="flex flex-wrap gap-2">
          <NuxtLink to="/motorcycles/create" class="btn btn-outline btn-primary btn-sm sm:btn-md flex-1 sm:flex-none min-w-[140px]">
            <IconPlus class="w-4 h-4 sm:w-5 sm:h-5" :stroke-width="1.5" />
            <span class="hidden sm:inline">Tambah Motor</span>
            <span class="sm:hidden">+ Motor</span>
          </NuxtLink>
          <NuxtLink to="/motorcycles?status=AVAILABLE" class="btn btn-outline btn-success btn-sm sm:btn-md flex-1 sm:flex-none min-w-[140px]">
            <IconCircleCheck class="w-4 h-4 sm:w-5 sm:h-5" :stroke-width="1.5" />
            <span class="hidden sm:inline">Motor Ready</span>
            <span class="sm:hidden">Ready</span>
          </NuxtLink>
          <NuxtLink to="/sales" class="btn btn-outline btn-info btn-sm sm:btn-md flex-1 sm:flex-none min-w-[140px]">
            <IconClipboardList class="w-4 h-4 sm:w-5 sm:h-5" :stroke-width="1.5" />
            <span class="hidden sm:inline">Riwayat Sales</span>
            <span class="sm:hidden">Sales</span>
          </NuxtLink>
          <NuxtLink to="/cashflow" class="btn btn-outline btn-warning btn-sm sm:btn-md flex-1 sm:flex-none min-w-[140px]">
            <IconChartBar class="w-4 h-4 sm:w-5 sm:h-5" :stroke-width="1.5" />
            <span class="hidden sm:inline">Laporan Cash</span>
            <span class="sm:hidden">Cash</span>
          </NuxtLink>
          <NuxtLink to="/reports/profit-loss" class="btn btn-outline btn-secondary btn-sm sm:btn-md flex-1 sm:flex-none min-w-[140px]">
            <IconReportAnalytics class="w-4 h-4 sm:w-5 sm:h-5" :stroke-width="1.5" />
            <span class="hidden sm:inline">Profit & Loss</span>
            <span class="sm:hidden">P&L</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
