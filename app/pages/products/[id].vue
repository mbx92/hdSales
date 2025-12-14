<script setup lang="ts">
import { IconArrowLeft, IconChevronDown, IconCash, IconTrash, IconPlus, IconInfoCircle, IconEdit, IconBox, IconReceipt } from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const { showError } = useAlert()
const { showConfirm, confirmData, confirm, handleConfirm, handleCancel } = useConfirm()
const id = route.params.id as string

const { data: product, pending, refresh } = await useFetch(`/api/products/${id}`)

const showCostModal = ref(false)
const showEditCostModal = ref(false)
const showSellModal = ref(false)
const loading = ref(false)
const editingCost = ref<any>(null)

const costForm = ref({
  component: 'PURCHASE',
  description: '',
  amount: '',
  currency: 'IDR',
  paymentMethod: 'CASH',
  notes: '',
})

const editCostForm = ref({
  component: '',
  description: '',
  amount: '',
  currency: 'IDR',
  paymentMethod: 'CASH',
  notes: '',
})

const sellForm = ref({
  sellingPrice: '',
  currency: 'IDR',
  saleDate: new Date().toISOString().split('T')[0],
  buyerName: '',
  buyerPhone: '',
  buyerAddress: '',
  paymentMethod: 'TRANSFER',
  notes: '',
})

const costComponents = [
  { value: 'PURCHASE', label: 'Pembelian' },
  { value: 'SHIPPING', label: 'Pengiriman' },
  { value: 'CUSTOMS', label: 'Bea Cukai' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'OTHER', label: 'Lainnya' },
]

const formatCurrency = (value: number, currency: string = 'IDR') => {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ON_PROGRESS': return 'badge-warning'
    case 'AVAILABLE': return 'badge-success'
    case 'SOLD': return 'badge-info'
    default: return 'badge-ghost'
  }
}

const getCategoryBadge = (category: string) => {
  switch (category) {
    case 'SPAREPART': return 'badge-primary'
    case 'ACCESSORIES': return 'badge-secondary'
    case 'APPAREL': return 'badge-accent'
    case 'CUSTOM': return 'badge-neutral'
    default: return 'badge-ghost'
  }
}

// Check if product has at least one cost
const hasCosts = computed(() => {
  return product.value?.costs && product.value.costs.length > 0
})

const addCost = async () => {
  loading.value = true
  try {
    await $fetch(`/api/products/${id}/costs`, {
      method: 'POST',
      body: {
        ...costForm.value,
        amount: parseFloat(costForm.value.amount),
      },
    })
    showCostModal.value = false
    costForm.value = {
      component: 'PURCHASE',
      description: '',
      amount: '',
      currency: 'IDR',
      paymentMethod: 'CASH',
      notes: '',
    }
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menambah biaya')
  } finally {
    loading.value = false
  }
}

const openEditCost = (cost: any) => {
  editingCost.value = cost
  editCostForm.value = {
    component: cost.component,
    description: cost.description,
    amount: cost.amount.toString(),
    currency: cost.currency,
    paymentMethod: cost.paymentMethod || 'CASH',
    notes: cost.notes || '',
  }
  showEditCostModal.value = true
}

const updateCost = async () => {
  if (!editingCost.value) return
  
  loading.value = true
  try {
    await $fetch(`/api/products/${id}/costs/${editingCost.value.id}`, {
      method: 'PATCH',
      body: {
        ...editCostForm.value,
        amount: parseFloat(editCostForm.value.amount),
      },
    })
    showEditCostModal.value = false
    editingCost.value = null
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal mengupdate biaya')
  } finally {
    loading.value = false
  }
}

const deleteCost = async (costId: string) => {
  const confirmed = await confirm({
    title: 'Hapus Biaya',
    message: 'Yakin ingin menghapus biaya ini?',
    confirmText: 'Ya, Hapus',
    type: 'danger',
  })
  
  if (!confirmed) return
  
  loading.value = true
  try {
    await $fetch(`/api/products/${id}/costs/${costId}`, {
      method: 'DELETE',
    })
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menghapus biaya')
  } finally {
    loading.value = false
  }
}

const sellProduct = async () => {
  loading.value = true
  try {
    await $fetch(`/api/products/${id}/sell`, {
      method: 'POST',
      body: {
        ...sellForm.value,
        sellingPrice: parseFloat(sellForm.value.sellingPrice),
      },
    })
    showSellModal.value = false
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menjual product')
  } finally {
    loading.value = false
  }
}

const updateStatus = async (newStatus: string) => {
  loading.value = true
  try {
    await $fetch(`/api/products/${id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    })
    refresh()
  } catch (e: any) {
    showError(e.data?.message || 'Gagal update status')
  } finally {
    loading.value = false
  }
}

const deleteProduct = async () => {
  const confirmed = await confirm({
    title: 'Hapus Product',
    message: 'Yakin ingin menghapus product ini? Semua data biaya juga akan terhapus.',
    confirmText: 'Ya, Hapus',
    type: 'danger',
  })
  
  if (!confirmed) return
  
  loading.value = true
  try {
    await $fetch(`/api/products/${id}`, { method: 'DELETE' })
    router.push('/products')
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menghapus product')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Loading -->
    <div v-if="pending" class="flex items-center justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else-if="product">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <NuxtLink to="/products" class="btn btn-ghost btn-square">
            <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
          </NuxtLink>
          <div>
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-3xl font-bold">{{ product.name }}</h1>
              <div :class="['badge', getCategoryBadge(product.category)]">
                {{ product.customCategory || product.category }}
              </div>
              <div :class="['badge', getStatusBadge(product.status)]">
                {{ product.status }}
              </div>
            </div>
            <p class="text-base-content/60">{{ product.sku || 'No SKU' }} • {{ product.supplier || 'No Supplier' }}</p>
          </div>
        </div>

        <div class="flex gap-2 flex-wrap">
          <NuxtLink
            :to="`/products/edit-${product.id}`"
            class="btn btn-outline"
          >
            Edit Product
          </NuxtLink>

          <div v-if="product.status === 'ON_PROGRESS'" class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-outline">
              Update Status
              <IconChevronDown class="w-4 h-4 ml-1" :stroke-width="1.5" />
            </label>
            <ul tabindex="0" class="dropdown-content menu p-2 shadow-lg bg-base-300 rounded-box w-52 z-10">
              <li><a @click="updateStatus('AVAILABLE')">✓ Tersedia</a></li>
            </ul>
          </div>

          <div v-if="product.status === 'AVAILABLE'" :class="{ 'tooltip tooltip-bottom': !hasCosts }" :data-tip="!hasCosts ? 'Tambahkan biaya terlebih dahulu sebelum menjual' : undefined">
            <button
              @click="showSellModal = true"
              class="btn btn-success"
              :disabled="!hasCosts"
            >
              <IconCash class="w-5 h-5 mr-1" :stroke-width="1.5" />
              Jual Product
            </button>
          </div>

          <button
            @click="deleteProduct"
            class="btn btn-outline btn-error"
            :disabled="loading"
          >
            <IconTrash class="w-5 h-5" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <!-- Info Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Details Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-lg">Detail Product</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between">
                <span class="text-base-content/60">Kategori</span>
                <span>{{ product.customCategory || product.category }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">SKU</span>
                <span class="font-mono">{{ product.sku || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Supplier</span>
                <span>{{ product.supplier || '-' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/60">Currency</span>
                <span class="badge">{{ product.currency }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-lg">Keuangan</h2>
            <div class="space-y-3 mt-2">
              <div class="flex justify-between items-center">
                <span class="text-base-content/60">HPP</span>
                <span class="text-xl font-bold text-primary">
                  {{ formatCurrency(product.totalCost, product.currency) }}
                </span>
              </div>
              <div v-if="product.sellingPrice" class="flex justify-between items-center">
                <span class="text-base-content/60">Harga Jual</span>
                <span class="text-xl font-bold text-success">
                  {{ formatCurrency(product.sellingPrice, product.currency) }}
                </span>
              </div>
              <div v-if="product.profit" class="flex justify-between items-center">
                <span class="text-base-content/60">Profit</span>
                <span :class="['text-xl font-bold', product.profit >= 0 ? 'text-success' : 'text-error']">
                  {{ formatCurrency(product.profit, product.currency) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="product.description" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg">Deskripsi</h2>
          <p class="whitespace-pre-wrap">{{ product.description }}</p>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="product.notes" class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg">Catatan</h2>
          <p class="whitespace-pre-wrap">{{ product.notes }}</p>
        </div>
      </div>

      <!-- Costs Section -->
      <div class="card bg-base-200 border border-base-300">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title text-lg">
              Riwayat Biaya
              <span class="badge badge-primary">{{ product.costs?.length || 0 }}</span>
            </h2>
            <button
              @click="showCostModal = true"
              class="btn btn-primary btn-sm"
            >
              <IconPlus class="w-4 h-4 mr-1" :stroke-width="1.5" />
              Tambah Biaya
            </button>
          </div>

          <div v-if="product.costs?.length" class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Deskripsi</th>
                  <th>Bayar</th>
                  <th class="text-right">Jumlah</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cost in product.costs" :key="cost.id">
                  <td>{{ new Date(cost.transactionDate).toLocaleDateString('id-ID') }}</td>
                  <td>
                    <span class="badge badge-outline">{{ cost.component }}</span>
                  </td>
                  <td>{{ cost.description }}</td>
                  <td>{{ cost.paymentMethod || '-' }}</td>
                  <td class="text-right font-mono">
                    {{ formatCurrency(cost.amount, cost.currency) }}
                  </td>
                  <td>
                    <div class="flex justify-center gap-1">
                      <button
                        @click="openEditCost(cost)"
                        class="btn btn-ghost btn-xs"
                        title="Edit"
                      >
                        <IconEdit class="w-4 h-4" :stroke-width="1.5" />
                      </button>
                      <button
                        @click="deleteCost(cost.id)"
                        class="btn btn-ghost btn-xs text-error"
                        title="Hapus"
                      >
                        <IconTrash class="w-4 h-4" :stroke-width="1.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="5">Total HPP</th>
                  <th class="text-right text-primary text-lg">
                    {{ formatCurrency(product.totalCost, product.currency) }}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="text-center py-8 text-base-content/40">
            Belum ada biaya tercatat
          </div>
        </div>
      </div>

      <!-- Sale Transaction -->
      <div v-if="product.saleTransaction" class="card bg-success/10 border border-success/20">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <h2 class="card-title text-lg text-success">Transaksi Penjualan</h2>
            <NuxtLink
              :to="`/sales/product-receipt/${product.saleTransaction.id}`"
              class="btn btn-primary btn-sm gap-1"
            >
              <IconReceipt class="w-4 h-4" :stroke-width="1.5" />
              Cetak Kwitansi
            </NuxtLink>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <span class="text-base-content/60">Pembeli</span>
              <p class="font-bold">{{ product.saleTransaction.buyerName }}</p>
              <p class="text-sm">{{ product.saleTransaction.buyerPhone }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Tanggal Jual</span>
              <p class="font-bold">{{ new Date(product.saleTransaction.saleDate).toLocaleDateString('id-ID') }}</p>
              <p class="text-sm">{{ product.saleTransaction.paymentMethod }}</p>
            </div>
            <div>
              <span class="text-base-content/60">Profit</span>
              <p :class="['text-2xl font-bold', product.saleTransaction.profit >= 0 ? 'text-success' : 'text-error']">
                {{ formatCurrency(product.saleTransaction.profit, product.saleTransaction.currency) }}
              </p>
              <p class="text-sm">Margin: {{ product.saleTransaction.profitMargin?.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Cost Modal -->
    <Teleport to="body">
      <dialog :class="['modal', showCostModal && 'modal-open']">
        <div class="modal-box bg-base-200">
          <h3 class="font-bold text-lg mb-4">Tambah Biaya</h3>
          <form @submit.prevent="addCost" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Kategori *</span></label>
              <select v-model="costForm.component" class="select select-bordered bg-base-300" required>
                <option v-for="c in costComponents" :key="c.value" :value="c.value">
                  {{ c.label }}
                </option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Deskripsi *</span></label>
              <input v-model="costForm.description" type="text" class="input input-bordered bg-base-300" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Jumlah *</span></label>
                <input v-model="costForm.amount" type="number" step="0.01" class="input input-bordered bg-base-300" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Currency</span></label>
                <select v-model="costForm.currency" class="select select-bordered bg-base-300" disabled>
                  <option value="IDR">IDR</option>
                </select>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Metode Bayar</span></label>
              <select v-model="costForm.paymentMethod" class="select select-bordered bg-base-300">
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" @click="showCostModal = false">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                Simpan
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="showCostModal = false">close</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Edit Cost Modal -->
    <Teleport to="body">
      <dialog :class="['modal', showEditCostModal && 'modal-open']">
        <div class="modal-box bg-base-200">
          <h3 class="font-bold text-lg mb-4">Edit Biaya</h3>
          <form @submit.prevent="updateCost" class="space-y-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Kategori *</span></label>
              <select v-model="editCostForm.component" class="select select-bordered bg-base-300" required>
                <option v-for="c in costComponents" :key="c.value" :value="c.value">
                  {{ c.label }}
                </option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Deskripsi *</span></label>
              <input v-model="editCostForm.description" type="text" class="input input-bordered bg-base-300" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Jumlah *</span></label>
                <input v-model="editCostForm.amount" type="number" step="0.01" class="input input-bordered bg-base-300" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Currency</span></label>
                <select v-model="editCostForm.currency" class="select select-bordered bg-base-300" disabled>
                  <option value="IDR">IDR</option>
                </select>
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Metode Bayar</span></label>
              <select v-model="editCostForm.paymentMethod" class="select select-bordered bg-base-300">
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" @click="showEditCostModal = false">Batal</button>
              <button type="submit" class="btn btn-primary" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                Update
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="showEditCostModal = false">close</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Sell Modal -->
    <Teleport to="body">
      <dialog :class="['modal', showSellModal && 'modal-open']">
        <div class="modal-box bg-base-200 max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Jual Product</h3>
          <form @submit.prevent="sellProduct" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">Harga Jual *</span></label>
                <input v-model="sellForm.sellingPrice" type="number" step="0.01" class="input input-bordered bg-base-300" required />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Tanggal Jual *</span></label>
                <input v-model="sellForm.saleDate" type="date" class="input input-bordered bg-base-300" required />
              </div>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Nama Pembeli *</span></label>
              <input v-model="sellForm.buyerName" type="text" class="input input-bordered bg-base-300" required />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label"><span class="label-text">No. Telepon</span></label>
                <input v-model="sellForm.buyerPhone" type="tel" class="input input-bordered bg-base-300" />
              </div>
              <div class="form-control">
                <label class="label"><span class="label-text">Metode Bayar</span></label>
                <select v-model="sellForm.paymentMethod" class="select select-bordered bg-base-300">
                  <option value="CASH">Cash</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
            </div>
            <div class="alert alert-info">
              <IconInfoCircle class="w-6 h-6 shrink-0" :stroke-width="1.5" />
              <div>
                <p>HPP Product: <strong>{{ formatCurrency(product?.totalCost || 0, product?.currency) }}</strong></p>
                <p v-if="sellForm.sellingPrice">
                  Estimasi Profit: 
                  <strong :class="parseFloat(sellForm.sellingPrice) - (product?.totalCost || 0) >= 0 ? 'text-success' : 'text-error'">
                    {{ formatCurrency(parseFloat(sellForm.sellingPrice) - (product?.totalCost || 0), sellForm.currency) }}
                  </strong>
                </p>
              </div>
            </div>
            <div class="modal-action">
              <button type="button" class="btn btn-ghost" @click="showSellModal = false">Batal</button>
              <button type="submit" class="btn btn-success" :disabled="loading">
                <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                Konfirmasi Penjualan
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop">
          <button @click="showSellModal = false">close</button>
        </form>
      </dialog>
    </Teleport>

    <!-- Confirmation Modal -->
    <ConfirmModal
      :show="showConfirm"
      :title="confirmData.title"
      :message="confirmData.message"
      :confirm-text="confirmData.confirmText"
      :cancel-text="confirmData.cancelText"
      :type="confirmData.type"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>
