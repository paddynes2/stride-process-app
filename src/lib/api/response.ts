import { NextResponse } from "next/server";

interface ApiSuccess<T> {
  data: T;
  error: null;
}

interface ApiError {
  data: null;
  error: { code: string; message: string };
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data, error: null }, { status });
}

export function errorResponse(code: string, message: string, status = 400): NextResponse<ApiError> {
  return NextResponse.json({ data: null, error: { code, message } }, { status });
}
