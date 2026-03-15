import { useState } from "react";
import { authApi } from "./utils/authapi";
import { tokenStore } from "./utils/tokenstore";
import { validateFields, isValid } from "./utils/validators";
import { useAsync } from "./hooks/useasync";
import FormField from "./FormField";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginPanel({ onOtp, onSuccess }) {
    const [fields, setFields] = useState({ email: "", password: "" });
    const [fieldErrors, setFieldErrors] = useState({});
    const { run, loading, error } = useAsync();

    const set = (key) => (e) =>
        setFields((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();

        const errors = validateFields(fields);
        setFieldErrors(errors);
        if (!isValid(errors)) return;

        const data = await run(() => authApi.login(fields.email, fields.password));
        if (!data) return;

        if (data.otpRequired) {
            onOtp?.();
            return;
        }

        tokenStore.set(data.token);
        onSuccess?.();
    };

    return (
        <form className="ogm-auth-form" onSubmit={handleSubmit} noValidate>
            <FormField
                type="email"
                placeholder="Email address"
                value={fields.email}
                onChange={set("email")}
                error={fieldErrors.email}
                required
            />

            <FormField
                type="password"
                placeholder="Password"
                value={fields.password}
                onChange={set("password")}
                error={fieldErrors.password}
                required
            />

            {error && (
                <p className="ogm-auth-error" role="alert">
                    {error}
                </p>
            )}

            <div className="ogm-auth-actions">
                <span className="ogm-link" onClick={onOtp} role="button" tabIndex={0}>
                    Login with OTP
                </span>
                <span className="ogm-link" role="button" tabIndex={0}>
                    Forgot password?
                </span>
            </div>

            <button className="ogm-primary-btn" disabled={loading} type="submit">
                {loading ? "Logging in…" : "Login"}
            </button>

            <SocialAuthButtons />
        </form>
    );
}