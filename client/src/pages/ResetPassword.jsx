import { useState, useEffect } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../apis/api";
import Logo from "../components/Logo";

export default function ResetPasswordPage() {
  const [validated, setValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid or missing reset token");
    }
  }, [token]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setValidated(true);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setValidated(true);
      return;
    }

    if (!token) {
      setError("Invalid or missing reset token");
      return;
    }

    setValidated(true);
    setIsLoading(true);
    setError(null);

    try {
      await api.post("/auth/reset-password", { token, password: formData.password });
      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError.response?.data?.message || "Invalid or expired reset token. Please request a new one.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="auth-page">
        <section className="auth-hero">
          <div className="auth-hero__content">
          <Logo />
          </div>
        </section>
        <section className="auth-panel">
          <Card className="auth-card">
            <Card.Body className="auth-card__body">
              <div className="auth-heading">
                <h2>Invalid Reset Link</h2>
                <p>This password reset link is invalid or has expired.</p>
              </div>
              <Alert variant="danger" className="mt-4">
                {error || "Please request a new password reset link."}
              </Alert>
              <Link to="/forgot-password" className="btn btn-primary w-100 mt-3">
                Request New Link
              </Link>
            </Card.Body>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero__content">
          <Logo />
          <div className="auth-kicker">RestroVibe</div>
          <h1>Set new password</h1>
          <p>Your new password must be different from previously used passwords.</p>
        </div>
      </section>

      <section className="auth-panel">
        <Card className="auth-card">
          <Card.Body className="auth-card__body">
            <div className="auth-heading">
              <h2>Reset Password</h2>
              <p>Enter your new password below.</p>
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
            {success && (
              <Alert variant="success" className="mt-4">
                Your password has been reset successfully.
              </Alert>
            )}

            <Form className="auth-form" noValidate validated={validated} onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Enter new password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  disabled={success}
                />
                <Form.Control.Feedback type="invalid">Password must be at least 8 characters.</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="confirmPassword">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={success}
                />
                <Form.Control.Feedback type="invalid">Please confirm your password.</Form.Control.Feedback>
              </Form.Group>

              {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <Alert variant="danger" className="mb-3">Passwords do not match</Alert>
              )}

              <Button
                className="auth-submit w-100 mb-3"
                type="submit"
                disabled={isLoading || success}
              >
                {isLoading ? <Spinner size="sm" /> : success ? "Password Reset" : "Reset Password"}
              </Button>

              {!success && (
                <div className="text-center auth-footnote">
                  <Link to="/login" className="auth-link">Back to login</Link>
                </div>
              )}

              {success && (
                <div className="text-center auth-footnote">
                  <Link to="/login" className="btn btn-primary">Go to Login</Link>
                </div>
              )}
            </Form>
          </Card.Body>
        </Card>
      </section>
    </div>
  );
}