import React, { useState, useEffect } from "react";
import { Container, Row, Col, Spinner } from "react-bootstrap";
import {
  FaUser,
  FaStar,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
} from "react-icons/fa";
import { UtensilsCrossed } from "lucide-react";
import api from "../../apis/api";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const formatTimeLabel = (value) => {
  if (!value) return "09:00 AM";
  const [hourString, minuteString] = String(value).slice(0, 5).split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "09:00 AM";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
};

const RestaurantProfile = ({ restaurantId }) => {
  const navigate = useNavigate();
  const [restaurant, setrestaurant] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openingTime = restaurant?.opening_time || "09:00:00";
  const closingTime = restaurant?.closing_time || "18:00:00";

  useEffect(() => {
    const fetchrestaurantData = async () => {
      try {
        setLoading(true);
        setError(null);
        const id = restaurantId || sessionStorage.getItem("selected_restaurant_id");

        if (!id) throw new Error("Missing targeted instance identifiers.");

        const restaurantResponse = await api.get(`/restaurateurs-services/${id}`);
        if (restaurantResponse.status === 200) {
          const mainrestaurant = restaurantResponse.data.data;
          
          try {
            const ratingsResponse = await api.get(`/ratings/average/restaurateur/${id}`);
            if (ratingsResponse.status === 200) {
              mainrestaurant.average_rating = ratingsResponse.data.data.averageRating;
              mainrestaurant.total_ratings = ratingsResponse.data.data.totalRatings;
            }
          } catch (rErr) {
            console.warn("Could not fetch ratings for restaurateur", rErr);
          }

          setrestaurant(mainrestaurant);
        }

        const servicesResponse = await api.get(`/restaurateurs-services/all`);
        if (servicesResponse.status === 200) {
          const all = servicesResponse.data || [];
          setServices(
            Array.isArray(all)
              ? all.filter(
                  (s) =>
                    String(s.restaurateur_id || s.restaurateurId) ===
                    String(id),
                )
              : [],
          );
        }
      } catch (err) {
        console.error(err);
        setError("Unable to process provider profile elements.");
      } finally {
        setLoading(false);
      }
    };

    fetchrestaurantData();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "50vh" }}>
        <Spinner animation="border" variant="secondary" size="sm" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-4 max-width-1240 mx-auto">
        <div className="s-vis-alert">{error || "Missing workspace allocation."}</div>
      </div>
    );
  }

  return (
    <div className="s-vis-dashboard">
      <Container className="s-vis-main py-5">
        <Row className="g-4 g-lg-5">
          <Col lg={4}>
            <div className="s-vis-sidebar p-4">
              <div className="text-center mb-4">
                <div className="s-vis-avatar mx-auto mb-3">
                  <FaUser className="s-vis-avatar-icon" />
                </div>
                <h1 className="s-vis-name text-capitalize">{restaurant.first_name} {restaurant.last_name}</h1>
                
                <div className="s-vis-rating d-inline-flex align-items-center gap-1 px-2.5 py-1 mt-1">
                  <FaStar className="star-soft" />
                  <span className="fw-semibold">{restaurant.average_rating || "0.0"}</span>
                  <span className="text-muted">•</span>
                  <span className="text-muted">{restaurant.total_ratings || 0} reviews</span>
                </div>
              </div>

              <div className="s-vis-info-stack mt-4">
                <div className="s-vis-info-row">
                  <FaPhoneAlt className="s-vis-icon" />
                  <a href={`tel:${restaurant.phone_number || "—"}`} className="s-vis-text">
                    {restaurant.phone_number || "—"}
                  </a>
                </div>
                <div className="s-vis-info-row">
                  <FaEnvelope className="s-vis-icon" />
                  <a href={`mailto:${restaurant.email || "—"}`} className="s-vis-text text-lowercase">
                    {restaurant.email || "—"}
                  </a>
                </div>
                <div className="s-vis-info-row">
                  <FaMapMarkerAlt className="s-vis-icon" />
                  <span className="s-vis-text">{restaurant.location_name || restaurant.location || "—"}</span>
                </div>
                <div className="s-vis-info-row highlight-row">
                  <FaClock className="s-vis-icon highlight-icon" />
                  <span className="s-vis-text fw-medium text-secondary-dark">Available {formatTimeLabel(openingTime)} - {formatTimeLabel(closingTime)}</span>
                </div>
              </div>
            </div>
          </Col>

          <Col lg={8}>
            <div className="s-vis-header mb-4">
              <h2 className="s-vis-title m-0">Menu & Services</h2>
              <p className="text-muted small m-0 mt-1">Select an item below to book your appointment slot</p>
            </div>

            {services.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {services.map((service) => (
                  <div key={service.id} className="s-vis-card p-4 d-flex align-items-center justify-content-between">
                    <div className="s-vis-card-main d-flex align-items-center gap-3">
                      <div className="s-vis-item-art">
                        <UtensilsCrossed size={20} />
                      </div>
                      <div className="s-vis-card-text">
                        <h4 className="s-vis-item-title m-0">{service.name}</h4>
                        <div className="d-flex align-items-center gap-2 mt-2">
                          <span className="s-vis-tag">{service.duration} mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="s-vis-card-side d-flex align-items-center gap-3">
                      <div className="text-end">
                        <span className="s-vis-price-hint">Price</span>
                        <div className="s-vis-price">Rs. {service.price}</div>
                      </div>
                      <button
                        className="s-vis-btn"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}
                        onClick={() => navigate(`/book/${restaurant.id}?service=${service.id}`)}
                      >
                        Book Table
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="s-vis-empty p-5 text-center text-muted">
                No active items currently available in this catalog.
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RestaurantProfile;