import type { ComponentProps } from "react";
import styles from "./style.module.css";

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={joinClassNames(styles.card, className)}
      data-slot="card"
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={joinClassNames(styles.cardHeader, className)}
      data-slot="card-header"
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      className={joinClassNames(styles.cardTitle, className)}
      data-slot="card-title"
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={joinClassNames(styles.cardContent, className)}
      data-slot="card-content"
      {...props}
    />
  );
}
