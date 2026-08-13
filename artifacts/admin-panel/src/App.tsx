import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout';
import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import BrandsList from '@/pages/brands/index';
import BrandForm from '@/pages/brands/form';
import TemplatesList from '@/pages/templates/index';
import TemplateForm from '@/pages/templates/form';
import SendNotification from '@/pages/send';
import DeliveryLogs from '@/pages/logs';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/brands" component={BrandsList} />
          <Route path="/brands/new" component={BrandForm} />
          <Route path="/brands/:id/edit" component={BrandForm} />
          <Route path="/templates" component={TemplatesList} />
          <Route path="/templates/new" component={TemplateForm} />
          <Route path="/templates/:id/edit" component={TemplateForm} />
          <Route path="/send" component={SendNotification} />
          <Route path="/logs" component={DeliveryLogs} />
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppLayout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
