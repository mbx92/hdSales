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
