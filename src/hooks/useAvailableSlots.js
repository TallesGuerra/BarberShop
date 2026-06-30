import { useState, useEffect } from "react";
import { GOOGLE_CALENDAR_CONFIG, DateUtils } from "../config/calendarConfig";
import { googleCalendarService } from "../services/googleCalendarService";

export function useAvailableSlots(date, barber) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSlots() {
      if (!date) {
        setSlots([]);
        return;
      }
      const d = new Date(date);
      if (d.getDay() === 0) {
        setSlots([]);
        return;
      }
      setLoading(true);
      try {
        if (barber && barber !== "any" && GOOGLE_CALENDAR_CONFIG.API_KEY) {
          const available = await googleCalendarService.getAvailableSlots(barber, date);
          setSlots(available);
        } else if (barber && barber !== "any") {
          setSlots(DateUtils.generateTimeSlots(d, barber));
        } else {
          const isWeekend = d.getDay() === 6;
          const start = isWeekend ? "08:00" : "09:00";
          const slotsList = [];
          let cur = new Date(`2000-01-01T${start}`);
          const endD = new Date(`2000-01-01T18:00`);
          while (cur < endD) {
            slotsList.push(cur.toTimeString().slice(0, 5));
            cur.setMinutes(cur.getMinutes() + 30);
          }
          setSlots(slotsList);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [date, barber]);

  return { slots, loading, setSlots };
}
