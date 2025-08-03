"use server"

import { connectToDatabase } from "@/lib/mongodb"
import type { ObjectId } from "mongodb"
import { format } from "date-fns"

// Interfaces (replicadas aquí para el contexto del servidor)
interface Transaction {
  _id?: ObjectId // MongoDB uses _id
  id: string // Keep original string ID for compatibility with existing logic
  cliente: string
  metodoPago: "efectivo" | "tarjeta" | "transferencia"
  montoRecibido: number
  montoServicio: number
  cambioEntregado: number
  quienAtendio: string
  observaciones: string
  fecha: string
}

interface DailySummary {
  _id?: ObjectId // MongoDB uses _id
  fecha: string
  montoInicial: number
  totalEfectivo: number
  totalTransferencias: number
  totalDevuelto: number
  saldoFinal: number
  totalGeneral: number
}

interface Empleada {
  _id?: ObjectId // MongoDB uses _id
  id: string // Keep original string ID
  nombre: string
  fechaRegistro: string
}

// Helper function to calculate summary values (duplicated for server-side consistency)
const calculateSummaryValues = (currentMontoInicial: number, currentTransactions: Transaction[]) => {
  const totalEfectivo = currentTransactions
    .filter((t) => t.metodoPago === "efectivo")
    .reduce((sum, t) => sum + t.montoRecibido, 0)

  const totalTransferencias = currentTransactions
    .filter((t) => t.metodoPago === "tarjeta" || t.metodoPago === "transferencia")
    .reduce((sum, t) => sum + t.montoRecibido, 0)

  const totalDevuelto = currentTransactions.reduce((sum, t) => sum + t.cambioEntregado, 0)

  const saldoFinal = currentMontoInicial + totalEfectivo - totalDevuelto
  const totalGeneral = saldoFinal + totalTransferencias

  return {
    totalEfectivo,
    totalTransferencias,
    totalDevuelto,
    saldoFinal,
    totalGeneral,
  }
}

// --- GET INITIAL DATA ---
export async function getInitialData() {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")
    const empleadasCollection = db.collection<Empleada>("empleadas")

    const transactions = await transactionsCollection.find({}).toArray()
    const empleadas = await empleadasCollection.find({}).toArray()

    // Find or create daily summary for today
    const today = format(new Date(), "dd/MM/yyyy")
    let dailySummary = await dailySummaryCollection.findOne({ fecha: today })

    if (!dailySummary) {
      // If no summary for today, create a default one
      const defaultSummary: DailySummary = {
        fecha: today,
        montoInicial: 4090, // Default initial amount
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      }
      await dailySummaryCollection.insertOne(defaultSummary)
      dailySummary = defaultSummary
    }

    // Recalculate summary based on fetched data to ensure consistency
    const { totalEfectivo, totalTransferencias, totalDevuelto, saldoFinal, totalGeneral } = calculateSummaryValues(
      dailySummary.montoInicial,
      transactions,
    )

    dailySummary = {
      ...dailySummary,
      totalEfectivo,
      totalTransferencias,
      totalDevuelto,
      saldoFinal,
      totalGeneral,
    }

    // Update the summary in DB with recalculated values
    await dailySummaryCollection.updateOne({ fecha: today }, { $set: dailySummary }, { upsert: true })

    return {
      transactions: JSON.parse(JSON.stringify(transactions)), // Serialize ObjectId
      dailySummary: JSON.parse(JSON.stringify(dailySummary)), // Serialize ObjectId
      empleadas: JSON.parse(JSON.stringify(empleadas)), // Serialize ObjectId
    }
  } catch (error) {
    console.error("Error fetching initial data:", error)
    return {
      transactions: [],
      dailySummary: {
        fecha: format(new Date(), "dd/MM/yyyy"),
        montoInicial: 4090,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      },
      empleadas: [],
      error: "Failed to fetch initial data",
    }
  }
}

// --- TRANSACTIONS ---
export async function addTransactionAction(newTransactionData: Omit<Transaction, "_id" | "fecha">) {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")

    const transaction: Transaction = {
      ...newTransactionData,
      id: Date.now().toString(), // Ensure a string ID for client-side use
      fecha: format(new Date(), "dd/MM/yyyy hh:mm a"),
    }

    await transactionsCollection.insertOne(transaction)

    // Recalculate and update daily summary
    const today = format(new Date(), "dd/MM/yyyy")
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactions = await transactionsCollection.find({}).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, saldoFinal, totalGeneral } = calculateSummaryValues(
        currentSummary.montoInicial,
        allTransactions,
      )

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            saldoFinal,
            totalGeneral,
          },
        },
      )
    }

    return { success: true, transaction: JSON.parse(JSON.stringify(transaction)) }
  } catch (error) {
    console.error("Error adding transaction:", error)
    return { success: false, error: "Failed to add transaction" }
  }
}

export async function deleteTransactionAction(id: string) {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")

    await transactionsCollection.deleteOne({ id: id })

    // Recalculate and update daily summary
    const today = format(new Date(), "dd/MM/yyyy")
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactions = await transactionsCollection.find({}).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, saldoFinal, totalGeneral } = calculateSummaryValues(
        currentSummary.montoInicial,
        allTransactions,
      )

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            saldoFinal,
            totalGeneral,
          },
        },
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return { success: false, error: "Failed to delete transaction" }
  }
}

// --- EMPLEADAS ---
export async function addEmpleadaAction(newEmpleadaName: string) {
  try {
    const { db } = await connectToDatabase()
    const empleadasCollection = db.collection<Empleada>("empleadas")

    const empleada: Empleada = {
      id: Date.now().toString(),
      nombre: newEmpleadaName.trim(),
      fechaRegistro: format(new Date(), "dd/MM/yyyy"),
    }

    await empleadasCollection.insertOne(empleada)
    return { success: true, empleada: JSON.parse(JSON.stringify(empleada)) }
  } catch (error) {
    console.error("Error adding empleada:", error)
    return { success: false, error: "Failed to add empleada" }
  }
}

export async function deleteEmpleadaAction(id: string) {
  try {
    const { db } = await connectToDatabase()
    const empleadasCollection = db.collection<Empleada>("empleadas")

    await empleadasCollection.deleteOne({ id: id })
    return { success: true }
  } catch (error) {
    console.error("Error deleting empleada:", error)
    return { success: false, error: "Failed to delete empleada" }
  }
}

// --- DAILY SUMMARY / CONFIGURATION ---
export async function updateInitialAmountAction(newAmount: number) {
  try {
    const { db } = await connectToDatabase()
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")
    const transactionsCollection = db.collection<Transaction>("transactions")

    const today = format(new Date(), "dd/MM/yyyy")
    let dailySummary = await dailySummaryCollection.findOne({ fecha: today })

    if (!dailySummary) {
      // Should not happen if getInitialData is called first, but as a fallback
      const defaultSummary: DailySummary = {
        fecha: today,
        montoInicial: newAmount,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      }
      await dailySummaryCollection.insertOne(defaultSummary)
      dailySummary = defaultSummary
    } else {
      await dailySummaryCollection.updateOne({ fecha: today }, { $set: { montoInicial: newAmount } })
      dailySummary.montoInicial = newAmount // Update local object for recalculation
    }

    // Recalculate and update daily summary based on new initial amount and existing transactions
    const allTransactions = await transactionsCollection.find({}).toArray()
    const { totalEfectivo, totalTransferencias, totalDevuelto, saldoFinal, totalGeneral } = calculateSummaryValues(
      dailySummary.montoInicial,
      allTransactions,
    )

    const updatedSummary = {
      ...dailySummary,
      totalEfectivo,
      totalTransferencias,
      totalDevuelto,
      saldoFinal,
      totalGeneral,
    }

    await dailySummaryCollection.updateOne({ fecha: today }, { $set: updatedSummary })

    return { success: true, dailySummary: JSON.parse(JSON.stringify(updatedSummary)) }
  } catch (error) {
    console.error("Error updating initial amount:", error)
    return { success: false, error: "Failed to update initial amount" }
  }
}
