import { fakeApi } from "./fake-api";
import { httpApi } from "./http-api";
import type { DataLayer } from "./types";

const base = process.env.NEXT_PUBLIC_API_BASE;

export const isFake = !base;
export const api: DataLayer = base ? httpApi(base.replace(/\/$/, "")) : fakeApi;
