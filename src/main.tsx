import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastContainer } from "./components/Toast";
import { getErrorMessage } from "./lib/errors";
import { initTheme } from "./lib/theme";
import { toastError } from "./store/toast";
import { subscribeToSystemTheme } from "./store/theme";
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
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Root() {
  useEffect(() => subscribeToSystemTheme(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <App />
      <ToastContainer />
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
