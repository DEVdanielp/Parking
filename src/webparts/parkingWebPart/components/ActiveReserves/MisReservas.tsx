// src/webparts/.../components/MisReservas/MisReservas.tsx
import * as React from 'react';
//import styles from './MisReservas.module.scss';
import { useDeps } from '../../context/AppProviders';

type Row = {
  ID: number;
  Date: string;            // ISO string
  Turn: string;
  SpotIdId: number;
  VehicleType: 'Carro' | 'Moto';
  Status: 'Activa' | 'Cancelada';
  MotoSlotIndex?: number | null;
  SpotTitle?: string;      // si luego haces expand del título
};

const turns = [
  'Manana (6:00 AM - 12:00 PM)',
  'Tarde (1:00 PM - 6:00PM)',
  'Dia Completo (6:00 AM - 12:00 PM)',
];

const MisReservas: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const { reservationsSvc } = useDeps();

  // Filtros
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');
  const [turn, setTurn] = React.useState<string>('');
  const [vehicle, setVehicle] = React.useState<string>('');
  const [status, setStatus] = React.useState<string>('');
  const [q, setQ] = React.useState<string>('');

  // Datos/estado
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Diálogo cancelar
  const dlgRef = React.useRef<HTMLDialogElement>(null);
  const [pending, setPending] = React.useState<Row | null>(null);

  const fmt = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      // Implementa este método en tu ReservationsService con filtros OData:
      // myReservations({ userEmail, from, to, turn, vehicle, status, q })
      if (!(reservationsSvc as any).myReservations) {
        throw new Error('Falta implementar reservationsSvc.myReservations({ ...filtros })');
      }
      const data: Row[] = await (reservationsSvc as any).myReservations({
        userEmail, from, to, turn, vehicle, status, q,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando reservas');
    } finally {
      setLoading(false);
    }
  }, [reservationsSvc, userEmail, from, to, turn, vehicle, status, q]);

  React.useEffect(() => { load(); }, [load]);

  const onSubmit: React.FormEventHandler = (e) => { e.preventDefault(); load(); };
  const onReset = () => { setFrom(''); setTo(''); setTurn(''); setVehicle(''); setStatus(''); setQ(''); };

  const onAskCancel = (row: Row) => { setPending(row); dlgRef.current?.showModal(); };
  const onCancelClose = () => { dlgRef.current?.close(); setPending(null); };
  const onConfirmCancel = async () => {
    if (!pending) return;
    try {
      await reservationsSvc.cancel(pending.ID);
      onCancelClose();
      load();
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo cancelar');
    }
  };

  const act = rows.filter(r => r.Status === 'Activa').length;
  const canc = rows.filter(r => r.Status === 'Cancelada').length;

  return (
    <section  aria-labelledby="titulo-reservas">
      <header >
        <h1 id="titulo-reservas">Mis reservas</h1>
        <div  aria-live="polite">
          <span><strong>Activas:</strong> {act}</span>
          <span><strong>Canceladas:</strong> {canc}</span>
          <span><strong>Total:</strong> {rows.length}</span>
        </div>
      </header>


      <form  onSubmit={onSubmit} onReset={onReset}>
        {/* Bloque 1: fechas */}
        <div >
          <label>Desde
            <input type="date" value={from} onChange={e => setFrom(e.currentTarget.value)} />
          </label>
          <label>Hasta
            <input type="date" value={to} onChange={e => setTo(e.currentTarget.value)} />
          </label>

          <label>Turno
            <select value={turn} onChange={e => setTurn(e.currentTarget.value)}>
              <option value="">Todos</option>
              {turns.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label>Vehículo
            <select value={vehicle} onChange={e => setVehicle(e.currentTarget.value)}>
              <option value="">Todos</option>
              <option value="Carro">Carro</option>
              <option value="Moto">Moto</option>
            </select>
          </label>

          <label>Estado
            <select value={status} onChange={e => setStatus(e.currentTarget.value)}>
              <option value="">Todos</option>
              <option value="Activa">Activa</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </label>
        </div>

        {/* Bloque 2: buscar + botones */}
        <div >
          <label>Buscar
            <input type="search" value={q} onChange={e => setQ(e.currentTarget.value)} placeholder="Celda / notas…" />
          </label>
          <button type="submit">Aplicar</button>
          <button type="reset" >Limpiar</button>
        </div>
      </form>

      {loading && <div role="status" aria-live="polite">Cargando reservas…</div>}
      {error && (
        <div  role="alert">
          {error} <button  onClick={load}>Reintentar</button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div >No tienes reservas para los criterios seleccionados.</div>
      )}

      {!loading && !error && rows.length > 0 && (
        <div >
          <table>
            <caption >Listado de reservas del usuario</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Turno</th>
                <th scope="col">Celda</th>
                <th scope="col">Vehículo</th>
                <th scope="col">Slot Moto</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.ID} data-id={r.ID} data-status={r.Status}>
                  <td><time dateTime={r.Date}>{fmt.format(new Date(r.Date))}</time></td>
                  <td>{r.Turn}</td>
                  <td>{r.SpotTitle ?? `#${r.SpotIdId}`}</td>
                  <td>{r.VehicleType}</td>
                  <td>{r.VehicleType === 'Moto' ? (r.MotoSlotIndex ?? '—') : '—'}</td>
                  <td>
                    <span >
                      {r.Status}
                    </span>
                  </td>
                  <td >
                    {r.Status === 'Activa' && (
                      <button  onClick={() => onAskCancel(r)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dialog ref={dlgRef}>
        <h2>Cancelar reserva</h2>
        <p>
          ¿Confirmas cancelar la reserva de la celda <strong>{pending?.SpotTitle ?? `#${pending?.SpotIdId}`}</strong>?
        </p>
        <div >
          <button  onClick={onConfirmCancel}>Sí, cancelar</button>
          <button onClick={onCancelClose}>No, volver</button>
        </div>
      </dialog>
    </section>
  );
};

export default MisReservas;
