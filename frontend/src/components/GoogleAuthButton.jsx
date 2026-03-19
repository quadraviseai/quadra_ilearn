import { useEffect, useRef, useState } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let googleScriptPromise = null;

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Failed to load Google sign-in."));
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
}

function GoogleAuthButton({ buttonText, onCredential, disabled = false, onUnavailable }) {
  const containerRef = useRef(null);
  const [loadError, setLoadError] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      if (!clientId) {
        setLoadError("Google sign-in is not configured.");
        onUnavailable?.("Google sign-in is not configured.");
      }
      return undefined;
    }

    let active = true;
    setLoadError("");

    loadGoogleScript()
      .then((google) => {
        if (!active || !google?.accounts?.id || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = "";
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          },
        });
        google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: buttonText,
          width: containerRef.current.offsetWidth || 360,
          logo_alignment: "left",
        });

        if (disabled) {
          const iframe = containerRef.current.querySelector("iframe");
          if (iframe) {
            iframe.style.pointerEvents = "none";
            iframe.style.opacity = "0.6";
          }
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setLoadError(error.message);
        onUnavailable?.(error.message);
      });

    return () => {
      active = false;
    };
  }, [buttonText, clientId, disabled, onCredential, onUnavailable]);

  return (
    <div className="auth-google-slot" aria-disabled={disabled}>
      <div ref={containerRef} />
      {loadError ? <small className="auth-google-help">{loadError}</small> : null}
    </div>
  );
}

export default GoogleAuthButton;
