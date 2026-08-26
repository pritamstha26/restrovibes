import React, { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import routes from "./routes/routes";
import { Container } from "react-bootstrap";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => {
      navigate("/login", { replace: true });
    };
    window.addEventListener("app:unauthorized", handler);
    return () => window.removeEventListener("app:unauthorized", handler);
  }, [navigate]);

  const renderRoutes = (routesList) => {
    return routesList.map((route, index) => {
      const { children, ...routeProps } = route;
      return (
        <Route key={index} {...routeProps}>
          {children && renderRoutes(children)}
        </Route>
      );
    });
  };

  return (
    <div className="app-shell">
      <Container fluid className="app-shell__inner p-0">
        <ErrorBoundary>
          <Routes>
            {renderRoutes(routes)}
          </Routes>
        </ErrorBoundary>
      </Container>
    </div>
  );
}

export default App;
