/**
 * FormField.js
 * Accessible input wrapper with inline validation feedback.
 */

export default function FormField({
    type = "text",
    placeholder,
    value,
    onChange,
    error,
    autoFocus,
    maxLength,
    required,
    inputMode,
}) {
    return (
        <div className="ogm-field">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
                maxLength={maxLength}
                required={required}
                inputMode={inputMode}
                aria-invalid={!!error}
                aria-describedby={error ? `${placeholder}-error` : undefined}
                className={error ? "has-error" : ""}
            />
            {error && (
                <span
                    className="ogm-field-error"
                    id={`${placeholder}-error`}
                    role="alert"
                >
                    {error}
                </span>
            )}
        </div>
    );
}