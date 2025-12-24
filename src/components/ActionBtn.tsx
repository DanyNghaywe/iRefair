import Link from "next/link";
import React from "react";

import moduleStyles from "./ActionBtn.module.css";

type Variant = "primary" | "ghost";
type Size = "md" | "sm";

type BaseProps = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  title?: string;
  "aria-label"?: string;
  "data-no-row-click"?: string | boolean;
};

type ButtonProps = BaseProps & {
  as?: "button";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
};

type LinkProps = BaseProps & {
  as: "link";
  href: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

function toBtnClass(variant: Variant, size: Size, disabled: boolean | undefined, className?: string) {
  // Using CSS modules for component styles
  const variantClass = variant === "ghost" ? moduleStyles.ghost : moduleStyles.primary;
  const sizeClass = size === "sm" ? moduleStyles.sm : "";
  const disabledClass = disabled ? moduleStyles.disabled : "";
  return cx(moduleStyles.btn, variantClass, sizeClass, disabledClass, className);
}

export function ActionBtn(props: ButtonProps | LinkProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";

  if (props.as === "link") {
    const { href, target, rel, disabled, onClick, children, ...rest } = props;
    const sharedClass = toBtnClass(variant, size, disabled, props.className);
    if ("as" in rest) {
      delete (rest as { as?: unknown }).as;
    }

    if (disabled) {
      return (
        <span className={sharedClass} aria-disabled="true" {...rest}>
          {children}
        </span>
      );
    }

    return (
      <Link className={sharedClass} href={href} target={target} rel={rel} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  const { onClick, type, disabled, children, ...rest } = props;
  const sharedClass = toBtnClass(variant, size, disabled, props.className);

  return (
    <button
      type={type ?? "button"}
      className={sharedClass}
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled ? true : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
