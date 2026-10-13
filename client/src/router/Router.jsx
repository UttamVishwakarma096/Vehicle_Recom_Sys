import { useState, useEffect, useMemo, useCallback } from "react";
import { RouterContext } from "./context.js";
import { useRouter } from "./hooks.js";
import { matchRoute, parseLocation } from "./matcher.js";

export function Router({ children }) {
  const [path, setPath] = useState(() =>
    typeof window !== "undefined"
      ? (window.location.pathname || "/") + (window.location.search || "")
      : "/"
  );
  const [params, setParams] = useState({});

  useEffect(() => {
    const handlePopState = () => {
      setPath(
        (window.location.pathname || "/") + (window.location.search || "")
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const location = useMemo(() => parseLocation(path), [path]);

  const contextValue = useMemo(() => ({
    path,
    location,
    params,
    setParams,
    navigate,
  }), [path, location, params, navigate]);

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
}

export function Route({ path: routePath, component: Component, children }) {
  const { path: currentPath, setParams } = useRouter();

  const { matches, params } = useMemo(
    () => matchRoute(routePath, currentPath),
    [routePath, currentPath],
  );

  useEffect(() => {
    if (matches) {
      setParams(params);
    }
  }, [matches, params, setParams]);

  if (!matches) {
    return null;
  }

  if (Component) {
    return <Component params={params} />;
  }

  return children;
}

export function Link({ to, children, className = "", onClick, ...props }) {
  const { navigate } = useRouter();

  const handleClick = (e) => {
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      if (onClick) {
        onClick(e);
      }
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
