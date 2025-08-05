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
  fecha: string // Formato "dd/MM/yyyy hh:mm a"
}

interface Expense {
  _id?: ObjectId
  id: string
  monto: number
  descripcion: string
  fecha: string // Formato "dd/MM/yyyy hh:mm a"
}

interface DailySummary {
  _id?: ObjectId
  fecha: string // Formato "dd/MM/yyyy"
  montoInicial: number
  totalEfectivo: number
  totalTransferencias: number
  totalDevuelto: number
  totalGastosImprevistos: number
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
const calculateSummaryValues = (
  currentMontoInicial: number,
  currentTransactions: Transaction[],
  currentExpenses: Expense[],
) => {
  const totalEfectivo = currentTransactions
    .filter((t) => t.metodoPago === "efectivo")
    .reduce((sum, t) => sum + (t.montoRecibido ?? 0), 0) // Asegurar que montoRecibido sea un número

  const totalTransferencias = currentTransactions
    .filter((t) => t.metodoPago === "tarjeta" || t.metodoPago === "transferencia")
    .reduce((sum, t) => sum + (t.montoRecibido ?? 0), 0) // CORREGIDO: t.montoRecibido y asegurar que sea un número

  const totalDevuelto = currentTransactions.reduce((sum, t) => sum + (t.cambioEntregado ?? 0), 0) // Asegurar que cambioEntregado sea un número

  const totalGastosImprevistos = currentExpenses.reduce((sum, e) => sum + (e.monto ?? 0), 0) // Asegurar que monto sea un número

  const saldoFinal = currentMontoInicial + totalEfectivo - totalDevuelto - totalGastosImprevistos
  const totalGeneral = saldoFinal + totalTransferencias

  return {
    totalEfectivo,
    totalTransferencias,
    totalDevuelto,
    totalGastosImprevistos,
    saldoFinal,
    totalGeneral,
  }
}

// --- GET INITIAL DATA ---
// Ahora acepta una fecha opcional para cargar datos de un día específico
export async function getInitialData(dateToLoad?: string) {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")
    const empleadasCollection = db.collection<Empleada>("empleadas")
    const expensesCollection = db.collection<Expense>("expenses")

    const todayFormatted = format(new Date(), "dd/MM/yyyy")
    const targetDate = dateToLoad || todayFormatted // Usa la fecha proporcionada o la actual

    // Filtra transacciones y gastos por la fecha objetivo
    const transactions = await transactionsCollection.find({ fecha: { $regex: `^${targetDate}` } }).toArray()
    const expenses = await expensesCollection.find({ fecha: { $regex: `^${targetDate}` } }).toArray()
    const empleadas = await empleadasCollection.find({}).toArray() // Empleadas no dependen de la fecha

    // Encuentra o crea el resumen diario para la fecha objetivo
    let dailySummary = await dailySummaryCollection.findOne({ fecha: targetDate })

    if (!dailySummary) {
      // Antes de crear el resumen por defecto, verifica si hay actividad para esta fecha
      const transactionsForTargetDate = await transactionsCollection
        .find({ fecha: { $regex: `^${targetDate}` } })
        .toArray()
      const expensesForTargetDate = await expensesCollection.find({ fecha: { $regex: `^${targetDate}` } }).toArray()

      const defaultSummary: DailySummary = {
        fecha: targetDate,
        // Si no hay transacciones ni gastos, el monto inicial es 0, de lo contrario, 4090
        montoInicial: transactionsForTargetDate.length === 0 && expensesForTargetDate.length === 0 ? 0 : 4090,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        totalGastosImprevistos: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      }
      await dailySummaryCollection.insertOne(defaultSummary)
      dailySummary = defaultSummary
    } else {
      // Asegurar que todas las propiedades numéricas sean números, no null/undefined
      dailySummary.montoInicial = dailySummary.montoInicial ?? 0
      dailySummary.totalEfectivo = dailySummary.totalEfectivo ?? 0
      dailySummary.totalTransferencias = dailySummary.totalTransferencias ?? 0
      dailySummary.totalDevuelto = dailySummary.totalDevuelto ?? 0
      dailySummary.totalGastosImprevistos = dailySummary.totalGastosImprevistos ?? 0
      dailySummary.saldoFinal = dailySummary.saldoFinal ?? 0
      dailySummary.totalGeneral = dailySummary.totalGeneral ?? 0
    }

    // Recalcula el resumen basado en los datos filtrados para la fecha objetivo
    const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
      calculateSummaryValues(dailySummary.montoInicial, transactions, expenses)

    dailySummary = {
      ...dailySummary,
      totalEfectivo,
      totalTransferencias,
      totalDevuelto,
      totalGastosImprevistos,
      saldoFinal,
      totalGeneral,
    }

    // Actualiza el resumen en la DB con los valores recalculados (upsert para asegurar que exista)
    await dailySummaryCollection.updateOne({ fecha: targetDate }, { $set: dailySummary }, { upsert: true })

    return {
      transactions: JSON.parse(JSON.stringify(transactions)),
      dailySummary: JSON.parse(JSON.stringify(dailySummary)),
      empleadas: JSON.parse(JSON.stringify(empleadas)),
      expenses: JSON.parse(JSON.stringify(expenses)),
    }
  } catch (error) {
    console.error("Error fetching initial data:", error)
    return {
      transactions: [],
      dailySummary: {
        fecha: dateToLoad || format(new Date(), "dd/MM/yyyy"),
        montoInicial: 4090,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        totalGastosImprevistos: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      },
      empleadas: [],
      expenses: [],
      error: "Failed to fetch initial data",
    }
  }
}

// --- TRANSACTIONS ---
// Estas acciones siempre operan sobre el día actual
export async function addTransactionAction(newTransactionData: Omit<Transaction, "_id" | "fecha">) {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")
    const expensesCollection = db.collection<Expense>("expenses")

    const today = format(new Date(), "dd/MM/yyyy") // Siempre el día actual
    const transaction: Transaction = {
      ...newTransactionData,
      id: Date.now().toString(),
      fecha: format(new Date(), "dd/MM/yyyy hh:mm a"), // Fecha y hora actual
    }

    await transactionsCollection.insertOne(transaction)

    // Recalcular y actualizar el resumen diario para HOY
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactionsToday = await transactionsCollection.find({ fecha: { $regex: `^${today}` } }).toArray()
    const allExpensesToday = await expensesCollection.find({ fecha: { $regex: `^${today}` } }).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
        calculateSummaryValues(currentSummary.montoInicial, allTransactionsToday, allExpensesToday)

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            totalGastosImprevistos,
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
    const expensesCollection = db.collection<Expense>("expenses")

    await transactionsCollection.deleteOne({ id: id })

    // Recalcular y actualizar el resumen diario para HOY
    const today = format(new Date(), "dd/MM/yyyy") // Siempre el día actual
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactionsToday = await transactionsCollection.find({ fecha: { $regex: `^${today}` } }).toArray()
    const allExpensesToday = await expensesCollection.find({ fecha: { $regex: `^${today}` } }).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
        calculateSummaryValues(currentSummary.montoInicial, allTransactionsToday, allExpensesToday)

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            totalGastosImprevistos,
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

// --- GASTOS IMPREVISTOS ---
// Estas acciones siempre operan sobre el día actual
export async function addExpenseAction(newExpenseData: Omit<Expense, "_id" | "fecha">) {
  try {
    const { db } = await connectToDatabase()
    const expensesCollection = db.collection<Expense>("expenses")
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")

    const today = format(new Date(), "dd/MM/yyyy") // Siempre el día actual
    const expense: Expense = {
      ...newExpenseData,
      id: Date.now().toString(),
      fecha: format(new Date(), "dd/MM/yyyy hh:mm a"), // Fecha y hora actual
    }

    await expensesCollection.insertOne(expense)

    // Recalcular y actualizar el resumen diario para HOY
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactionsToday = await transactionsCollection.find({ fecha: { $regex: `^${today}` } }).toArray()
    const allExpensesToday = await expensesCollection.find({ fecha: { $regex: `^${today}` } }).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
        calculateSummaryValues(currentSummary.montoInicial, allTransactionsToday, allExpensesToday)

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            totalGastosImprevistos,
            saldoFinal,
            totalGeneral,
          },
        },
      )
    }

    return { success: true, expense: JSON.parse(JSON.stringify(expense)) }
  } catch (error) {
    console.error("Error adding expense:", error)
    return { success: false, error: "Failed to add expense" }
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const { db } = await connectToDatabase()
    const expensesCollection = db.collection<Expense>("expenses")
    const transactionsCollection = db.collection<Transaction>("transactions")
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")

    await expensesCollection.deleteOne({ id: id })

    // Recalcular y actualizar el resumen diario para HOY
    const today = format(new Date(), "dd/MM/yyyy") // Siempre el día actual
    const currentSummary = await dailySummaryCollection.findOne({ fecha: today })
    const allTransactionsToday = await transactionsCollection.find({ fecha: { $regex: `^${today}` } }).toArray()
    const allExpensesToday = await expensesCollection.find({ fecha: { $regex: `^${today}` } }).toArray()

    if (currentSummary) {
      const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
        calculateSummaryValues(currentSummary.montoInicial, allTransactionsToday, allExpensesToday)

      await dailySummaryCollection.updateOne(
        { fecha: today },
        {
          $set: {
            totalEfectivo,
            totalTransferencias,
            totalDevuelto,
            totalGastosImprevistos,
            saldoFinal,
            totalGeneral,
          },
        },
      )
    }

    return { success: true }
  } catch (error) {
    console.error("Error deleting expense:", error)
    return { success: false, error: "Failed to delete expense" }
  }
}

// --- DAILY SUMMARY / CONFIGURATION ---
// Esta acción siempre opera sobre el día actual
export async function updateInitialAmountAction(newAmount: number) {
  try {
    const { db } = await connectToDatabase()
    const dailySummaryCollection = db.collection<DailySummary>("dailySummaries")
    const transactionsCollection = db.collection<Transaction>("transactions")
    const expensesCollection = db.collection<Expense>("expenses")

    const today = format(new Date(), "dd/MM/yyyy") // Siempre el día actual
    let dailySummary = await dailySummaryCollection.findOne({ fecha: today })

    if (!dailySummary) {
      // Si no existe el resumen para hoy, crea uno
      const defaultSummary: DailySummary = {
        fecha: today,
        montoInicial: newAmount,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        totalGastosImprevistos: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      }
      await dailySummaryCollection.insertOne(defaultSummary)
      dailySummary = defaultSummary
    } else {
      // Asegurar que todas las propiedades numéricas sean números, no null/undefined
      dailySummary.montoInicial = dailySummary.montoInicial ?? 0
      dailySummary.totalEfectivo = dailySummary.totalEfectivo ?? 0
      dailySummary.totalTransferencias = dailySummary.totalTransferencias ?? 0
      dailySummary.totalDevuelto = dailySummary.totalDevuelto ?? 0
      dailySummary.totalGastosImprevistos = dailySummary.totalGastosImprevistos ?? 0
      dailySummary.saldoFinal = dailySummary.saldoFinal ?? 0
      dailySummary.totalGeneral = dailySummary.totalGeneral ?? 0

      await dailySummaryCollection.updateOne({ fecha: today }, { $set: { montoInicial: newAmount } })
      dailySummary.montoInicial = newAmount // Actualiza el objeto local para el recálculo
    }

    // Recalcular y actualizar el resumen diario basado en el nuevo monto inicial y las transacciones/gastos de HOY
    const allTransactionsToday = await transactionsCollection.find({ fecha: { $regex: `^${today}` } }).toArray()
    const allExpensesToday = await expensesCollection.find({ fecha: { $regex: `^${today}` } }).toArray()

    const { totalEfectivo, totalTransferencias, totalDevuelto, totalGastosImprevistos, saldoFinal, totalGeneral } =
      calculateSummaryValues(dailySummary.montoInicial, allTransactionsToday, allExpensesToday)

    const updatedSummary = {
      ...dailySummary,
      totalEfectivo,
      totalTransferencias,
      totalDevuelto,
      totalGastosImprevistos,
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

// --- UTILITY FUNCTIONS ---
export async function getDatesWithActivity() {
  try {
    const { db } = await connectToDatabase()
    const transactionsCollection = db.collection<Transaction>("transactions")
    const expensesCollection = db.collection<Expense>("expenses")

    // Get distinct dates from transactions
    const transactionDates = await transactionsCollection
      .aggregate([
        {
          $group: {
            _id: { $substrCP: ["$fecha", 0, 10] }, // Extract "dd/MM/yyyy" part
          },
        },
        { $project: { _id: 0, date: "$_id" } },
      ])
      .toArray()

    // Get distinct dates from expenses
    const expenseDates = await expensesCollection
      .aggregate([
        {
          $group: {
            _id: { $substrCP: ["$fecha", 0, 10] }, // Extract "dd/MM/yyyy" part
          },
        },
        { $project: { _id: 0, date: "$_id" } },
      ])
      .toArray()

    // Combine and get unique dates
    const allDates = [...transactionDates, ...expenseDates].map((d) => d.date)
    const uniqueDates = Array.from(new Set(allDates))

    return { success: true, dates: uniqueDates }
  } catch (error) {
    console.error("Error fetching dates with activity:", error)
    return { success: false, dates: [], error: "Failed to fetch active dates" }
  }
}
