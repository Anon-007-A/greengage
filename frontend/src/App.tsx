import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import LoanDetail from "./pages/LoanDetail";
import Reports from "./pages/Reports";
import Simulator from "./pages/Simulator";
import ErrorBoundary from "./components/ErrorBoundary";
import { PortfolioProvider } from "@/contexts/PortfolioContext";
import { GlobalDataProvider } from "@/context/GlobalDataContext";
import HowItWorks from "./pages/HowItWorks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalDataProvider>
        <PortfolioProvider>
          <ErrorBoundary>
            <RouterProvider
              router={createBrowserRouter([
                { path: "/", element: <Landing /> },
                { path: "/dashboard", element: <Dashboard /> },
                { path: "/loan/:id", element: <LoanDetail /> },
                { path: "/reports", element: <Reports /> },
                { path: "/simulator", element: <Simulator /> },
                { path: "/how-it-works", element: <HowItWorks /> },
                { path: "*", element: <NotFound /> },
              ])}
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            />
          </ErrorBoundary>
        </PortfolioProvider>
      </GlobalDataProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
