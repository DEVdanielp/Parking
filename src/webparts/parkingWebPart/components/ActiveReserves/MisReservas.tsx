import * as React from 'react';
import { useDeps } from '../../context/AppProviders';

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

  // Cargar al montar (con el rango default de 30 días)
  React.useEffect(() => { load(); }, [load]);

  return (
    <section>
      <h1>Mis reservas</h1>

      {/* Si quieres permitir cambiar el rango manualmente */}
      <form onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label>
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setRange(r => ({ ...r, from: e.currentTarget.value }))}
          />
        </label>
        {' '}
        <label>
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setRange(r => ({ ...r, to: e.currentTarget.value }))}
          />
        </label>
        {' '}
        <button type="submit">Aplicar</button>
      </form>

      {loading && <div>Cargando…</div>}
      {error && <div>{error}</div>}

      {!loading && !error && rows.length > 0 && (
        
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Turno</th>
              <th>Celda</th>
              <th>Vehículo</th>
              <th>Slot Moto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.Id}>
                <td>{r.Date}</td>
                <td>{r.Turn}</td>
                <td>{r.SpotId}</td>
              </tr>
            ))

            }
          </tbody>
        </table>
      )}
      {!loading && !error && rows.length > 0 && (
    <ul>
          {rows.map((r: any) => (
            <li key={r.ID ?? r.Id}>{JSON.stringify(r)}</li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default MisReservas;
