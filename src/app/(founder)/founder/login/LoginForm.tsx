"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useNavigationLoader } from "@/components/NavigationLoader";

type Status = "idle" | "submitting" | "error";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationLoader();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [bannerMessage, setBannerMessage] = useState("");

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const fieldClass = (name: string) => `founder-login-field ${errors[name] ? "has-error" : ""}`.trim();

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!email.trim()) {
      nextErrors.email = "Please enter your email.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Please enter your password.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBannerMessage("");
    setStatus("idle");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const response = await fetch("/api/founder/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setBannerMessage(data?.error ?? "Unable to sign in. Please check your details.");
        setStatus("error");
        return;
      }

      const next = searchParams.get("next") || "/founder";
      startNavigation(next);
      router.replace(next);
      router.refresh();
    } catch (err) {
      console.error("Founder login failed", err);
      setBannerMessage("Unable to sign in right now. Please try again.");
      setStatus("error");
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  };

  return (
    <form className="founder-login-form" onSubmit={handleSubmit} noValidate>
      {status === "error" && (
      <div className="founder-login-banner" role="alert">
          {bannerMessage || "Unable to sign in. Please check your details."}
        </div>
      )}

      <div className={`founderField ${fieldClass("email")}`}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder=""
          value={email}
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-error"
          onChange={(event) => {
            setEmail(event.target.value);
            clearError("email");
          }}
          disabled={status === "submitting"}
          required
        />
        <p className="field-error" id="email-error" role="alert" aria-live="polite">
          {errors.email}
        </p>
      </div>

      <div className={`founderField ${fieldClass("password")}`}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder=""
          value={password}
          aria-invalid={Boolean(errors.password)}
          aria-describedby="password-error"
          onChange={(event) => {
            setPassword(event.target.value);
            clearError("password");
          }}
          disabled={status === "submitting"}
          required
        />
        <p className="field-error" id="password-error" role="alert" aria-live="polite">
          {errors.password}
        </p>
      </div>

      {status === "submitting" ? (
        <div className="founder-login-status" aria-live="polite" role="status">
          <span className="founder-login-status__message">Signing you in...</span>
        </div>
      ) : null}

      <div className="founder-login-actions">
        <ActionBtn
          as="button"
          variant="primary"
          type="submit"
          disabled={status === "submitting"}
          className="founder-login-submit founderLoginBtn"
          aria-busy={status === "submitting"}
        >
          {status === "submitting" ? "Signing in..." : "Log in"}
        </ActionBtn>

        <Link
          href="/"
          className="founder-login-back"
          onClick={() => {
            startNavigation("/");
          }}
        >
          Back to home
        </Link>
      </div>
    </form>
  );
}
