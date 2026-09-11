import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  } catch {
    return dateString;
  }
}

export function calculateSlaStatus(deadlineString: string): {
  isBreached: boolean;
  timeLeft: string;
  badgeClass: string;
} {
  try {
    const deadline = new Date(deadlineString).getTime();
    const now = new Date().getTime();
    const diffMs = deadline - now;

    if (diffMs <= 0) {
      const breachedMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
      return {
        isBreached: true,
        timeLeft: `Breached by ${breachedMinutes > 60 ? Math.floor(breachedMinutes / 60) + 'h' : breachedMinutes + 'm'}`,
        badgeClass: "bg-red-500/15 text-red-400 border-red-500/30",
      };
    }

    const minutesLeft = Math.floor(diffMs / (1000 * 60));
    if (minutesLeft < 60) {
      return {
        isBreached: false,
        timeLeft: `${minutesLeft}m left`,
        badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
      };
    }

    const hoursLeft = Math.floor(minutesLeft / 60);
    return {
      isBreached: false,
      timeLeft: `${hoursLeft}h left`,
      badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    };
  } catch {
    return {
      isBreached: false,
      timeLeft: "N/A",
      badgeClass: "bg-slate-500/15 text-slate-400 border-slate-500/30",
    };
  }
}
