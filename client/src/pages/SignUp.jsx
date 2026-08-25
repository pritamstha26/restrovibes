import { useState } from "react";
import { Alert, Button, Card, Form, Spinner } from "react-bootstrap";
import api from "../apis/api";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { reverseGeocode } from "../utils/geocode";

const ROLES = [
  { key: "restaurateurs", label: "Restaurateurs" },
  { key: "client", label: "Client" },
];

export default function SignupPage() {
  const [validated, setValidated] = useState(false);
  const [selectedRole, setSelectedRole] = useState("client");
  const [error, setError] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
  });
  const navigate = useNavigate();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getRestaurateurLocation = async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { latitude: null, longitude: null, location_name: null };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const location_name =
            (await reverseGeocode(latitude, longitude)) || "Current location";
          resolve({ latitude, longitude, location_name });
        },
        () => resolve({ latitude: null, longitude: null, location_name: null }),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      event.stopPropagation();
      setValidated(true);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      setValidated(true);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setValidated(true);
      return;
    }

    setValidated(true);
    setError(null);

    let payload = {
      ...formData,
      role: selectedRole,
      phone_number: formData.phone_number || null,
    };

    if (selectedRole === "restaurateurs") {
      setIsFetchingLocation(true);
      const locationData = await getRestaurateurLocation();
      payload = { ...payload, ...locationData };
    }

    try {
      const response = await api.post("/auth/register", payload);
      if (response.status === 201) {
        sessionStorage.setItem("access_token", response.data.access_token);
        sessionStorage.setItem("refresh_token", response.data.refresh_token);
        navigate("/login");
      }
    } catch (caughtError) {
      setError(
        caughtError.response?.data?.message || "An error occurred. Please try again.",
      );
    } finally {
      setIsFetchingLocation(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-hero__content">
          <Logo />
          <div className="auth-kicker">RestroVibe</div>
          <h1>Open a modern booking workspace in minutes.</h1>
          <p>
            Create a client or restaurateur account and start using location-aware
            booking, live availability, and smart scheduling.
          </p>
          <div className="auth-metrics">
            <div className="auth-metric"><strong>Fast</strong><span>onboarding</span></div>
            <div className="auth-metric"><strong>Geo</strong><span>restaurateur setup</span></div>
            <div className="auth-metric"><strong>Secure</strong><span>role access</span></div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <Card className="auth-card">
          <Card.Body className="auth-card__body">
            <div className="auth-heading">
              <h2>Create account</h2>
              <p>Set up your profile and choose your role.</p>
            </div>

            {error && <Alert variant="danger" className="mt-4">{error}</Alert>}

            <div className="role-switch role-switch--two">
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
              <div className="row g-3">
                <div className="col-6">
                  <Form.Group controlId="firstName">
                    <Form.Label>First name</Form.Label>
                    <Form.Control
                      type="text"
                      name="first_name"
                      placeholder="First name"
                      value={formData.first_name}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </div>
                <div className="col-6">
                  <Form.Group controlId="lastName">
                    <Form.Label>Last name</Form.Label>
                    <Form.Control
                      type="text"
                      name="last_name"
                      placeholder="Last name"
                      value={formData.last_name}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mt-3 mb-3" controlId="phoneNumber">
                <Form.Label>Phone number</Form.Label>
                <Form.Control
                  type="text"
                  name="phone_number"
                  placeholder="Phone number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

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
              </Form.Group>

              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                />
              </Form.Group>

              <div className="mb-3 small text-muted">
                {selectedRole === "restaurateurs"
                  ? "We’ll store your restaurant coordinates using your current location."
                  : "Client accounts can book appointments immediately after signup."}
              </div>

              <Button className="auth-submit w-100 mb-3" type="submit" disabled={isFetchingLocation}>
                {isFetchingLocation ? <Spinner size="sm" /> : "Sign up"}
              </Button>

              <div className="text-center auth-footnote">
                Already have an account? <Link to="/login" className="auth-link">Log in</Link>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </section>
    </div>
  );
}