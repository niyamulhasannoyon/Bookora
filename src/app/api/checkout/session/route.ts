// DEPRECATED: This route is superseded by /api/public/booking which handles
// both free and paid booking creation in a single endpoint.
// Keeping this file as a redirect for backward compatibility.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use POST /api/public/booking instead." },
    { status: 410 }
  );
}
