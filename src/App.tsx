import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { MobileDetector } from "@/components/MobileDetector";
import { MobileTouchHandler } from "@/components/MobileTouchHandler";
import { Loader2 } from "lucide-react";

// Lightweight loading component
const LoadingFallback = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

// Lazy load pages to reduce initial bundle size
const Auth = lazy(() => import("./pages/Auth"));
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Admin = lazy(() => import("./pages/Admin"));
const Install = lazy(() => import("./pages/Install"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback message="Authenticating..." />;
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <MobileDetector>
          <MobileTouchHandler>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={
                  <Suspense fallback={<LoadingFallback message="Loading sign in..." />}>
                    <Auth />
                  </Suspense>
                } />
                <Route path="/landing" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Landing />
                  </Suspense>
                } />
                <Route path="/install" element={
                  <Suspense fallback={<LoadingFallback message="Loading installation..." />}>
                    <Install />
                  </Suspense>
                } />
                <Route path="/app" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
                      <Index />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading admin panel..." />}>
                      <Admin />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/subscription" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading subscription..." />}>
                      <Subscription />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
                      <Settings />
                    </Suspense>
                  </ProtectedRoute>
                } />
                <Route path="/" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Landing />
                  </Suspense>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <Suspense fallback={<LoadingFallback message="Loading page..." />}>
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
