"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const items = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#security", label: "Security" },
] as const;

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={"mobile-menu" + (isOpen ? " is-open" : "")}>
      <button
        ref={toggleRef}
        className="menu-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="menu-line" />
        <span className="menu-line" />
      </button>
      <nav
        id="mobile-navigation"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!isOpen}
      >
        {items.map((item) => (
          <a
            className="nav-item"
            href={item.href}
            key={item.href}
            onClick={closeMenu}
          >
            {item.label}
          </a>
        ))}
        <Link className="nav-item" href="/login" onClick={closeMenu}>
          Sign In
        </Link>
        <Link
          className="button button-primary button-small"
          href="/signup"
          onClick={closeMenu}
        >
          Get Started
        </Link>
      </nav>
    </div>
  );
}
