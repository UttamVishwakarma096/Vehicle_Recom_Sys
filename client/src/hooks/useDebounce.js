import { useState, useEffect } from "react";

/**
 * Standard debounce utility function.
 *
 * @param {Function} fn - The function to debounce.
 * @param {number} delay - Debounce delay in milliseconds.
 * @returns {Function} - The debounced function with a .cancel() method.
 */
export function debounce(fn, delay = 300) {
  let timerId;
  const debounced = (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  debounced.cancel = () => {
    clearTimeout(timerId);
  };

  return debounced;
}

/**
 * Custom React hook to debounce any fast-changing value.
 *
 * @template T
 * @param {T} value - The input value to debounce.
 * @param {number} delay - Debounce delay in milliseconds (default: 300ms).
 * @returns {T} - The debounced value.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
