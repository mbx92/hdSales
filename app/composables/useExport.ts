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

    return {
        exportToExcel,
        exportToPDF,
    }
}
