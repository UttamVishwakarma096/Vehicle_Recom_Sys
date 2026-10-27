/**
 * Normalizes toast arguments to support both legacy VehicleWise calls
 * (e.g. `toast.success(message, title)`) and direct Sileo options
 * (e.g. `toast.success({ title, description, duration })`).
 */
export function formatToastArgs(arg1, arg2, defaultTitle, extraOpts = {}) {
  if (typeof arg1 === "object" && arg1 !== null) {
    const { title, description, message, ...rest } = arg1;
    return {
      title: title || defaultTitle,
      description: description ?? message,
      ...rest,
      ...extraOpts,
    };
  }

  const text = typeof arg1 === "string" ? arg1 : String(arg1 ?? "");
  const base = arg2
    ? { title: arg2, description: text }
    : text.length <= 40
      ? { title: text }
      : { title: defaultTitle, description: text };

  return {
    ...base,
    ...extraOpts,
  };
}
