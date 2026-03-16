import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetPendingSquares() {
  try {
    console.log('Resetting pending squares...')

    const result = await prisma.gridSquare.updateMany({
      where: {
        status: 'pending',
      },
      data: {
        status: 'available',
        lockedUntil: null,
      },
    })

    console.log(`✅ Reset ${result.count} pending squares to available`)
  } catch (error) {
    console.error('Error resetting squares:', error)
  } finally {
    await prisma.$disconnect()
  }
}

resetPendingSquares()
