<script setup lang="ts">
import { IconSearch, IconPlus, IconPencil, IconTrash, IconTruck, IconMapPin, IconPhone, IconMail } from '@tabler/icons-vue'

interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  _count?: { spareparts: number }
}

const search = ref('')
const debouncedSearch = refDebounced(search, 300)

const { data: suppliers, pending, refresh } = await useFetch<Supplier[]>('/api/suppliers', {
  query: { search: debouncedSearch },
  watch: [debouncedSearch]
})

const showModal = ref(false)
const loading = ref(false)
const isEditing = ref(false)
const editId = ref('')

const form = ref({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
})

const resetForm = () => {
  form.value = { name: '', phone: '', email: '', address: '', notes: '' }
  isEditing.value = false
  editId.value = ''
}

const openAddModal = () => {
  resetForm()
  showModal.value = true
}

const openEditModal = (supplier: Supplier) => {
  form.value = {
    name: supplier.name,
    phone: supplier.phone || '',
    email: supplier.email || '',
    address: supplier.address || '',
    notes: supplier.notes || '',
  }
  isEditing.value = true
  editId.value = supplier.id
  showModal.value = true
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const url = isEditing.value ? `/api/suppliers/${editId.value}` : '/api/suppliers'
    const method = isEditing.value ? 'PATCH' : 'POST'
    
    await $fetch(url, {
      method,
      body: form.value
    })
    
    showModal.value = false
    refresh()
    resetForm()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menyimpan supplier')
  } finally {
    loading.value = false
  }
}

const deleteSupplier = async (id: string, name: string) => {
  if (!confirm(`Yakin ingin menghapus supplier ${name}?`)) return
  
  loading.value = true
  try {
    await $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    refresh()
  } catch (e: any) {
    alert(e.data?.message || 'Gagal menghapus supplier')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold flex items-center gap-2">
          <IconTruck class="w-8 h-8 text-primary" :stroke-width="1.5" />
          Suppliers
        </h1>
        <p class="text-base-content/60">Kelola data supplier spareparts</p>
      </div>
      <button @click="openAddModal" class="btn btn-primary">
        <IconPlus class="w-5 h-5 mr-2" :stroke-width="1.5" />
        Tambah Supplier
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-base-200 border border-base-300">
      <div class="card-body py-4">
        <div class="form-control">
          <div class="relative">
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama, email, atau telepon..."
              class="input input-bordered w-full bg-base-300 pr-10"
            />
            <IconSearch class="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40" :stroke-width="1.5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Suppliers Grid -->
    <div v-else-if="suppliers?.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="supplier in suppliers" :key="supplier.id" class="card bg-base-200 border border-base-300 hover:shadow-lg transition-shadow">
        <div class="card-body">
          <div class="flex justify-between items-start">
            <h3 class="card-title text-lg">{{ supplier.name }}</h3>
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-sm btn-square">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </label>
              <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-300 rounded-box w-52 z-10">
                <li><a @click="openEditModal(supplier)"><IconPencil class="w-4 h-4" /> Edit</a></li>
                <li><a @click="deleteSupplier(supplier.id, supplier.name)" class="text-error"><IconTrash class="w-4 h-4" /> Delete</a></li>
              </ul>
            </div>
          </div>
          
          <div class="space-y-2 mt-2 text-sm text-base-content/80">
            <div v-if="supplier.phone" class="flex items-center gap-2">
              <IconPhone class="w-4 h-4 text-base-content/60" />
              {{ supplier.phone }}
            </div>
            <div v-if="supplier.email" class="flex items-center gap-2">
              <IconMail class="w-4 h-4 text-base-content/60" />
              {{ supplier.email }}
            </div>
            <div v-if="supplier.address" class="flex items-start gap-2">
              <IconMapPin class="w-4 h-4 text-base-content/60 mt-0.5" />
              <span class="truncate">{{ supplier.address }}</span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-base-300 flex justify-between items-center text-xs text-base-content/60">
            <span>{{ supplier._count?.spareparts || 0 }} products</span>
            <span v-if="supplier.notes" class="tooltip" :data-tip="supplier.notes">
              See notes
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-16">
      <IconTruck class="w-16 h-16 mx-auto text-base-content/20 mb-4" :stroke-width="1" />
      <h3 class="text-lg font-bold">Belum ada supplier</h3>
      <p class="text-base-content/60">Mulai dengan menambahkan supplier pertama Anda</p>
    </div>

    <!-- Modal -->
    <dialog :class="['modal', showModal && 'modal-open']">
      <div class="modal-box bg-base-200">
        <h3 class="font-bold text-lg mb-4">{{ isEditing ? 'Edit Supplier' : 'Tambah Supplier' }}</h3>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Supplier *</span></label>
            <input v-model="form.name" type="text" class="input input-bordered bg-base-300" required />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Telepon</span></label>
              <input v-model="form.phone" type="tel" class="input input-bordered bg-base-300" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">Email</span></label>
              <input v-model="form.email" type="email" class="input input-bordered bg-base-300" />
            </div>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Alamat</span></label>
            <textarea v-model="form.address" class="textarea textarea-bordered bg-base-300 h-24"></textarea>
          </div>

          <div class="form-control">
            <label class="label"><span class="label-text">Catatan</span></label>
            <textarea v-model="form.notes" class="textarea textarea-bordered bg-base-300"></textarea>
          </div>

          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="showModal = false">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <span v-if="loading" class="loading loading-spinner loading-sm"></span>
              Simpan
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="showModal = false">close</button>
      </form>
    </dialog>
  </div>
</template>
