"use client";

import { useMemo } from "react";

type FormProgressProps = {
  fields: Record<string, unknown>;
  requiredFields: string[];
  className?: string;
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md";
};

export function FormProgress({
  fields,
  requiredFields,
  className = "",
  showPercentage = true,
  showLabel = false,
  label = "Form completion",
  size = "md",
}: FormProgressProps) {
  const progress = useMemo(() => {
    if (requiredFields.length === 0) return 100;

    const filledCount = requiredFields.filter((field) => {
      const value = fields[field];
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "boolean") return value;
      return Boolean(value);
    }).length;

    return Math.round((filledCount / requiredFields.length) * 100);
  }, [fields, requiredFields]);

  const isComplete = progress === 100;

  return (
    <div
      className={`form-progress form-progress--${size} ${isComplete ? "form-progress--complete" : ""} ${className}`}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {showLabel && <span className="form-progress__label">{label}</span>}
      <div className="form-progress__track">
        <div
          className="form-progress__bar"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showPercentage && (
        <span className="form-progress__percentage">
          {isComplete ? (
            <span className="form-progress__check" aria-label="Complete">
              <CheckIcon />
            </span>
          ) : (
            `${progress}%`
          )}
        </span>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 7L6 10L11 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Step indicator for multi-step forms
type StepIndicatorProps = {
  steps: { label: string; completed?: boolean }[];
  currentStep: number;
  className?: string;
};

export function StepIndicator({ steps, currentStep, className = "" }: StepIndicatorProps) {
  return (
    <nav className={`step-indicator ${className}`} aria-label="Form progress">
      <ol className="step-indicator__list">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.completed || index < currentStep;
          const stepNumber = index + 1;

          return (
            <li
              key={index}
              className={`step-indicator__item ${isActive ? "is-active" : ""} ${isCompleted ? "is-completed" : ""}`}
            >
              <div className="step-indicator__marker">
                {isCompleted ? (
                  <span className="step-indicator__check">
                    <CheckIcon />
                  </span>
                ) : (
                  <span className="step-indicator__number">{stepNumber}</span>
                )}
              </div>
              <span className="step-indicator__label">{step.label}</span>
              {index < steps.length - 1 && <div className="step-indicator__connector" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
