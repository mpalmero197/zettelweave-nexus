import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { FastLoadingFallback } from "@/components/FastLoadingFallback";
import { MobileDetector } from "@/components/MobileDetector";
import { MobileTouchHandler } from "@/components/MobileTouchHandler";

// Lazy load ALL pages including Auth to reduce initial bundle size dramatically
const Auth = lazy(() => import("./pages/Auth"));
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const Install = lazy(() => import("./pages/Install"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <FastLoadingFallback message="Authenticating..." />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <MobileDetector>
          <MobileTouchHandler>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={
                  <Suspense fallback={<FastLoadingFallback message="Loading sign in..." />}>
                    <Auth />
                  </Suspense>
                } />
                <Route path="/install" element={
                  <Suspense fallback={<FastLoadingFallback message="Loading installation..." />}>
                    <Install />
                  </Suspense>
                } />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Suspense fallback={<FastLoadingFallback message="Loading workspace..." />}>
                      <Index />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Suspense fallback={<FastLoadingFallback message="Loading admin panel..." />}>
                      <Admin />
                    </Suspense>
                  </ProtectedRoute>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <Suspense fallback={<FastLoadingFallback message="Loading page..." />}>
                    <NotFound />
                  </Suspense>
                } />
              </Routes>
            </BrowserRouter>
          </MobileTouchHandler>
        </MobileDetector>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
