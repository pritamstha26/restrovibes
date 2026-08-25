import { useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import api from "../apis/api";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";

export default function ForgotPasswordPage() {
  const [validated, setValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [formData, setFormData] = useState({ email: "" });

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

    setValidated(true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/forgot-password", { email: formData.email });
      setResetUrl(response.data?.resetUrl || "");
      setSuccess(true);
    } catch (caughtError) {
      setError(caughtError.response?.data?.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero__content">
          <Logo />
          <div className="auth-kicker">RestroVibe</div>
          <h1>Reset your password</h1>
          <p>Enter your email and we'll send you a link to reset your password.</p>
        </div>
      </section>

      <section className="auth-panel">
        <Card className="auth-card">
          <Card.Body className="auth-card__body">
            <div className="auth-heading">
              <h2>Forgot password?</h2>
              <p>No worries, we'll send you reset instructions.</p>
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}
            {success && (
              <Alert variant="success" className="mt-4">
                If an account exists for that email, you'll receive password reset instructions shortly.
                {resetUrl && (
                  <div className="mt-3">
                    <div className="small mb-1">Development reset link:</div>
                    <a href={resetUrl} className="text-break">Open password reset</a>
                  </div>
                )}
              </Alert>
            )}

            <Form className="auth-form" noValidate validated={validated} onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={success}
                />
                <Form.Control.Feedback type="invalid">Please provide a valid email.</Form.Control.Feedback>
              </Form.Group>

              <Button className="auth-submit w-100 mb-3" type="submit" disabled={isLoading || success}>
                {isLoading ? <Spinner size="sm" /> : "Send reset link"}
              </Button>

              <div className="text-center auth-footnote">
                Remember your password? <Link to="/login" className="auth-link">Log in</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </section>
    </div>
  );
}