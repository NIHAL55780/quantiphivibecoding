import { AlertIcon } from './icons.jsx';

/**
 * `renewingSoon` is decided by the backend; this component only renders it.
 */
export default function RenewalBadge({ renewingSoon }) {
  if (!renewingSoon) {
    return <span className="subscription-table__placeholder">—</span>;
  }

  return (
    <span className="badge badge--amber">
      <AlertIcon width={13} height={13} />
      Renewing Soon
    </span>
  );
}
