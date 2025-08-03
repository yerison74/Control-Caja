// models/Cliente.ts
import mongoose, { Schema, model, models } from "mongoose";

const ClienteSchema = new Schema({
  nombre: { type: String, required: true },
  telefono: { type: String },
  correo: { type: String },
}, { timestamps: true });

const Cliente = models.Cliente || model("Cliente", ClienteSchema);
export default Cliente;
