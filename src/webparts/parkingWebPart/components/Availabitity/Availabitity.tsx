import * as React from 'react';
import styles from './Availabitity.module.scss';
import { useDeps, useSettings } from '../../context/AppProviders';
import type { AvailabilityCell, TurnType, VehicleType, SPParkingSpot } from '../../types';
import { addDays, todayISO } from '../../utils/dates';

const turns: TurnType[] = ['Manana (6:00 AM - 12:00 PM)', 'Tarde (1:00 PM - 6:00PM)', 'Dia Completo (6:00 AM - 12:00 PM)'];

const Availability: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const { reservationsSvc } = useDeps();
  const settings = useSettings()!;
  const [date, setDate] = React.useState<string>(todayISO()); //Acutlizar fecha
  const [turn, setTurn] = React.useState<TurnType>('Manana (6:00 AM - 12:00 PM)'); //Actualizar turno
  const [vehicle, setVehicle] = React.useState<VehicleType>('Carro'); //Actualizar tipo de vehiculo
  const [cells, setCells] = React.useState<AvailabilityCell[]>([]); //Lista con los slots
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ventana visible
  const minDate = todayISO();
  const maxDate = (() => {
    const max = addDays(new Date(), settings.VisibleDays);
    return max.toISOString().substring(0,10);
  })();

  //Funcion
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await reservationsSvc.getAvailability(date, turn);
      setCells(data);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando disponibilidad');
    } finally { setLoading(false); }
  }, [reservationsSvc, date, turn]);

  React.useEffect(() => { load(); }, [load]);

  const reserve = async (spot: SPParkingSpot) => {
    try {
      await reservationsSvc.validateBeforeCreate(date, turn, userEmail, vehicle, spot, settings, );

      let motoSlot: number | null = null;


      if (!confirm(`Confirmar reserva:
        Fecha: ${date}
        Turno: ${turn}
        Celda: ${spot.Title}
        Vehículo: ${vehicle}${motoSlot ? ` (slot ${motoSlot})` : ''}`)) return;

      

      await reservationsSvc.create({
        Title: userEmail,
        Date: date,
        Turn: turn,
        SpotIdId: spot.ID,
        VehicleType: vehicle,
        Status: 'Activa'
      } as any);

      alert('Reserva creada.');
      load();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo reservar');
      load();
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Toolbar de filtros */}
      <div className={styles.toolbar}>
        <label className={styles.label}>
          Fecha:
          <input
            className={styles.input}
            type="date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={e => setDate(e.currentTarget.value)}
          />
        </label>

        <label className={styles.label}>
          Turno:
          <select
            className={styles.select}
            value={turn}
            onChange={e => setTurn(e.currentTarget.value as TurnType)}
          >
            {turns.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label className={styles.label}>
          Vehículo:
          <select
            className={styles.select}
            value={vehicle}
            onChange={e => setVehicle(e.currentTarget.value as any)}
          >
            <option value="Carro">Carro</option>
            <option value="Moto">Moto</option>
          </select>
        </label>

        <button className={styles.button} onClick={load}>Actualizar</button>
      </div>

      {loading && <div>Cargando...</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.grid}>
        {cells
          .filter(c => {
            // (opinión) devuelve boolean explícito para evitar warnings
            if (vehicle === "Moto")  return c.spot.TipoCelda === 'Moto';
            if (vehicle === "Carro") return c.spot.TipoCelda === 'Carro';
            return true;
          })
          .map(c => {
            const disabled =
              (vehicle === 'Carro' && !c.isCarAvailable) ||
              (vehicle === 'Moto'  && !c.isMotoAvailable);

            return (
              <div
                key={c.spot.ID}
                className={`${styles.card} ${disabled ? styles.cardDisabled : ''}`}
              >
                <div className={styles.code}>{c.spot.Title}</div>
                <button
                  className={styles.reserveBtn}
                  disabled={disabled}
                  onClick={() => reserve(c.spot)}
                >
                  {disabled ? 'Sin cupo' : 'Reservar'}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default Availability;
