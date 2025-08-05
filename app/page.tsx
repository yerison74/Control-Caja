"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  Plus,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  UserPlus,
  DollarSign,
  Banknote,
  CreditCard,
  ArrowUpDown,
  Users,
  Clock,
  Wallet,
  Trash2,
  MinusCircle,
} from "lucide-react"
import { format } from "date-fns"
import {
  getInitialData,
  addTransactionAction,
  deleteTransactionAction,
  addEmpleadaAction,
  deleteEmpleadaAction,
  updateInitialAmountAction,
  addExpenseAction, // Importar nueva acción
  deleteExpenseAction, // Importar nueva acción
} from "@/actions" // Import Server Actions

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog" // Import Dialog components

interface Transaction {
  id: string
  cliente: string
  metodoPago: "efectivo" | "tarjeta" | "transferencia"
  montoRecibido: number
  montoServicio: number
  cambioEntregado: number
  quienAtendio: string
  observaciones: string
  fecha: string
}

interface Expense {
  id: string
  monto: number
  descripcion: string
  fecha: string
}

interface DailySummary {
  fecha: string
  montoInicial: number
  totalEfectivo: number
  totalTransferencias: number
  totalDevuelto: number
  totalGastosImprevistos: number // Nuevo campo
  saldoFinal: number
  totalGeneral: number
}

interface Empleada {
  id: string
  nombre: string
  fechaRegistro: string
}

type ActiveSection =
  | "dashboard"
  | "nueva-transaccion"
  | "transacciones"
  | "estadisticas"
  | "empleadas"
  | "configuracion"
  | "gastos-imprevistos" // Nueva sección

export default function SalonCashControl() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([]) // Nuevo estado para gastos
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    fecha: format(new Date(), "dd/MM/yyyy"),
    montoInicial: 4090,
    totalEfectivo: 0,
    totalTransferencias: 0,
    totalDevuelto: 0,
    totalGastosImprevistos: 0, // Inicializar nuevo campo
    saldoFinal: 0,
    totalGeneral: 0,
  })
  const [isLoading, setIsLoading] = useState(true) // New loading state

  const [newTransaction, setNewTransaction] = useState<Omit<Transaction, "id" | "fecha">>({
    cliente: "",
    metodoPago: "efectivo",
    montoRecibido: 0,
    montoServicio: 0,
    cambioEntregado: 0,
    quienAtendio: "",
    observaciones: "",
  })

  const [newExpense, setNewExpense] = useState<Omit<Expense, "id" | "fecha">>({
    // Nuevo estado para nuevo gasto
    monto: 0,
    descripcion: "",
  })

  const [newEmpleada, setNewEmpleada] = useState("")
  const [isEditingInitialAmount, setIsEditingInitialAmount] = useState(false)
  const [tempInitialAmount, setTempInitialAmount] = useState(dailySummary.montoInicial)
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // New states for observation dialog
  const [showObservationDialog, setShowObservationDialog] = useState(false)
  const [selectedObservation, setSelectedObservation] = useState("")

  // Cargar datos de MongoDB al iniciar
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const data = await getInitialData()
      if (data.transactions) {
        setTransactions(data.transactions)
      }
      if (data.dailySummary) {
        setDailySummary(data.dailySummary)
        setTempInitialAmount(data.dailySummary.montoInicial) // Initialize temp amount
      }
      if (data.empleadas) {
        setEmpleadas(data.empleadas)
      }
      if (data.expenses) {
        // Cargar gastos
        setExpenses(data.expenses)
      }
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Agregar nueva empleada
  const addEmpleada = async () => {
    if (!newEmpleada.trim()) {
      alert("Por favor ingrese el nombre de la empleada")
      return
    }

    const result = await addEmpleadaAction(newEmpleada)
    if (result.success && result.empleada) {
      setEmpleadas((prev) => [...prev, result.empleada])
      setNewEmpleada("")
    } else {
      alert(`Error al agregar empleada: ${result.error}`)
    }
  }

  // Eliminar empleada
  const deleteEmpleada = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta empleada?")) {
      const result = await deleteEmpleadaAction(id)
      if (result.success) {
        setEmpleadas((prev) => prev.filter((e) => e.id !== id))
      } else {
        alert(`Error al eliminar empleada: ${result.error}`)
      }
    }
  }

  // Agregar nueva transacción
  const addTransaction = async () => {
    if (!newTransaction.cliente || !newTransaction.quienAtendio) {
      alert("Por favor complete los campos obligatorios")
      return
    }

    // Calcular monto recibido correctamente según el método de pago
    let montoRecibidoFinal: number
    if (newTransaction.metodoPago === "tarjeta") {
      // Para tarjetas, el monto recibido es el servicio + 5%
      montoRecibidoFinal = newTransaction.montoServicio * 1.05
    } else {
      // Para efectivo y transferencias, usar el monto que ingresó el usuario
      montoRecibidoFinal = newTransaction.montoRecibido
    }

    const transactionDataToSend = {
      ...newTransaction,
      montoRecibido: montoRecibidoFinal,
      cambioEntregado:
        newTransaction.metodoPago === "efectivo"
          ? Math.max(0, newTransaction.montoRecibido - newTransaction.montoServicio)
          : 0,
    }

    const result = await addTransactionAction(transactionDataToSend)
    if (result.success && result.transaction) {
      setTransactions((prev) => [...prev, result.transaction])
      // Re-fetch summary to get updated totals
      const updatedData = await getInitialData()
      if (updatedData.dailySummary) {
        setDailySummary(updatedData.dailySummary)
      }
      if (updatedData.expenses) {
        // Actualizar gastos también
        setExpenses(updatedData.expenses)
      }
      setNewTransaction({
        cliente: "",
        metodoPago: "efectivo",
        montoRecibido: 0,
        montoServicio: 0,
        cambioEntregado: 0,
        quienAtendio: "",
        observaciones: "",
      })
      setActiveSection("transacciones")
    } else {
      alert(`Error al agregar transacción: ${result.error}`)
    }
  }

  // Agregar nuevo gasto imprevisto
  const addExpense = async () => {
    if (newExpense.monto <= 0 || !newExpense.descripcion.trim()) {
      alert("Por favor ingrese un monto válido y una descripción para el gasto.")
      return
    }

    const result = await addExpenseAction(newExpense)
    if (result.success && result.expense) {
      setExpenses((prev) => [...prev, result.expense])
      // Re-fetch summary to get updated totals
      const updatedData = await getInitialData()
      if (updatedData.dailySummary) {
        setDailySummary(updatedData.dailySummary)
      }
      if (updatedData.transactions) {
        // Actualizar transacciones también
        setTransactions(updatedData.transactions)
      }
      setNewExpense({ monto: 0, descripcion: "" })
    } else {
      alert(`Error al agregar gasto: ${result.error}`)
    }
  }

  // Eliminar gasto imprevisto
  const deleteExpense = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este gasto?")) {
      const result = await deleteExpenseAction(id)
      if (result.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id))
        // Re-fetch summary to get updated totals
        const updatedData = await getInitialData()
        if (updatedData.dailySummary) {
          setDailySummary(updatedData.dailySummary)
        }
        if (updatedData.transactions) {
          // Actualizar transacciones también
          setTransactions(updatedData.transactions)
        }
      } else {
        alert(`Error al eliminar gasto: ${result.error}`)
      }
    }
  }

  // Actualizar monto inicial
  const updateInitialAmount = async () => {
    const result = await updateInitialAmountAction(tempInitialAmount)
    if (result.success && result.dailySummary) {
      setDailySummary(result.dailySummary)
      setIsEditingInitialAmount(false)
    } else {
      alert(`Error al actualizar monto inicial: ${result.error}`)
    }
  }

  // Cancelar edición del monto inicial
  const cancelEditInitialAmount = () => {
    setTempInitialAmount(dailySummary.montoInicial)
    setIsEditingInitialAmount(false)
  }

  // Eliminar transacción
  const deleteTransaction = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
      const result = await deleteTransactionAction(id)
      if (result.success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id))
        // Re-fetch summary to get updated totals
        const updatedData = await getInitialData()
        if (updatedData.dailySummary) {
          setDailySummary(updatedData.dailySummary)
        }
        if (updatedData.expenses) {
          // Actualizar gastos también
          setExpenses(updatedData.expenses)
        }
      } else {
        alert(`Error al eliminar transacción: ${result.error}`)
      }
    }
  }

  // Formatear moneda
  const formatCurrency = useCallback((amount: number) => {
    return `RD$${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }, [])

  // Exportar a PDF
  const exportToPDF = async () => {
    try {
      console.log("Iniciando exportación a PDF (alternativa con manejo de finalY)...")

      // Importar jsPDF
      const { jsPDF } = await import("jspdf")
      console.log("jsPDF importado:", jsPDF)

      // Importar autoTable directamente como una función
      const { default: autoTable } = await import("jspdf-autotable")
      console.log("autoTable importado:", autoTable)

      // Verificar si autoTable es una función
      if (typeof autoTable !== "function") {
        console.error("Error: autoTable NO es una función después de la importación.")
        throw new Error("La función autoTable no se cargó correctamente.")
      }
      console.log("autoTable está disponible y es una función.")

      const doc = new jsPDF()
      console.log("Instancia de jsPDF creada:", doc)

      // Define colors (RGB values)
      const primaryGreen = [74, 222, 128] // Tailwind green-500
      const secondaryBlue = [59, 130, 246] // Tailwind blue-500
      const accentPurple = [168, 85, 247] // Tailwind purple-500
      const textColor = [55, 65, 81] // Tailwind gray-700
      const headerBg = [243, 244, 246] // Tailwind gray-100

      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      // --- Header ---
      doc.setFontSize(24)
      doc.setFont("helvetica", "bold")
      doc.text("Reporte Diario de Caja - Salón", 20, 25)

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Fecha del Reporte: ${dailySummary.fecha}`, 20, 35)
      doc.text(`Generado el: ${format(new Date(), "dd/MM/yyyy hh:mm a")}`, 20, 42)

      // --- Resumen Financiero del Día ---
      let yOffset = 60
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("RESUMEN FINANCIERO DEL DÍA", 20, yOffset)
      yOffset += 10

      // Summary Cards (simulated with rectangles and text)
      const cardWidth = 45
      const cardHeight = 25
      const cardSpacing = 5
      let currentX = 20

      // Monto Inicial
      doc.setFillColor(230, 230, 250) // Light purple
      doc.rect(currentX, yOffset, cardWidth, cardHeight, "F")
      doc.setTextColor(accentPurple[0], accentPurple[1], accentPurple[2])
      doc.setFontSize(8)
      doc.text("Monto Inicial", currentX + 2, yOffset + 7)
      doc.setFontSize(12)
      doc.text(formatCurrency(dailySummary.montoInicial), currentX + 2, yOffset + 17)
      currentX += cardWidth + cardSpacing

      // Total Efectivo
      doc.setFillColor(200, 250, 200) // Light green
      doc.rect(currentX, yOffset, cardWidth, cardHeight, "F")
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2])
      doc.setFontSize(8)
      doc.text("Total Efectivo", currentX + 2, yOffset + 7)
      doc.setFontSize(12)
      doc.text(formatCurrency(dailySummary.totalEfectivo), currentX + 2, yOffset + 17)
      currentX += cardWidth + cardSpacing

      // Total Transferencias
      doc.setFillColor(200, 220, 255) // Light blue
      doc.rect(currentX, yOffset, cardWidth, cardHeight, "F")
      doc.setTextColor(secondaryBlue[0], secondaryBlue[1], secondaryBlue[2])
      doc.setFontSize(8)
      doc.text("Total Transferencias", currentX + 2, yOffset + 7)
      doc.setFontSize(12)
      doc.text(formatCurrency(dailySummary.totalTransferencias), currentX + 2, yOffset + 17)
      currentX += cardWidth + cardSpacing

      // Total Devuelto
      doc.setFillColor(255, 200, 200) // Light red
      doc.rect(currentX, yOffset, cardWidth, cardHeight, "F")
      doc.setTextColor(255, 0, 0) // Red
      doc.setFontSize(8)
      doc.text("Total Devuelto", currentX + 2, yOffset + 7)
      doc.setFontSize(12)
      doc.text(formatCurrency(dailySummary.totalDevuelto), currentX + 2, yOffset + 17)
      currentX += cardWidth + cardSpacing

      // Total Gastos Imprevistos
      doc.setFillColor(255, 230, 200) // Light orange
      doc.rect(currentX, yOffset, cardWidth, cardHeight, "F")
      doc.setTextColor(255, 140, 0) // Dark orange
      doc.setFontSize(8)
      doc.text("Gastos Imprevistos", currentX + 2, yOffset + 7)
      doc.setFontSize(12)
      doc.text(formatCurrency(dailySummary.totalGastosImprevistos), currentX + 2, yOffset + 17)
      currentX = 20 // Reset X for next row if needed
      yOffset += cardHeight + cardSpacing + 5 // Move down for next section

      // Total en Caja (Efectivo) - Highlighted
      doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]) // Green background
      doc.rect(currentX, yOffset, 170, 30, "F") // Wider card
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(12)
      doc.text("TOTAL EN CAJA (EFECTIVO)", currentX + 5, yOffset + 10)
      doc.setFontSize(20)
      doc.text(formatCurrency(dailySummary.saldoFinal), currentX + 5, yOffset + 23)
      yOffset += 30 + cardSpacing

      // TOTAL GENERAL - Highlighted
      doc.setFillColor(accentPurple[0], accentPurple[1], accentPurple[2]) // Purple background
      doc.rect(currentX, yOffset, 170, 30, "F") // Wider card
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(12)
      doc.text("TOTAL GENERAL DEL DÍA", currentX + 5, yOffset + 10)
      doc.setFontSize(20)
      doc.text(formatCurrency(dailySummary.totalGeneral), currentX + 5, yOffset + 23)
      yOffset += 30 + 15 // Move down for next section

      doc.setTextColor(textColor[0], textColor[1], textColor[2]) // Reset text color

      // --- Detalle de Transacciones ---
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("DETALLE DE TRANSACCIONES", 20, yOffset)
      yOffset += 10

      const transactionsData = transactions.map((t) => [
        t.cliente,
        t.fecha
          .split(" ")
          .slice(-2)
          .join(" "), // Hora
        t.metodoPago === "efectivo" ? "Efectivo" : t.metodoPago === "tarjeta" ? "Tarjeta" : "Transferencia",
        formatCurrency(t.montoRecibido),
        formatCurrency(t.montoServicio),
        t.metodoPago === "tarjeta" ? formatCurrency(t.montoServicio * 0.05) : "-",
        formatCurrency(t.cambioEntregado),
        t.quienAtendio,
        t.observaciones,
      ])

      // Llamar a autoTable directamente, pasándole la instancia de doc
      autoTable(doc, {
        startY: yOffset,
        head: [["Cliente", "Hora", "Método", "Recibido", "Servicio", "Recargo", "Cambio", "Atendió", "Observaciones"]],
        body: transactionsData,
        theme: "striped", // Modern look with alternating row colors
        headStyles: {
          fillColor: headerBg, // Light gray header
          textColor: textColor,
          fontStyle: "bold",
          fontSize: 8,
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak", // Handle long text
          halign: "left",
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Cliente
          1: { cellWidth: 15 }, // Hora
          2: { cellWidth: 15 }, // Método
          3: { cellWidth: 18 }, // Recibido
          4: { cellWidth: 18 }, // Servicio
          5: { cellWidth: 15 }, // Recargo
          6: { cellWidth: 15 }, // Cambio
          7: { cellWidth: 20 }, // Atendió
          8: { cellWidth: 30 }, // Observaciones
        },
        didDrawPage: (data: any) => {
          // Footer for page numbers
          doc.setFontSize(8)
          doc.text(
            "Página " + doc.internal.getNumberOfPages(),
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10,
            { align: "right" },
          )
        },
      })

      // Actualizar yOffset de forma segura
      yOffset = (autoTable as any).previous?.finalY ? (autoTable as any).previous.finalY + 15 : yOffset + 50
      console.log("yOffset después de la tabla de transacciones:", yOffset)

      // --- Detalle de Gastos Imprevistos ---
      if (expenses.length > 0) {
        doc.addPage() // Nueva página para gastos si hay muchos datos
        yOffset = 20 // Reiniciar yOffset para la nueva página

        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text("DETALLE DE GASTOS IMPREVISTOS", 20, yOffset)
        yOffset += 10

        const expensesData = expenses.map((e) => [
          e.fecha
            .split(" ")
            .slice(-2)
            .join(" "), // Hora
          formatCurrency(e.monto),
          e.descripcion,
        ])

        autoTable(doc, {
          startY: yOffset,
          head: [["Hora", "Monto", "Descripción"]],
          body: expensesData,
          theme: "striped",
          headStyles: {
            fillColor: headerBg,
            textColor: textColor,
            fontStyle: "bold",
            fontSize: 8,
          },
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: "linebreak",
            halign: "left",
          },
          columnStyles: {
            0: { cellWidth: 20 }, // Hora
            1: { cellWidth: 25 }, // Monto
            2: { cellWidth: 140 }, // Descripción
          },
          didDrawPage: (data: any) => {
            doc.setFontSize(8)
            doc.text(
              "Página " + doc.internal.getNumberOfPages(),
              doc.internal.pageSize.width - 20,
              doc.internal.pageSize.height - 10,
              { align: "right" },
            )
          },
        })
        yOffset = (autoTable as any).previous?.finalY ? (autoTable as any).previous.finalY + 15 : yOffset + 50
        console.log("yOffset después de la tabla de gastos:", yOffset)
      }

      // --- Estadísticas de Empleadas ---
      // Asegurarse de que las estadísticas de empleadas comiencen en una nueva página si el contenido anterior es largo
      if (yOffset > doc.internal.pageSize.height - 50) {
        // Si queda poco espacio
        doc.addPage()
        yOffset = 20 // Reiniciar yOffset para la nueva página
      }

      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("ESTADÍSTICAS DE EMPLEADAS", 20, yOffset)
      yOffset += 10

      const clientesPorEmpleada = transactions.reduce(
        (acc, transaction) => {
          acc[transaction.quienAtendio] = (acc[transaction.quienAtendio] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )

      const employeeStatsData = empleadas.map((empleada) => [
        empleada.nombre,
        clientesPorEmpleada[empleada.nombre] || 0,
      ])

      // Llamar a autoTable directamente, pasándole la instancia de doc
      autoTable(doc, {
        startY: yOffset,
        head: [["Empleada", "Clientes Atendidos"]],
        body: employeeStatsData,
        theme: "striped",
        headStyles: {
          fillColor: headerBg,
          textColor: textColor,
          fontStyle: "bold",
          fontSize: 8,
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 40, halign: "center" },
        },
        didDrawPage: (data: any) => {
          doc.setFontSize(8)
          doc.text(
            "Página " + doc.internal.getNumberOfPages(), // Corrected line
            doc.internal.pageSize.width - 20,
            doc.internal.pageSize.height - 10,
            { align: "right" },
          )
        },
      })

      doc.save(`reporte-salon-${dailySummary.fecha.replace(/\//g, "-")}.pdf`)
      console.log("PDF generado y guardado.")
    } catch (error) {
      console.error("Error durante la exportación a PDF:", error)
      alert(
        `Error al generar PDF: ${error instanceof Error ? error.message : String(error)}. Por favor, revise la consola para más detalles.`,
      )
    }
  }

  // Exportar a Excel
  const exportToExcel = async () => {
    try {
      console.log("Iniciando exportación a Excel...")
      const XLSX = await import("xlsx")
      console.log("XLSX importado:", XLSX)

      // Crear libro de trabajo
      const workbook = XLSX.utils.book_new()

      // Hoja de resumen
      const resumenData = [
        ["CONTROL DE CAJA - SALÓN"],
        [`Fecha: ${dailySummary.fecha}`],
        [""],
        ["RESUMEN DEL DÍA"],
        ["Monto Inicial", formatCurrency(dailySummary.montoInicial)],
        ["Total Efectivo Recibido", formatCurrency(dailySummary.totalEfectivo)],
        ["Total en Caja (Efectivo)", formatCurrency(dailySummary.saldoFinal)],
        ["Total Transferencias", formatCurrency(dailySummary.totalTransferencias)],
        ["Total Devuelto", formatCurrency(dailySummary.totalDevuelto)],
        ["Total Gastos Imprevistos", formatCurrency(dailySummary.totalGastosImprevistos)], // Nuevo campo
        ["TOTAL GENERAL", formatCurrency(dailySummary.totalGeneral)],
        ["Total de Transacciones", transactions.length],
        ["Empleadas Registradas", empleadas.length],
      ]

      const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")
      console.log("Hoja 'Resumen' creada.")

      // Hoja de transacciones
      if (transactions.length > 0) {
        const transaccionesData = [
          [
            "Cliente",
            "Fecha y Hora",
            "Método de Pago",
            "Monto Recibido",
            "Monto Servicio",
            "Recargo",
            "Cambio",
            "Quien Atendió",
            "Observaciones",
          ],
        ]

        transactions.forEach((transaction) => {
          transaccionesData.push([
            transaction.cliente,
            transaction.fecha,
            transaction.metodoPago,
            formatCurrency(transaction.montoRecibido), // Aplicar formato de moneda
            formatCurrency(transaction.montoServicio), // Aplicar formato de moneda
            transaction.metodoPago === "tarjeta" ? formatCurrency(transaction.montoServicio * 0.05) : "-", // Aplicar formato de moneda
            formatCurrency(transaction.cambioEntregado), // Aplicar formato de moneda
            transaction.quienAtendio,
            transaction.observaciones,
          ])
        })

        const transaccionesSheet = XLSX.utils.aoa_to_sheet(transaccionesData)
        XLSX.utils.book_append_sheet(workbook, transaccionesSheet, "Transacciones")
        console.log("Hoja 'Transacciones' creada.")
      } else {
        console.log("No hay transacciones para exportar a Excel.")
      }

      // Hoja de gastos imprevistos
      if (expenses.length > 0) {
        const expensesData = [["Fecha y Hora", "Monto", "Descripción"]]

        expenses.forEach((expense) => {
          expensesData.push([expense.fecha, formatCurrency(expense.monto), expense.descripcion])
        })

        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData)
        XLSX.utils.book_append_sheet(workbook, expensesSheet, "Gastos Imprevistos")
        console.log("Hoja 'Gastos Imprevistos' creada.")
      } else {
        console.log("No hay gastos imprevistos para exportar a Excel.")
      }

      // Hoja de empleadas
      if (empleadas.length > 0) {
        const empleadasData = [["Nombre", "Fecha de Registro", "Clientes Atendidos"]]

        const clientesPorEmpleada = transactions.reduce(
          (acc, transaction) => {
            acc[transaction.quienAtendio] = (acc[transaction.quienAtendio] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        empleadas.forEach((empleada) => {
          empleadasData.push([empleada.nombre, empleada.fechaRegistro, clientesPorEmpleada[empleada.nombre] || 0])
        })

        const empleadasSheet = XLSX.utils.aoa_to_sheet(empleadasData)
        XLSX.utils.book_append_sheet(workbook, empleadasSheet, "Empleadas")
        console.log("Hoja 'Empleadas' creada.")
      } else {
        console.log("No hay empleadas para exportar a Excel.")
      }

      // Guardar archivo
      XLSX.writeFile(workbook, `control-caja-${dailySummary.fecha.replace(/\//g, "-")}.xlsx`)
      console.log("Archivo Excel generado y guardado.")
    } catch (error) {
      console.error("Error durante la exportación a Excel:", error)
      alert(
        `Error al generar Excel: ${error instanceof Error ? error.message : String(error)}. Por favor, revise la consola para más detalles.`,
      )
    }
  }

  // Obtener color del método de pago
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "efectivo":
        return "bg-green-100 text-green-800"
      case "tarjeta":
        return "bg-blue-100 text-blue-800"
      case "transferencia":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Elementos del menú
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "nueva-transaccion", label: "Nueva Transacción", icon: Plus },
    { id: "transacciones", label: "Transacciones", icon: Receipt },
    { id: "gastos-imprevistos", label: "Gastos Imprevistos", icon: MinusCircle }, // Nuevo item de menú
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
    { id: "empleadas", label: "Empleadas", icon: UserPlus },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  // Obtener título de la sección activa
  const getSectionTitle = () => {
    const item = menuItems.find((item) => item.id === activeSection)
    return item ? item.label : "Dashboard"
  }

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            {/* Total en Caja - Destacado */}
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">💰 Total en Caja (Efectivo)</CardTitle>
                <Wallet className="h-6 w-6" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{formatCurrency(dailySummary.saldoFinal)}</div>
                <p className="text-green-100 mt-1">Monto inicial + Efectivo recibido - Cambios entregados - Gastos</p>
              </CardContent>
            </Card>

            {/* Resumen Diario */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monto Inicial</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dailySummary.montoInicial)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Efectivo</CardTitle>
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(dailySummary.totalEfectivo)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transferencias</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(dailySummary.totalTransferencias)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Devuelto</CardTitle>
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(dailySummary.totalDevuelto)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Resumen Adicional */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen del Día</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total General</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(dailySummary.totalGeneral)}</p>
                    <p className="text-xs text-blue-500 mt-1">Total en Caja + Transferencias</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Transacciones</p>
                    <p className="text-2xl font-bold text-purple-700">{transactions.length}</p>
                    <p className="text-xs text-purple-500 mt-1">Total del día</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">Gastos Imprevistos</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {formatCurrency(dailySummary.totalGastosImprevistos)}
                    </p>
                    <p className="text-xs text-orange-500 mt-1">Dinero retirado de caja</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de Exportación */}
            <Card>
              <CardHeader>
                <CardTitle>Exportar Reportes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button onClick={exportToPDF} className="flex-1">
                    <Receipt className="h-4 w-4 mr-2" />
                    Exportar a PDF
                  </Button>
                  <Button onClick={exportToExcel} variant="outline" className="flex-1 bg-transparent">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Exportar a Excel
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Exporta todos los datos del día incluyendo resumen, transacciones y estadísticas de empleadas
                </p>
              </CardContent>
            </Card>
          </div>
        )

      case "nueva-transaccion":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nueva Transacción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Input
                    id="cliente"
                    value={newTransaction.cliente}
                    onChange={(e) => setNewTransaction({ ...newTransaction, cliente: e.target.value })}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div>
                  <Label htmlFor="metodoPago">Método de Pago</Label>
                  <Select
                    value={newTransaction.metodoPago}
                    onValueChange={(value: "efectivo" | "tarjeta" | "transferencia") =>
                      setNewTransaction({ ...newTransaction, metodoPago: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
                      <SelectItem value="efectivo" className="bg-green-100 text-green-800">
                        Efectivo
                      </SelectItem>
                      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
                      <SelectItem value="tarjeta" className="bg-blue-100 text-blue-800">
                        Tarjeta de Crédito
                      </SelectItem>
                      {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
                      <SelectItem value="transferencia" className="bg-purple-100 text-purple-800">
                        Transferencia
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="montoRecibido">
                    Monto Recibido (RD$)
                    {newTransaction.metodoPago === "tarjeta" && (
                      <span className="text-blue-600 text-xs ml-1">(Auto-calculado)</span>
                    )}
                  </Label>
                  <Input
                    id="montoRecibido"
                    type="number"
                    value={
                      newTransaction.metodoPago === "tarjeta"
                        ? (newTransaction.montoServicio * 1.05).toFixed(2)
                        : newTransaction.montoRecibido || ""
                    }
                    onChange={(e) =>
                      newTransaction.metodoPago !== "tarjeta" &&
                      setNewTransaction({ ...newTransaction, montoRecibido: Number.parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    disabled={newTransaction.metodoPago === "tarjeta"}
                    className={newTransaction.metodoPago === "tarjeta" ? "bg-blue-50" : ""}
                  />
                  {newTransaction.metodoPago === "efectivo" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ingrese el monto que recibió del cliente (puede ser mayor al servicio para dar cambio)
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="montoServicio">Monto del Servicio (RD$)</Label>
                  <Input
                    id="montoServicio"
                    type="number"
                    value={newTransaction.montoServicio || ""}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, montoServicio: Number.parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                {newTransaction.metodoPago === "tarjeta" && (
                  <div>
                    <Label>Monto a Cobrar (+5%)</Label>
                    <div className="p-2 bg-blue-100 rounded-md text-lg font-semibold text-blue-800">
                      {formatCurrency(newTransaction.montoServicio * 1.05)}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Incluye 5% por tarjeta de crédito</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="quienAtendio">Quien Atendió *</Label>
                  {empleadas.length > 0 ? (
                    <Select
                      value={newTransaction.quienAtendio}
                      onValueChange={(value) => setNewTransaction({ ...newTransaction, quienAtendio: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleada" />
                      </SelectTrigger>
                      <SelectContent>
                        {empleadas.map((empleada) => (
                          <SelectItem key={empleada.id} value={empleada.nombre}>
                            {empleada.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        id="quienAtendio"
                        value={newTransaction.quienAtendio}
                        onChange={(e) => setNewTransaction({ ...newTransaction, quienAtendio: e.target.value })}
                        placeholder="Nombre del empleado"
                      />
                      <p className="text-xs text-gray-500">
                        💡 Tip: Agrega empleadas en la sección "Empleadas" para seleccionarlas fácilmente
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Cambio Calculado</Label>
                  <div className="p-2 bg-gray-100 rounded-md text-lg font-semibold">
                    {formatCurrency(
                      newTransaction.metodoPago === "efectivo"
                        ? Math.max(0, newTransaction.montoRecibido - newTransaction.montoServicio)
                        : 0,
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={newTransaction.observaciones}
                    onChange={(e) => setNewTransaction({ ...newTransaction, observaciones: e.target.value })}
                    placeholder="Detalles del servicio, notas adicionales..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={addTransaction} className="w-full md:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Transacción
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case "empleadas":
        return (
          <div className="space-y-6">
            {/* Formulario para agregar empleada */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Agregar Nueva Empleada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="newEmpleada">Nombre de la Empleada</Label>
                    <Input
                      id="newEmpleada"
                      value={newEmpleada}
                      onChange={(e) => setNewEmpleada(e.target.value)}
                      placeholder="Ingrese el nombre completo"
                      onKeyPress={(e) => e.key === "Enter" && addEmpleada()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addEmpleada}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de empleadas */}
            <Card>
              <CardHeader>
                <CardTitle>Empleadas Registradas ({empleadas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {empleadas.length > 0 ? (
                  <div className="space-y-2">
                    {empleadas.map((empleada) => (
                      <div key={empleada.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{empleada.nombre}</p>
                          <p className="text-sm text-gray-500">Registrada el {empleada.fechaRegistro}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteEmpleada(empleada.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay empleadas registradas</p>
                    <p className="text-sm">Agrega empleadas para facilitar la selección en las transacciones</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case "transacciones":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Transacciones del Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>Monto Recibido</TableHead>
                      <TableHead>Monto Servicio</TableHead>
                      <TableHead>Recargo</TableHead>
                      <TableHead>Cambio</TableHead>
                      <TableHead>Quien Atendió</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{transaction.cliente}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.fecha.split(" ").slice(-2).join(" ")}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodColor(transaction.metodoPago)}>
                            {transaction.metodoPago === "efectivo"
                              ? "Efectivo"
                              : transaction.metodoPago === "tarjeta"
                                ? "Tarjeta"
                                : "Transferencia"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.montoRecibido)}</TableCell>
                        <TableCell>{formatCurrency(transaction.montoServicio)}</TableCell>
                        <TableCell>
                          {transaction.metodoPago === "tarjeta" ? (
                            <Badge className="bg-blue-100 text-blue-800">+5%</Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.cambioEntregado)}</TableCell>
                        <TableCell>{transaction.quienAtendio}</TableCell>
                        <TableCell className="max-w-xs">
                          {transaction.observaciones.length > 50 ? (
                            <div className="flex items-center">
                              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                {transaction.observaciones.substring(0, 47)}...
                              </span>
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-blue-600 hover:text-blue-800 ml-1 flex-shrink-0"
                                onClick={() => {
                                  setSelectedObservation(transaction.observaciones)
                                  setShowObservationDialog(true)
                                }}
                              >
                                Ver más
                              </Button>
                            </div>
                          ) : (
                            transaction.observaciones
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No hay transacciones registradas para hoy
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Dialog for full observation */}
              <Dialog open={showObservationDialog} onOpenChange={setShowObservationDialog}>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Observación Completa</DialogTitle>
                    <DialogDescription>Detalles completos de la observación de la transacción.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedObservation}</p>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )

      case "gastos-imprevistos": // Nueva sección para gastos
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MinusCircle className="h-5 w-5" />
                  Registrar Gasto Imprevisto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expenseMonto">Monto del Gasto (RD$)</Label>
                    <Input
                      id="expenseMonto"
                      type="number"
                      value={newExpense.monto || ""}
                      onChange={(e) => setNewExpense({ ...newExpense, monto: Number.parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="expenseDescripcion">Descripción del Gasto</Label>
                    <Textarea
                      id="expenseDescripcion"
                      value={newExpense.descripcion}
                      onChange={(e) => setNewExpense({ ...newExpense, descripcion: e.target.value })}
                      placeholder="Ej: Compra de bombillo, reparación de silla, etc."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={addExpense} className="w-full md:w-auto">
                    <MinusCircle className="h-4 w-4 mr-2" />
                    Registrar Gasto
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial de Gastos Imprevistos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.length > 0 ? (
                        expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="font-mono text-sm">{expense.fecha}</TableCell>
                            <TableCell className="font-medium text-red-600">{formatCurrency(expense.monto)}</TableCell>
                            <TableCell className="max-w-xs">{expense.descripcion}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteExpense(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                            No hay gastos imprevistos registrados para hoy
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "estadisticas":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estadísticas de Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estadísticas de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Total de Clientes Hoy</p>
                    <p className="text-3xl font-bold text-green-700">{transactions.length}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-700">Clientes por Empleada:</h4>
                    {Object.entries(
                      transactions.reduce(
                        (acc, transaction) => {
                          acc[transaction.quienAtendio] = (acc[transaction.quienAtendio] || 0) + 1
                          return acc
                        },
                        {} as Record<string, number>,
                      ),
                    ).map(([empleada, cantidad]) => (
                      <div key={empleada} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-medium">{empleada}</span>
                        <Badge variant="secondary">
                          {cantidad} cliente{cantidad !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    ))}
                    {transactions.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actividad por Horas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Actividad por Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.length > 0 ? (
                    transactions
                      .slice()
                      .reverse()
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm"
                        >
                          <div>
                            <span className="font-medium">{transaction.cliente}</span>
                            <span className="text-gray-500 ml-2">({transaction.quienAtendio})</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono">{transaction.fecha.split(" ").slice(-2).join(" ")}</div>
                            <div className="text-xs text-gray-500">{formatCurrency(transaction.montoRecibido)}</div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay actividad registrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "configuracion":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">Monto Inicial en Caja</Label>
                  <p className="text-sm text-gray-600 mb-3">Configura el monto inicial con el que empiezas el día</p>

                  {isEditingInitialAmount ? (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        value={tempInitialAmount}
                        onChange={(e) => setTempInitialAmount(Number.parseFloat(e.target.value) || 0)}
                        className="text-lg font-bold max-w-xs border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={updateInitialAmount}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditInitialAmount}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">{formatCurrency(dailySummary.montoInicial)}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingInitialAmount(true)}
                        className="mt-1 text-xs"
                      >
                        Editar Monto
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <Label className="text-base font-semibold">Información del Sistema</Label>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p>• Los datos se guardan automáticamente en tu navegador</p>
                    <p>• Las transacciones con tarjeta incluyen automáticamente 5% de recargo</p>
                    <p>• El cambio se calcula automáticamente para pagos en efectivo</p>
                    <p>• Todas las horas se registran en formato de 12 horas (AM/PM)</p>
                    <p>• Las empleadas registradas aparecen como opciones en las transacciones</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg font-semibold text-gray-700">Cargando datos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Salón Control</h1>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id as ActiveSection)
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-100 transition-colors ${
                  activeSection === item.id ? "bg-blue-50 text-blue-600 border-r-2 border-blue-600" : "text-gray-700"
                }`}
              >
                <Icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t">
          <div className="text-center text-sm text-gray-500">
            <CalendarDays className="h-4 w-4 inline mr-1" />
            {dailySummary.fecha}
          </div>
        </div>
      </div>

      {/* Overlay para móvil */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className="flex-1 lg:ml-0">
        {/* Header móvil */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold">{getSectionTitle()}</h2>
          <div></div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header de escritorio */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h2>
            </div>

            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}
