import type { ComponentProps } from 'react';
import styles from './style.module.css';

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className={styles.tableContainer} data-slot="table-container">
      <table
        className={joinClassNames(styles.table, className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: ComponentProps<'thead'>) {
  return (
    <thead
      className={joinClassNames(styles.tableHeader, className)}
      data-slot="table-header"
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentProps<'tbody'>) {
  return (
    <tbody
      className={joinClassNames(styles.tableBody, className)}
      data-slot="table-body"
      {...props}
    />
  );
}

export function TableFooter({
  className,
  ...props
}: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      className={joinClassNames(styles.tableFooter, className)}
      data-slot="table-footer"
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={joinClassNames(styles.tableRow, className)}
      data-slot="table-row"
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      className={joinClassNames(styles.tableHead, className)}
      data-slot="table-head"
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td
      className={joinClassNames(styles.tableCell, className)}
      data-slot="table-cell"
      {...props}
    />
  );
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<'caption'>) {
  return (
    <caption
      className={joinClassNames(styles.tableCaption, className)}
      data-slot="table-caption"
      {...props}
    />
  );
}
