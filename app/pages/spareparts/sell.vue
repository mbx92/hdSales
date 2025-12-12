<script setup lang="ts">
import { IconShoppingCart, IconTrash, IconSearch, IconCheck, IconPackage, IconArrowLeft } from '@tabler/icons-vue'

const router = useRouter()
const { data: products } = await useFetch('/api/spareparts', {
  query: { status: 'ACTIVE' }
})

const search = ref('')
const cart = ref<any[]>([])
const customerName = ref('')
const customerPhone = ref('')
const paymentMethod = ref('CASH')
const discount = ref(0)
const loading = ref(false)
const showSuccessModal = ref(false)
const lastInvoice = ref('')

const filteredProducts = computed(() => {
  if (!search.value) return []
  const q = search.value.toLowerCase()
  return products.value?.filter((p: any) => 
    p.name.toLowerCase().includes(q) || 
    p.sku.toLowerCase().includes(q)
  ).slice(0, 5) || [] // Limit 5 suggestions
})

const addToCart = (product: any) => {
  if (product.stock <= 0) return alert('Stok habis!')
  
  const existing = cart.value.find(item => item.id === product.id)
  if (existing) {
    if (existing.quantity >= product.stock) return alert('Stok tidak cukup!')
    existing.quantity++
  } else {
    cart.value.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.sellingPrice,
      quantity: 1,
      maxStock: product.stock
    })
  }
  search.value = '' // Clear search
}

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1)
}

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const total = computed(() => {
  return Math.max(0, subtotal.value - discount.value)
})

const processSale = async () => {
  if (cart.value.length === 0) return
  if (!customerName.value) return alert('Nama pembeli wajib diisi')
  
  loading.value = true
  try {
    const res: any = await $fetch('/api/sparepart-sales', {
      method: 'POST',
      body: {
        items: cart.value.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        paymentMethod: paymentMethod.value,
        discount: discount.value
      }
    })
    
    lastInvoice.value = res.invoiceNumber
    showSuccessModal.value = true
    
    // Reset cart but keep page open for next sale
    cart.value = []
    customerName.value = ''
    customerPhone.value = ''
    discount.value = 0
  } catch (e: any) {
    alert(e.data?.message || 'Transaksi gagal')
  } finally {
    loading.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <div class="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-6">
    <!-- Left Panel: Product Search & Cart -->
    <div class="flex-1 flex flex-col gap-4 h-full">
      
      <!-- Search Bar -->
      <div class="card bg-base-200 border border-base-300 flex-shrink-0 z-20">
        <div class="card-body py-2 px-4">
            <div class="flex items-center gap-2 mb-2">
                <NuxtLink to="/spareparts" class="btn btn-ghost btn-sm btn-square">
                    <IconArrowLeft class="w-5 h-5" />
                </NuxtLink>
                <span class="font-bold">Kembali ke Stok</span>
            </div>
          <div class="relative">
            <input 
              v-model="search"
              type="text" 
              placeholder="Scan SKU atau Cari Nama Produk..." 
              class="input input-bordered w-full pl-10 h-12 text-lg"
              autofocus
            />
            <IconSearch class="w-6 h-6 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
            
            <!-- Autocomplete Dropdown -->
            <div v-if="filteredProducts.length && search" class="absolute top-14 left-0 w-full bg-base-100 border border-base-300 shadow-xl rounded-box overflow-hidden">
              <ul class="menu p-2 w-full">
                <li v-for="p in filteredProducts" :key="p.id">
                  <a @click="addToCart(p)" class="flex justify-between items-center py-3">
                    <div>
                      <div class="font-bold">{{ p.name }}</div>
                      <div class="text-xs opacity-60">{{ p.sku }} • Stok: {{ p.stock }}</div>
                    </div>
                    <div class="font-mono font-bold">{{ formatCurrency(p.sellingPrice) }}</div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart Items -->
      <div class="card bg-base-200 border border-base-300 flex-1 overflow-hidden">
        <div class="card-body p-0 flex flex-col h-full">
          <div class="p-4 border-b border-base-300 font-bold flex items-center gap-2">
            <IconShoppingCart class="w-5 h-5" /> Keranjang Belanja
          </div>
          
          <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div v-if="cart.length === 0" class="text-center py-12 opacity-50">
              Keranjang kosong
            </div>
            
            <div v-for="(item, index) in cart" :key="index" class="flex items-center justify-between p-3 bg-base-100/50 rounded-lg border border-base-300/50">
              <div class="flex-1">
                <div class="font-bold">{{ item.name }}</div>
                <div class="text-xs opacity-60">{{ item.sku }}</div>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <button @click="item.quantity > 1 ? item.quantity-- : removeFromCart(index)" class="btn btn-xs btn-square">-</button>
                  <span class="w-8 text-center font-bold">{{ item.quantity }}</span>
                  <button @click="item.quantity < item.maxStock && item.quantity++" class="btn btn-xs btn-square" :disabled="item.quantity >= item.maxStock">+</button>
                </div>
                <div class="text-right w-24">
                  <div class="font-bold">{{ formatCurrency(item.price * item.quantity) }}</div>
                  <div class="text-xs opacity-60">@ {{ formatCurrency(item.price) }}</div>
                </div>
                <button @click="removeFromCart(index)" class="btn btn-ghost btn-xs text-error">
                  <IconTrash class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Checkout -->
    <div class="w-full md:w-96 flex flex-col gap-4">
      <div class="card bg-base-200 border border-base-300 h-full">
        <div class="card-body">
          <h2 class="card-title mb-6">Informasi & Pembayaran</h2>
          
          <div class="space-y-4 flex-1">
            <div class="form-control">
              <label class="label"><span class="label-text">Nama Pembeli</span></label>
              <input v-model="customerName" type="text" class="input input-bordered" placeholder="Nama Customer" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">No. Telepon</span></label>
              <input v-model="customerPhone" type="tel" class="input input-bordered" placeholder="08..." />
            </div>
            
            <div class="divider"></div>
            
            <div class="flex justify-between items-center text-sm">
              <span>Subtotal</span>
              <span class="font-mono">{{ formatCurrency(subtotal) }}</span>
            </div>
            
            <div class="form-control">
              <label class="label"><span class="label-text">Diskon</span></label>
              <input v-model="discount" type="number" class="input input-bordered input-sm" min="0" />
            </div>
            
            <div class="form-control">
              <label class="label"><span class="label-text">Metode Bayar</span></label>
              <select v-model="paymentMethod" class="select select-bordered select-sm">
                <option value="CASH">Cash</option>
                <option value="TRANSFER">Transfer</option>
                <option value="CARD">Kartu Debit/Kredit</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
            
            <div class="divider"></div>
            
            <div class="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span class="text-primary">{{ formatCurrency(total) }}</span>
            </div>
          </div>

          <div class="mt-6">
            <button 
              @click="processSale" 
              class="btn btn-primary w-full btn-lg"
              :disabled="loading || cart.length === 0"
            >
              <span v-if="loading" class="loading loading-spinner"></span>
              <template v-else>
                Bayar & Cetak Struk
                <IconCheck class="w-6 h-6 ml-2" />
              </template>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <dialog :class="['modal', showSuccessModal && 'modal-open']">
      <div class="modal-box text-center">
        <IconCheck class="w-16 h-16 mx-auto text-success mb-4" />
        <h3 class="font-bold text-lg">Transaksi Berhasil!</h3>
        <p class="py-4">Invoice #{{ lastInvoice }} telah dibuat.</p>
        <div class="modal-action justify-center">
          <button class="btn btn-primary" @click="showSuccessModal = false">
            Transaksi Baru
          </button>
          <NuxtLink to="/sales" class="btn btn-outline" @click="showSuccessModal = false">
            Lihat Riwayat
          </NuxtLink>
        </div>
      </div>
    </dialog>
  </div>
</template>
