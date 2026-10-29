"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider } from "@/features/auth/auth-provider";
import { FavoritesProvider } from "@/features/favorites/favorites-provider";
import { createQueryClient } from "@/lib/query/client";

function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 5000,
            }}
          />
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export { AppProviders };
