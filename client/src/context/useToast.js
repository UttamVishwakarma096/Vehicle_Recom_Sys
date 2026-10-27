import { useContext } from "react";
import { sileo } from "sileo";
import { ToastContext } from "./toastContextDef.js";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export { sileo };
