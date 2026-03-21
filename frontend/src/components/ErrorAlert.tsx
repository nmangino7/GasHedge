"use client";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorAlertProps {
  title?: string;
  message: string;
  suggestion?: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ title = "Error", message, suggestion, onRetry }: ErrorAlertProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-800">{title}</p>
          <p className="text-sm text-red-700 mt-1 break-words">{message}</p>
          {suggestion && (
            <p className="text-xs text-red-600 mt-2">{suggestion}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
