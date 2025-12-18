<script setup lang="ts">
import { IconPrinter, IconDownload } from '@tabler/icons-vue'

const route = useRoute()
const id = route.params.id as string
const { showError } = useAlert()
const authStore = useAuthStore()

// Get logged-in user name for signature
const sellerName = computed(() => authStore.user?.name || 'DIGARASI')

const { data: sale, error } = await useFetch(`/api/sales/${id}`)

if (error.value || !sale.value) {
  throw createError({
    statusCode: 404,
    message: 'Transaksi penjualan tidak ditemukan'
  })
}

// Non-null sale data (after error check above)
const saleData = computed(() => sale.value!)

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

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const handlePrint = () => {
  window.print()
}

const exportingPDF = ref(false)

const handleExportPDF = async () => {
  if (!sale.value) return
  
  exportingPDF.value = true
  
  try {
    const { default: jsPDF } = await import('jspdf')
    
    const doc = new jsPDF()
    const s = sale.value
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Helper for download
    const downloadFile = (blob: Blob, filename: string) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
    
    const pageHeight = doc.internal.pageSize.getHeight()
    let currentY = 12 // Smaller top margin
    
    // Helper to draw section box
    const drawSectionBox = (height: number, color: [number, number, number]) => {
      doc.setFillColor(...color)
      doc.roundedRect(20, currentY, pageWidth - 40, height, 2, 2, 'F')
    }

    // Load logo and create watermark/blue versions using canvas
    let logoDataUrl: string | null = null
    let watermarkDataUrl: string | null = null
    let blueLogoDataUrl: string | null = null
    
    try {
      const logoResponse = await fetch('/logo.png')
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob()
        const reader = new FileReader()
        logoDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
        
        const img = new Image()
        img.src = logoDataUrl
        await new Promise((resolve) => { img.onload = resolve })
        
        // Create watermark with 50% opacity using canvas
        const wmCanvas = document.createElement('canvas')
        wmCanvas.width = img.width
        wmCanvas.height = img.height
        const wmCtx = wmCanvas.getContext('2d')!
        wmCtx.globalAlpha = 0.3
        wmCtx.drawImage(img, 0, 0)
        watermarkDataUrl = wmCanvas.toDataURL('image/png')
        
        // Create blue-tinted logo with low opacity for stamp
        const blueCanvas = document.createElement('canvas')
        blueCanvas.width = img.width
        blueCanvas.height = img.height
        const blueCtx = blueCanvas.getContext('2d')!
        // Draw original image
        blueCtx.drawImage(img, 0, 0)
        // Apply blue overlay with multiply blend
        blueCtx.globalCompositeOperation = 'source-atop'
        blueCtx.globalAlpha = 0.7
        blueCtx.fillStyle = '#2563eb' // Blue color
        blueCtx.fillRect(0, 0, img.width, img.height)
        // Make it semi-transparent
        const finalBlueCanvas = document.createElement('canvas')
        finalBlueCanvas.width = img.width
        finalBlueCanvas.height = img.height
        const finalBlueCtx = finalBlueCanvas.getContext('2d')!
        finalBlueCtx.globalAlpha = 0.25 // Low opacity
        finalBlueCtx.drawImage(blueCanvas, 0, 0)
        blueLogoDataUrl = finalBlueCanvas.toDataURL('image/png')
        
        // Draw watermark FIRST - full page size with 50% opacity
        const pageMargin = 20
        const availableWidth = pageWidth - (pageMargin * 2)
        const availableHeight = pageHeight - (pageMargin * 2)
        const wmRatio = Math.min(availableWidth / img.width, availableHeight / img.height)
        const wmW = img.width * wmRatio
        const wmH = img.height * wmRatio
        doc.addImage(watermarkDataUrl, 'PNG', (pageWidth - wmW) / 2, (pageHeight - wmH) / 2, wmW, wmH)
        
        // Then draw header logo
        const maxWidth = 40
        const maxHeight = 20
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height)
        const width = img.width * ratio
        const height = img.height * ratio
        doc.addImage(logoDataUrl, 'PNG', (pageWidth - width) / 2, currentY, width, height)
        currentY += height + 3
      } else {
        currentY += 10
      }
    } catch (e) {
      console.log('Logo error:', e)
      currentY += 10
    }
    
    // Header - compressed
    currentY += 3
    doc.setTextColor(30, 58, 95)
    doc.setFontSize(18) // Smaller
    doc.setFont('helvetica', 'bold')
    doc.text('KWITANSI PEMBAYARAN', pageWidth / 2, currentY, { align: 'center' })
    
    currentY += 6
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Jl. Sunset Road no 39A, seminyak, Badung. Bali', pageWidth / 2, currentY, { align: 'center' })
    
    currentY += 5
    doc.setFontSize(9)
    doc.text('08113859009', pageWidth / 2, currentY, { align: 'center' })
    
    // Line separator
    currentY += 5
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.line(20, currentY, pageWidth - 20, currentY)
    
    // Transaction info
    currentY += 8
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('No. Transaksi', 25, currentY)
    doc.text('Tanggal Penjualan', pageWidth - 25, currentY, { align: 'right' })
    currentY += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.invoiceNumber || s.id, 25, currentY)
    doc.text(formatDate(s.saleDate), pageWidth - 25, currentY, { align: 'right' })
    
    // Buyer Info Section - compact
    currentY += 8
    const cardPadding = 5
    const contentLeft = 25
    
    // No background card - just content
    currentY += cardPadding
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Informasi Pembeli', contentLeft, currentY)
    
    currentY += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Nama Pembeli', contentLeft, currentY)
    doc.text('No. Telepon', pageWidth / 2, currentY)
    currentY += 4
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.buyerName, contentLeft, currentY)
    doc.text(s.buyerPhone || '-', pageWidth / 2, currentY)
    currentY += 6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Alamat', contentLeft, currentY)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.buyerAddress || '-', 50, currentY)
    
    currentY += cardPadding + 5
    
    // Motorcycle Info Section
    currentY += 5
    const col2 = pageWidth / 2 + 5 // Column 2 starts at center + offset
    
    // No background card - just content
    currentY += cardPadding + 2
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Detail Motor', contentLeft, currentY)
    
    currentY += 8
    doc.setFontSize(9)
    
    // Row 1: Merek & Model (side by side)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Merek', contentLeft, currentY)
    doc.text('Model', col2, currentY)
    currentY += 5
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.motorcycle?.brand || '', contentLeft, currentY)
    doc.text(s.motorcycle?.model || '', col2, currentY)
    
    // Row 2: Tahun & Warna
    currentY += 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Tahun', contentLeft, currentY)
    doc.text('Warna', col2, currentY)
    currentY += 5
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(String(s.motorcycle?.year || ''), contentLeft, currentY)
    doc.text(s.motorcycle?.color || '-', col2, currentY)
    
    // Row 3: VIN (full width) & Kilometer
    currentY += 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('VIN', contentLeft, currentY)
    doc.text('Kilometer', col2, currentY)
    currentY += 5
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.motorcycle?.vin || '', contentLeft, currentY)
    doc.text(s.motorcycle?.mileage ? `${s.motorcycle.mileage.toLocaleString('id-ID')} km` : '-', col2, currentY)

    // Row 4: Kondisi
    currentY += 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Kondisi', contentLeft, currentY)
    currentY += 5
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text(s.motorcycle?.condition || '-', contentLeft, currentY)
    
    currentY += cardPadding + 3
    
    // Payment Section - compact
    currentY += 5
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Rincian Pembayaran', 25, currentY)
    
    currentY += 6
    doc.setFontSize(9)
    doc.setDrawColor(230, 230, 230)
    doc.setLineWidth(0.2)
    
    // Payment rows - compact
    const drawPaymentRow = (label: string, value: string, bold = false) => {
      doc.line(25, currentY + 2, pageWidth - 25, currentY + 2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(label, 25, currentY)
      doc.setTextColor(30, 30, 30)
      if (bold) doc.setFont('helvetica', 'bold')
      doc.text(value, pageWidth - 25, currentY, { align: 'right' })
      currentY += 7 // Reduced from 10
    }
    
    drawPaymentRow('Harga Jual', formatCurrency(s.sellingPrice, s.currency), true)
    drawPaymentRow('Metode Pembayaran', s.paymentMethod)
    drawPaymentRow('Jumlah Dibayar', formatCurrency(s.paidAmount, s.currency))
    if (s.remainingAmount > 0) {
      drawPaymentRow('Sisa Pembayaran', formatCurrency(s.remainingAmount, s.currency))
    }
    
    // Total Box - compact
    currentY += 4
    
    doc.setFillColor(37, 99, 235)
    doc.roundedRect(20, currentY - 3, pageWidth - 40, 14, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL PEMBAYARAN', 25, currentY + 5)
    doc.setFontSize(11)
    doc.text(formatCurrency(s.sellingPrice, s.currency), pageWidth - 25, currentY + 5, { align: 'right' })
    
    currentY += 16
    doc.setTextColor(0, 0, 0)
    
    // Notes - compact
    if (s.notes) {
      doc.setFillColor(254, 252, 232)
      doc.roundedRect(20, currentY - 3, pageWidth - 40, 10, 2, 2, 'F')
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text('Catatan:', 25, currentY + 2)
      doc.setTextColor(30, 30, 30)
      doc.text(s.notes, 48, currentY + 2)
      currentY += 12
    }
    
    // Signature Section - right aligned to match preview
    currentY += 5
    
    // Draw separator line for signature section
    doc.setDrawColor(150, 150, 150)
    doc.setLineWidth(0.5)
    doc.line(20, currentY, pageWidth - 20, currentY)
    
    currentY += 10
    
    // Signature box positioned at right side
    const signatureX = pageWidth - 80 // Right side position
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('Penjual', signatureX + 20, currentY, { align: 'center' })
    
    // Draw blue company stamp using logo
    if (blueLogoDataUrl) {
      const stampMaxWidth = 35
      const stampMaxHeight = 35
      const logoImg = new Image()
      logoImg.src = logoDataUrl!
      await new Promise((resolve) => { logoImg.onload = resolve })
      const stampRatio = Math.min(stampMaxWidth / logoImg.width, stampMaxHeight / logoImg.height)
      const stampWidth = logoImg.width * stampRatio
      const stampHeight = logoImg.height * stampRatio
      // Position stamp in center of signature area
      doc.addImage(blueLogoDataUrl, 'PNG', signatureX + 20 - (stampWidth / 2), currentY + 5, stampWidth, stampHeight)
    }
    
    currentY += 30
    
    // Name from logged-in user
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(10)
    doc.text(sellerName.value.toUpperCase(), signatureX + 20, currentY, { align: 'center' })
    
    // Line separator
    currentY += 2
    doc.setDrawColor(100, 100, 100)
    doc.line(signatureX, currentY, signatureX + 40, currentY)
    
    // Company: DIGARASI
    currentY += 5
    doc.setFont('helvetica', 'bold')
    doc.text('DIGARASI', signatureX + 20, currentY, { align: 'center' })
    
    // Footer - fixed at bottom
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text('Terima kasih atas kepercayaan Anda', pageWidth / 2, pageHeight - 12, { align: 'center' })
    doc.text('Kwitansi ini merupakan bukti pembayaran yang sah', pageWidth / 2, pageHeight - 8, { align: 'center' })
    
    // Download
    const dateStr = new Date().toISOString().split('T')[0]
    const pdfBlob = doc.output('blob')
    downloadFile(pdfBlob, `kwitansi-${s.motorcycle?.model}-${dateStr}.pdf`)
    
  } catch (error) {
    console.error('Export PDF error:', error)
    showError('Gagal export PDF')
  } finally {
    exportingPDF.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-base-100 p-8">
    <!-- Action Buttons (hidden on print) -->
    <div class="print:hidden mb-6 flex gap-3 justify-end">
      <NuxtLink to="/sales" class="btn btn-ghost">
        Kembali
      </NuxtLink>
      <button @click="handleExportPDF" class="btn btn-primary gap-2" :disabled="exportingPDF">
        <span v-if="exportingPDF" class="loading loading-spinner loading-sm"></span>
        <IconDownload v-else class="w-5 h-5" />
        Download PDF
      </button>
    </div>

    <!-- Receipt Container -->
    <div class="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none relative">
      <!-- Watermark -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none p-5">
        <img 
          src="/logo.png" 
          alt="" 
          class="w-full h-full object-contain" 
          style="opacity: 0.3;" 
          onerror="this.style.display='none'" 
        />
      </div>
      <div class="p-12 print:p-8 relative z-10">
        <!-- Header -->
        <div class="text-center mb-8 pb-6 border-b-2 border-gray-300">
          <img src="/logo.png" alt="Logo" class="mx-auto mb-4 h-20 w-auto" onerror="this.style.display='none'" />
          <h1 class="text-3xl font-bold text-gray-800 mb-2">KWITANSI PEMBAYARAN</h1>
          <p class="text-lg text-gray-600">Jl. Sunset Road no 39A, seminyak, Badung. Bali</p>
          <p class="text-sm text-gray-500 mt-1">08113859009</p>
        </div>

        <!-- Receipt Number & Date -->
        <div class="grid grid-cols-2 gap-6 mb-8">
          <div>
            <p class="text-sm text-gray-600">No. Transaksi</p>
            <p class="text-lg font-mono font-bold text-gray-800">{{ saleData.invoiceNumber || saleData.id }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-600">Tanggal Penjualan</p>
            <p class="text-lg font-semibold text-gray-800">{{ formatDate(saleData.saleDate) }}</p>
          </div>
        </div>

        <!-- Buyer Information -->
        <div class="mb-8 p-6 rounded-lg">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Informasi Pembeli</h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Nama Pembeli</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.buyerName }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">No. Telepon</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.buyerPhone || '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-sm text-gray-600">Alamat</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.buyerAddress || '-' }}</p>
            </div>
          </div>
        </div>

        <!-- Motorcycle Information -->
        <div class="mb-8 p-6 rounded-lg">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Detail Motor</h2>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Merek</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.brand }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Model</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.model }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Tahun</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.year }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Warna</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.color || '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-sm text-gray-600">VIN</p>
              <p class="text-base font-mono font-semibold text-gray-800">{{ saleData.motorcycle?.vin }}</p>
            </div>
            <div v-if="saleData.motorcycle?.mileage">
              <p class="text-sm text-gray-600">Kilometer</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.mileage?.toLocaleString?.('id-ID') || saleData.motorcycle?.mileage }} km</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Kondisi</p>
              <p class="text-base font-semibold text-gray-800">{{ saleData.motorcycle?.condition }}</p>
            </div>
          </div>
        </div>

        <!-- Payment Details -->
        <div class="mb-8">
          <h2 class="text-lg font-bold text-gray-800 mb-4">Rincian Pembayaran</h2>
          <div class="space-y-3">
            <div class="flex justify-between items-center py-2 border-b border-gray-200">
              <span class="text-gray-600">Harga Jual</span>
              <span class="text-xl font-bold text-gray-800">{{ formatCurrency(saleData.sellingPrice, saleData.currency) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-200">
              <span class="text-gray-600">Metode Pembayaran</span>
              <span class="font-semibold text-gray-800">{{ saleData.paymentMethod }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-200">
              <span class="text-gray-600">Jumlah Dibayar</span>
              <span class="text-lg font-semibold text-green-600">{{ formatCurrency(saleData.paidAmount, saleData.currency) }}</span>
            </div>
            <div v-if="saleData.remainingAmount > 0" class="flex justify-between items-center py-2 border-b border-gray-200">
              <span class="text-gray-600">Sisa Pembayaran</span>
              <span class="text-lg font-semibold text-orange-600">{{ formatCurrency(saleData.remainingAmount, saleData.currency) }}</span>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div class="mb-8 p-6 bg-blue-600 text-white rounded-lg">
          <div class="flex justify-between items-center">
            <span class="text-xl font-bold">TOTAL PEMBAYARAN</span>
            <span class="text-3xl font-bold">{{ formatCurrency(saleData.sellingPrice, saleData.currency) }}</span>
          </div>
          <div v-if="saleData.currency === 'USD'" class="text-right mt-2 text-blue-100">
            <span class="text-sm">≈ {{ formatCurrency(saleData.sellingPriceIdr, 'IDR') }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="saleData.notes" class="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <p class="text-sm text-gray-600 mb-1">Catatan:</p>
          <p class="text-base text-gray-800">{{ saleData.notes }}</p>
        </div>

        <!-- Signature Section -->
        <div class="flex justify-end mt-12 pt-8 border-t-2 border-gray-300">
          <div class="text-center relative w-60">
            <p class="text-gray-600 mb-4">Penjual</p>
            <!-- Blue logo stamp - positioned on the right -->
            <div class="top-8 h-20 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Stamp" 
                class="h-24 w-auto" 
                style="opacity: 0.25; filter: sepia(100%) saturate(300%) brightness(70%) hue-rotate(180deg);" 
                onerror="this.style.display='none'" 
              />
            </div>
            <div class="h-2"></div>
            <p class="font-semibold text-gray-800">{{ sellerName.toUpperCase() }}</p>
            <div class="border-t-2 border-gray-400 w-40 mx-auto">
              <p class="font-semibold text-gray-800">DIGARASI</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-500">
          <p>Terima kasih atas kepercayaan Anda</p>
          <p class="mt-1">Kwitansi ini merupakan bukti pembayaran yang sah</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body {
    background: white;
  }
  
  .print\:hidden {
    display: none !important;
  }
  
  .print\:shadow-none {
    box-shadow: none !important;
  }
  
  .print\:p-8 {
    padding: 2rem !important;
  }
  
  @page {
    margin: 1cm;
    size: A4;
  }
}
</style>
