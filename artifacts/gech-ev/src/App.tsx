import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Home } from './pages/Home';
import { BuyTicket } from './pages/BuyTicket';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { MyTickets } from './pages/MyTickets';
import { Profile } from './pages/Profile';
import { AdminPanel } from './pages/Admin';
import NotFound from '@/pages/not-found';
import { AppLayout } from './components/layout/AppLayout';
import { CheckoutProvider } from './contexts/CheckoutContext';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/buy/:campaignId" component={BuyTicket} />
        <Route path="/checkout/:campaignId" component={Checkout} />
        <Route path="/success" component={Success} />
        <Route path="/tickets" component={MyTickets} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={AdminPanel} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CheckoutProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </CheckoutProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
