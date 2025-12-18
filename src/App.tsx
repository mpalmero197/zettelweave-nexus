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
import { CosmicBackground } from "@/components/CosmicBackground";
import { CookieConsent } from "@/components/CookieConsent";
import { Loader2 } from "lucide-react";

// Initialize performance preferences from localStorage on load
const initPerformancePreferences = () => {
  const lowPowerMode = localStorage.getItem('theme-low-power-mode') === 'true';
  const animationsEnabled = localStorage.getItem('theme-animations-enabled') !== 'false';
  const respectOSPreference = localStorage.getItem('theme-animations-respect-os') !== 'false';
  const osReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reducedBlur = localStorage.getItem('theme-reduced-blur') === 'true';
  const simplifiedTransitions = localStorage.getItem('theme-simplified-transitions') === 'true';
  
  // Low power mode overrides individual settings
  const shouldDisableAnimations = lowPowerMode || !animationsEnabled || (respectOSPreference && osReducedMotion);
  const shouldReduceBlur = lowPowerMode || reducedBlur;
  const shouldSimplifyTransitions = lowPowerMode || simplifiedTransitions;
  
  if (shouldDisableAnimations) {
    document.documentElement.classList.add('no-theme-animations');
  }
  
  if (shouldReduceBlur) {
    document.documentElement.classList.add('reduced-blur');
  }
  
  if (shouldSimplifyTransitions) {
    document.documentElement.classList.add('simplified-transitions');
  }
};
initPerformancePreferences();

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
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));

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
            <CosmicBackground />
            <Toaster />
            <Sonner />
            <CookieConsent />
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
                <Route path="/terms" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <TermsOfService />
                  </Suspense>
                } />
                <Route path="/privacy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <PrivacyPolicy />
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
