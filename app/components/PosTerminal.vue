<script setup lang="ts">
import { IconShoppingCart, IconTrash, IconSearch, IconCheck, IconPackage, IconDownload, IconInfinity, IconReceipt, IconBox, IconCurrencyDollar, IconLayoutGrid, IconList, IconCash, IconBuildingBank, IconCreditCard, IconQrcode } from '~/utils/tabler-icons'

const { showError, showWarning } = useAlert()
const viewMode = useCookie<'grid' | 'list'>('pos-products-view-mode', {
  default: () => 'grid',
  sameSite: 'lax',
})
const stockFilter = ref<'all' | 'available' | 'out-of-stock'>('all')

// Fetch spareparts
const { data: spareparts, refresh: refreshSpareparts } = await useFetch('/api/spareparts', {
  query: { status: 'ACTIVE' }
})

// Fetch products (only AVAILABLE)
const { data: productItems, refresh: refreshProducts } = await useFetch('/api/products', {
  query: { status: 'AVAILABLE' }
})

// Combine all items for POS
const allItems = computed(() => {
  const sparepartList = (spareparts.value || []).map((p: any) => ({
    ...p,
    itemType: 'sparepart',
    isService: p.category === 'SERVICE',
    displaySku: p.sku
  }))
  
  const productList = (productItems.value || []).map((p: any) => ({
    ...p,
    itemType: 'product',
    isService: false,
    stock: 1, // Products are single items
    displaySku: p.sku || `PRD-${p.id.slice(-4).toUpperCase()}`,
    hasPrice: p.sellingPrice != null && p.sellingPrice > 0 // Track if product has a real price
  }))
  
  return [...sparepartList, ...productList]
})

const search = ref('')
const cart = ref<any[]>([])
const customerName = ref('')
const customerPhone = ref('')
const paymentMethod = ref('CASH')
const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: IconCash },
  { value: 'TRANSFER', label: 'Transfer', icon: IconBuildingBank },
  { value: 'CARD', label: 'Kartu', icon: IconCreditCard },
  { value: 'QRIS', label: 'QRIS', icon: IconQrcode },
]
const discountMode = ref<'NOMINAL' | 'PERCENTAGE'>('NOMINAL')
const discountValue = ref<string | number>('')
const loading = ref(false)
const showSuccessModal = ref(false)
const showCheckoutModal = ref(false)
const showPriceModal = ref(false)
const pendingProduct = ref<any>(null)
const inputPrice = ref('')
const savingPrice = ref(false)
const lastInvoice = ref('')
const lastSaleId = ref('')

const filteredProducts = computed(() => {
  if (!search.value) return []
  const q = search.value.toLowerCase()
  return allItems.value?.filter((p: any) => 
    p.name.toLowerCase().includes(q) || 
    (p.displaySku && p.displaySku.toLowerCase().includes(q))
  ).slice(0, 5) || [] // Limit 5 suggestions
})

// Show every active sparepart/service and every available single product.
// Out-of-stock spareparts remain visible but cannot be added to the cart.
const availableProducts = computed(() => {
  return allItems.value || []
})

const isItemOutOfStock = (item: any) => {
  return item.itemType !== 'product' && item.category !== 'SERVICE' && item.stock <= 0
}

const catalogItems = computed(() => {
  if (stockFilter.value === 'available') {
    return availableProducts.value.filter((item: any) => !isItemOutOfStock(item))
  }

  if (stockFilter.value === 'out-of-stock') {
    return availableProducts.value.filter((item: any) => isItemOutOfStock(item))
  }

  return availableProducts.value
})

const availableItemCount = computed(() => {
  return availableProducts.value.filter((item: any) => !isItemOutOfStock(item)).length
})

const outOfStockItemCount = computed(() => {
  return availableProducts.value.filter((item: any) => isItemOutOfStock(item)).length
})

const addToCart = (product: any) => {
  // Skip stock check for SERVICE category
  const isService = product.isService || product.category === 'SERVICE'
  const isProduct = product.itemType === 'product'
  
  // Products can only be added once (single item)
  if (isProduct) {
    const existing = cart.value.find(item => item.id === product.id && item.itemType === 'product')
    if (existing) return showWarning('Produk ini sudah ada di keranjang!')
    
    // Check if product has no selling price - show price input modal
    if (!product.hasPrice) {
      pendingProduct.value = product
      inputPrice.value = product.totalCost ? String(product.totalCost) : ''
      showPriceModal.value = true
      search.value = ''
      return
    }
  }
  
  if (!isService && !isProduct && product.stock <= 0) return showWarning('Stok habis!')
  
  const existing = cart.value.find(item => item.id === product.id && item.itemType === product.itemType)
  if (existing) {
    if (!isService && existing.quantity >= product.stock) return showWarning('Stok tidak cukup!')
    existing.quantity++
  } else {
    cart.value.push({
      id: product.id,
      name: product.name,
      sku: product.displaySku || product.sku,
      price: product.sellingPrice,
      quantity: 1,
      maxStock: isService ? null : (isProduct ? 1 : product.stock),
      isService,
      itemType: product.itemType || 'sparepart'
    })
  }
  search.value = '' // Clear search
}

// Save price and add to cart
const saveProductPrice = async () => {
  if (!pendingProduct.value || !inputPrice.value) {
    return showWarning('Harga jual wajib diisi!')
  }
  
  const price = parseFloat(inputPrice.value)
  if (isNaN(price) || price <= 0) {
    return showWarning('Harga tidak valid!')
  }
  
  savingPrice.value = true
  try {
    // Update product selling price in database
    await $fetch(`/api/products/${pendingProduct.value.id}`, {
      method: 'PATCH',
      body: { sellingPrice: price }
    })
    
    // Add to cart with the new price
    cart.value.push({
      id: pendingProduct.value.id,
      name: pendingProduct.value.name,
      sku: pendingProduct.value.displaySku || pendingProduct.value.sku,
      price: price,
      quantity: 1,
      maxStock: 1,
      isService: false,
      itemType: 'product'
    })
    
    // Update the product in allItems to reflect the new price
    pendingProduct.value.sellingPrice = price
    
    showPriceModal.value = false
    pendingProduct.value = null
    inputPrice.value = ''
  } catch (e: any) {
    showError(e.data?.message || 'Gagal menyimpan harga')
  } finally {
    savingPrice.value = false
  }
}

const removeFromCart = (index: number) => {
  cart.value.splice(index, 1)
}

const changeQuantity = (item: any, index: number, change: number) => {
  const nextQuantity = item.quantity + change

  if (nextQuantity < 1) {
    removeFromCart(index)
    return
  }

  if (item.maxStock !== null && nextQuantity > item.maxStock) {
    showWarning(`Stok maksimal ${item.maxStock}`)
    return
  }

  item.quantity = nextQuantity
}

const totalCartQuantity = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0)
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const parsedDiscountValue = computed(() => Number(discountValue.value) || 0)

const discountAmount = computed(() => {
  if (discountMode.value === 'PERCENTAGE') {
    return Math.round(subtotal.value * parsedDiscountValue.value / 100)
  }

  return Math.round(parsedDiscountValue.value)
})

const discountPercentage = computed(() => {
  if (subtotal.value <= 0) return 0
  return discountMode.value === 'PERCENTAGE'
    ? parsedDiscountValue.value
    : (discountAmount.value / subtotal.value) * 100
})

const discountError = computed(() => {
  if (parsedDiscountValue.value < 0) return 'Diskon tidak boleh kurang dari 0'
  if (discountMode.value === 'PERCENTAGE' && parsedDiscountValue.value > 100) {
    return 'Persentase diskon maksimal 100%'
  }
  if (discountMode.value === 'NOMINAL' && discountAmount.value > subtotal.value) {
    return 'Nominal diskon tidak boleh melebihi subtotal'
  }
  return ''
})

const total = computed(() => {
  return Math.max(0, subtotal.value - discountAmount.value)
})

const setDiscountMode = (mode: 'NOMINAL' | 'PERCENTAGE') => {
  discountMode.value = mode
  discountValue.value = ''
}

const openCheckout = () => {
  if (cart.value.length === 0) return showWarning('Keranjang kosong!')
  showCheckoutModal.value = true
}

const processSale = async () => {
  if (cart.value.length === 0) return
  if (!customerName.value) return showWarning('Nama pembeli wajib diisi')
  if (discountError.value) return showWarning(discountError.value)
  
  loading.value = true
  try {
    const res: any = await $fetch('/api/sparepart-sales', {
      method: 'POST',
      body: {
        items: cart.value.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          itemType: item.itemType || 'sparepart'
        })),
        customerName: customerName.value,
        customerPhone: customerPhone.value,
        paymentMethod: paymentMethod.value,
        discount: discountAmount.value
      }
    })
    
    lastInvoice.value = res.invoiceNumber
    lastSaleId.value = res.id
    showCheckoutModal.value = false
    showSuccessModal.value = true
    
    // Reset cart but keep page open for next sale
    cart.value = []
    customerName.value = ''
    customerPhone.value = ''
    discountMode.value = 'NOMINAL'
    discountValue.value = ''
    await Promise.allSettled([refreshSpareparts(), refreshProducts()])
  } catch (e: any) {
    showError(e.data?.message || 'Transaksi gagal')
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
  <div class="h-auto min-h-0 md:h-full flex flex-col md:flex-row gap-4">
    <!-- Left Panel: Search & Products -->
    <div class="flex-1 flex flex-col gap-4 h-full">
      
      <!-- Search Bar -->
      <div class="card bg-base-200 border border-base-300 flex-shrink-0 z-20">
        <div class="card-body py-2 px-4">
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
            <div v-if="filteredProducts.length && search" class="absolute top-14 left-0 w-full bg-base-100 border border-base-300 shadow-xl rounded-box overflow-hidden z-50">
              <ul class="menu p-2 w-full">
                <li v-for="p in filteredProducts" :key="`${p.itemType}-${p.id}`">
                  <a @click="addToCart(p)" class="flex justify-between items-center py-3">
                    <div>
                      <div class="font-bold flex items-center gap-2">
                        {{ p.name }}
                        <span v-if="p.itemType === 'product'" class="badge badge-warning badge-xs">Produk</span>
                      </div>
                      <div class="text-xs opacity-60">
                        {{ p.displaySku || p.sku }} • 
                        <span v-if="p.category === 'SERVICE'" class="text-info">
                          <IconInfinity class="w-3 h-3 inline" /> Unlimited
                        </span>
                        <span v-else-if="p.itemType === 'product'" class="text-warning">1 unit</span>
                        <span v-else>Stok: {{ p.stock }}</span>
                      </div>
                    </div>
                    <div v-if="p.itemType === 'product' && !p.hasPrice" class="font-bold text-warning flex items-center gap-1">
                      <IconCurrencyDollar class="w-4 h-4" /> Set Harga
                    </div>
                    <div v-else class="font-mono font-bold">{{ formatCurrency(p.sellingPrice || 0) }}</div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Product Grid -->
      <div class="card bg-base-200 border border-base-300 flex-1 overflow-hidden">
        <div class="card-body p-4 min-h-0 overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span class="font-bold text-sm flex items-center gap-2">
              <IconPackage class="w-4 h-4" /> Produk & Layanan
              <span class="badge badge-ghost badge-sm">{{ catalogItems.length }}</span>
            </span>
            <div class="flex items-center gap-3">
              <span class="hidden sm:inline text-xs opacity-60">Klik untuk tambah ke keranjang</span>
              <div class="join" role="group" aria-label="Pilih tampilan produk dan layanan">
                <button
                  type="button"
                  :class="['join-item btn btn-sm btn-square', viewMode === 'grid' ? 'btn-primary' : 'btn-ghost bg-base-300']"
                  :aria-pressed="viewMode === 'grid'"
                  title="Tampilan grid"
                  @click="viewMode = 'grid'"
                >
                  <IconLayoutGrid class="w-4 h-4" />
                </button>
                <button
                  type="button"
                  :class="['join-item btn btn-sm btn-square', viewMode === 'list' ? 'btn-primary' : 'btn-ghost bg-base-300']"
                  :aria-pressed="viewMode === 'list'"
                  title="Tampilan list"
                  @click="viewMode = 'list'"
                >
                  <IconList class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 mb-3" role="group" aria-label="Filter ketersediaan stok">
            <button
              type="button"
              :class="['btn btn-sm', stockFilter === 'all' ? 'btn-primary' : 'btn-ghost bg-base-300']"
              :aria-pressed="stockFilter === 'all'"
              @click="stockFilter = 'all'"
            >
              Semua
              <span class="badge badge-sm">{{ availableProducts.length }}</span>
            </button>
            <button
              type="button"
              :class="['btn btn-sm', stockFilter === 'available' ? 'btn-success' : 'btn-ghost bg-base-300']"
              :aria-pressed="stockFilter === 'available'"
              @click="stockFilter = 'available'"
            >
              Tersedia
              <span class="badge badge-sm">{{ availableItemCount }}</span>
            </button>
            <button
              type="button"
              :class="['btn btn-sm', stockFilter === 'out-of-stock' ? 'btn-error' : 'btn-ghost bg-base-300']"
              :aria-pressed="stockFilter === 'out-of-stock'"
              @click="stockFilter = 'out-of-stock'"
            >
              Stok Habis
              <span class="badge badge-sm">{{ outOfStockItemCount }}</span>
            </button>
          </div>
          <div :class="[
            'min-h-0 flex-1 content-start overflow-y-auto pr-1',
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3'
              : 'flex flex-col gap-2',
          ]">
            <button
              v-for="product in catalogItems"
              :key="`${product.itemType}-${product.id}`"
              @click="addToCart(product)"
              :disabled="isItemOutOfStock(product)"
              :class="[
                'card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition-all cursor-pointer',
                viewMode === 'grid' ? 'min-w-[100px]' : 'w-full',
                isItemOutOfStock(product) ? 'opacity-60 cursor-not-allowed hover:border-base-300 hover:shadow-none' : '',
              ]"
            >
              <div :class="['card-body p-3', viewMode === 'grid' ? 'items-center text-center' : 'flex-row items-center gap-3 text-left']">
                <div :class="['avatar placeholder shrink-0', viewMode === 'grid' ? 'mb-1' : '']">
                  <div :class="['rounded w-10 h-10', 
                    product.category === 'SERVICE' ? 'bg-info/10 text-info' : 
                    product.itemType === 'product' ? 'bg-warning/10 text-warning' : 
                    'bg-primary/10 text-primary'
                  ]">
                    <span class="text-xs font-bold">{{ (product.displaySku || product.sku || '').slice(-3) }}</span>
                  </div>
                </div>
                <div class="min-w-0 flex-1">
                  <p :class="['text-xs font-semibold', viewMode === 'grid' ? 'line-clamp-2 min-h-[2rem]' : 'truncate']">{{ product.name }}</p>
                  <p class="text-[11px] opacity-50 truncate">{{ product.displaySku || product.sku }}</p>
                </div>
                <div :class="['flex flex-col gap-1', viewMode === 'grid' ? 'items-center' : 'items-end shrink-0']">
                  <p v-if="product.itemType === 'product' && !product.hasPrice"
                    class="text-xs font-bold text-warning flex items-center gap-1">
                    <IconCurrencyDollar class="w-3 h-3" /> Set Harga
                  </p>
                  <p v-else class="text-xs font-mono font-bold text-primary">{{ formatCurrency(product.sellingPrice || 0) }}</p>
                  <p v-if="product.category === 'SERVICE'" class="text-xs text-info flex items-center gap-1">
                    <IconInfinity class="w-3 h-3" /> Jasa
                  </p>
                  <p v-else-if="product.itemType === 'product'" class="text-xs text-warning flex items-center gap-1">
                    <IconBox class="w-3 h-3" /> Produk
                  </p>
                  <p v-else :class="['text-xs', product.stock <= 0 ? 'text-error font-medium' : 'opacity-60']">
                    {{ product.stock <= 0 ? 'Stok habis' : `Stok: ${product.stock}` }}
                  </p>
                </div>
              </div>
            </button>
            <div v-if="catalogItems.length === 0" class="col-span-full flex flex-col items-center justify-center py-10 text-center text-base-content/50">
              <IconPackage class="w-10 h-10 mb-2 opacity-30" />
              <p class="text-sm font-medium">Tidak ada item pada filter ini</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Cart -->
    <div class="w-full md:w-80 lg:w-96 flex flex-col gap-4">
      <div class="card bg-base-200 border border-base-300 h-full flex flex-col">
        <div class="p-4 border-b border-base-300 font-bold flex items-center gap-2">
          <IconShoppingCart class="w-5 h-5" /> Keranjang Belanja
          <span v-if="totalCartQuantity" class="badge badge-primary badge-sm">{{ totalCartQuantity }}</span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <div v-if="cart.length === 0" class="text-center py-12 opacity-50">
            Keranjang kosong
          </div>
          
          <div v-for="(item, index) in cart" :key="`${item.itemType}-${item.id}`" class="flex items-center justify-between p-3 bg-base-100/50 rounded-lg border border-base-300/50">
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm truncate flex items-center gap-1">
                {{ item.name }}
                <span v-if="item.itemType === 'product'" class="badge badge-warning badge-xs">Produk</span>
              </div>
              <div class="text-xs opacity-60">{{ item.sku }}</div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex flex-col items-end gap-1.5">
                <div class="flex items-center gap-1">
                  <button @click="changeQuantity(item, index, -1)" class="btn btn-xs btn-square" :aria-label="`Kurangi jumlah ${item.name}`">-</button>
                  <span class="w-6 text-center font-bold text-sm">{{ item.quantity }}</span>
                  <button
                    @click="changeQuantity(item, index, 1)"
                    class="btn btn-xs btn-square"
                    :disabled="item.maxStock !== null && item.quantity >= item.maxStock"
                    :aria-label="`Tambah jumlah ${item.name}`"
                  >+</button>
                </div>
                <div class="text-right min-w-24 font-bold text-sm leading-tight">
                  {{ formatCurrency(item.price * item.quantity) }}
                </div>
              </div>
              <button @click="removeFromCart(index)" class="btn btn-ghost btn-xs text-error">
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Cart Footer -->
        <div class="p-4 border-t border-base-300 space-y-3">
          <div class="flex justify-between items-center text-sm">
            <span>Subtotal ({{ totalCartQuantity }} item)</span>
            <span class="font-mono font-bold">{{ formatCurrency(subtotal) }}</span>
          </div>
          <button 
            @click="openCheckout" 
            class="btn btn-primary w-full"
            :disabled="cart.length === 0"
          >
            Checkout
            <IconCheck class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <dialog :class="['modal', showCheckoutModal && 'modal-open']">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Checkout</h3>
        
        <div class="space-y-4">
          <div class="form-control">
            <label class="label"><span class="label-text">Nama Pembeli *</span></label>
            <input v-model="customerName" type="text" class="input input-bordered" placeholder="Nama Customer" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">No. Telepon</span></label>
            <input v-model="customerPhone" type="tel" class="input input-bordered" placeholder="08..." />
          </div>
          
          <div class="divider my-2"></div>
          
          <div class="flex justify-between items-center text-sm">
            <span>Subtotal</span>
            <span class="font-mono">{{ formatCurrency(subtotal) }}</span>
          </div>
          
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text">Diskon</span>
              <span v-if="discountAmount > 0" class="label-text-alt text-primary">
                {{ formatCurrency(discountAmount) }} ({{ discountPercentage.toFixed(2) }}%)
              </span>
            </label>

            <div class="join mb-2 w-full" role="group" aria-label="Pilih jenis diskon">
              <button
                type="button"
                :class="['join-item btn btn-sm flex-1', discountMode === 'NOMINAL' ? 'btn-primary' : 'btn-ghost bg-base-200']"
                :aria-pressed="discountMode === 'NOMINAL'"
                @click="setDiscountMode('NOMINAL')"
              >
                Nominal (Rp)
              </button>
              <button
                type="button"
                :class="['join-item btn btn-sm flex-1', discountMode === 'PERCENTAGE' ? 'btn-primary' : 'btn-ghost bg-base-200']"
                :aria-pressed="discountMode === 'PERCENTAGE'"
                @click="setDiscountMode('PERCENTAGE')"
              >
                Persentase (%)
              </button>
            </div>

            <ThousandsInput
              v-if="discountMode === 'NOMINAL'"
              v-model="discountValue"
              class="input input-bordered input-sm w-full font-mono"
              placeholder="0"
              aria-label="Nominal diskon"
            />
            <div v-else class="relative">
              <input
                v-model="discountValue"
                type="number"
                inputmode="decimal"
                min="0"
                max="100"
                step="0.01"
                class="input input-bordered input-sm w-full pr-9 font-mono"
                placeholder="0"
                aria-label="Persentase diskon"
              />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-base-content/60">%</span>
            </div>
            <label v-if="discountError" class="label py-1">
              <span class="label-text-alt text-error">{{ discountError }}</span>
            </label>
          </div>
          
          <div class="form-control">
            <label class="label py-1"><span class="label-text">Metode Bayar</span></label>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Metode pembayaran">
              <button
                v-for="method in paymentMethods"
                :key="method.value"
                type="button"
                role="radio"
                :aria-checked="paymentMethod === method.value"
                :class="[
                  'btn h-auto min-h-16 flex-col gap-1 px-2 py-2',
                  paymentMethod === method.value
                    ? 'btn-primary shadow-md'
                    : 'btn-ghost border border-base-300 bg-base-200',
                ]"
                @click="paymentMethod = method.value"
              >
                <component :is="method.icon" class="h-5 w-5" :stroke-width="1.8" />
                <span class="text-xs">{{ method.label }}</span>
              </button>
            </div>
          </div>
          
          <div class="divider my-2"></div>
          
          <div class="flex justify-between items-center text-xl font-bold">
            <span>Total</span>
            <span class="text-primary">{{ formatCurrency(total) }}</span>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-ghost" @click="showCheckoutModal = false">Batal</button>
          <button 
            @click="processSale" 
            class="btn btn-primary"
            :disabled="loading || !customerName || !!discountError"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            <template v-else>
              Bayar & Cetak Struk
              <IconCheck class="w-5 h-5" />
            </template>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showCheckoutModal = false"></form>
    </dialog>

    <!-- Success Modal -->
    <dialog :class="['modal', showSuccessModal && 'modal-open']">
      <div class="modal-box text-center">
        <IconCheck class="w-16 h-16 mx-auto text-success mb-4" />
        <h3 class="font-bold text-lg">Transaksi Berhasil!</h3>
        <p class="py-4">Invoice #{{ lastInvoice }} telah dibuat.</p>
        <div class="modal-action justify-center flex-wrap gap-2">
          <NuxtLink 
            :to="`/sales/sparepart-receipt/${lastSaleId}?from=pos`" 
            class="btn btn-secondary gap-2"
            target="_blank"
          >
            <IconDownload class="w-4 h-4" />
            E-Receipt
          </NuxtLink>
          <NuxtLink 
            :to="`/sales/sparepart-invoice/${lastSaleId}?from=pos`" 
            class="btn btn-accent gap-2"
            target="_blank"
          >
            <IconReceipt class="w-4 h-4" />
            Invoice
          </NuxtLink>
          <button class="btn btn-primary" @click="showSuccessModal = false">
            Transaksi Baru
          </button>
        </div>
      </div>
    </dialog>

    <!-- Price Input Modal for Products -->
    <dialog :class="['modal', showPriceModal && 'modal-open']">
      <div class="modal-box">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <IconCurrencyDollar class="w-5 h-5 text-primary" />
          Set Harga Jual
        </h3>
        <div class="py-4" v-if="pendingProduct">
          <div class="bg-base-200 rounded-lg p-3 mb-4">
            <p class="font-bold">{{ pendingProduct.name }}</p>
            <p class="text-sm opacity-60">{{ pendingProduct.displaySku || pendingProduct.sku }}</p>
            <p v-if="pendingProduct.totalCost" class="text-sm mt-1">
              HPP: <span class="font-mono">{{ formatCurrency(pendingProduct.totalCost) }}</span>
            </p>
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Harga Jual (IDR) *</span></label>
            <input 
              v-model="inputPrice" 
              type="number" 
              class="input input-bordered font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0"
              min="0"
              @keyup.enter="saveProductPrice"
              autofocus
            />
          </div>
          <p v-if="pendingProduct.totalCost && inputPrice" class="text-sm mt-2">
            Margin: 
            <span :class="parseFloat(inputPrice) > pendingProduct.totalCost ? 'text-success' : 'text-error'">
              {{ formatCurrency(parseFloat(inputPrice || '0') - pendingProduct.totalCost) }}
              ({{ ((parseFloat(inputPrice || '0') - pendingProduct.totalCost) / pendingProduct.totalCost * 100).toFixed(1) }}%)
            </span>
          </p>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" @click="showPriceModal = false; pendingProduct = null">Batal</button>
          <button 
            @click="saveProductPrice" 
            class="btn btn-primary"
            :disabled="savingPrice || !inputPrice"
          >
            <span v-if="savingPrice" class="loading loading-spinner loading-sm"></span>
            <template v-else>
              Simpan & Tambah
              <IconCheck class="w-5 h-5" />
            </template>
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop" @click="showPriceModal = false; pendingProduct = null"></form>
    </dialog>
  </div>
</template>
