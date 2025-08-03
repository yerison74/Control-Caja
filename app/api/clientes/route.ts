// app/api/clientes/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Cliente from "@/models/Cliente";

export async function GET() {
  await connectDB();
  const clientes = await Cliente.find().lean();
  return NextResponse.json(clientes);
}

export async function POST(req: Request) {
  await connectDB();
  const data = await req.json();
  const nuevoCliente = await Cliente.create(data);
  return NextResponse.json(nuevoCliente, { status: 201 });
}
