"use client";

import type { HTMLAttributes } from "react";

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "text" | "circular" | "rectangular" | "rounded";
  width?: string | number;
  height?: string | number;
  animation?: boolean;
};

export function Skeleton({
  variant = "rectangular",
  width,
  height,
  animation = true,
  className = "",
  ...props
}: SkeletonProps) {
  const baseClasses = "ep-skeleton";
  const variantClasses = {
    text: "ep-skeleton--text",
    circular: "ep-skeleton--circular",
    rectangular: "ep-skeleton--rectangular",
    rounded: "ep-skeleton--rounded",
  };

  const style = {
    width: width || (variant === "circular" ? height : "100%"),
    height: height || (variant === "text" ? "1em" : "100%"),
    ...props.style,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animation ? "ep-skeleton--animate" : ""} ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 1,
  width,
  animation = true,
  className = "",
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={`ep-skeleton-text ${className}`} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={width || (index === lines - 1 ? "75%" : "100%")}
          animation={animation}
          style={{ marginBottom: index < lines - 1 ? "8px" : undefined }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  animation = true,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { animation?: boolean }) {
  return (
    <div className={`ep-skeleton-card ${className}`} {...props}>
      <Skeleton variant="rounded" height={120} animation={animation} />
      <div className="ep-skeleton-card__content">
        <Skeleton variant="text" width="60%" animation={animation} />
        <SkeletonText lines={2} animation={animation} />
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 3,
  animation = true,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { items?: number; animation?: boolean }) {
  return (
    <div className={`ep-skeleton-list ${className}`} {...props}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} animation={animation} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 40,
  animation = true,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: number; animation?: boolean }) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      animation={animation}
      className={`ep-skeleton-avatar ${className}`}
      {...props}
    />
  );
}

export function SkeletonButton({
  animation = true,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { animation?: boolean }) {
  return (
    <Skeleton
      variant="rounded"
      height={40}
      animation={animation}
      className={`ep-skeleton-button ${className}`}
      {...props}
    />
  );
}

export function LoadingPlaceholder({
  message = "Loading...",
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { message?: string }) {
  return (
    <div
      className={`ep-loading-placeholder ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
      {...props}
    >
      <div className="ep-loading-placeholder__spinner" />
      <p className="ep-loading-placeholder__message">{message}</p>
    </div>
  );
}
