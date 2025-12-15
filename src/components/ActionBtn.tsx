import Link from "next/link";
import React from "react";

type Variant = "primary" | "ghost";
type Size = "md" | "sm";

type BaseProps = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  "aria-label"?: string;
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

function toBtnClass(variant: Variant, size: Size, className?: string) {
  const v = variant === "ghost" ? "ghost" : "primary";
  const s = size === "sm" ? "btn-sm" : "";
  return cx("btn", v, s, className);
}

export function ActionBtn(props: ButtonProps | LinkProps) {
  const variant = props.variant ?? "primary";
  const size = props.size ?? "md";

  const sharedClass = toBtnClass(variant, size, props.className);

  if (props.as === "link") {
    const { href, target, rel, disabled, onClick, children, ...rest } = props;

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
