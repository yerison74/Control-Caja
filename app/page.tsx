"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDays,
  DollarSign,
  CreditCard,
  Banknote,
  ArrowUpDown,
  Trash2,
  Plus,
  Users,
  Clock,
  LayoutDashboard,
  Receipt,
  BarChart3,
  Settings,
  Menu,
  X,
  UserPlus,
  Wallet,
} from "lucide-react"
import { format } from "date-fns"

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

interface DailySummary {
  fecha: string
  montoInicial: number
  totalEfectivo: number
  totalTransferencias: number
  totalDevuelto: number
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

export default function SalonCashControl() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [empleadas, setEmpleadas] = useState<Empleada[]>([])
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    fecha: format(new Date(), "dd/MM/yyyy"),
    montoInicial: 4090,
    totalEfectivo: 0,
    totalTransferencias: 0,
    totalDevuelto: 0,
    saldoFinal: 0,
    totalGeneral: 0,
  })

  const [newTransaction, setNewTransaction] = useState<Omit<Transaction, "id" | "fecha">>({
    cliente: "",
    metodoPago: "efectivo",
    montoRecibido: 0,
    montoServicio: 0,
    cambioEntregado: 0,
    quienAtendio: "",
    observaciones: "",
  })

  const [newEmpleada, setNewEmpleada] = useState("")
  const [isEditingInitialAmount, setIsEditingInitialAmount] = useState(false)
  const [tempInitialAmount, setTempInitialAmount] = useState(dailySummary.montoInicial)
  const [activeSection, setActiveSection] = useState<ActiveSection>("dashboard")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Helper function to calculate summary values
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

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const savedTransactions = localStorage.getItem("salon-transactions")
    const savedSummary = localStorage.getItem("salon-summary")
    const savedEmpleadas = localStorage.getItem("salon-empleadas")

    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions))
    }
    if (savedSummary) {
      setDailySummary(JSON.parse(savedSummary))
    }
    if (savedEmpleadas) {
      setEmpleadas(JSON.parse(savedEmpleadas))
    }
  }, [])

  // Efecto para recalcular el resumen cuando cambian las transacciones o el monto inicial
  useEffect(() => {
    const { totalEfectivo, totalTransferencias, totalDevuelto, saldoFinal, totalGeneral } = calculateSummaryValues(
      dailySummary.montoInicial,
      transactions,
    )

    setDailySummary((prev) => ({
      ...prev,
      totalEfectivo,
      totalTransferencias,
      totalDevuelto,
      saldoFinal,
      totalGeneral,
    }))
  }, [transactions, dailySummary.montoInicial]) // Dependencias: transacciones y montoInicial

  // Efecto para guardar todas las transacciones en localStorage
  useEffect(() => {
    localStorage.setItem("salon-transactions", JSON.stringify(transactions))
  }, [transactions])

  // Efecto para guardar todo el dailySummary en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem("salon-summary", JSON.stringify(dailySummary))
  }, [dailySummary])

  // Guardar empleadas en localStorage
  useEffect(() => {
    localStorage.setItem("salon-empleadas", JSON.stringify(empleadas))
  }, [empleadas])

  // Agregar nueva empleada
  const addEmpleada = () => {
    if (!newEmpleada.trim()) {
      alert("Por favor ingrese el nombre de la empleada")
      return
    }

    const empleada: Empleada = {
      id: Date.now().toString(),
      nombre: newEmpleada.trim(),
      fechaRegistro: format(new Date(), "dd/MM/yyyy"),
    }

    setEmpleadas([...empleadas, empleada])
    setNewEmpleada("")
  }

  // Eliminar empleada
  const deleteEmpleada = (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta empleada?")) {
      setEmpleadas(empleadas.filter((e) => e.id !== id))
    }
  }

  // Agregar nueva transacción
  const addTransaction = () => {
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

    const transaction: Transaction = {
      ...newTransaction,
      id: Date.now().toString(),
      fecha: format(new Date(), "dd/MM/yyyy hh:mm a"),
      montoRecibido: montoRecibidoFinal,
      cambioEntregado:
        newTransaction.metodoPago === "efectivo"
          ? Math.max(0, newTransaction.montoRecibido - newTransaction.montoServicio)
          : 0,
    }

    setTransactions([...transactions, transaction])
    setNewTransaction({
      cliente: "",
      metodoPago: "efectivo",
      montoRecibido: 0,
      montoServicio: 0,
      cambioEntregado: 0,
      quienAtendio: "",
      observaciones: "",
    })

    // Cambiar a la sección de transacciones después de agregar
    setActiveSection("transacciones")
  }

  // Actualizar monto inicial
  const updateInitialAmount = () => {
    const newMontoInicial = tempInitialAmount
    setDailySummary((prev) => ({
      ...prev,
      montoInicial: newMontoInicial,
    }))
    setIsEditingInitialAmount(false)
    // Los useEffects se encargarán de recalcular y persistir
  }

  // Cancelar edición del monto inicial
  const cancelEditInitialAmount = () => {
    setTempInitialAmount(dailySummary.montoInicial)
    setIsEditingInitialAmount(false)
  }

  // Eliminar transacción
  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id))
  }

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return `RD$${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Exportar a PDF
  const exportToPDF = async () => {
    const { jsPDF } = await import("jspdf")
    const doc = new jsPDF()

    // Título
    doc.setFontSize(20)
    doc.text("Control de Caja - Salón", 20, 20)
    doc.setFontSize(12)
    doc.text(`Fecha: ${dailySummary.fecha}`, 20, 35)

    // Resumen
    doc.setFontSize(14)
    doc.text("RESUMEN DEL DÍA", 20, 55)
    doc.setFontSize(10)
    doc.text(`Monto Inicial: ${formatCurrency(dailySummary.montoInicial)}`, 20, 70)
    doc.text(`Total en Caja (Efectivo): ${formatCurrency(dailySummary.saldoFinal)}`, 20, 80)
    doc.text(`Total Transferencias: ${formatCurrency(dailySummary.totalTransferencias)}`, 20, 90)
    doc.text(`Total Devuelto: ${formatCurrency(dailySummary.totalDevuelto)}`, 20, 100)
    doc.text(`TOTAL GENERAL: ${formatCurrency(dailySummary.totalGeneral)}`, 20, 110)
    doc.text(`Total de Transacciones: ${transactions.length}`, 20, 120)

    // Transacciones
    if (transactions.length > 0) {
      doc.setFontSize(14)
      doc.text("TRANSACCIONES", 20, 140)
      doc.setFontSize(8)

      let yPos = 155
      transactions.forEach((transaction, index) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        doc.text(`${index + 1}. ${transaction.cliente}`, 20, yPos)
        doc.text(`${transaction.fecha.split(" ").slice(-2).join(" ")}`, 70, yPos)
        doc.text(`${transaction.metodoPago.toUpperCase()}`, 110, yPos)
        doc.text(`${formatCurrency(transaction.montoRecibido)}`, 140, yPos)
        doc.text(`${transaction.quienAtendio}`, 170, yPos)
        yPos += 10
      })
    }

    doc.save(`control-caja-${dailySummary.fecha.replace(/\//g, "-")}.pdf`)
  }

  // Exportar a Excel
  const exportToExcel = async () => {
    const XLSX = await import("xlsx")

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new()

    // Hoja de resumen
    const resumenData = [
      ["CONTROL DE CAJA - SALÓN"],
      [`Fecha: ${dailySummary.fecha}`],
      [""],
      ["RESUMEN DEL DÍA"],
      ["Monto Inicial", dailySummary.montoInicial],
      ["Total Efectivo Recibido", dailySummary.totalEfectivo],
      ["Total en Caja (Efectivo)", dailySummary.saldoFinal],
      ["Total Transferencias", dailySummary.totalTransferencias],
      ["Total Devuelto", dailySummary.totalDevuelto],
      ["TOTAL GENERAL", dailySummary.totalGeneral],
      ["Total de Transacciones", transactions.length],
      ["Empleadas Registradas", empleadas.length],
    ]

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")

    // Hoja de transacciones
    if (transactions.length > 0) {
      const transaccionesData = [
        [
          "Cliente",
          "Fecha y Hora",
          "Método de Pago",
          "Monto Recibido",
          "Monto Servicio",
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
          transaction.montoRecibido,
          transaction.montoServicio,
          transaction.cambioEntregado,
          transaction.quienAtendio,
          transaction.observaciones,
        ])
      })

      const transaccionesSheet = XLSX.utils.aoa_to_sheet(transaccionesData)
      XLSX.utils.book_append_sheet(workbook, transaccionesSheet, "Transacciones")
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
    }

    // Guardar archivo
    XLSX.writeFile(workbook, `control-caja-${dailySummary.fecha.replace(/\//g, "-")}.xlsx`)
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
    { id: "estadisticas", label: "Estadísticas", icon: BarChart3 },
    { id: "empleadas", label: "Empleadas", icon: UserPlus },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  // Obtener título de la sección activa
  const getSectionTitle = () => {
    const item = menuItems.find((item) => item.id === activeSection)
    return item ? item.label : "Dashboard"
  }

  // Renderizar contenido según la sección activa
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
                <p className="text-green-100 mt-1">Monto inicial + Efectivo recibido - Cambios entregados</p>
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
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(dailySummary.totalTransferencias)}
                  </div>
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
                    <p className="text-sm text-orange-600 font-medium">Empleadas Activas</p>
                    <p className="text-2xl font-bold text-orange-700">{empleadas.length}</p>
                    <p className="text-xs text-orange-500 mt-1">Registradas</p>
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
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
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
                        <TableCell className="max-w-xs truncate">{transaction.observaciones}</TableCell>
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
            </CardContent>
          </Card>
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
                        className="text-lg font-bold max-w-xs border-blue-300 focus:border-blue-500 focus:ring-blue-500" // Added class for active input
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
                        variant="outline" // Changed to outline for better visibility
                        onClick={() => setIsEditingInitialAmount(true)}
                        className="mt-1 text-xs" // Kept original text-xs for size
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
