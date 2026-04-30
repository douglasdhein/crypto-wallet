"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./style.module.css";

type TimePartSelectProps = {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
};

export function TimePartSelect({
  ariaLabel,
  onChange,
  options,
  value,
}: TimePartSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    selectedOptionRef.current?.scrollIntoView({
      block: "nearest",
    });

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span>{value}</span>
        <ChevronDown
          aria-hidden="true"
          className={`${styles.icon} ${isOpen ? styles.iconOpen : ""}`}
        />
      </button>

      {isOpen ? (
        <div className={styles.options} id={listboxId} role="listbox">
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                aria-selected={isSelected}
                className={`${styles.optionButton} ${
                  isSelected ? styles.optionButtonSelected : ""
                }`}
                key={option}
                onClick={() => handleSelect(option)}
                ref={isSelected ? selectedOptionRef : null}
                role="option"
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
