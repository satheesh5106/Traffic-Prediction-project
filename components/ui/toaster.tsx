'use client';

import {
  ToastContainer,
  useToast,
} from "./toast"

export function Toaster() {
  const { toasts, removeToast } = useToast();

  return (
    <ToastContainer toasts={toasts} onClose={removeToast} />
  );
}
