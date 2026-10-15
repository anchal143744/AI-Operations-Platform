"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Server-rendered auth controls must stay disabled until their client-side
// submit handlers are attached. The POST form method remains a safe fallback.
export function useAuthFormReady() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
