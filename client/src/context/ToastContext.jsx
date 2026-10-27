import { useMemo, useContext } from "react";
import { Toaster, sileo } from "sileo";
import "sileo/styles.css";
import { ToastContext } from "./toastContextDef.js";
import { ThemeContext } from "./themeContextDef.js";
import { formatToastArgs } from "./toastFormatter.js";

export function ToastProvider({ children, position = "top-center" }) {
  const themeContext = useContext(ThemeContext);
  const isDark = Boolean(themeContext?.isDark);

  const toastHelpers = useMemo(() => {
    return {
      success: (arg1, arg2, extraOpts) =>
        sileo.success(formatToastArgs(arg1, arg2, "Success", extraOpts)),
      error: (arg1, arg2, extraOpts) =>
        sileo.error(formatToastArgs(arg1, arg2, "Error", extraOpts)),
      warning: (arg1, arg2, extraOpts) =>
        sileo.warning(formatToastArgs(arg1, arg2, "Warning", extraOpts)),
      info: (arg1, arg2, extraOpts) =>
        sileo.info(formatToastArgs(arg1, arg2, "Info", extraOpts)),
      action: (opts) => sileo.action(opts),
      promise: (promise, opts) => sileo.promise(promise, opts),
      remove: (id) => sileo.dismiss(id),
      dismiss: (id) => sileo.dismiss(id),
      clear: (pos) => sileo.clear(pos),
      show: (opts) => sileo.show(opts),
      sileo,
    };
  }, []);

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}
      <Toaster
        position={position}
        theme={isDark ? "light" : "dark"}
        options={{
          fill: isDark ? "#18181B" : "#FFFFFF",
        }}
      />
    </ToastContext.Provider>
  );
}
