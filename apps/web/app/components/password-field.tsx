'use client';

import { useState } from 'react';

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  style?: React.CSSProperties;
};

export function PasswordField({
  value,
  onChange,
  autoComplete,
  required = false,
  minLength,
  style,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative', width: '100%', marginTop: style?.marginTop }}>
      <input
        required={required}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        minLength={minLength}
        value={value}
        onChange={event => onChange(event.target.value)}
        style={{ ...style, marginTop: 0, paddingRight: 76 }}
      />
      <button
        type="button"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible(current => !current)}
        onMouseDown={event => event.preventDefault()}
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          border: 0,
          padding: '6px 2px',
          background: 'transparent',
          color: 'var(--wine)',
          font: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
