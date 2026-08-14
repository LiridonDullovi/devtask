import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { CaptureApp } from "./CaptureApp";
import { getErrorMessage } from "./lib/errors";
import { initTheme } from "./lib/theme";
import { toastError } from "./store/toast";
import "./index.css";

initTheme();

function handleError(error: unknown) {
  toastError(getErrorMessage(error));
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleError }),
  mutationCache: new MutationCache({ onError: handleError }),
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
      refetchOnMount: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CaptureApp />
    </QueryClientProvider>
  </React.StrictMode>,
);
