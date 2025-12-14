interface Transaction {
    id: string
    type: string
    amount: number
    currency: string
    amountIdr: number
    description: string
    category: string
    transactionDate: string
}

interface ExportSummary {
    totalIncome: number
    totalOutcome: number
    netBalance: number
    transactionCount: number
}

interface PnLSummary {
    totalRevenue: number
    totalHPP: number
    grossProfit: number
    profitMargin: number
    totalTransactions: number
}

interface PnLCategoryBreakdown {
    motorcycle: {
        count: number
        totalRevenue: number
        totalHPP: number
        totalProfit: number
    }
    product: {
        count: number
        totalRevenue: number
        totalHPP: number
        totalProfit: number
        categories?: Record<string, { count: number; revenue: number; hpp: number; profit: number }>
    }
}

interface PnLSaleDetail {
    id: string
    invoiceNumber: string
    type: string
    name: string
    buyerName: string
    saleDate: string
    sellingPrice: number
    hpp: number
    profit: number
    profitMargin: number
    paymentMethod: string
    costBreakdown?: Array<{
        component: string
        description: string
        amount: number
    }>
}

interface InventoryAsset {
    id: string
    type: string
    name: string
    vin?: string | null
    sku?: string | null
    category?: string | null
    status: string
    totalCost: number
    createdAt: string
}

interface InventorySummary {
    totalAssets: number
    totalValue: number
    motorcycle: { count: number; totalValue: number }
    product: { count: number; totalValue: number }
}

export function useExport() {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value)
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })
    }

    // Helper function to trigger file download
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

    const exportToExcel = async (transactions: Transaction[], summary: ExportSummary, filename: string = 'laporan-transaksi') => {
        // Dynamic import for client-side only
        const XLSX = await import('xlsx')

        // Prepare data for Excel
        const data = transactions.map((t, index) => ({
            'No': index + 1,
            'Tanggal': formatDate(t.transactionDate),
            'Deskripsi': t.description,
            'Kategori': t.category,
            'Tipe': t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
            'Jumlah': t.amountIdr,
            'Currency': t.currency,
        }))

        // Add summary rows
        data.push({} as any) // Empty row
        data.push({
            'No': '',
            'Tanggal': '',
            'Deskripsi': 'RINGKASAN',
            'Kategori': '',
            'Tipe': '',
            'Jumlah': '',
            'Currency': '',
        } as any)
        data.push({
            'No': '',
            'Tanggal': '',
            'Deskripsi': 'Total Pemasukan',
            'Kategori': '',
            'Tipe': '',
            'Jumlah': summary.totalIncome,
            'Currency': 'IDR',
        } as any)
        data.push({
            'No': '',
            'Tanggal': '',
            'Deskripsi': 'Total Pengeluaran',
            'Kategori': '',
            'Tipe': '',
            'Jumlah': summary.totalOutcome,
            'Currency': 'IDR',
        } as any)
        data.push({
            'No': '',
            'Tanggal': '',
            'Deskripsi': 'Saldo Bersih',
            'Kategori': '',
            'Tipe': '',
            'Jumlah': summary.netBalance,
            'Currency': 'IDR',
        } as any)

        // Create workbook
        const ws = XLSX.utils.json_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transaksi')

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // No
            { wch: 12 },  // Tanggal
            { wch: 40 },  // Deskripsi
            { wch: 20 },  // Kategori
            { wch: 15 },  // Tipe
            { wch: 18 },  // Jumlah
            { wch: 10 },  // Currency
        ]

        // Generate file as array buffer and create blob
        const dateStr = new Date().toISOString().split('T')[0]
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadFile(blob, `${filename}-${dateStr}.xlsx`)
    }

    const exportToPDF = async (transactions: Transaction[], summary: ExportSummary, filters: any, filename: string = 'laporan-transaksi') => {
        // Dynamic imports for client-side only
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF()

        // Header
        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('LAPORAN TRANSAKSI', 105, 20, { align: 'center' })

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('HD Sales - Harley Davidson', 105, 28, { align: 'center' })

        // Filter info
        doc.setFontSize(10)
        let filterText = 'Filter: '
        if (filters?.type && filters.type !== 'all') {
            filterText += `Tipe: ${filters.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} | `
        }
        if (filters?.category && filters.category !== 'all') {
            filterText += `Kategori: ${filters.category} | `
        }
        if (filters?.startDate) {
            filterText += `Periode: ${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`
        }
        doc.text(filterText, 14, 38)

        // Summary section
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text('RINGKASAN', 14, 48)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Total Pemasukan: ${formatCurrency(summary.totalIncome)}`, 14, 56)
        doc.text(`Total Pengeluaran: ${formatCurrency(summary.totalOutcome)}`, 14, 62)
        doc.text(`Saldo Bersih: ${formatCurrency(summary.netBalance)}`, 14, 68)
        doc.text(`Jumlah Transaksi: ${summary.transactionCount}`, 14, 74)

        // Transaction table
        const tableData = transactions.map((t, index) => [
            index + 1,
            formatDate(t.transactionDate),
            t.description.length > 30 ? t.description.substring(0, 30) + '...' : t.description,
            t.category,
            t.type === 'INCOME' ? 'Masuk' : 'Keluar',
            formatCurrency(t.amountIdr),
        ])

        autoTable(doc, {
            head: [['No', 'Tanggal', 'Deskripsi', 'Kategori', 'Tipe', 'Jumlah']],
            body: tableData,
            startY: 82,
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [59, 130, 246], // Blue
                textColor: 255,
                fontStyle: 'bold',
            },
            alternateRowStyles: {
                fillColor: [243, 244, 246],
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 22 },
                2: { cellWidth: 55 },
                3: { cellWidth: 30 },
                4: { cellWidth: 15 },
                5: { cellWidth: 35, halign: 'right' },
            },
        })

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(
                `Dicetak pada: ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`,
                105,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            )
        }

        // Generate PDF as blob and download
        const dateStr = new Date().toISOString().split('T')[0]
        const pdfBlob = doc.output('blob')
        downloadFile(pdfBlob, `${filename}-${dateStr}.pdf`)
    }

    // PnL Export Functions
    const exportPnLToExcel = async (
        salesDetails: PnLSaleDetail[],
        summary: PnLSummary,
        period: { startDate: string, endDate: string },
        categoryBreakdown?: PnLCategoryBreakdown
    ) => {
        const XLSX = await import('xlsx')
        const wb = XLSX.utils.book_new()

        // Sheet 1: Laporan Laba Rugi (P&L Statement)
        const pnlData: any[][] = [
            ['LAPORAN LABA RUGI (PROFIT & LOSS)'],
            [`Periode: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`],
            [''],
            ['AKUN', 'JUMLAH'],
            [''],
            ['PENDAPATAN OPERASIONAL', ''],
        ]

        // Revenue breakdown
        if (categoryBreakdown) {
            pnlData.push(['  Penjualan Motor', categoryBreakdown.motorcycle.totalRevenue])
            pnlData.push(['  Penjualan Produk', categoryBreakdown.product.totalRevenue])
        }
        pnlData.push(['Total Pendapatan Operasional', summary.totalRevenue])
        pnlData.push([''])

        // Cost of Goods Sold
        pnlData.push(['HARGA POKOK PENJUALAN (HPP)', ''])
        if (categoryBreakdown) {
            pnlData.push(['  HPP Motor', categoryBreakdown.motorcycle.totalHPP])
            pnlData.push(['  HPP Produk', categoryBreakdown.product.totalHPP])
        }
        pnlData.push(['Total HPP', summary.totalHPP])
        pnlData.push([''])

        // Gross Profit
        pnlData.push(['LABA KOTOR', summary.grossProfit])
        pnlData.push([''])

        // Profit margin
        pnlData.push(['Margin Laba (%)', `${summary.profitMargin?.toFixed(1)}%`])
        pnlData.push([''])

        // Summary by category
        pnlData.push([''])
        pnlData.push(['RINGKASAN PER KATEGORI', ''])
        if (categoryBreakdown) {
            pnlData.push(['Motor', ''])
            pnlData.push(['  Jumlah Transaksi', categoryBreakdown.motorcycle.count])
            pnlData.push(['  Total Profit', categoryBreakdown.motorcycle.totalProfit])
            pnlData.push(['Produk', ''])
            pnlData.push(['  Jumlah Transaksi', categoryBreakdown.product.count])
            pnlData.push(['  Total Profit', categoryBreakdown.product.totalProfit])
        }

        const pnlWs = XLSX.utils.aoa_to_sheet(pnlData)
        pnlWs['!cols'] = [{ wch: 40 }, { wch: 20 }]
        XLSX.utils.book_append_sheet(wb, pnlWs, 'Laba Rugi')

        // Sheet 2: Detail Transaksi
        const detailData = salesDetails.map((s, index) => ({
            'No': index + 1,
            'Invoice': s.invoiceNumber,
            'Tanggal': formatDate(s.saleDate),
            'Tipe': s.type,
            'Nama': s.name,
            'Pembeli': s.buyerName,
            'Harga Jual': s.sellingPrice,
            'HPP': s.hpp,
            'Profit': s.profit,
            'Margin (%)': s.profitMargin?.toFixed(1),
        }))

        const detailWs = XLSX.utils.json_to_sheet(detailData)
        detailWs['!cols'] = [
            { wch: 5 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 30 },
            { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }
        ]
        XLSX.utils.book_append_sheet(wb, detailWs, 'Detail Transaksi')

        // Sheet 3: Detail Biaya
        const costData: any[] = []
        salesDetails.forEach(s => {
            if (s.costBreakdown && s.costBreakdown.length > 0) {
                s.costBreakdown.forEach((c, i) => {
                    costData.push({
                        'Invoice': i === 0 ? s.invoiceNumber : '',
                        'Nama Item': i === 0 ? s.name : '',
                        'Komponen': c.component,
                        'Deskripsi': c.description,
                        'Jumlah': c.amount,
                    })
                })
                costData.push({} as any)
            }
        })

        if (costData.length > 0) {
            const costWs = XLSX.utils.json_to_sheet(costData)
            costWs['!cols'] = [{ wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 35 }, { wch: 15 }]
            XLSX.utils.book_append_sheet(wb, costWs, 'Detail Biaya')
        }

        const dateStr = new Date().toISOString().split('T')[0]
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadFile(blob, `laporan-pnl-${dateStr}.xlsx`)
    }

    const exportPnLToPDF = async (
        salesDetails: PnLSaleDetail[],
        summary: PnLSummary,
        period: { startDate: string, endDate: string },
        categoryBreakdown?: PnLCategoryBreakdown
    ) => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF('portrait')
        const pageWidth = doc.internal.pageSize.getWidth()

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('LAPORAN LABA RUGI', pageWidth / 2, 15, { align: 'center' })
        doc.text('(PROFIT & LOSS)', pageWidth / 2, 22, { align: 'center' })

        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text('HD Sales - Harley Davidson', pageWidth / 2, 30, { align: 'center' })
        doc.setFontSize(10)
        doc.text(`Periode: ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`, pageWidth / 2, 36, { align: 'center' })

        // P&L Table
        const pnlTableData: any[][] = []

        // Operating Revenue section
        pnlTableData.push([{ content: 'PENDAPATAN OPERASIONAL', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''])
        if (categoryBreakdown) {
            pnlTableData.push(['   Penjualan Motor', formatCurrency(categoryBreakdown.motorcycle.totalRevenue)])
            pnlTableData.push(['   Penjualan Produk', formatCurrency(categoryBreakdown.product.totalRevenue)])
        }
        pnlTableData.push([{ content: 'Total Pendapatan Operasional', styles: { fontStyle: 'bold' } }, { content: formatCurrency(summary.totalRevenue), styles: { fontStyle: 'bold' } }])

        pnlTableData.push(['', '']) // Separator

        // COGS section
        pnlTableData.push([{ content: 'HARGA POKOK PENJUALAN (HPP)', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, ''])
        if (categoryBreakdown) {
            pnlTableData.push(['   HPP Motor', formatCurrency(categoryBreakdown.motorcycle.totalHPP)])
            pnlTableData.push(['   HPP Produk', formatCurrency(categoryBreakdown.product.totalHPP)])
        }
        pnlTableData.push([{ content: 'Total HPP', styles: { fontStyle: 'bold' } }, { content: formatCurrency(summary.totalHPP), styles: { fontStyle: 'bold' } }])

        pnlTableData.push(['', '']) // Separator

        // Gross Profit
        pnlTableData.push([{ content: 'LABA KOTOR (GROSS PROFIT)', styles: { fontStyle: 'bold', fillColor: [200, 230, 200] } }, { content: formatCurrency(summary.grossProfit), styles: { fontStyle: 'bold', fillColor: [200, 230, 200] } }])

        pnlTableData.push(['', '']) // Separator

        // Net Profit (same as Gross since no operating expenses)
        pnlTableData.push([{ content: 'LABA BERSIH (NET PROFIT)', styles: { fontStyle: 'bold', fillColor: [180, 220, 255] } }, { content: formatCurrency(summary.grossProfit), styles: { fontStyle: 'bold', fillColor: [180, 220, 255] } }])
        pnlTableData.push([{ content: 'Margin Laba', styles: { fontStyle: 'bold' } }, { content: `${summary.profitMargin?.toFixed(1)}%`, styles: { fontStyle: 'bold' } }])

        autoTable(doc, {
            body: pnlTableData,
            startY: 44,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 120 },
                1: { cellWidth: 60, halign: 'right' },
            },
            didParseCell: (data) => {
                if (data.row.index === pnlTableData.length - 1 || data.row.index === pnlTableData.length - 2) {
                    data.cell.styles.lineWidth = 0.5
                }
            },
        })

        // Transaction Summary
        const finalY = (doc as any).lastAutoTable.finalY + 10
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Ringkasan Transaksi', 14, finalY)

        const summaryTableData: any[][] = []
        if (categoryBreakdown) {
            summaryTableData.push(['Motor', categoryBreakdown.motorcycle.count + ' transaksi', formatCurrency(categoryBreakdown.motorcycle.totalProfit)])
            summaryTableData.push(['Produk', categoryBreakdown.product.count + ' transaksi', formatCurrency(categoryBreakdown.product.totalProfit)])
        }
        summaryTableData.push([{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: summary.totalTransactions + ' transaksi', styles: { fontStyle: 'bold' } }, { content: formatCurrency(summary.grossProfit), styles: { fontStyle: 'bold' } }])

        autoTable(doc, {
            head: [['Kategori', 'Jumlah', 'Total Profit']],
            body: summaryTableData,
            startY: finalY + 4,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        })

        // Footer
        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} | Hal ${i}/${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 8, { align: 'center' })
        }

        const dateStr = new Date().toISOString().split('T')[0]
        downloadFile(doc.output('blob'), `laporan-pnl-${dateStr}.pdf`)
    }

    // Inventory Export Functions
    const exportInventoryToExcel = async (motorcycles: InventoryAsset[], products: InventoryAsset[], summary: InventorySummary) => {
        const XLSX = await import('xlsx')

        const motorData = motorcycles.map((m, i) => ({
            'No': i + 1,
            'Nama': m.name,
            'VIN': m.vin || '-',
            'Status': m.status,
            'HPP': m.totalCost,
            'Tanggal Masuk': formatDate(m.createdAt),
        }))

        const productData = products.map((p, i) => ({
            'No': i + 1,
            'Nama': p.name,
            'SKU': p.sku || '-',
            'Kategori': p.category || '-',
            'Status': p.status,
            'HPP': p.totalCost,
            'Tanggal Masuk': formatDate(p.createdAt),
        }))

        const wb = XLSX.utils.book_new()

        // Summary sheet
        const summaryData = [
            { 'Item': 'Total Aset', 'Nilai': summary.totalAssets },
            { 'Item': 'Total Nilai HPP', 'Nilai': summary.totalValue },
            { 'Item': 'Motor', 'Nilai': summary.motorcycle.count },
            { 'Item': 'Nilai Motor', 'Nilai': summary.motorcycle.totalValue },
            { 'Item': 'Product', 'Nilai': summary.product.count },
            { 'Item': 'Nilai Product', 'Nilai': summary.product.totalValue },
        ]
        const summaryWs = XLSX.utils.json_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, summaryWs, 'Ringkasan')

        if (motorData.length > 0) {
            const motorWs = XLSX.utils.json_to_sheet(motorData)
            motorWs['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
            XLSX.utils.book_append_sheet(wb, motorWs, 'Motor')
        }

        if (productData.length > 0) {
            const productWs = XLSX.utils.json_to_sheet(productData)
            productWs['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }]
            XLSX.utils.book_append_sheet(wb, productWs, 'Product')
        }

        const dateStr = new Date().toISOString().split('T')[0]
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        downloadFile(blob, `laporan-inventory-${dateStr}.xlsx`)
    }

    const exportInventoryToPDF = async (motorcycles: InventoryAsset[], products: InventoryAsset[], summary: InventorySummary) => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')

        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.setFont('helvetica', 'bold')
        doc.text('LAPORAN INVENTORY ASSET', 105, 15, { align: 'center' })

        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.text('HD Sales - Harley Davidson', 105, 22, { align: 'center' })

        // Summary
        doc.setFontSize(10)
        doc.text(`Total Aset: ${summary.totalAssets}`, 14, 35)
        doc.text(`Total Nilai: ${formatCurrency(summary.totalValue)}`, 80, 35)
        doc.text(`Motor: ${summary.motorcycle.count} (${formatCurrency(summary.motorcycle.totalValue)})`, 14, 42)
        doc.text(`Product: ${summary.product.count} (${formatCurrency(summary.product.totalValue)})`, 110, 42)

        let currentY = 50

        if (motorcycles.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Inventory Motor', 14, currentY)
            const motorData = motorcycles.map((m, i) => [i + 1, m.name, m.vin || '-', m.status, formatCurrency(m.totalCost)])
            autoTable(doc, {
                head: [['No', 'Nama', 'VIN', 'Status', 'HPP']],
                body: motorData,
                startY: currentY + 3,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
            })
            currentY = (doc as any).lastAutoTable.finalY + 10
        }

        if (products.length > 0) {
            doc.setFont('helvetica', 'bold')
            doc.text('Inventory Product', 14, currentY)
            const productData = products.map((p, i) => [i + 1, p.name, p.sku || '-', p.category || '-', p.status, formatCurrency(p.totalCost)])
            autoTable(doc, {
                head: [['No', 'Nama', 'SKU', 'Kategori', 'Status', 'HPP']],
                body: productData,
                startY: currentY + 3,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [34, 197, 94] },
            })
        }

        const pageCount = doc.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')} | Hal ${i}/${pageCount}`, 105, doc.internal.pageSize.height - 8, { align: 'center' })
        }

        const dateStr = new Date().toISOString().split('T')[0]
        downloadFile(doc.output('blob'), `laporan-inventory-${dateStr}.pdf`)
    }

    return {
        exportToExcel,
        exportToPDF,
        exportPnLToExcel,
        exportPnLToPDF,
        exportInventoryToExcel,
        exportInventoryToPDF,
    }
}

