import { ReactNode } from 'react';
import { LucideIcon, Plus, ArrowRight } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: ReactNode;
  iconClassName?: string;
  hint?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  iconClassName = 'bg-blue-100',
  hint,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center border border-gray-200">
      <div className={`w-16 h-16 ${iconClassName} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <Icon className="w-8 h-8 text-scripps-blue" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>

      {hint && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
          <p className="text-sm text-blue-800">{hint}</p>
        </div>
      )}

      {children}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-6 py-3 bg-white text-scripps-blue border-2 border-scripps-blue rounded-lg hover:bg-blue-50 transition-all font-medium flex items-center justify-center gap-2"
            >
              {secondaryActionLabel}
            </button>
          )}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-6 py-3 bg-gradient-to-r from-scripps-blue to-scripps-light-blue text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface WorkflowStep {
  label: string;
  completed?: boolean;
  current?: boolean;
}

interface EmptyStateWithWorkflowProps extends Omit<EmptyStateProps, 'children'> {
  steps: WorkflowStep[];
}

export function EmptyStateWithWorkflow({
  steps,
  ...props
}: EmptyStateWithWorkflowProps) {
  return (
    <EmptyState {...props}>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 max-w-lg mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium ${
                  step.completed
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : step.current
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}. {step.label}
              </span>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-400 rotate-90 sm:rotate-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </EmptyState>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-scripps-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <Skeleton className="h-48 rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={`h-5 ${i === 0 ? 'w-1/4' : 'flex-1'}`} />
      ))}
    </div>
  );
}
