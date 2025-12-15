<script setup lang="ts">
import { IconPlus, IconEdit, IconTrash, IconFilter, IconReceipt, IconWallet, IconBuildingStore, IconBolt, IconUsers, IconSpeakerphone, IconTool, IconDotsVertical, IconChevronLeft, IconChevronRight } from '@tabler/icons-vue'

const { showError, showSuccess } = useAlert()

const filterCategory = ref('all')
const filterStartDate = ref('')
const filterEndDate = ref('')
const showModal = ref(false)
const editingExpense = ref<any>(null)
const loading = ref(false)
const deleting = ref<string | null>(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const categories = [
    { value: 'RENT', label: 'Sewa', icon: IconBuildingStore, color: 'primary' },
    { value: 'UTILITIES', label: 'Utilitas', icon: IconBolt, color: 'warning' },
    { value: 'SALARY', label: 'Gaji', icon: IconUsers, color: 'info' },
    { value: 'MARKETING', label: 'Marketing', icon: IconSpeakerphone, color: 'secondary' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: IconTool, color: 'accent' },
    { value: 'OTHER', label: 'Lainnya', icon: IconWallet, color: 'neutral' },
]

const form = ref({
    category: 'OTHER',
    description: '',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    notes: ''
})

const queryParams = computed(() => {
    const params: Record<string, string> = {}
    if (filterCategory.value !== 'all') params.category = filterCategory.value
    if (filterStartDate.value) params.startDate = filterStartDate.value
    if (filterEndDate.value) params.endDate = filterEndDate.value
    return params
})

const { data: expenseData, pending, refresh } = await useFetch('/api/expenses', {
    query: queryParams,
    watch: [queryParams],
})

// Reset page when filters change
watch(queryParams, () => {
    currentPage.value = 1
})

// Paginated data
const paginatedExpenses = computed(() => {
    if (!expenseData.value?.data) return []
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return expenseData.value.data.slice(start, end)
})

const totalPages = computed(() => {
    if (!expenseData.value?.data) return 1
    return Math.ceil(expenseData.value.data.length / itemsPerPage)
})

const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page
    }
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(value)
}

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const getCategoryInfo = (category: string) => {
    return categories.find(c => c.value === category) || categories[5]
}

const openCreateModal = () => {
    editingExpense.value = null
    form.value = {
        category: 'OTHER',
        description: '',
        amount: '',
        transactionDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'CASH',
        notes: ''
    }
    showModal.value = true
}

const openEditModal = (expense: any) => {
    editingExpense.value = expense
    form.value = {
        category: expense.category,
        description: expense.description,
        amount: String(expense.amount),
        transactionDate: expense.transactionDate.split('T')[0],
        paymentMethod: expense.paymentMethod || 'CASH',
        notes: expense.notes || ''
    }
    showModal.value = true
}

const handleSubmit = async () => {
    if (!form.value.description || !form.value.amount) {
        return showError('Deskripsi dan jumlah wajib diisi')
    }

    loading.value = true
    try {
        if (editingExpense.value) {
            await $fetch(`/api/expenses/${editingExpense.value.id}`, {
                method: 'PATCH',
                body: form.value
            })
            showSuccess('Expense berhasil diupdate')
        } else {
            await $fetch('/api/expenses', {
                method: 'POST',
                body: form.value
            })
            showSuccess('Expense berhasil ditambahkan')
        }
        showModal.value = false
        refresh()
    } catch (e: any) {
        showError(e.data?.message || 'Gagal menyimpan expense')
    } finally {
        loading.value = false
    }
}

const handleDelete = async (id: string) => {
    if (!confirm('Hapus expense ini?')) return
    
    deleting.value = id
    try {
        await $fetch(`/api/expenses/${id}`, { method: 'DELETE' })
        showSuccess('Expense berhasil dihapus')
        refresh()
    } catch (e: any) {
        showError(e.data?.message || 'Gagal menghapus expense')
    } finally {
        deleting.value = null
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 class="text-3xl font-bold">Expenses</h1>
                <p class="text-base-content/60">Pencatatan biaya operasional showroom</p>
            </div>
            <div class="flex flex-wrap gap-2">
                <NuxtLink to="/reports" class="btn btn-outline btn-sm">Transaksi</NuxtLink>
                <NuxtLink to="/reports/profit-loss" class="btn btn-outline btn-sm">P&L</NuxtLink>
                <NuxtLink to="/reports/inventory" class="btn btn-outline btn-sm">Inventory</NuxtLink>
                <button @click="openCreateModal" class="btn btn-primary btn-sm gap-1">
                    <IconPlus class="w-4 h-4" :stroke-width="1.5" />
                    Tambah Expense
                </button>
            </div>
        </div>

        <!-- Summary Cards -->
        <div v-if="expenseData?.summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="card bg-base-200 border border-base-300">
                <div class="card-body py-4">
                    <p class="text-xs text-base-content/60">Total Expense</p>
                    <p class="text-2xl font-bold text-error">{{ formatCurrency(expenseData.summary.totalExpenses) }}</p>
                    <p class="text-xs text-base-content/60">{{ expenseData.summary.count }} transaksi</p>
                </div>
            </div>
            <template v-for="(cat, key) in expenseData.summary.categoryTotals" :key="key">
                <div class="card bg-base-200 border border-base-300">
                    <div class="card-body py-4">
                        <p class="text-xs text-base-content/60 flex items-center gap-1">
                            <component :is="getCategoryInfo(key).icon" class="w-3 h-3" />
                            {{ getCategoryInfo(key).label }}
                        </p>
                        <p class="text-lg font-bold">{{ formatCurrency(cat.total) }}</p>
                        <p class="text-xs text-base-content/60">{{ cat.count }}×</p>
                    </div>
                </div>
            </template>
        </div>

        <!-- Filters -->
        <div class="card bg-base-200 border border-base-300">
            <div class="card-body py-4">
                <div class="flex items-center gap-2 mb-3">
                    <IconFilter class="w-5 h-5" :stroke-width="1.5" />
                    <span class="font-semibold">Filter</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div class="form-control">
                        <select v-model="filterCategory" class="select select-bordered select-sm bg-base-300">
                            <option value="all">Semua Kategori</option>
                            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                        </select>
                    </div>
                    <div class="form-control">
                        <input v-model="filterStartDate" type="date" placeholder="Dari" class="input input-bordered input-sm bg-base-300" />
                    </div>
                    <div class="form-control">
                        <input v-model="filterEndDate" type="date" placeholder="Sampai" class="input input-bordered input-sm bg-base-300" />
                    </div>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="pending" class="flex items-center justify-center py-12">
            <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <!-- Expenses List -->
        <div v-else-if="expenseData?.data?.length" class="card bg-base-200 border border-base-300">
            <div class="card-body">
                <div class="flex items-center gap-2 mb-4">
                    <IconReceipt class="w-5 h-5" :stroke-width="1.5" />
                    <h2 class="card-title text-lg">Daftar Expense</h2>
                    <span class="badge badge-primary">{{ expenseData.data.length }}</span>
                </div>

                <div>
                    <table class="table table-zebra w-full">
                        <thead class="sticky top-0 bg-base-200">
                            <tr>
                                <th class="py-4 w-32">Tanggal</th>
                                <th class="py-4 w-28">Kategori</th>
                                <th class="py-4">Deskripsi</th>
                                <th class="py-4 w-28 hidden md:table-cell">Metode</th>
                                <th class="py-4 w-40 text-right">Jumlah</th>
                                <th class="py-4 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="expense in paginatedExpenses" :key="expense.id" class="hover">
                                <td class="whitespace-nowrap py-4">{{ formatDate(expense.transactionDate) }}</td>
                                <td class="py-4">
                                    <span :class="['badge badge-sm', `badge-${getCategoryInfo(expense.category).color}`]">
                                        {{ getCategoryInfo(expense.category).label }}
                                    </span>
                                </td>
                                <td class="py-4 min-w-[200px] max-w-[300px]">
                                    <div class="font-medium">{{ expense.description }}</div>
                                    <div v-if="expense.notes" class="text-xs text-base-content/60 truncate">{{ expense.notes }}</div>
                                    <div class="text-xs text-base-content/60 md:hidden mt-1">{{ expense.paymentMethod || '-' }}</div>
                                </td>
                                <td class="py-4 hidden md:table-cell">{{ expense.paymentMethod || '-' }}</td>
                                <td class="py-4 text-right font-mono font-bold text-error whitespace-nowrap">{{ formatCurrency(expense.amountIdr) }}</td>
                                <td class="py-4">
                                    <div class="dropdown dropdown-end">
                                        <div tabindex="0" role="button" class="btn btn-ghost btn-sm btn-square">
                                            <IconDotsVertical class="w-4 h-4" />
                                        </div>
                                        <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32">
                                            <li><a @click="openEditModal(expense)"><IconEdit class="w-4 h-4" /> Edit</a></li>
                                            <li>
                                                <a @click="handleDelete(expense.id)" class="text-error">
                                                    <span v-if="deleting === expense.id" class="loading loading-spinner loading-xs"></span>
                                                    <IconTrash v-else class="w-4 h-4" /> Hapus
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div v-if="totalPages > 1" class="flex items-center justify-between mt-4 pt-4 border-t border-base-300">
                    <div class="text-sm text-base-content/60">
                        Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, expenseData?.data?.length || 0) }} dari {{ expenseData?.data?.length || 0 }}
                    </div>
                    <div class="flex items-center gap-2">
                        <button 
                            @click="goToPage(currentPage - 1)" 
                            :disabled="currentPage === 1"
                            class="btn btn-sm btn-ghost"
                        >
                            <IconChevronLeft class="w-4 h-4" />
                        </button>
                        <span class="text-sm">
                            Halaman {{ currentPage }} dari {{ totalPages }}
                        </span>
                        <button 
                            @click="goToPage(currentPage + 1)" 
                            :disabled="currentPage === totalPages"
                            class="btn btn-sm btn-ghost"
                        >
                            <IconChevronRight class="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="card bg-base-200 border border-base-300">
            <div class="card-body text-center py-12">
                <IconWallet class="w-16 h-16 mx-auto text-base-content/20" :stroke-width="1" />
                <p class="text-base-content/60 mt-4">Belum ada expense pada periode ini</p>
                <button @click="openCreateModal" class="btn btn-primary btn-sm mt-4">
                    <IconPlus class="w-4 h-4" /> Tambah Expense Pertama
                </button>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <dialog :class="['modal', showModal && 'modal-open']">
            <div class="modal-box">
                <h3 class="font-bold text-lg mb-4">{{ editingExpense ? 'Edit Expense' : 'Tambah Expense' }}</h3>
                
                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div class="form-control">
                        <label class="label"><span class="label-text">Kategori *</span></label>
                        <select v-model="form.category" class="select select-bordered bg-base-200">
                            <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
                        </select>
                    </div>

                    <div class="form-control">
                        <label class="label"><span class="label-text">Deskripsi *</span></label>
                        <input v-model="form.description" type="text" class="input input-bordered bg-base-200" placeholder="Contoh: Listrik bulan Desember" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label"><span class="label-text">Jumlah (IDR) *</span></label>
                            <input v-model="form.amount" type="number" class="input input-bordered bg-base-200" min="0" />
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text">Tanggal</span></label>
                            <input v-model="form.transactionDate" type="date" class="input input-bordered bg-base-200" />
                        </div>
                    </div>

                    <div class="form-control">
                        <label class="label"><span class="label-text">Metode Pembayaran</span></label>
                        <select v-model="form.paymentMethod" class="select select-bordered bg-base-200">
                            <option value="CASH">Cash</option>
                            <option value="TRANSFER">Transfer</option>
                            <option value="CARD">Kartu</option>
                            <option value="QRIS">QRIS</option>
                        </select>
                    </div>

                    <div class="form-control">
                        <label class="label"><span class="label-text">Catatan</span></label>
                        <textarea v-model="form.notes" class="textarea textarea-bordered bg-base-200 h-20" placeholder="Catatan tambahan..."></textarea>
                    </div>

                    <div class="modal-action">
                        <button type="button" class="btn btn-ghost" @click="showModal = false">Batal</button>
                        <button type="submit" class="btn btn-primary" :disabled="loading">
                            <span v-if="loading" class="loading loading-spinner loading-sm"></span>
                            {{ editingExpense ? 'Update' : 'Simpan' }}
                        </button>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop" @click="showModal = false"></form>
        </dialog>
    </div>
</template>
