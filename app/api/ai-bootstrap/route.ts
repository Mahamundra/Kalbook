import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(()=>({}));
  console.log("ai-bootstrap payload", body);
  // Here you would forward to process.env.N8N_WEBHOOK_URL with headers X-Model and X-Tenant
  return NextResponse.json({ ok: true, tenant_slug: "demo-tenant" });
}