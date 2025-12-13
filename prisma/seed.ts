import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create owner user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const owner = await prisma.user.upsert({
        where: { email: 'adimas@digarasi.id' },
        update: {},
        create: {
            email: 'adimas@digarasi.id',
            password: hashedPassword,
            name: 'Adi Mas Sudarma',
            role: 'OWNER',
        },
    })
    console.log('✅ Created owner:', owner.email)

    // Create initial exchange rate
    const rate = await prisma.exchangeRate.create({
        data: {
            fromCurrency: 'USD',
            toCurrency: 'IDR',
            rate: 15500,
            effectiveDate: new Date(),
        },
    })
    console.log('✅ Created exchange rate: 1 USD =', rate.rate, 'IDR')

    // Create sample motorcycles
    const motorcycles = await Promise.all([
        prisma.motorcycle.create({
            data: {
                vin: '1HD1KB4147Y123456',
                brand: 'Harley Davidson',
                model: 'Street 750',
                year: 2018,
                color: 'Vivid Black',
                mileage: 12500,
                condition: 'USED',
                currency: 'IDR',
                totalCost: 0,
                status: 'AVAILABLE',
                ownerName: 'John Doe',
                ownerPhone: '081234567890',
                ownerLocation: 'Denpasar, Bali',
                notes: 'Motor kondisi baik, ready untuk inspeksi',
            },
        }),
        prisma.motorcycle.create({
            data: {
                vin: '1HD1KRM17LB654321',
                brand: 'Harley Davidson',
                model: 'Iron 883',
                year: 2020,
                color: 'River Rock Gray',
                mileage: 5200,
                condition: 'USED',
                currency: 'IDR',
                totalCost: 185000000,
                status: 'AVAILABLE',
                ownerName: 'Jane Smith',
                ownerPhone: '087654321098',
                ownerLocation: 'Kuta, Bali',
                notes: 'Sudah service lengkap, siap jual',
            },
        }),
        prisma.motorcycle.create({
            data: {
                vin: '1HD1BX517KB987654',
                brand: 'Harley Davidson',
                model: 'Fat Bob 114',
                year: 2019,
                color: 'Industrial Gray',
                mileage: 8900,
                condition: 'USED',
                currency: 'USD',
                totalCost: 18500,
                sellingPrice: 22000,
                profit: 3500,
                status: 'SOLD',
                ownerName: 'Mike Wilson',
                ownerPhone: '089876543210',
                ownerLocation: 'Seminyak, Bali',
                notes: 'Sold to collector',
            },
        }),
    ])
    console.log('✅ Created', motorcycles.length, 'sample motorcycles')

    // Create sample cash flows and costs for the AVAILABLE motorcycle
    const motorcycle = motorcycles[1]

    // Create cash flow for purchase
    const purchaseCashFlow = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 175000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 175000000,
            description: 'Pembelian Harley Davidson Iron 883 2020',
            category: 'PURCHASE',
            transactionDate: new Date('2024-11-15'),
        },
    })

    await prisma.cost.create({
        data: {
            motorcycleId: motorcycle.id,
            component: 'PURCHASE',
            description: 'Harga beli motor dari owner',
            amount: 175000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 175000000,
            transactionDate: new Date('2024-11-15'),
            paymentMethod: 'TRANSFER',
            cashFlowId: purchaseCashFlow.id,
        },
    })

    // Create cash flow for service
    const serviceCashFlow = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 5000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 5000000,
            description: 'Service lengkap Iron 883',
            category: 'SERVICE',
            transactionDate: new Date('2024-11-20'),
        },
    })

    await prisma.cost.create({
        data: {
            motorcycleId: motorcycle.id,
            component: 'SERVICE',
            description: 'Ganti oli, filter, tune-up mesin',
            amount: 5000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 5000000,
            transactionDate: new Date('2024-11-20'),
            paymentMethod: 'CASH',
            cashFlowId: serviceCashFlow.id,
        },
    })

    // Create cash flow for detailing
    const detailingCashFlow = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 5000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 5000000,
            description: 'Detailing Iron 883',
            category: 'DETAILING',
            transactionDate: new Date('2024-11-22'),
        },
    })

    await prisma.cost.create({
        data: {
            motorcycleId: motorcycle.id,
            component: 'DETAILING',
            description: 'Poles body, coating, cuci detail',
            amount: 5000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 5000000,
            transactionDate: new Date('2024-11-22'),
            paymentMethod: 'CASH',
            cashFlowId: detailingCashFlow.id,
        },
    })

    console.log('✅ Created sample costs and cash flows')

    // Create sale transaction for SOLD motorcycle
    const soldMotorcycle = motorcycles[2]
    const saleCashFlow = await prisma.cashFlow.create({
        data: {
            type: 'INCOME',
            amount: 22000,
            currency: 'USD',
            exchangeRate: 15500,
            amountIdr: 341000000,
            description: 'Penjualan Harley Davidson Fat Bob 114',
            category: 'MOTORCYCLE_SALE',
            transactionDate: new Date('2024-12-01'),
        },
    })

    await prisma.saleTransaction.create({
        data: {
            motorcycleId: soldMotorcycle.id,
            sellingPrice: 22000,
            currency: 'USD',
            exchangeRate: 15500,
            sellingPriceIdr: 341000000,
            totalCost: 18500,
            profit: 3500,
            profitMargin: 18.92,
            buyerName: 'David Chen',
            buyerPhone: '082345678901',
            buyerAddress: 'Ubud, Bali',
            paymentMethod: 'TRANSFER',
            paidAmount: 22000,
            remainingAmount: 0,
            saleDate: new Date('2024-12-01'),
            cashFlowId: saleCashFlow.id,
        },
    })

    console.log('✅ Created sample sale transaction')

    // Create sample products
    const products = await Promise.all([
        // Sparepart - Available
        prisma.product.create({
            data: {
                category: 'SPAREPART',
                name: 'Oil Filter Harley Davidson',
                sku: 'HD-OIL-001',
                description: 'Original oil filter for Harley Davidson motorcycles',
                currency: 'IDR',
                totalCost: 0,
                status: 'AVAILABLE',
                supplier: 'HD Parts Indonesia',
                purchaseDate: new Date('2024-12-01'),
            },
        }),
        // Accessories - Available
        prisma.product.create({
            data: {
                category: 'ACCESSORIES',
                name: 'Leather Saddlebag',
                sku: 'HD-ACC-002',
                description: 'Premium leather saddlebag for touring bikes',
                currency: 'USD',
                totalCost: 0,
                sellingPrice: 450,
                status: 'AVAILABLE',
                supplier: 'Leather Works Bali',
                purchaseDate: new Date('2024-11-25'),
            },
        }),
        // Apparel - Sold
        prisma.product.create({
            data: {
                category: 'APPAREL',
                name: 'HD Riding Jacket',
                sku: 'HD-APP-003',
                description: 'Official Harley Davidson leather riding jacket - Size L',
                currency: 'IDR',
                totalCost: 3500000,
                sellingPrice: 5500000,
                profit: 2000000,
                status: 'SOLD',
                supplier: 'HD Official Store',
                purchaseDate: new Date('2024-11-20'),
            },
        }),
        // Custom category
        prisma.product.create({
            data: {
                category: 'CUSTOM',
                customCategory: 'Tools',
                name: 'Professional Bike Lift',
                sku: 'TOOL-001',
                description: 'Hydraulic motorcycle lift for workshop',
                currency: 'IDR',
                totalCost: 0,
                status: 'ON_PROGRESS',
                supplier: 'Workshop Equipment Co',
                purchaseDate: new Date('2024-12-05'),
            },
        }),
    ])
    console.log('✅ Created', products.length, 'sample products')

    // Add costs to first product (Oil Filter) - with shipping
    const oilFilter = products[0]
    const oilFilterPurchaseCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 250000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 250000,
            description: 'Pembelian Oil Filter HD',
            category: 'PRODUCT_PURCHASE',
            transactionDate: new Date('2024-12-01'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: oilFilter.id,
            component: 'PURCHASE',
            description: 'Harga beli dari supplier - 10 pcs',
            amount: 250000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 250000,
            transactionDate: new Date('2024-12-01'),
            paymentMethod: 'TRANSFER',
            cashFlowId: oilFilterPurchaseCF.id,
        },
    })

    // Add shipping cost
    const oilFilterShippingCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 50000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 50000,
            description: 'Ongkir Oil Filter',
            category: 'SHIPPING',
            transactionDate: new Date('2024-12-02'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: oilFilter.id,
            component: 'SHIPPING',
            description: 'Biaya pengiriman dari Jakarta',
            amount: 50000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 50000,
            transactionDate: new Date('2024-12-02'),
            paymentMethod: 'CASH',
            cashFlowId: oilFilterShippingCF.id,
        },
    })

    await prisma.product.update({
        where: { id: oilFilter.id },
        data: { totalCost: 300000, sellingPrice: 450000 },
    })

    // Add costs to leather saddlebag - with shipping and customs
    const saddlebag = products[1]
    const saddlebagPurchaseCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 300,
            currency: 'USD',
            exchangeRate: 15500,
            amountIdr: 4650000,
            description: 'Pembelian Leather Saddlebag',
            category: 'PRODUCT_PURCHASE',
            transactionDate: new Date('2024-11-25'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: saddlebag.id,
            component: 'PURCHASE',
            description: 'Harga beli dari supplier USA',
            amount: 300,
            currency: 'USD',
            exchangeRate: 15500,
            amountIdr: 4650000,
            transactionDate: new Date('2024-11-25'),
            paymentMethod: 'TRANSFER',
            cashFlowId: saddlebagPurchaseCF.id,
        },
    })

    // Add shipping cost (international)
    const saddlebagShippingCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 50,
            currency: 'USD',
            exchangeRate: 15500,
            amountIdr: 775000,
            description: 'Shipping Saddlebag dari USA',
            category: 'SHIPPING',
            transactionDate: new Date('2024-11-26'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: saddlebag.id,
            component: 'SHIPPING',
            description: 'International shipping via DHL',
            amount: 50,
            currency: 'USD',
            exchangeRate: 15500,
            amountIdr: 775000,
            transactionDate: new Date('2024-11-26'),
            paymentMethod: 'TRANSFER',
            cashFlowId: saddlebagShippingCF.id,
        },
    })

    // Add customs fee
    const saddlebagCustomsCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 1200000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 1200000,
            description: 'Bea cukai Saddlebag',
            category: 'CUSTOMS',
            transactionDate: new Date('2024-11-28'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: saddlebag.id,
            component: 'CUSTOMS',
            description: 'Biaya bea cukai dan pajak impor',
            amount: 1200000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 1200000,
            transactionDate: new Date('2024-11-28'),
            paymentMethod: 'CASH',
            cashFlowId: saddlebagCustomsCF.id,
        },
    })

    await prisma.product.update({
        where: { id: saddlebag.id },
        data: { totalCost: 6625000 }, // 4,650,000 + 775,000 + 1,200,000
    })

    // Add purchase cost to jacket (already sold)
    const jacket = products[2]
    const jacketPurchaseCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 3500000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 3500000,
            description: 'Pembelian HD Riding Jacket',
            category: 'PRODUCT_PURCHASE',
            transactionDate: new Date('2024-11-20'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: jacket.id,
            component: 'PURCHASE',
            description: 'Harga beli dari HD Official Store',
            amount: 3500000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 3500000,
            transactionDate: new Date('2024-11-20'),
            paymentMethod: 'TRANSFER',
            cashFlowId: jacketPurchaseCF.id,
        },
    })

    // Create sale for sold jacket with detailed buyer info
    const jacketSaleCF = await prisma.cashFlow.create({
        data: {
            type: 'INCOME',
            amount: 5500000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 5500000,
            description: 'Penjualan HD Riding Jacket Size L',
            category: 'PRODUCT_SALE',
            transactionDate: new Date('2024-12-10'),
        },
    })

    await prisma.productSale.create({
        data: {
            productId: jacket.id,
            sellingPrice: 5500000,
            currency: 'IDR',
            exchangeRate: 1,
            sellingPriceIdr: 5500000,
            totalCost: 3500000,
            profit: 2000000,
            profitMargin: 36.36,
            buyerName: 'Budi Santoso',
            buyerPhone: '081234567890',
            buyerAddress: 'Jl. Sunset Road No. 88, Denpasar, Bali',
            paymentMethod: 'CASH',
            paidAmount: 5500000,
            remainingAmount: 0,
            saleDate: new Date('2024-12-10'),
            notes: 'Pembeli langsung datang ke toko, cash payment',
            cashFlowId: jacketSaleCF.id,
        },
    })

    // Add purchase cost to bike lift (on progress)
    const bikeLift = products[3]
    const bikeLiftPurchaseCF = await prisma.cashFlow.create({
        data: {
            type: 'OUTCOME',
            amount: 15000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 15000000,
            description: 'Pembelian Professional Bike Lift',
            category: 'PRODUCT_PURCHASE',
            transactionDate: new Date('2024-12-05'),
        },
    })

    await prisma.productCost.create({
        data: {
            productId: bikeLift.id,
            component: 'PURCHASE',
            description: 'Harga beli hydraulic bike lift',
            amount: 15000000,
            currency: 'IDR',
            exchangeRate: 1,
            amountIdr: 15000000,
            transactionDate: new Date('2024-12-05'),
            paymentMethod: 'TRANSFER',
            cashFlowId: bikeLiftPurchaseCF.id,
        },
    })

    await prisma.product.update({
        where: { id: bikeLift.id },
        data: { totalCost: 15000000, sellingPrice: 22000000 },
    })

    console.log('✅ Created sample product costs and sales')
    console.log('   - Oil Filter: Purchase + Shipping (Total: Rp 300K)')
    console.log('   - Saddlebag: Purchase + Shipping + Customs (Total: Rp 6.6M)')
    console.log('   - Jacket: Purchased Rp 3.5M, Sold Rp 5.5M (Profit: Rp 2M)')
    console.log('   - Bike Lift: Purchase Rp 15M (On Progress)')
    console.log('🎉 Seeding completed!')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
