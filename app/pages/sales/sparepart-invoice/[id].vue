<script setup lang="ts">
import { IconDownload, IconArrowLeft, IconFileInvoice } from '@tabler/icons-vue'

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

const saleData = computed(() => sale.value!)

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
    year: 'numeric'
  })
}

const handleExportPDF = async () => {
  exportingPDF.value = true
  try {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    
    const doc = new jsPDF()
    const s = sale.value as any
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Load logo
    try {
      const logoResponse = await fetch('/logo.png')
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob()
        const reader = new FileReader()
        const logoDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
        
        const img = new Image()
        img.src = logoDataUrl
        await new Promise((resolve) => { img.onload = resolve })
        
        const maxHeight = 18
        const ratio = maxHeight / img.height
        const logoW = img.width * ratio
        doc.addImage(logoDataUrl, 'PNG', 14, 10, logoW, maxHeight)
      }
    } catch (e) {
      console.log('Logo error:', e)
    }
    
    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', pageWidth / 2, 18, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('DIGARASI ID', pageWidth / 2, 26, { align: 'center' })
    
    // Invoice Info
    doc.setFontSize(10)
    doc.text(`No. Invoice: ${s.invoiceNumber}`, 14, 40)
    doc.text(`Tanggal: ${formatDate(s.saleDate)}`, 14, 46)
    doc.text(`Customer: ${s.customerName || '-'}`, 14, 52)
    if (s.customerPhone) {
      doc.text(`Telp: ${s.customerPhone}`, 14, 58)
    }
    
    // Items table
    const tableData = s.items.map((item: any, index: number) => [
      index + 1,
      item.sparepart?.name || '-',
      item.sparepart?.sku || '-',
      item.quantity,
      formatCurrency(item.unitPrice),
      formatCurrency(item.subtotal)
    ])
    
    // Add product items
    if (s.productItems && s.productItems.length > 0) {
      s.productItems.forEach((item: any) => {
        tableData.push([
          tableData.length + 1,
          `[Produk] ${item.name || '-'}`,
          item.sku || '-',
          item.quantity,
          formatCurrency(item.unitPrice),
          formatCurrency(item.subtotal)
        ])
      })
    }
    
    autoTable(doc, {
      head: [['No', 'Nama Produk', 'SKU', 'Qty', 'Harga', 'Subtotal']],
      body: tableData,
      startY: 65,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' }
      }
    })
    
    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    
    doc.text('Subtotal:', 130, finalY)
    doc.text(formatCurrency(s.subtotal), pageWidth - 14, finalY, { align: 'right' })
    
    let currentY = finalY
    if (s.discount > 0) {
      currentY += 6
      doc.text('Diskon:', 130, currentY)
      doc.setTextColor(220, 38, 38)
      doc.text(`-${formatCurrency(s.discount)}`, pageWidth - 14, currentY, { align: 'right' })
      doc.setTextColor(0, 0, 0)
    }
    
    currentY += 8
    doc.line(130, currentY - 2, pageWidth - 14, currentY - 2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', 130, currentY + 4)
    doc.text(formatCurrency(s.total), pageWidth - 14, currentY + 4, { align: 'right' })
    
    currentY += 12
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Metode Pembayaran: ${s.paymentMethod}`, 14, currentY)
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.text('Invoice ini dibuat secara digital dan sah tanpa tanda tangan.', pageWidth / 2, pageHeight - 15, { align: 'center' })
    doc.text('DIGARASI ID - Jl. Sunset Road no 39A, Seminyak, Badung, Bali', pageWidth / 2, pageHeight - 10, { align: 'center' })
    
    // Download
    doc.save(`invoice-${s.invoiceNumber}.pdf`)
    
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
    <div class="mb-6 flex gap-3 justify-between items-center max-w-3xl mx-auto">
      <NuxtLink to="/sales" class="btn btn-ghost btn-sm gap-2">
        <IconArrowLeft class="w-4 h-4" />
        Kembali
      </NuxtLink>
      <button @click="handleExportPDF" class="btn btn-primary btn-sm gap-2" :disabled="exportingPDF">
        <span v-if="exportingPDF" class="loading loading-spinner loading-sm"></span>
        <IconDownload v-else class="w-4 h-4" />
        Download Invoice PDF
      </button>
    </div>

    <!-- Invoice Card -->
    <div class="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
      <!-- Header -->
      <div class="p-6 border-b border-base-200">
        <div class="flex justify-between items-start">
          <div>
            <img src="/logo.png" alt="Logo" class="h-12 mb-2" onerror="this.style.display='none'" />
            <h1 class="text-2xl font-bold text-primary">INVOICE</h1>
            <p class="text-sm text-base-content/60">DIGARASI ID</p>
          </div>
          <div class="text-right">
            <p class="font-mono font-bold text-lg">{{ saleData.invoiceNumber }}</p>
            <p class="text-sm text-base-content/60">{{ formatDate(saleData.saleDate) }}</p>
          </div>
        </div>
      </div>

      <!-- Customer Info -->
      <div class="p-6 bg-base-100 border-b border-base-200">
        <h3 class="text-xs font-bold uppercase text-base-content/60 mb-2">Ditagihkan Kepada</h3>
        <p class="font-bold">{{ saleData.customerName || 'Walk-in Customer' }}</p>
        <p v-if="saleData.customerPhone" class="text-sm text-base-content/60">{{ saleData.customerPhone }}</p>
      </div>

      <!-- Items Table -->
      <div class="p-6">
        <table class="table table-sm w-full">
          <thead>
            <tr class="bg-base-200">
              <th class="w-12">No</th>
              <th>Nama Produk</th>
              <th>SKU</th>
              <th class="text-center">Qty</th>
              <th class="text-right">Harga</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in saleData.items" :key="item.id" class="hover">
              <td>{{ index + 1 }}</td>
              <td class="font-medium">{{ item.sparepart?.name }}</td>
              <td class="font-mono text-xs">{{ item.sparepart?.sku }}</td>
              <td class="text-center">{{ item.quantity }}</td>
              <td class="text-right font-mono">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="text-right font-mono font-bold">{{ formatCurrency(item.subtotal) }}</td>
            </tr>
            <!-- Product Items -->
            <tr v-for="(item, index) in (saleData as any).productItems" :key="`product-${item.id}`" class="hover bg-warning/5">
              <td>{{ saleData.items.length + index + 1 }}</td>
              <td class="font-medium">
                <span class="flex items-center gap-2">
                  {{ item.name }}
                  <span class="badge badge-warning badge-xs">Produk</span>
                </span>
              </td>
              <td class="font-mono text-xs">{{ item.sku }}</td>
              <td class="text-center">{{ item.quantity }}</td>
              <td class="text-right font-mono">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="text-right font-mono font-bold">{{ formatCurrency(item.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="p-6 bg-base-200">
        <div class="flex justify-end">
          <div class="w-64 space-y-2">
            <div class="flex justify-between text-sm">
              <span>Subtotal</span>
              <span class="font-mono">{{ formatCurrency(saleData.subtotal) }}</span>
            </div>
            <div v-if="saleData.discount > 0" class="flex justify-between text-sm text-error">
              <span>Diskon</span>
              <span class="font-mono">-{{ formatCurrency(saleData.discount) }}</span>
            </div>
            <div class="divider my-1"></div>
            <div class="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span class="text-primary font-mono">{{ formatCurrency(saleData.total) }}</span>
            </div>
            <div class="flex justify-between text-sm text-base-content/60 pt-2">
              <span>Metode Pembayaran</span>
              <span class="badge badge-outline">{{ saleData.paymentMethod }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 text-center text-xs text-base-content/60 bg-base-100 border-t border-base-200">
        <p class="mb-1">Invoice ini dibuat secara digital dan sah tanpa tanda tangan.</p>
        <p>DIGARASI ID - Jl. Sunset Road no 39A, Seminyak, Badung, Bali</p>
      </div>
    </div>
  </div>
</template>
