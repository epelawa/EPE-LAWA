"use client";

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import styles from "./otp-styles.module.css";

export default function VerifyPage() {
  const [digits, setDigits] = useState<string[]>(Array(4).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus management
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(-1);
    if (!cleanValue) return;
    
    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);
    setIsError(false);

    // Auto-focus next input
    if (index < 3 && cleanValue) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    if (newDigits.every((d) => d) && newDigits.join("").length === 4) {
      handleVerify();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pastedData) {
      const newDigits = pastedData.split("").concat(Array(4 - pastedData.length).fill(""));
      setDigits(newDigits.slice(0, 4));
      inputRefs.current[Math.min(pastedData.length, 3)]?.focus();
      if (newDigits.join("").length === 4) {
        handleVerify();
      }
    }
  };

  const handleVerify = async () => {
    setIsLoading(true);
    setIsError(false);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Check if code is correct (in real app, this would be an API call)
    const code = digits.join("");
    if (code === "1234") { // Demo code
      setIsSuccess(true);
      setTimeout(() => {
        // Redirect to dashboard or home
        window.location.href = "/dashboard";
      }, 2000);
    } else {
      setIsError(true);
      setDigits(Array(4).fill(""));
      inputRefs.current[0]?.focus();
    }
    
    setIsLoading(false);
  };

  const handleResend = () => {
    if (!canResend) return;
    setCountdown(45);
    setCanResend(false);
    // In real app, this would trigger a resend API call
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>EPE LAWA - Verify Your Email</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      {/* Background elements */}
      <div className={styles.pointerLight} id="pointerLight"></div>
      <div className={styles.noise}></div>

      {/* Main card */}
      <main className={styles.card} id="card">
        <h1 className={styles.title} id="title">Enter Access Code</h1>
        <p className={styles.subtitle} id="subtitle">
          A 4-digit code has been sent to your email.
        </p>

        <div className={styles.stage} id="stage">
          {/* OTP Inputs */}
          <div className={styles.inputStage} id="inputStage">
            {Array.from({ length: 4 }, (_, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                className={styles.inputPill}
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Digit ${index + 1}`}
                data-index={index}
                value={digits[index]}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                disabled={isLoading || isSuccess}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Orbit layer (visual effect) */}
          <div className={styles.orbitLayer} id="orbitLayer">
            <div className={styles.orbitRing} id="orbitRing"></div>
          </div>

          {/* Loading animation */}
          {isLoading && (
            <div className={styles.loadingWrap} id="loadingWrap">
              <div className={styles.loadingCore}>
                <div className={styles.loadingRing}></div>
                <div className={styles.loadingPulse}></div>
                <div className={styles.loadingInner} id="loadingPercent">
                  Verifying...
                </div>
              </div>
            </div>
          )}

          {/* Success animation */}
          {isSuccess && (
            <div className={styles.successWrap} id="successWrap">
              <div className={styles.successFlash}></div>
              <div className={styles.bubble}></div>
              <div className={styles.bubble}></div>
              <div className={styles.bubble}></div>
              <div className={styles.successVault}>
                <svg
                  className={styles.checkmark}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className={styles.successBadge}>Verified</div>
            </div>
          )}
        </div>

        {/* Error message */}
        {isError && (
          <div className={styles.errorMsg} id="errorMsg">
            Incorrect code. Please try again.
          </div>
        )}

        {/* Resend button */}
        <button
          className={styles.resendBtn}
          id="resendBtn"
          onClick={handleResend}
          disabled={!canResend || isLoading}
        >
          Didn&apos;t receive it? <span>Resend</span>
        </button>

        {/* Countdown display */}
        {!canResend && countdown > 0 && (
          <p className={styles.countdown}>Resend in {countdown}s</p>
        )}
      </main>

      {/* Add the script for animations */}
      <script dangerouslySetInnerHTML={{
        __html: `
          // Add pointer light follow effect
          document.addEventListener('mousemove', (e) => {
            const pointerLight = document.getElementById('pointerLight');
            if (pointerLight) {
              pointerLight.style.left = e.clientX + 'px';
              pointerLight.style.top = e.clientY + 'px';
              pointerLight.style.opacity = '0.3';
            }
          });
          
          document.addEventListener('mouseleave', () => {
            const pointerLight = document.getElementById('pointerLight');
            if (pointerLight) {
              pointerLight.style.opacity = '0';
            }
          });
        `,
      }} />
    </div>
  );
}
