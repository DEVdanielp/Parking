import * as React from 'react';
import { useDeps } from '../../context/AppProviders';
import {toISODate} from '../../utils/dates'
import styles from './MisReservas.module.scss';

type Row = any; // usa tu tipo real si lo tienes (SPReservation[])

const pad2 = (n: number) => ('0' + n).slice(-2);
const ymdLocal = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Rango default: últimos 30 días (incluye hoy)
const last30Days = () => {
  const end = new Date();             // hoy (local)
  const start = new Date();
  start.setDate(start.getDate() - 29);
  end.setDate(end.getDate() + 3) 
  return { from: ymdLocal(start), to: ymdLocal(end) };
};

const MisReservas: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const { reservationsSvc } = useDeps();

  // inicia el rango con el default de 30 días
  const [{ from, to }, setRange] = React.useState(() => last30Days());

  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Carga simple: llama tal cual tu método con el rango actual
  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data: Row[] = await (reservationsSvc as any).getUserReserves(
        userEmail,
        from, // YYYY-MM-DD
        to    // YYYY-MM-DD
      );
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando reservas');
    } finally {
      setLoading(false);
    }
  }, [reservationsSvc, userEmail, from, to]);

    const statusClass = (s: string | undefined) => {
    const t = (s || '').toLowerCase();
    if (t.includes('cancel')) return styles.statusCancelada;
    if (t.includes('termin')) return styles.statusTerminada;
    if (t.includes('act') || t.includes('aprob') || t.includes('ocup')) return styles.statusActiva;
    // por defecto: reservada / solicitada
    return styles.statusReservada || styles.statusSolicitada;
  };


  // Cargar al montar (con el rango default de 30 días)
  React.useEffect(() => { load(); }, [load]);

  return (
    <section className={`${styles.wrap}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>Mis reservas</h1>

        <form className={styles.toolbar} onSubmit={(e) => { e.preventDefault(); load(); }}>
          <label className={styles.label}>
            Desde
            <input
              className={styles.input}
              type="date"
              value={from}
              onChange={(e) => setRange(r => ({ ...r, from: e.currentTarget.value }))}
            />
          </label>
          <label className={styles.label}>
            Hasta
            <input
              className={styles.input}
              type="date"
              value={to}
              onChange={(e) => setRange(r => ({ ...r, to: e.currentTarget.value }))}
            />
          </label>
          <button className={styles.button} type="submit">Aplicar</button>
        </form>

        {loading && <div className={styles.state}>Cargando…</div>}
        {error && <div className={styles.error}>{error}</div>}

        {!loading && !error && rows.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Celda</th>
                  <th>Vehículo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.Id}>
                    <td>{toISODate(new Date(r.Date))}</td>
                    <td>{r.Turn}</td>
                    <td>{r.SpotId?.Title ?? r.SpotId}</td>
                    <td>{r.VehicleType}</td>
                    <td>
                      <span className={`${styles.badge} ${statusClass(r.Status)}`}>{r.Status}</span>
                    </td>
                    <td className={styles.actions}>
                      {/* Ejemplo de acción opcional */}
                      {<button className={styles.actionLight}>Ver</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className={styles.state}>No hay reservas en el rango seleccionado.</div>
        )}
      </div>
    </section>
  );
};

export default MisReservas;
