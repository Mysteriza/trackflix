import { Watchlist } from '@/components/dashboard/watchlist';
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Welcome to Your Watchlist
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Easily add, track, and manage all the movies and series you want to watch.
        </p>
      </div>
      <Suspense>
        <Watchlist />
      </Suspense>
    </div>
  );
}
