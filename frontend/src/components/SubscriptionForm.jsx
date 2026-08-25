import { useState } from 'react';

import { AlertIcon, PlusIcon } from './icons.jsx';

import './SubscriptionForm.css';

const BILLING_CYCLES = ['Monthly', 'Yearly'];

// The app tracks a single currency, so this is fixed rather than user-selectable.
const SUPPORTED_CURRENCY = 'INR';

const EMPTY_FORM = {
  serviceName: '',
  cost: '',
  billingCycle: 'Monthly',
  nextRenewalDate: '',
};

/**
 * Mirrors the backend rules to give immediate feedback. The server re-validates
 * everything, so this is a convenience layer rather than the source of truth.
 */
function validate(values) {
  const errors = {};

  if (!values.serviceName.trim()) {
    errors.serviceName = 'Service name is required';
  }

  if (values.cost === '') {
    errors.cost = 'Cost is required';
  } else if (!Number.isFinite(Number(values.cost))) {
    errors.cost = 'Cost must be a valid number';
  } else if (Number(values.cost) <= 0) {
    errors.cost = 'Cost must be greater than 0';
  }

  if (!values.nextRenewalDate) {
    errors.nextRenewalDate = 'Next renewal date is required';
  }

  return errors;
}

function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
        <span className="field__required" aria-hidden="true">
          *
        </span>
      </label>

      {children}

      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default function SubscriptionForm({ onAdd }) {
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSubmitError(null);
  }

  function controlProps(name, extraClassName = '') {
    return {
      id: name,
      name,
      value: values[name],
      disabled: isSubmitting,
      className: `field__control${errors[name] ? ' field__control--invalid' : ''}${extraClassName}`,
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `${name}-error` : undefined,
      onChange: (event) => updateField(name, event.target.value),
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onAdd({
        serviceName: values.serviceName.trim(),
        cost: Number(values.cost),
        currency: SUPPORTED_CURRENCY,
        billingCycle: values.billingCycle,
        nextRenewalDate: values.nextRenewalDate,
      });

      setValues(EMPTY_FORM);
      setErrors({});
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card subscription-form">
      <header className="subscription-form__header">
        <h2 className="subscription-form__title">Add a Subscription</h2>
        <p className="subscription-form__subtitle">
          Record a recurring service to include it in your monthly burn rate.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className="subscription-form__grid">
          <Field id="serviceName" label="Service Name" error={errors.serviceName}>
            <input
              type="text"
              placeholder="e.g. Netflix"
              autoComplete="off"
              maxLength={100}
              {...controlProps('serviceName')}
            />
          </Field>

          <Field id="cost" label="Cost" error={errors.cost}>
            <input
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="e.g. 649"
              {...controlProps('cost')}
            />
          </Field>

          <Field id="currency" label="Currency">
            <input
              id="currency"
              name="currency"
              type="text"
              className="field__control"
              value={SUPPORTED_CURRENCY}
              readOnly
              aria-describedby="currency-hint"
            />
            <span className="field__hint" id="currency-hint">
              All amounts are tracked in {SUPPORTED_CURRENCY}
            </span>
          </Field>

          <Field id="billingCycle" label="Billing Cycle" error={errors.billingCycle}>
            <select {...controlProps('billingCycle')}>
              {BILLING_CYCLES.map((cycle) => (
                <option key={cycle} value={cycle}>
                  {cycle}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="nextRenewalDate"
            label="Next Renewal Date"
            error={errors.nextRenewalDate}
          >
            <input type="date" {...controlProps('nextRenewalDate')} />
          </Field>
        </div>

        {submitError && (
          <div className="alert alert--error subscription-form__form-error" role="alert">
            <AlertIcon />
            <span>{submitError}</span>
          </div>
        )}

        <div className="subscription-form__footer">
          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? (
              'Adding…'
            ) : (
              <>
                <PlusIcon />
                Add Subscription
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
