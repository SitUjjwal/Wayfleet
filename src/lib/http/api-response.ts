import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiFailure = {
  success: false;
  error: string;
  fields?: Record<string, string>;
};

export function apiSuccess<T>(
  data: T,
  init?: { status?: number; pagination?: ApiSuccess<T>["pagination"] },
) {
  const body: ApiSuccess<T> = { success: true, data };
  if (init?.pagination) {
    body.pagination = init.pagination;
  }
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function apiError(
  status: number,
  error: string,
  fields?: Record<string, string>,
) {
  const body: ApiFailure = { success: false, error };
  if (fields) {
    body.fields = fields;
  }
  return NextResponse.json(body, { status });
}
