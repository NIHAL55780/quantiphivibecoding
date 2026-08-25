import './StatusToggle.css';

export default function StatusToggle({ status, serviceName, disabled, onChange }) {
  const isActive = status === 'Active';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={disabled}
      className={`toggle${isActive ? ' toggle--on' : ''}`}
      onClick={() => onChange(isActive ? 'Paused' : 'Active')}
    >
      <span className="visually-hidden">
        {isActive ? `Pause ${serviceName}` : `Resume ${serviceName}`}
      </span>
      <span className="toggle__knob" />
    </button>
  );
}
