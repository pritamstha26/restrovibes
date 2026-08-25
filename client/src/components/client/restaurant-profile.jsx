import React, { useState, useEffect } from "react";
import { Container, Row, Col, Form, Spinner, Modal, Button, Alert } from "react-bootstrap";
import {
  FaUser,
  FaCut,
  FaCalendarAlt,
  FaStar,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaClock,
} from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

const getTimeOnDate = (date, value, offsetMinutes = 0) => {
  const [hours, minutes] = String(value || "09:00").slice(0, 5).split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes - offsetMinutes, 0, 0);
  return result;
};

const RestaurantProfile = ({ restaurantId }) => {
  const navigate = useNavigate();
  const [restaurant, setrestaurant] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [, setAppointments] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [partySize, setPartySize] = useState(1);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

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
          
          // Fetch ratings
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
          setServices(servicesResponse.data);
        }

        fetchAppointments(id);
      } catch (err) {
        console.error(err);
        setError("Unable to process provider profile elements.");
      } finally {
        setLoading(false);
      }
    };

    fetchrestaurantData();
  }, [restaurantId]);

  const fetchAppointments = async (targetId) => {
    try {
      const token = sessionStorage.getItem("access_token");
      const response = await api.get(`/appointments/restaurateurs/${targetId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      if (response.status === 200) setAppointments(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleServiceSelect = (service) => {
    console.log("[Booking] handleServiceSelect", service);
    setSelectedService(service);
    setShowBookingModal(true);
    setBookingError(null);
    setBookingSuccess(false);
    setBookingDate(
      getTimeOnDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        openingTime,
      ),
    );
    setPartySize(1);
  };

  const handleBookAppointment = async () => {
    console.log("[Booking] handleBookAppointment", { selectedService: selectedService?.id, restaurant: restaurant?.id, bookingDate, partySize });
    if (!selectedService || !restaurant) return;

    setBookingInProgress(true);
    setBookingError(null);

    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) {
        setBookingError("Please log in to book an appointment.");
        setBookingInProgress(false);
        return;
      }

      const response = await api.post(
        "/appointments",
        {
          service_id: selectedService.id,
          date: bookingDate.toISOString(),
          restaurateurs_id: restaurant.id,
          party_size: partySize,
          clientType: "regular",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("[Booking] appointment response", response.status, response.data);
      if (response.status === 201) {
        navigate("/client/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("[Booking] appointment error", err);
      setBookingError(err.response?.data?.message || "Failed to book appointment. Please try again.");
    } finally {
      setBookingInProgress(false);
    }
  };

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
        <Row className="g-5">
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
                  <span className="s-vis-text">{restaurant.location || "—"}</span>
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
                    <div className="d-flex align-items-center gap-3.5">
                      <div className="s-vis-item-art">
                        <FaCut />
                      </div>
                      <div>
                        <h4 className="s-vis-item-title m-0">{service.name}</h4>
                        <div className="d-flex align-items-center gap-2 mt-1.5">
                          <span className="s-vis-tag">{service.duration} mins</span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-4">
                      <div className="text-end">
                        <span className="s-vis-price-hint">Price</span>
                        <div className="s-vis-price">Rs. {service.price}</div>
                      </div>
                      <button className="s-vis-btn" onClick={() => handleServiceSelect(service)}>
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

      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Book Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bookingSuccess ? (
            <Alert variant="success">
              <Alert.Heading>Appointment Booked!</Alert.Heading>
              <p>Your appointment has been successfully scheduled.</p>
            </Alert>
          ) : (
            <>
              {bookingError && <Alert variant="danger">{bookingError}</Alert>}

              {selectedService && (
                <div className="mb-4">
                  <h5>Service Details</h5>
                  <p className="mb-1"><strong>Service:</strong> {selectedService.name}</p>
                  <p className="mb-1"><strong>Duration:</strong> {selectedService.duration} minutes</p>
                  <p className="mb-0"><strong>Price:</strong> Rs. {selectedService.price}</p>
                  <p className="mb-0 text-muted"><strong>Available:</strong> {formatTimeLabel(openingTime)} - {formatTimeLabel(closingTime)}</p>
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Select Date and Time</Form.Label>
                <div className="w-100">
                  <DatePicker
                    selected={bookingDate}
                    onChange={(date) => setBookingDate(date)}
                    showTimeSelect
                    timeIntervals={15}
                    minTime={getTimeOnDate(bookingDate, openingTime)}
                    maxTime={getTimeOnDate(bookingDate, closingTime, Number(selectedService?.duration) || 45)}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date()}
                    className="form-control"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Party Size</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                />
              </Form.Group>

              <div className="small text-muted mb-3">
                By booking this appointment, you agree to our cancellation policy. Please arrive a few minutes before your scheduled time.
              </div>
            </>
          )}
        </Modal.Body>

        {!bookingSuccess && (
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBookingModal(false)} disabled={bookingInProgress}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleBookAppointment} disabled={bookingInProgress}>
              {bookingInProgress ? "Booking..." : "Confirm Booking"}
            </Button>
          </Modal.Footer>
        )}
      </Modal>
    </div>
  );
};

export default RestaurantProfile;