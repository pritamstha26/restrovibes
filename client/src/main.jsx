import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App.jsx";
import AppointmentProvider from "./context/Appointment_context.jsx";
import "./index.css";
import { registerServiceWorker } from "./registerServiceWorker";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <AppointmentProvider>
        <App />
      </AppointmentProvider>
    </Router>
  </React.StrictMode>,
);

registerServiceWorker();
