import { useState } from "react";
import { FaStar } from "react-icons/fa";

export default function StarRating({ value = 0, onChange, readonly = false, size = 20 }) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <FaStar
          key={star}
          size={size}
          style={{
            cursor: readonly ? "default" : "pointer",
            color: star <= (hover || value) ? "#f59e0b" : "#d1d5db",
            transition: "color 0.15s",
          }}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => !readonly && onChange && onChange(star)}
        />
      ))}
    </div>
  );
}
