import { Router, Route } from "./router/Router.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { AppLayout } from "./components/layout/AppLayout.jsx";
import { HomePage } from "./pages/HomePage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { RegisterPage } from "./pages/RegisterPage.jsx";
import { CatalogPage } from "./pages/CatalogPage.jsx";
import { VehicleDetailPage } from "./pages/VehicleDetailPage.jsx";
import { AdminCatalogPage } from "./pages/AdminCatalogPage.jsx";
import { AdminUsersPage } from "./pages/AdminUsersPage.jsx";
import { RecommendationPage } from "./pages/RecommendationPage.jsx";
import { ComparePage } from "./pages/ComparePage.jsx";
import { FavoritesPage } from "./pages/FavoritesPage.jsx";
import { AiScannerPage } from "./pages/AiScannerPage.jsx";

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider position="top-center">
            <AppLayout>
              <Route path="/" component={HomePage} />
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/vehicles" component={CatalogPage} />
              <Route path="/vehicles/:id" component={VehicleDetailPage} />
              <Route path="/ai-scanner" component={AiScannerPage} />
              <Route path="/recommendations" component={RecommendationPage} />
              <Route path="/compare" component={ComparePage} />
              <Route path="/favorites" component={FavoritesPage} />
              <Route path="/admin" component={AdminCatalogPage} />
              <Route path="/admin/users" component={AdminUsersPage} />
            </AppLayout>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
