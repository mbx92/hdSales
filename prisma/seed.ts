import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create owner user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const owner = await prisma.user.upsert({
        where: { email: 'owner@hdsales.com' },
        update: {},
        create: {
            email: 'owner@hdsales.com',
            password: hashedPassword,
            name: 'HD Sales Owner',
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
                status: 'INSPECTION',
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
