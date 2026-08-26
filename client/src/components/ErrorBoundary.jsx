import { Component } from "react";
import { Container, Button } from "react-bootstrap";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: "80vh" }}>
          <h3 className="mb-3">Something went wrong</h3>
          <p className="text-muted mb-4">{this.state.error?.message || "An unexpected error occurred"}</p>
          <Button
            variant="primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/client";
            }}
          >
            Go to Dashboard
          </Button>
        </Container>
      );
    }

    return this.props.children;
  }
}
