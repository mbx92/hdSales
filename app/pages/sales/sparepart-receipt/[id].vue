<script setup lang="ts">
import { IconDownload, IconArrowLeft, IconReceipt } from '@tabler/icons-vue'

const route = useRoute()
const id = route.params.id as string
const { showError } = useAlert()

const { data: sale, error } = await useFetch(`/api/sparepart-sales/${id}`)

if (error.value || !sale.value) {
  throw createError({
    statusCode: 404,
    message: 'Transaksi tidak ditemukan'
  })
}

const exportingPDF = ref(false)

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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleExportPDF = async () => {
  exportingPDF.value = true
  try {
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF({ unit: 'mm', format: [80, 200] }) // Thermal receipt size
    
    const s = sale.value as any
    const pageWidth = 80
    let y = 10
    
    // Store name
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('DIGARASI', pageWidth / 2, y, { align: 'center' })
    y += 5
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Harley Davidson Sales', pageWidth / 2, y, { align: 'center' })
    y += 8
    
    // Line separator
    doc.setLineWidth(0.3)
    doc.setDrawColor(200)
    doc.line(5, y, pageWidth - 5, y)
    y += 5
    
    // Invoice info
    doc.setFontSize(9)
    doc.text(`Invoice: ${s.invoiceNumber}`, 5, y)
    y += 4
    doc.text(`Tanggal: ${formatDate(s.saleDate)}`, 5, y)
    y += 4
    doc.text(`Customer: ${s.customerName || '-'}`, 5, y)
    y += 6
    
    // Line separator
    doc.line(5, y, pageWidth - 5, y)
    y += 5
    
    // Items
    doc.setFont('helvetica', 'bold')
    doc.text('ITEM', 5, y)
    doc.text('QTY', 45, y, { align: 'center' })
    doc.text('TOTAL', pageWidth - 5, y, { align: 'right' })
    y += 4
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    
    for (const item of s.items) {
      doc.text(item.sparepart?.name?.substring(0, 25) || '-', 5, y)
      doc.text(String(item.quantity), 45, y, { align: 'center' })
      doc.text(formatCurrency(item.subtotal), pageWidth - 5, y, { align: 'right' })
      y += 4
    }
    
    y += 2
    doc.line(5, y, pageWidth - 5, y)
    y += 5
    
    // Totals
    doc.setFontSize(9)
    doc.text('Subtotal:', 5, y)
    doc.text(formatCurrency(s.subtotal), pageWidth - 5, y, { align: 'right' })
    y += 4
    
    if (s.discount > 0) {
      doc.text('Diskon:', 5, y)
      doc.text(`-${formatCurrency(s.discount)}`, pageWidth - 5, y, { align: 'right' })
      y += 4
    }
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('TOTAL:', 5, y)
    doc.text(formatCurrency(s.total), pageWidth - 5, y, { align: 'right' })
    y += 6
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Pembayaran: ${s.paymentMethod}`, 5, y)
    y += 8
    
    // Footer
    doc.line(5, y, pageWidth - 5, y)
    y += 5
    doc.setFontSize(7)
    doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, y, { align: 'center' })
    y += 3
    doc.text('Barang yang sudah dibeli tidak dapat dikembalikan', pageWidth / 2, y, { align: 'center' })
    
    // Download
    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${s.invoiceNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    
  } catch (e) {
    console.error('Export error:', e)
    showError('Gagal export PDF')
  } finally {
    exportingPDF.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-100 p-4 md:p-8">
    <!-- Action Buttons -->
    <div class="mb-6 flex gap-3 justify-between items-center max-w-2xl mx-auto">
      <NuxtLink to="/sales" class="btn btn-ghost btn-sm gap-2">
        <IconArrowLeft class="w-4 h-4" />
        Kembali
      </NuxtLink>
      <button @click="handleExportPDF" class="btn btn-primary btn-sm gap-2" :disabled="exportingPDF">
        <span v-if="exportingPDF" class="loading loading-spinner loading-sm"></span>
        <IconDownload v-else class="w-4 h-4" />
        Download PDF
      </button>
    </div>

    <!-- Receipt Card -->
    <div class="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary to-secondary text-primary-content p-6 text-center">
        <div class="flex items-center justify-center gap-2 mb-2">
          <IconReceipt class="w-8 h-8" />
          <h1 class="text-2xl font-bold">DIGARASI</h1>
        </div>
        <p class="text-sm opacity-80">Harley Davidson Sales</p>
      </div>

      <!-- Invoice Info -->
      <div class="p-6 border-b border-base-200">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-base-content/60">Nomor Invoice</p>
            <p class="font-mono font-bold text-lg">{{ sale.invoiceNumber }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-base-content/60">Tanggal</p>
            <p class="font-medium">{{ formatDate(sale.saleDate) }}</p>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="p-6 bg-base-100 border-b border-base-200">
        <p class="text-xs text-base-content/60 mb-1">Customer</p>
        <p class="font-bold">{{ sale.customerName || 'Walk-in Customer' }}</p>
        <p v-if="sale.customerPhone" class="text-sm text-base-content/60">{{ sale.customerPhone }}</p>
      </div>

      <!-- Items -->
      <div class="p-6">
        <h3 class="font-bold mb-4 text-sm text-base-content/60 uppercase tracking-wide">Detail Pembelian</h3>
        <div class="space-y-3">
          <div 
            v-for="item in sale.items" 
            :key="item.id" 
            class="flex justify-between items-start p-3 bg-base-100 rounded-lg border border-base-200"
          >
            <div class="flex-1">
              <p class="font-medium">{{ item.sparepart?.name }}</p>
              <p class="text-xs text-base-content/60">
                {{ item.sparepart?.sku }} • {{ item.quantity }} × {{ formatCurrency(item.unitPrice) }}
              </p>
            </div>
            <p class="font-mono font-bold">{{ formatCurrency(item.subtotal) }}</p>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="p-6 bg-base-200">
        <div class="space-y-2">
          <div class="flex justify-between text-sm">
            <span>Subtotal</span>
            <span class="font-mono">{{ formatCurrency(sale.subtotal) }}</span>
          </div>
          <div v-if="sale.discount > 0" class="flex justify-between text-sm text-error">
            <span>Diskon</span>
            <span class="font-mono">-{{ formatCurrency(sale.discount) }}</span>
          </div>
          <div class="divider my-2"></div>
          <div class="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span class="text-primary font-mono">{{ formatCurrency(sale.total) }}</span>
          </div>
          <div class="flex justify-between text-sm text-base-content/60 mt-2">
            <span>Metode Pembayaran</span>
            <span class="badge badge-outline">{{ sale.paymentMethod }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 text-center text-xs text-base-content/60 bg-base-100">
        <p class="mb-1">Terima kasih atas kunjungan Anda!</p>
        <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
      </div>
    </div>
  </div>
</template>
