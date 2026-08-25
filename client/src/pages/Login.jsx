import { useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import api from "../apis/api";
import Logo from "../components/Logo";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "restaurateurs", label: "Restaurateurs" },
  { key: "client", label: "Client" },
];

export default function LoginPage() {
  const [validated, setValidated] = useState(false);
  const [selectedRole, setSelectedRole] = useState("client");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

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
      const response = await api.post("/auth/login", {
        ...formData,
        role: selectedRole,
      });

      if (response.status === 200) {
        sessionStorage.setItem("access_token", response.data.access_token);
        sessionStorage.setItem("refresh_token", response.data.refresh_token);
        navigate(`/${selectedRole}`);
      }
    } catch (caughtError) {
      if (isAxiosError(caughtError)) {
        setError(caughtError.response?.data?.message || "Login failed");
      } else {
        setError("An unexpected error occurred");
      }
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
          <h1>Sharper bookings, cleaner operations.</h1>
          <p>
            A single workspace for clients, restaurateurs, and admins to book,
            price, and manage every appointment.
          </p>
          <div className="auth-metrics">
            <div className="auth-metric"><strong>24/7</strong><span>booking access</span></div>
            <div className="auth-metric"><strong>Live</strong><span>availability</span></div>
            <div className="auth-metric"><strong>Fast</strong><span>role-based routing</span></div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <Card className="auth-card">
          <Card.Body className="auth-card__body">
            <div className="auth-heading">
              <h2>Welcome back</h2>
              <p>Sign in and continue where you left off.</p>
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

            <div className="role-switch">
              {ROLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`role-pill${selectedRole === key ? " active" : ""}`}
                  onClick={() => setSelectedRole(key)}
                >
                  <span className="role-pill__dot" />
                  {label}
                </button>
              ))}
            </div>

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
                />
                <Form.Control.Feedback type="invalid">Please provide a valid email.</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <Form.Control.Feedback type="invalid">Please provide your password.</Form.Control.Feedback>
              </Form.Group>

             
              <div className="d-flex justify-content-center mb-3">
                <Link to="/forgot-password" className="auth-link small">Forgot password?</Link>
              </div>

              <Button className="auth-submit w-100 mb-3" type="submit" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : `Login as ${selectedRole}`}
              </Button>

              <div className="text-center auth-footnote">
                Don’t have an account? <Link to="/sign-up" className="auth-link">Sign up</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </section>
    </div>
  );
}