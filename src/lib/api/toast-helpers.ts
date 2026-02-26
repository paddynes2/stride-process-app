import { toast } from "sonner";

/**
 * Check if an error is a network error (fetch failed, no internet, DNS, etc.)
 * vs a server/application error (HTTP response received but indicates failure).
 */
function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // fetch() throws TypeError for network failures (e.g., "Failed to fetch")
    return true;
  }
  return false;
}

/**
 * Show an error toast with an optional retry button.
 *
 * If the error is a network error, the message is prefixed with a network hint.
 * If a retry function is provided, a "Retry" action button is shown.
 */
export function toastError(
  message: string,
  options?: { retry?: () => void; error?: unknown }
) {
  const isNetwork = options?.error ? isNetworkError(options.error) : false;
  const displayMessage = isNetwork
    ? `Network error — ${message.charAt(0).toLowerCase()}${message.slice(1)}`
    : message;

  if (options?.retry) {
    toast.error(displayMessage, {
      action: {
        label: "Retry",
        onClick: options.retry,
      },
    });
  } else {
    toast.error(displayMessage);
  }
}
