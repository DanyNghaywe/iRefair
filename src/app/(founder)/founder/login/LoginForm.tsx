"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ActionBtn } from "@/components/ActionBtn";
import { useLanguage } from "@/components/LanguageProvider";
import { useNavigationLoader } from "@/components/NavigationLoader";

const translations = {
  en: {
    emailRequired: "Please enter your email.",
    emailInvalid: "Enter a valid email address.",
    passwordRequired: "Please enter your password.",
    signInError: "Unable to sign in. Please check your details.",
    signInErrorGeneric: "Unable to sign in right now. Please try again.",
    signingIn: "Signing you in...",
    signingInBtn: "Signing in...",
    logIn: "Log in",
    backToHome: "Back to home",
    emailLabel: "Email",
    passwordLabel: "Password",
  },
  fr: {
    emailRequired: "Veuillez entrer votre courriel.",
    emailInvalid: "Entrez une adresse courriel valide.",
    passwordRequired: "Veuillez entrer votre mot de passe.",
    signInError: "Connexion impossible. Veuillez v\u00e9rifier vos informations.",
    signInErrorGeneric: "Connexion impossible pour le moment. Veuillez r\u00e9essayer.",
    signingIn: "Connexion en cours...",
    signingInBtn: "Connexion...",
    logIn: "Se connecter",
    backToHome: "Retour \u00e0 l'accueil",
    emailLabel: "Courriel",
    passwordLabel: "Mot de passe",
  },
};

type Status = "idle" | "submitting" | "error";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startNavigation } = useNavigationLoader();
  const { language } = useLanguage();
  const t = translations[language];

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
      nextErrors.email = t.emailRequired;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = t.emailInvalid;
    }

    if (!password.trim()) {
      nextErrors.password = t.passwordRequired;
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
        setBannerMessage(data?.error ?? t.signInError);
        setStatus("error");
        return;
      }

      const next = searchParams.get("next") || "/founder";
      startNavigation(next);
      router.replace(next);
      router.refresh();
    } catch (err) {
      console.error("Founder login failed", err);
      setBannerMessage(t.signInErrorGeneric);
      setStatus("error");
    } finally {
      setStatus((prev) => (prev === "submitting" ? "idle" : prev));
    }
  };

  return (
    <form className="founder-login-form" onSubmit={handleSubmit} noValidate>
      {status === "error" && (
      <div className="founder-login-banner" role="alert">
          {bannerMessage || t.signInError}
        </div>
      )}

      <div className={fieldClass("email")}>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          placeholder=" "
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
        <label htmlFor="email">{t.emailLabel}</label>
        <p className="field-error" id="email-error" role="alert" aria-live="polite">
          {errors.email}
        </p>
      </div>

      <div className={fieldClass("password")}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder=" "
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
        <label htmlFor="password">{t.passwordLabel}</label>
        <p className="field-error" id="password-error" role="alert" aria-live="polite">
          {errors.password}
        </p>
      </div>

      {status === "submitting" ? (
        <div className="founder-login-status" aria-live="polite" role="status">
          <span className="founder-login-status__message">{t.signingIn}</span>
        </div>
      ) : null}

      <div className="founder-login-actions">
        <ActionBtn
          as="button"
          variant="primary"
          type="submit"
          disabled={status === "submitting"}
          className="founder-login-submit founder-login-btn"
          aria-busy={status === "submitting"}
        >
          {status === "submitting" ? t.signingInBtn : t.logIn}
        </ActionBtn>

        <Link
          href="/"
          className="founder-login-back"
          onClick={() => {
            startNavigation("/");
          }}
        >
          {t.backToHome}
        </Link>
      </div>
    </form>
  );
}
