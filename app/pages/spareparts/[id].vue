<script setup lang="ts">
import { IconArrowLeft, IconPencil, IconTrash, IconHistory, IconPackage, IconAlertTriangle } from '@tabler/icons-vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { data: sparepart, pending, refresh } = await useFetch(`/api/spareparts/${id}`)
const { data: suppliers } = await useFetch('/api/suppliers')

const showEditModal = ref(false)
const updateLoading = ref(false)

const editForm = ref<any>({})

const openEditModal = () => {
  editForm.value = { ...sparepart.value }
  // Ensure numeric values are safe
  editForm.value.supplierId = sparepart.value?.supplierId || ''
  showEditModal.value = true
}

const handleUpdate = async () => {
  updateLoading.value = true
  try {
    await $fetch(`/api/spareparts/${id}`, {
      method: 'PATCH',
      body: editForm.value
    })
    showEditModal.value = false
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal update produk')
  } finally {
    updateLoading.value = false
  }
}

const deleteItem = async () => {
  if (!confirm('Yakin ingin menghapus produk ini?')) return
  
  try {
    await $fetch(`/api/spareparts/${id}`, { method: 'DELETE' })
    router.push('/spareparts')
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menghapus produk')
  }
}

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
</script>

<template>
  <div class="space-y-6">
    <div v-if="pending" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <template v-else-if="sparepart">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div class="flex items-start gap-4">
          <NuxtLink to="/spareparts" class="btn btn-ghost btn-square">
            <IconArrowLeft class="w-6 h-6" :stroke-width="1.5" />
          </NuxtLink>
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-3xl font-bold">{{ sparepart.name }}</h1>
              <span :class="['badge badge-lg', sparepart.status === 'ACTIVE' ? 'badge-success' : 'badge-ghost']">
                {{ sparepart.status }}
              </span>
            </div>
            <p class="text-base-content/60">{{ sparepart.sku }} • {{ sparepart.brand || 'No Brand' }}</p>
          </div>
        </div>

        <div class="flex gap-2">
          <button @click="openEditModal" class="btn btn-outline">
            <IconPencil class="w-5 h-5 mr-1" :stroke-width="1.5" />
            Edit Info
          </button>
          <button @click="deleteItem" class="btn btn-outline btn-error">
            <IconTrash class="w-5 h-5" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Stock Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-sm text-base-content/60 flex items-center gap-2">
              <IconPackage class="w-4 h-4" /> Stok Saat Ini
            </h2>
            <div class="flex items-end gap-2 mt-1">
              <span class="text-4xl font-bold">{{ sparepart.stock }}</span>
              <span class="text-sm mb-1">unit</span>
            </div>
            <div v-if="sparepart.stock <= sparepart.minStock" class="alert alert-warning mt-2 py-2 text-sm">
              <IconAlertTriangle class="w-4 h-4" /> Stok menipis (Min: {{ sparepart.minStock }})
            </div>
          </div>
        </div>

        <!-- Price Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-sm text-base-content/60">Harga Jual</h2>
            <div class="text-3xl font-bold text-success mt-1">
              {{ formatCurrency(sparepart.sellingPrice, sparepart.currency) }}
            </div>
            <p class="text-xs text-base-content/60 mt-1">
              HPP: {{ formatCurrency(sparepart.purchasePrice, sparepart.currency) }}
            </p>
          </div>
        </div>

        <!-- Supplier Card -->
        <div class="card bg-base-200 border border-base-300">
          <div class="card-body">
            <h2 class="card-title text-sm text-base-content/60">Supplier Info</h2>
            <div v-if="sparepart.supplier">
              <p class="font-bold text-lg">{{ sparepart.supplier.name }}</p>
              <p class="text-sm opacity-60">{{ sparepart.supplier.phone || '-' }}</p>
            </div>
            <div v-else class="text-base-content/40 italic">
              Tidak ada data supplier
            </div>
          </div>
        </div>
      </div>

      <!-- Description & Details -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div v-if="sparepart.description" class="card bg-base-200 border border-base-300">
            <div class="card-body">
              <h3 class="font-bold mb-2">Deskripsi Produk</h3>
              <p class="whitespace-pre-wrap">{{ sparepart.description }}</p>
            </div>
          </div>

          <!-- Sales History -->
          <div class="card bg-base-200 border border-base-300">
            <div class="card-body">
              <h3 class="font-bold mb-4 flex items-center gap-2">
                <IconHistory class="w-5 h-5" /> Riwayat Penjualan
              </h3>
              
              <div v-if="sparepart.saleItems?.length" class="overflow-x-auto">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Invoice</th>
                      <th>Qty</th>
                      <th>Harga Satuan</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in sparepart.saleItems" :key="item.id">
                      <td>{{ new Date(item.createdAt).toLocaleDateString('id-ID') }}</td>
                      <td>
                        <span class="font-mono text-xs">{{ item.sale?.invoiceNumber || '-' }}</span>
                      </td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ formatCurrency(item.unitPrice, sparepart.currency) }}</td>
                      <td class="font-bold">{{ formatCurrency(item.subtotal, sparepart.currency) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="text-center py-8 text-base-content/40">
                Belum ada penjualan
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Info -->
        <div class="space-y-6">
          <div class="card bg-base-200 border border-base-300">
            <div class="card-body text-sm">
              <h3 class="font-bold mb-2">Info Tambahan</h3>
              <div class="flex justify-between py-2 border-b border-base-300">
                <span class="opacity-60">Kategori</span>
                <span class="badge">{{ sparepart.category }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-base-300">
                <span class="opacity-60">Ditambahkan</span>
                <span>{{ new Date(sparepart.createdAt).toLocaleDateString() }}</span>
              </div>
              <div class="flex justify-between py-2 border-b border-base-300">
                <span class="opacity-60">Terakhir Update</span>
                <span>{{ new Date(sparepart.updatedAt).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Modal -->
    <dialog :class="['modal', showEditModal && 'modal-open']">
      <div class="modal-box bg-base-200 w-11/12 max-w-3xl">
        <h3 class="font-bold text-lg mb-4">Edit Produk</h3>
        <form @submit.prevent="handleUpdate" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Nama Produk</span></label>
              <input v-model="editForm.name" type="text" class="input input-bordered bg-base-300" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">SKU</span></label>
              <input v-model="editForm.sku" type="text" class="input input-bordered bg-base-300" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Brand</span></label>
              <input v-model="editForm.brand" type="text" class="input input-bordered bg-base-300" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Supplier</span></label>
              <select v-model="editForm.supplierId" class="select select-bordered bg-base-300">
                <option value="">-- No Supplier --</option>
                <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
                  {{ sup.name }}
                </option>
              </select>
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Harga Jual</span></label>
              <input v-model="editForm.sellingPrice" type="number" class="input input-bordered bg-base-300" required />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Stok Saat Ini</span></label>
              <input v-model="editForm.stock" type="number" class="input input-bordered bg-base-300" required />
            </div>
             <div class="form-control">
              <label class="label"><span class="label-text">Status</span></label>
              <select v-model="editForm.status" class="select select-bordered bg-base-300">
                <option value="ACTIVE">Active</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Deskripsi</span></label>
            <textarea v-model="editForm.description" class="textarea textarea-bordered bg-base-300 h-24"></textarea>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="showEditModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="updateLoading">
              <span v-if="updateLoading" class="loading loading-spinner loading-sm"></span>
              Update
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showEditModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>
