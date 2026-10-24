"use client";
import type { Locale } from "@ichnara/contracts";
import { Eye, EyeOff } from "lucide-react";
import { type Ref, useId, useState } from "react";
import styles from "./auth.module.css";

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;
// Mirrors what the browser's type="email" accepts closely enough to guide typing; the server decides.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldName = "name" | "email" | "password";
type State = "idle" | "valid" | "invalid";

const text = {
	ar: {
		name: "اسم الحساب",
		email: "البريد الإلكتروني",
		password: "كلمة المرور",
		nameMissing: "اكتب اسمك كما تريد أن يظهر.",
		emailInvalid: "اكتب بريداً صحيحاً، مثل name@example.com",
		emailValid: "بريد صالح",
		passwordHint: "١٠ أحرف على الأقل",
		passwordCount: (n: number) => `${n.toLocaleString("ar-EG")} من ١٠ أحرف`,
		passwordValid: "طول مناسب",
		passwordLong: "١٢٨ حرفاً كحد أقصى",
		show: "إظهار كلمة المرور",
		hide: "إخفاء كلمة المرور",
	},
	en: {
		name: "Account name",
		email: "Email",
		password: "Password",
		nameMissing: "Enter your name as you want it to appear.",
		emailInvalid: "Enter a valid email, like name@example.com",
		emailValid: "Valid email",
		passwordHint: "At least 10 characters",
		passwordCount: (n: number) => `${n} of 10 characters`,
		passwordValid: "Good length",
		passwordLong: "128 characters at most",
		show: "Show password",
		hide: "Hide password",
	},
} as const;

/**
 * Sign-up fields that answer while the person types: the email shape after leaving the field, a
 * live password length count, and the same messages when a submit is refused. The native
 * constraints stay in place, so the form still cannot be sent incomplete.
 */
export function SignupFields({
	locale,
	firstInput,
}: {
	locale: Locale;
	firstInput: Ref<HTMLInputElement>;
}) {
	const t = text[locale];
	const id = useId();
	const [values, setValues] = useState({ name: "", email: "", password: "" });
	const [touched, setTouched] = useState({ name: false, email: false, password: false });
	const [visible, setVisible] = useState(false);
	const touch = (field: FieldName) => setTouched((previous) => ({ ...previous, [field]: true }));
	// Leaving a field untouched is not an error yet; a refused submit (onInvalid) still flags it.
	const leave = (field: FieldName) => {
		if (values[field]) touch(field);
	};
	const change = (field: FieldName, value: string) =>
		setValues((previous) => ({ ...previous, [field]: value }));

	const length = values.password.length;
	const state: Record<FieldName, State> = {
		name: values.name.trim() ? "valid" : touched.name ? "invalid" : "idle",
		email: EMAIL_SHAPE.test(values.email.trim()) ? "valid" : touched.email ? "invalid" : "idle",
		password:
			length >= MIN_PASSWORD && length <= MAX_PASSWORD
				? "valid"
				: length > MAX_PASSWORD || (touched.password && length < MIN_PASSWORD)
					? "invalid"
					: "idle",
	};
	const message: Record<FieldName, string> = {
		name: state.name === "invalid" ? t.nameMissing : "",
		email: state.email === "invalid" ? t.emailInvalid : state.email === "valid" ? t.emailValid : "",
		password:
			length > MAX_PASSWORD
				? t.passwordLong
				: length >= MIN_PASSWORD
					? t.passwordValid
					: length > 0
						? t.passwordCount(length)
						: t.passwordHint,
	};

	const describedBy = (field: FieldName) => `${id}-${field}`;
	const hint = (field: FieldName) =>
		message[field] && (
			<small
				id={describedBy(field)}
				className={styles.hint}
				data-state={state[field]}
				aria-live="polite"
			>
				{message[field]}
			</small>
		);

	return (
		<>
			<label className={`field ${styles.liveField}`} data-state={state.name}>
				<span>{t.name}</span>
				<input
					ref={firstInput}
					name="name"
					dir="auto"
					autoComplete="name"
					required
					maxLength={100}
					value={values.name}
					onChange={(event) => change("name", event.target.value)}
					onBlur={() => leave("name")}
					onInvalid={() => touch("name")}
					aria-invalid={state.name === "invalid"}
					aria-describedby={message.name ? describedBy("name") : undefined}
				/>
				{hint("name")}
			</label>
			<label className={`field ${styles.liveField}`} data-state={state.email}>
				<span>{t.email}</span>
				<input
					name="email"
					type="email"
					dir="ltr"
					autoComplete="email"
					required
					value={values.email}
					onChange={(event) => change("email", event.target.value)}
					onBlur={() => leave("email")}
					onInvalid={() => touch("email")}
					aria-invalid={state.email === "invalid"}
					aria-describedby={message.email ? describedBy("email") : undefined}
				/>
				{hint("email")}
			</label>
			<label className={`field ${styles.liveField}`} data-state={state.password}>
				<span>{t.password}</span>
				{/* Passwords read left to right, so the toggle sits at the field's right edge in both languages. */}
				<span className={styles.passwordBox} dir="ltr">
					<input
						name="password"
						type={visible ? "text" : "password"}
						dir="ltr"
						autoComplete="new-password"
						required
						minLength={MIN_PASSWORD}
						maxLength={MAX_PASSWORD}
						value={values.password}
						onChange={(event) => change("password", event.target.value)}
						onBlur={() => leave("password")}
						onInvalid={() => touch("password")}
						aria-invalid={state.password === "invalid"}
						aria-describedby={describedBy("password")}
					/>
					<button
						type="button"
						className={styles.reveal}
						aria-label={visible ? t.hide : t.show}
						aria-pressed={visible}
						onClick={() => setVisible((value) => !value)}
					>
						{visible ? (
							<EyeOff size={18} aria-hidden="true" />
						) : (
							<Eye size={18} aria-hidden="true" />
						)}
					</button>
				</span>
				{hint("password")}
			</label>
		</>
	);
}
