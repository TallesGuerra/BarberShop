import { useEffect, useMemo, useState, useRef } from "react";
import { GOOGLE_CALENDAR_CONFIG, DateUtils } from "../config/calendarConfig";
import { googleCalendarService } from "../services/googleCalendarService";
import { useAvailableSlots } from "../hooks/useAvailableSlots";

import { SERVICES } from "../config/servicePrices";

export default function Schedule() {
  const [service, setService] = useState("");
  const [barber, setBarber] = useState("any");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const calendarRef = useRef(null);
  const formRef = useRef(null);

  const { slots, loading: loadingSlots, setSlots } = useAvailableSlots(date, barber);

  useEffect(() => {
    setShowCustomer(Boolean(date && time));
  }, [date, time]);

  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  const computedTitle = useMemo(() => {
    const d = new Date(calendarYear, calendarMonth, 1);
    return d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  }, [calendarYear, calendarMonth]);

  // UNIFIED handleSubmit: valida, chama backend, trata conflito e limpa formulário
  async function handleSubmit(e) {
    e.preventDefault();

    if (!date || !time || !service || barber === "any") {
      alert("Preencha serviço, profissional, data e horário.");
      return;
    }

    // limite semanal (mantém lógica existente)
    const canWeek = await googleCalendarService.canBookOnWeek(barber, date);
    if (!canWeek) {
      alert("Limite semanal atingido para este profissional.");
      return;
    }

    // enviar barberName/barberEmail para o backend (melhora visibilidade e filtragem)
    const barberObj = GOOGLE_CALENDAR_CONFIG.BARBERS[barber] || {};
    const barberName = barberObj.name || "";
    const barberEmail = barberObj.email || "";

    const result = await googleCalendarService.createBooking({
      name,
      phone,
      service,
      date,
      time,
      barber,
      barberName,
      barberEmail,
    });

    if (!result.success) {
      const err = result.error || "Erro desconhecido";
      // trata conflito 409 retornado pelo backend
      if (
        String(err).toLowerCase().includes("horário já reservado") ||
        result.status === 409
      ) {
        alert("Horário já ocupado para este barbeiro. Escolha outro horário.");
        // recarrega slots para refletir ocupação
        const newSlots = await googleCalendarService.getAvailableSlots(
          barber,
          date
        );
        setSlots(newSlots);
        return;
      }
      alert("Falha no agendamento: " + err);
      return;
    }

    // sucesso: limpar formulário e atualizar slots
    alert("Agendamento realizado com sucesso!");
    setName("");
    setPhone("");
    setService("");
    setTime("");

    const newSlots = await googleCalendarService.getAvailableSlots(
      barber,
      date
    );
    setSlots(newSlots);
  }

  function handleBarberClick(barberId) {
    setBarber(barberId);
    if (calendarRef.current) {
      calendarRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  function handleDayClick(dateStr, available) {
    if (!available) return;
    setDate(dateStr);
    setSelectedDay(dateStr);
    if (formRef.current) {
      formRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  return (
    <section id="schedule" className="schedule">
      <div className="container">
        <h2 className="section-title">Agende Seu Horário</h2>
        <div className="schedule-content">
          <div className="barbers">
            <h3>Escolha seu Barbeiro</h3>
            <div className="barbers-grid">
              {Object.entries(GOOGLE_CALENDAR_CONFIG.BARBERS).map(([id, b]) => (
                <div
                  key={id}
                  className={
                    barber === id ? "barber-card selected" : "barber-card"
                  }
                  onClick={() => handleBarberClick(id)}
                >
                  <img
                    src={
                      b.photoUrl ||
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"
                    }
                    alt={b.name}
                  />
                  <h4>{b.name}</h4>
                </div>
              ))}
            </div>
          </div>

          <div className="booking-form" ref={formRef}>
            <h3>Formulário de Agendamento</h3>
            <div
              id="calendarSection"
              className="calendar-section"
              aria-live="polite"
              ref={calendarRef}
            >
              <div className="calendar-header">
                <button
                  id="prevMonthBtn"
                  className="calendar-nav"
                  aria-label="Mês anterior"
                  onClick={() => {
                    if (calendarMonth === 0) {
                      setCalendarMonth(11);
                      setCalendarYear((y) => y - 1);
                    } else {
                      setCalendarMonth((m) => m - 1);
                    }
                  }}
                >
                  &#9664;
                </button>
                <div id="calendarTitle" className="calendar-title">
                  {computedTitle}
                </div>
                <button
                  id="nextMonthBtn"
                  className="calendar-nav"
                  aria-label="Próximo mês"
                  onClick={() => {
                    if (calendarMonth === 11) {
                      setCalendarMonth(0);
                      setCalendarYear((y) => y + 1);
                    } else {
                      setCalendarMonth((m) => m + 1);
                    }
                  }}
                >
                  &#9654;
                </button>
              </div>
              <div className="calendar-legend">
                <span>
                  <span className="legend-box available"></span> Disponível
                </span>
                <span>
                  <span className="legend-box unavailable"></span> Indisponível
                </span>
              </div>
              <div className="calendar-grid" id="calendarGrid">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((wd) => (
                  <div className="calendar-weekday" key={wd}>
                    {wd}
                  </div>
                ))}
                {(() => {
                  const firstDay = new Date(calendarYear, calendarMonth, 1);
                  const startWeekday = firstDay.getDay();
                  const daysInMonth = new Date(
                    calendarYear,
                    calendarMonth + 1,
                    0
                  ).getDate();
                  const today = new Date();
                  const todayStr = today.toISOString().split("T")[0];
                  const cells = [];
                  for (let i = 0; i < startWeekday; i++) {
                    cells.push(
                      <div
                        key={`empty-${i}`}
                        className="calendar-day disabled"
                      ></div>
                    );
                  }
                  for (let day = 1; day <= daysInMonth; day++) {
                    const cellDate = new Date(calendarYear, calendarMonth, day);
                    const dateStr = DateUtils.toISODate(cellDate);
                    const isSunday = cellDate.getDay() === 0;
                    const isMonday = cellDate.getDay() === 1;
                    const isPast =
                      cellDate <
                      new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                      );
                    const isToday = dateStr === todayStr;
                    const available = !isPast && !isSunday && !isMonday;
                    const isSelected = selectedDay === dateStr;
                    cells.push(
                      <div
                        key={`d-${day}`}
                        className={`calendar-day ${
                          available ? "available" : "unavailable"
                        } ${isToday ? "today" : ""} ${
                          available ? "" : "disabled"
                        } ${isSelected ? "selected" : ""}`}
                        onClick={() => handleDayClick(dateStr, available)}
                      >
                        <span>{day}</span>
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            <form onSubmit={handleSubmit} id="bookingForm">
              <div className="form-group">
                <label htmlFor="service">Serviço</label>
                <select
                  id="service"
                  name="service"
                  required
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                >
                  <option value="">Selecione um serviço</option>
                  {SERVICES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.price.toFixed(2)} €
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="barberPreference">Profissional</label>
                <select
                  id="barberPreference"
                  name="barberPreference"
                  required
                  value={barber}
                  onChange={(e) => setBarber(e.target.value)}
                >
                  <option value="any">Sem preferência</option>
                  {Object.entries(GOOGLE_CALENDAR_CONFIG.BARBERS).map(
                    ([id, b]) => (
                      <option key={id} value={id}>
                        {b.name}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="date">Data</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="time">Horário</label>
                <select
                  id="time"
                  name="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                >
                  <option value="">
                    {loadingSlots
                      ? "Carregando horários..."
                      : "Selecione um horário"}
                  </option>
                  {!loadingSlots &&
                    slots.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
              </div>
              {showCustomer && (
                <div id="customerInfo" className="customer-info">
                  <div className="form-group">
                    <label htmlFor="name">Nome Completo</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Contacto</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div
                id="confirmationPanel"
                className="confirmation-panel"
                aria-live="polite"
              >
                <h4>Confirme seus dados</h4>
                <ul>
                  <li>
                    <strong>Barbeiro:</strong>{" "}
                    <span id="confBarber">
                      {GOOGLE_CALENDAR_CONFIG.BARBERS[barber]?.name ||
                        (barber === "any" ? "Sem preferência" : "-")}
                    </span>
                  </li>
                  <li>
                    <strong>Serviço:</strong>{" "}
                    <span id="confService">{service || "-"}</span>
                  </li>
                  <li>
                    <strong>Data:</strong>{" "}
                    <span id="confDate">{date || "-"}</span>
                  </li>
                  <li>
                    <strong>Horário:</strong>{" "}
                    <span id="confTime">{time || "-"}</span>
                  </li>
                  <li>
                    <strong>Nome:</strong>{" "}
                    <span id="confName">{name || "-"}</span>
                  </li>
                  <li>
                    <strong>Contacto:</strong>{" "}
                    <span id="confPhone">{phone || "-"}</span>
                  </li>
                </ul>
              </div>
              <button type="submit" className="submit-btn">
                Confirmar Agendamento
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
