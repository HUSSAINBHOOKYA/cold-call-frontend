
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { PhoneCall, Mail, Lock, UserRound } from "lucide-react";
import "./Auth.css";

function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });

        if (authError) throw authError;

        if (data.session) {
          onAuthenticated(data.session);
        } else {
          setMessage(
            "Registration successful. Check your email to confirm your account, then sign in."
          );
        }
      } else {
        const { data, error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;

        onAuthenticated(data.session);
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-icon">
          <PhoneCall size={25} />
        </div>

        <div className="auth-eyebrow">MERIDIAN GROWTH PARTNERS</div>
        <h1>Cold Call Assistant</h1>
        <p className="auth-description">
          Sign in to manage your calls and keep track of every conversation.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
          >
            Create account
          </button>

          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <label>
              <span>Your name</span>
              <div className="auth-input-wrap">
                <UserRound size={17} />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter your name"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
          )}

          <label>
            <span>Email address</span>
            <div className="auth-input-wrap">
              <Mail size={17} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-input-wrap">
              <Lock size={17} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={6}
                required
              />
            </div>
          </label>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message" role="status">
              {message}
            </div>
          )}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="auth-footnote">
          Your calls are protected by Supabase authentication and database
          security policies.
        </p>
      </section>
    </main>
  );
}

export default Auth;
