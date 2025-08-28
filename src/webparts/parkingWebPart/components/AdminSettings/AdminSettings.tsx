import * as React from 'react';
import styles from './AdminSettings.module.scss';
import { useDeps, useSettings } from '../../context/AppProviders';

const AdminSettings: React.FC = () => {
  const { settingsSvc } = useDeps();
  const settings = useSettings();
  const [form, setForm] = React.useState({ VisibleDays: 7, MaxAdvanceHours: 72, MaxUserTurns: 3 });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (settings) {
      setForm({
        VisibleDays: settings.VisibleDays,
        MaxAdvanceHours: settings.MaxAdvanceHours,
        MaxUserTurns: settings.MaxUserTurns
      });
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await settingsSvc.update(form);
      alert('Ajustes guardados. Recarga la página para refrescar caché.');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div>Cargando...</div>;

  return (
    <div className={styles.wrapper}>
      <div >
        <label>VisibleDays</label>
        <input
          type="number"
          min={1}
          value={form.VisibleDays}
          onChange={e => setForm(f => ({ ...f, VisibleDays: +e.target.value }))}
        />
      </div>

      <div >
        <label>MaxAdvanceHours</label>
        <input
          type="number"
          min={1}
          value={form.MaxAdvanceHours}
          onChange={e => setForm(f => ({ ...f, MaxAdvanceHours: +e.target.value }))}
        />
      </div>

      <div >
        <label>MaxUserTurns</label>
        <input
          type="number"
          min={1}
          value={form.MaxUserTurns}
          onChange={e => setForm(f => ({ ...f, MaxUserTurns: +e.target.value }))}
        />
      </div>

      {error && <div >{error}</div>}

      <button  onClick={save} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
};

export default AdminSettings;
