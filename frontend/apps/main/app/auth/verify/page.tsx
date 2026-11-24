"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./otp-styles.module.css";

export default function VerifyPage() {
  const [digits, setDigits] = useState<string[]>(Array(4).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const inputStageRef = useRef<HTMLDivElement | null>(null);
  const orbitLayerRef = useRef<HTMLDivElement | null>(null);
  const orbitRingRef = useRef<HTMLDivElement | null>(null);
  const loadingWrapRef = useRef<HTMLDivElement | null>(null);
  const loadingPercentRef = useRef<HTMLDivElement | null>(null);
  const successWrapRef = useRef<HTMLDivElement | null>(null);
  const errorMsgRef = useRef<HTMLDivElement | null>(null);
  const resendBtnRef = useRef<HTMLButtonElement | null>(null);

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

  // Pointer light effect
  useEffect(() => {
    const pointerLight = document.getElementById('pointerLight');
    if (!pointerLight) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      pointerLight.style.opacity = '1';
      pointerLight.style.left = `${e.clientX}px`;
      pointerLight.style.top = `${e.clientY}px`;
    };

    const handleMouseLeave = () => {
      pointerLight.style.opacity = '0';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Build orbit animation
  useEffect(() => {
    if (!orbitRingRef.current || !inputStageRef.current) return;

    const buildOrbit = () => {
      const orbitRing = orbitRingRef.current;
      if (!orbitRing) return;
      
      orbitRing.innerHTML = '';
      const radius = 70;
      const currentDigits = digits;

      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;

        const node = document.createElement('div');
        node.className = styles.orbitNode;
        node.textContent = currentDigits[i] || '';
        node.style.setProperty('--dx', `${dx}px`);
        node.style.setProperty('--dy', `${dy}px`);
        node.style.animationDelay = `${i * 60}ms`;
        orbitRing.appendChild(node);
      }
    };

    const playOrbit = () => {
      buildOrbit();
      if (orbitLayerRef.current) {
        orbitLayerRef.current?.classList.add(styles.active);
      }
      if (orbitRingRef.current) {
        void orbitRingRef.current?.offsetWidth;
        orbitRingRef.current?.classList.add(styles.spin);
      }
      document.querySelectorAll(`.${styles.orbitNode}`).forEach((n: Element) => {
        (n as HTMLElement).classList.add(styles.nodeFly);
      });
    };

    // Trigger orbit when loading starts
    if (isLoading) {
      if (inputStageRef.current) {
        inputStageRef.current?.classList.add(styles.hidden);
      }
      playOrbit();

      const orbitTotal = 1600 + 180;
      const orbitTimer = setTimeout(() => {
        if (orbitLayerRef.current) {
          orbitLayerRef.current?.classList.remove(styles.active);
        }
        if (orbitRingRef.current) {
          orbitRingRef.current?.classList.remove(styles.spin);
          orbitRingRef.current.innerHTML = '';
        }
        if (inputStageRef.current) {
          inputStageRef.current.style.display = 'none';
        }

        if (titleRef.current) {
          titleRef.current.textContent = 'Verifying...';
        }
        if (subtitleRef.current) {
          subtitleRef.current.textContent = 'Securely checking your credentials.';
        }
        if (loadingWrapRef.current) {
          loadingWrapRef.current?.classList.add(styles.active);
        }

        const start = performance.now();
        function tick(now: number) {
          const p = Math.min((now - start) / 2000, 1);
          const eased = 1 - Math.pow(1 - p, 2.2);
          if (loadingPercentRef.current) {
            loadingPercentRef.current.textContent = Math.round(eased * 100).toString();
          }
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);

        // Simulate verification result
        setTimeout(() => {
          const code = digits.join("");
          if (code === "1234") {
            handleSuccess();
          } else {
            handleError();
          }
        }, 2000);
      }, orbitTotal);

      return () => clearTimeout(orbitTimer);
    }
  }, [isLoading, digits]);

  // Handle success
  useEffect(() => {
    if (!isSuccess) return;

    if (loadingWrapRef.current) {
      loadingWrapRef.current?.classList.remove(styles.active);
    }
    
    // Spawn confetti/bubbles
    spawnSplash();
    
    if (successWrapRef.current) {
      successWrapRef.current?.classList.add(styles.active);
    }
    if (cardRef.current) {
      cardRef.current?.classList.add(styles.successTint);
    }

    setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.textContent = 'Access Granted';
      }
      if (subtitleRef.current) {
        subtitleRef.current.textContent = 'Welcome back. Redirecting to your vault...';
      }
    }, 250);

    if (resendBtnRef.current) {
      resendBtnRef.current.style.display = 'none';
    }

    // Redirect after success animation
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  }, [isSuccess]);

  // Handle error
  useEffect(() => {
    if (!isError) return;

    if (loadingWrapRef.current) {
      loadingWrapRef.current?.classList.remove(styles.active);
    }
    if (cardRef.current) {
      cardRef.current?.classList.add(styles.shake);
    }
    if (errorMsgRef.current) {
      errorMsgRef.current?.classList.add(styles.show);
    }
    if (titleRef.current) {
      titleRef.current.textContent = 'Verification Failed';
    }
    if (subtitleRef.current) {
      subtitleRef.current.textContent = 'The code you entered is incorrect.';
    }

    const shakeTimer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current?.classList.remove(styles.shake);
      }
    }, 500);

    const resetTimer = setTimeout(() => {
      if (isError) {
        resetState(false);
      }
    }, 2000);

    return () => {
      clearTimeout(shakeTimer);
      clearTimeout(resetTimer);
    };
  }, [isError]);

  const spawnSplash = () => {
    if (!successWrapRef.current) return;
    
    successWrapRef.current?.querySelectorAll(`.${styles.confetti}`).forEach((c: Element) => {
      c.remove();
    });

    const colors = ['#10b981', '#34d399', '#6ee7b7', '#6366f1', '#a78bfa', '#fbbf24', '#f472b6', '#22d3ee'];
    const count = 24;
    const baseDist = 90;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dist = baseDist + Math.random() * 70;
      const cx = Math.cos(angle) * dist;
      const cy = Math.sin(angle) * dist;

      const dot = document.createElement('div');
      dot.className = styles.confetti;
      dot.style.background = colors[i % colors.length];
      dot.style.setProperty('--cx', `${cx}px`);
      dot.style.setProperty('--cy', `${cy}px`);
      dot.style.animationDelay = `${0.1 + Math.random() * 0.15}s`;
      dot.style.boxShadow = `0 0 12px ${colors[i % colors.length]}`;

      const size = 6 + Math.random() * 10;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      if (i % 4 === 0) dot.style.borderRadius = '2px';
      else if (i % 4 === 1) dot.style.borderRadius = '50% 0 50% 0';
      else dot.style.borderRadius = '50%';

      successWrapRef.current?.appendChild(dot);
    }
  };

  const resetState = (immediateFocus: boolean = true) => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
    setDigits(Array(4).fill(""));

    if (cardRef.current) {
      cardRef.current?.classList.remove(styles.shake, styles.successTint);
    }
    if (errorMsgRef.current) {
      errorMsgRef.current?.classList.remove(styles.show);
    }
    if (titleRef.current) {
      titleRef.current.textContent = 'Enter Access Code';
    }
    if (subtitleRef.current) {
      subtitleRef.current.textContent = 'A 4-digit code has been sent to your device.';
    }

    if (orbitLayerRef.current) {
      orbitLayerRef.current?.classList.remove(styles.active);
    }
    if (orbitRingRef.current) {
      orbitRingRef.current?.classList.remove(styles.spin);
      orbitRingRef.current.innerHTML = '';
    }

    if (loadingWrapRef.current) {
      loadingWrapRef.current?.classList.remove(styles.active);
    }
    if (loadingPercentRef.current) {
      loadingPercentRef.current.textContent = '0';
    }

    if (successWrapRef.current) {
      successWrapRef.current?.classList.remove(styles.active);
      successWrapRef.current?.querySelectorAll(`.${styles.confetti}`).forEach((c: Element) => {
        c.remove();
      });
      successWrapRef.current?.querySelectorAll(`.${styles.bubble}, .${styles.successFlash}`).forEach((el: Element) => {
        (el as HTMLElement).style.animation = 'none';
        void (el as HTMLElement).offsetWidth;
        (el as HTMLElement).style.animation = '';
      });
    }

    if (inputStageRef.current) {
      inputStageRef.current.style.display = 'flex';
      void inputStageRef.current?.offsetWidth;
      inputStageRef.current?.classList.remove(styles.hidden);
    }

    if (resendBtnRef.current) {
      resendBtnRef.current.style.display = 'inline-block';
    }

    if (immediateFocus !== false) {
      inputRefs.current[0]?.focus();
    }
  };

  const handleSuccess = () => {
    setIsLoading(false);
    setIsSuccess(true);
    setIsError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(true);
  };

  const handleDigitChange = (index: number, value: string) => {
    if (isLoading || isSuccess) return;
    if (isError) resetState(true);

    const cleanValue = value.replace(/[^0-9]/g, '').slice(-1);
    if (!cleanValue) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanValue;
    setDigits(newDigits);

    // Auto-focus next input
    if (index < 3 && cleanValue) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    if (newDigits.every((d) => d) && newDigits.join("").length === 4) {
      setIsLoading(true);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      if (isError) resetState(true);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isLoading || isSuccess || isError) return;
    
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
    if (pastedData) {
      const newDigits = pastedData.split("").concat(Array(4 - pastedData.length).fill(""));
      setDigits(newDigits.slice(0, 4));
      inputRefs.current[Math.min(pastedData.length, 3)]?.focus();
      if (newDigits.join("").length === 4) {
        setIsLoading(true);
      }
    }
  };

  const handleResend = () => {
    if (!canResend || isLoading) return;
    setCountdown(45);
    setCanResend(false);
    resetState(true);
  };

  return (
    <div className={styles.container}>
      {/* Background elements */}
      <div className={styles.pointerLight} id="pointerLight"></div>
      <div className={styles.noise}></div>

      {/* Main card */}
      <main className={styles.card} id="card" ref={cardRef}>
        <h1 className={styles.title} id="title" ref={titleRef}>Enter Access Code</h1>
        <p className={styles.subtitle} id="subtitle" ref={subtitleRef}>
          A 4-digit code has been sent to your device.
        </p>

        <div className={styles.stage} id="stage">
          {/* OTP Inputs */}
          <div className={styles.inputStage} id="inputStage" ref={inputStageRef}>
            {Array.from({ length: 4 }, (_, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                className={`${styles.inputPill} ${digits[index] ? styles.filled : ''} ${isError ? styles.error : ''}`}
                maxLength={1}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Digit ${index + 1}`}
                data-index={index}
                value={digits[index]}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => {
                  if (isError) resetState(true);
                  e.target.select();
                }}
                disabled={isLoading || isSuccess}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Orbit layer (visual effect) */}
          <div className={styles.orbitLayer} id="orbitLayer" ref={orbitLayerRef}>
            <div className={styles.orbitRing} id="orbitRing" ref={orbitRingRef}></div>
          </div>

          {/* Loading animation */}
          <div className={styles.loadingWrap} id="loadingWrap" ref={loadingWrapRef}>
            <div className={styles.loadingCore}>
              <div className={styles.loadingRing}></div>
              <div className={styles.loadingPulse}></div>
              <div className={styles.loadingInner} id="loadingPercent" ref={loadingPercentRef}>
                0
              </div>
            </div>
          </div>

          {/* Success animation */}
          <div className={styles.successWrap} id="successWrap" ref={successWrapRef}>
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
        </div>

        {/* Error message */}
        <div className={styles.errorMsg} id="errorMsg" ref={errorMsgRef}>
          Incorrect code. Please try again.
        </div>

        {/* Resend button */}
        <button
          className={styles.resendBtn}
          id="resendBtn"
          ref={resendBtnRef}
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
    </div>
  );
}
