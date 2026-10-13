import { useContext } from "react";
import { RouterContext } from "./context.js";

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a Router");
  }
  return context;
}

export function useLocation() {
  const { location, path } = useRouter();
  if (location) return location;
  const raw = path || "/";
  const [pathAndQuery, hash = ""] = raw.split("#");
  const [pathname = "/", search = ""] = pathAndQuery.split("?");
  return {
    pathname: pathname.startsWith("/") ? pathname : `/${pathname}`,
    search: search ? `?${search}` : "",
    hash: hash ? `#${hash}` : "",
  };
}

export function useNavigate() {
  const { navigate } = useRouter();
  return navigate;
}

export function useParams() {
  const { params } = useRouter();
  return params;
}
