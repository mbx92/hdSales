<script setup lang="ts">
import { IconArrowUp, IconArrowDown, IconChartBar } from '@tabler/icons-vue'

interface CashflowSummary {
  summary: {
    totalIncome: number
    totalOutcome: number
    netCashFlow: number
  }
  byCategory: Record<string, { income: number; outcome: number }>
  period: {
    start?: Date
    end?: Date
  }
}

const selectedPeriod = ref('month')
const startDate = ref<string | undefined>(undefined)
const endDate = ref<string | undefined>(undefined)

const { data: summary, pending: summaryPending, refresh: refreshSummary } = await useFetch<CashflowSummary>('/api/cashflow/summary', {
  query: { startDate, endDate },
  watch: [startDate, endDate],
})

const { data: cashflows, pending: cashflowsPending } = await useFetch('/api/cashflow', {
  query: { startDate, endDate, limit: 100 },
  watch: [startDate, endDate],
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

const setPeriod = (period: string) => {
  selectedPeriod.value = period
  const now = new Date()
  
  switch (period) {
    case 'week':
      startDate.value = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      endDate.value = now.toISOString().split('T')[0]
      break
    case 'month':
      startDate.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      endDate.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      break
    case 'year':
      startDate.value = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      endDate.value = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
      break
    default:
      startDate.value = ''
      endDate.value = ''
  }
}

// Initialize with current month
onMounted(() => setPeriod('month'))
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold">Cash Flow</h1>
        <p class="text-base-content/60">Laporan arus kas masuk dan keluar</p>
      </div>

      <!-- Period Filter -->
      <div class="join">
        <button
          :class="['join-item btn btn-sm', selectedPeriod === 'week' && 'btn-active']"
          @click="setPeriod('week')"
        >
          Minggu Ini
        </button>
        <button
          :class="['join-item btn btn-sm', selectedPeriod === 'month' && 'btn-active']"
          @click="setPeriod('month')"
        >
          Bulan Ini
        </button>
        <button
          :class="['join-item btn btn-sm', selectedPeriod === 'year' && 'btn-active']"
          @click="setPeriod('year')"
        >
          Tahun Ini
        </button>
        <button
          :class="['join-item btn btn-sm', selectedPeriod === 'all' && 'btn-active']"
          @click="setPeriod('all')"
        >
          Semua
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="card bg-success/10 border border-success/20">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-success/20 rounded-lg">
              <IconArrowUp class="w-6 h-6 text-success" :stroke-width="1.5" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-base-content/60">Total Income</h3>
              <p class="text-2xl font-bold text-success">
                {{ formatCurrency(summary?.summary?.totalIncome || 0) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-error/10 border border-error/20">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <div class="p-3 bg-error/20 rounded-lg">
              <IconArrowDown class="w-6 h-6 text-error" :stroke-width="1.5" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-base-content/60">Total Outcome</h3>
              <p class="text-2xl font-bold text-error">
                {{ formatCurrency(summary?.summary?.totalOutcome || 0) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div :class="['card border', (summary?.summary?.netCashFlow || 0) >= 0 ? 'bg-success/10 border-success/20' : 'bg-error/10 border-error/20']">
        <div class="card-body">
          <div class="flex items-center gap-3">
            <div :class="['p-3 rounded-lg', (summary?.summary?.netCashFlow || 0) >= 0 ? 'bg-success/20' : 'bg-error/20']">
              <IconChartBar :class="['w-6 h-6', (summary?.summary?.netCashFlow || 0) >= 0 ? 'text-success' : 'text-error']" :stroke-width="1.5" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-base-content/60">Net Cash Flow</h3>
              <p :class="['text-2xl font-bold', (summary?.summary?.netCashFlow || 0) >= 0 ? 'text-success' : 'text-error']">
                {{ formatCurrency(summary?.summary?.netCashFlow || 0) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Breakdown -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-lg">Breakdown per Kategori</h2>
        <div class="overflow-x-auto mt-4">
          <table class="table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th class="text-right text-success">Income</th>
                <th class="text-right text-error">Outcome</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(data, category) in summary?.byCategory" :key="category">
                <td>
                  <span class="badge badge-outline">{{ category }}</span>
                </td>
                <td class="text-right font-mono text-success">
                  {{ data.income ? formatCurrency(data.income) : '-' }}
                </td>
                <td class="text-right font-mono text-error">
                  {{ data.outcome ? formatCurrency(data.outcome) : '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Transaction List -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body">
        <h2 class="card-title text-lg">
          Daftar Transaksi
          <span class="badge badge-primary">{{ cashflows?.meta?.total || 0 }}</span>
        </h2>

        <div v-if="cashflowsPending" class="flex items-center justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="cashflows?.data?.length" class="overflow-x-auto mt-4">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tipe</th>
                <th>Kategori</th>
                <th>Deskripsi</th>
                <th class="text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cf in cashflows.data" :key="cf.id">
                <td>{{ new Date(cf.transactionDate).toLocaleDateString('id-ID') }}</td>
                <td>
                  <span :class="['badge badge-sm', cf.type === 'INCOME' ? 'badge-success' : 'badge-error']">
                    {{ cf.type }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-outline badge-sm">{{ cf.category }}</span>
                </td>
                <td class="max-w-xs truncate">{{ cf.description }}</td>
                <td :class="['text-right font-mono', cf.type === 'INCOME' ? 'text-success' : 'text-error']">
                  {{ cf.type === 'INCOME' ? '+' : '-' }}{{ formatCurrency(cf.amountIdr) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-center py-8 text-base-content/40">
          Tidak ada transaksi untuk periode ini
        </div>
      </div>
    </div>
  </div>
</template>
