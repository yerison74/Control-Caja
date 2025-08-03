import { MongoClient } from "mongodb"
import { format } from "date-fns"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI environment variable is not defined.")
  console.error(
    "Please set it in your .env.local file (e.g., MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/mydatabase?retryWrites=true&w=majority')",
  )
  process.exit(1)
}

async function seedDatabase() {
  let client
  try {
    client = new MongoClient(MONGODB_URI)
    console.log("Conectando a MongoDB...")
    await client.connect()
    console.log("Conexión exitosa a MongoDB.")

    const db = client.db() // Conecta a la base de datos especificada en la URI

    // Colección de Transacciones
    const transactionsCollection = db.collection("transactions")
    const transactionsCount = await transactionsCollection.countDocuments()
    if (transactionsCount === 0) {
      console.log("La colección 'transactions' está vacía. Insertando datos de ejemplo...")
      await transactionsCollection.insertMany([
        {
          id: "1678886400001",
          cliente: "Maria Lopez",
          metodoPago: "efectivo",
          montoRecibido: 1200,
          montoServicio: 1000,
          cambioEntregado: 200,
          quienAtendio: "Ana Garcia",
          observaciones: "Corte y peinado",
          fecha: format(new Date(), "dd/MM/yyyy hh:mm a"),
        },
        {
          id: "1678886400002",
          cliente: "Pedro Ramirez",
          metodoPago: "tarjeta",
          montoRecibido: 1050, // 1000 * 1.05
          montoServicio: 1000,
          cambioEntregado: 0,
          quienAtendio: "Laura Perez",
          observaciones: "Manicura y pedicura",
          fecha: format(new Date(), "dd/MM/yyyy hh:mm a"),
        },
        {
          id: "1678886400003",
          cliente: "Sofia Gomez",
          metodoPago: "transferencia",
          montoRecibido: 1500,
          montoServicio: 1500,
          cambioEntregado: 0,
          quienAtendio: "Ana Garcia",
          observaciones: "Tinte completo",
          fecha: format(new Date(), "dd/MM/yyyy hh:mm a"),
        },
      ])
      console.log("Datos de ejemplo insertados en 'transactions'.")
    } else {
      console.log(
        `La colección 'transactions' ya contiene ${transactionsCount} documentos. Saltando inserción de ejemplo.`,
      )
    }

    // Colección de Resúmenes Diarios
    const dailySummariesCollection = db.collection("dailySummaries")
    const today = format(new Date(), "dd/MM/yyyy")
    const existingSummary = await dailySummariesCollection.findOne({ fecha: today })

    if (!existingSummary) {
      console.log(`No se encontró resumen para hoy (${today}). Insertando resumen inicial...`)
      await dailySummariesCollection.insertOne({
        fecha: today,
        montoInicial: 4090,
        totalEfectivo: 0,
        totalTransferencias: 0,
        totalDevuelto: 0,
        saldoFinal: 0,
        totalGeneral: 0,
      })
      console.log("Resumen inicial insertado en 'dailySummaries'.")
    } else {
      console.log(`Ya existe un resumen para hoy (${today}). Saltando inserción de resumen inicial.`)
    }

    // Colección de Empleadas
    const empleadasCollection = db.collection("empleadas")
    const empleadasCount = await empleadasCollection.countDocuments()
    if (empleadasCount === 0) {
      console.log("La colección 'empleadas' está vacía. Insertando datos de ejemplo...")
      await empleadasCollection.insertMany([
        {
          id: "emp1",
          nombre: "Ana Garcia",
          fechaRegistro: format(new Date(), "dd/MM/yyyy"),
        },
        {
          id: "emp2",
          nombre: "Laura Perez",
          fechaRegistro: format(new Date(), "dd/MM/yyyy"),
        },
        {
          id: "emp3",
          nombre: "Carlos Santana",
          fechaRegistro: format(new Date(), "dd/MM/yyyy"),
        },
      ])
      console.log("Datos de ejemplo insertados en 'empleadas'.")
    } else {
      console.log(`La colección 'empleadas' ya contiene ${empleadasCount} documentos. Saltando inserción de ejemplo.`)
    }

    console.log("Proceso de creación/siembra de base de datos completado.")
  } catch (error) {
    console.error("Error al conectar o sembrar la base de datos:", error)
    process.exit(1)
  } finally {
    if (client) {
      await client.close()
      console.log("Conexión a MongoDB cerrada.")
    }
  }
}

seedDatabase()
