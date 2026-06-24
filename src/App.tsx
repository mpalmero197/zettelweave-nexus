import { Suspense, lazy, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { MobileDetector } from "@/components/MobileDetector";
import { MobileTouchHandler } from "@/components/MobileTouchHandler";
import { CosmicBackground } from "@/components/CosmicBackground";
import { CookieConsent } from "@/components/CookieConsent";
import { Loader2 } from "lucide-react";
import { MacroCoach } from "@/components/alice/MacroCoach";
import { VaultBridge } from "@/components/alice/VaultBridge";
import { RoutineBuilder } from "@/components/alice/RoutineBuilder";

// Lazy load heavy UI shell components not needed for initial render
const LazyToaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const LazySonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));
const LazyTooltipProvider = lazy(() => import("@/components/ui/tooltip").then(m => ({ default: m.TooltipProvider })));

const DeferredShell = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Defer loading shell components until after first paint
    const id = requestIdleCallback?.(() => setReady(true)) ?? setTimeout(() => setReady(true), 50);
    return () => { if (typeof id === 'number') cancelIdleCallback?.(id) ?? clearTimeout(id); };
  }, []);
  if (!ready) return <>{children}</>;
  return (
    <Suspense fallback={<>{children}</>}>
      <LazyTooltipProvider>
        {children}
        <LazyToaster />
        <LazySonner />
      </LazyTooltipProvider>
    </Suspense>
  );
};

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

const Jarvis = lazy(() => import("./pages/Jarvis"));
const Vault = lazy(() => import("./pages/Vault"));
const Scholar = lazy(() => import("./pages/Scholar"));
const ScholarLesson = lazy(() => import("./pages/ScholarLesson"));
const ScholarSandbox = lazy(() => import("./pages/ScholarSandbox"));
const ScholarAlice = lazy(() => import("./pages/ScholarAlice"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Changelog = lazy(() => import("./pages/Changelog"));
const SharedWithMe = lazy(() => import("./pages/SharedWithMe"));
const Sitemap = lazy(() => import("./pages/Sitemap"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const EditorialPolicy = lazy(() => import("./pages/EditorialPolicy"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const SsoHandoff = lazy(() => import("./pages/SsoHandoff"));
const AliceStandalone = lazy(() => import("./pages/AliceStandalone"));

// Lazy load persistent layout
const AppLayout = lazy(() => import("./components/AppLayout").then(m => ({ default: m.AppLayout })));

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
      <MobileDetector>
        <MobileTouchHandler>
          <DeferredShell>
            <CosmicBackground />
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
                {/* All authenticated pages share the persistent AppLayout */}
                <Route element={
                  <ProtectedRoute>
                    <Suspense fallback={<LoadingFallback message="Loading..." />}>
                      <AppLayout />
                    </Suspense>
                  </ProtectedRoute>
                }>
                  <Route path="/app" element={
                    <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
                      <Index />
                    </Suspense>
                  } />
                  <Route path="/app/:tab" element={
                    <Suspense fallback={<LoadingFallback message="Loading workspace..." />}>
                      <Index />
                    </Suspense>
                  } />
                  <Route path="/admin" element={
                    <Suspense fallback={<LoadingFallback message="Loading admin panel..." />}>
                      <Admin />
                    </Suspense>
                  } />
                  <Route path="/subscription" element={
                    <Suspense fallback={<LoadingFallback message="Loading subscription..." />}>
                      <Subscription />
                    </Suspense>
                  } />
                  <Route path="/settings" element={
                    <Suspense fallback={<LoadingFallback message="Loading settings..." />}>
                      <Settings />
                    </Suspense>
                  } />
                  <Route path="/agents" element={<Navigate to="/alice" replace />} />
                  <Route path="/alice" element={
                    <Suspense fallback={<LoadingFallback message="Waking ALICE..." />}>
                      <Jarvis />
                    </Suspense>
                  } />
                  <Route path="/jarvis" element={<Navigate to="/alice" replace />} />
                  <Route path="/install" element={
                    <Suspense fallback={<LoadingFallback message="Loading installation..." />}>
                      <Install />
                    </Suspense>
                  } />
                  <Route path="/shared" element={
                    <Suspense fallback={<LoadingFallback message="Loading shared items..." />}>
                      <SharedWithMe />
                    </Suspense>
                  } />
                  <Route path="/vault" element={
                    <Suspense fallback={<LoadingFallback message="Opening vault..." />}>
                      <Vault />
                    </Suspense>
                  } />
                  <Route path="/scholar" element={
                    <Suspense fallback={<LoadingFallback message="Loading Scholar..." />}><Scholar /></Suspense>
                  } />
                  <Route path="/scholar/sandbox" element={
                    <Suspense fallback={<LoadingFallback message="Loading sandbox..." />}><ScholarSandbox /></Suspense>
                  } />
                  <Route path="/scholar/alice" element={
                    <Suspense fallback={<LoadingFallback />}><ScholarAlice /></Suspense>
                  } />
                  <Route path="/scholar/lesson/:slug" element={
                    <Suspense fallback={<LoadingFallback message="Opening lesson..." />}><ScholarLesson /></Suspense>
                  } />
                </Route>
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
                <Route path="/changelog" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Changelog />
                  </Suspense>
                } />
                <Route path="/sitemap" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Sitemap />
                  </Suspense>
                } />
                <Route path="/about" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <About />
                  </Suspense>
                } />
                <Route path="/contact" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Contact />
                  </Suspense>
                } />
                <Route path="/editorial-policy" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <EditorialPolicy />
                  </Suspense>
                } />
                <Route path="/unsubscribe" element={
                  <Suspense fallback={<LoadingFallback />}>
                    <Unsubscribe />
                  </Suspense>
                } />
                <Route path="/sso" element={
                  <Suspense fallback={<LoadingFallback message="Signing in from Toolbox..." />}>
                    <SsoHandoff />
                  </Suspense>
                } />
                {/* Standalone ALICE shell — installable as its own PWA, outside AppLayout */}
                <Route path="/alice-app" element={
                  <Suspense fallback={<LoadingFallback message="Waking ALICE..." />}>
                    <AliceStandalone />
                  </Suspense>
                } />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={
                  <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                    <NotFound />
                  </Suspense>
                } />
              </Routes>
              <MacroCoach />
              <VaultBridge />
              <RoutineBuilder />
            </BrowserRouter>
          </DeferredShell>
        </MobileTouchHandler>
      </MobileDetector>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
