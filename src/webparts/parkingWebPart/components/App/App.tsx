// App.tsx
import * as React from 'react';
import styles from './App.module.scss';
import { useSettings, useDeps } from '../../context/AppProviders';
import Availability from '../Availabitity/Availabitity';
import AdminCells from '../AdminCells/AdminCells';
import AdminSettings from '../AdminSettings/AdminSettings';
import MisReservas from '../ActiveReserves/MisReservas';
import "@pnp/sp/webs";
import "@pnp/sp/site-users/web";

// NO crees spfi aquí. Usa el que viene configurado vía AppProviders.

type Role = 'user' | 'admin';
type View = 'availability' | 'cells' | 'settings' | 'ActiveReserves';

const App: React.FC = () => {
  const settings = useSettings();
  const { sp } = useDeps(); 
  const [email, setEmail] = React.useState<string | null>(null);
  const [role, setRole] = React.useState<Role>('user');
  const [view, setView] = React.useState<View>('availability');


  // Auto-login con la sesión de SharePoint
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me = await sp.web.currentUser();
        if (!alive) return;

        const upn = (me.LoginName || '').split('|').pop() || '';
        const resolvedEmail = me.Email || upn;

        setEmail(resolvedEmail);

        // ¿Admin? (opcional) – por grupo de SP
        /*const groups = await sp.web.currentUser.groups();
        const isAdmin = groups.some(g =>
          g.Title === 'ParkingAdmins' || g.Title.endsWith('Owners')
        );*/
        setRole('admin');
      } catch (e) {
        console.warn('No se pudo obtener el usuario actual, usa el selector manual.', e);
      }
    })();
    return () => { alive = false; };
  }, [sp]);

  if (!settings) {
    return <div className={styles.container}>Cargando configuración...</div>;
  }

  return (
    <div className={styles.container}>
          <header className={styles.header}>
            <div>
              <div><strong>Usuario:</strong> {email}</div>
              <div><strong>Rol:</strong> {role}</div>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setView('availability')}>Agendar</button>
              <button onClick={() => setView('ActiveReserves')}>Mis reservas</button>
              {role === 'admin' && (
                <>                  
                  <button onClick={() => setView('cells')}>Celdas</button>
                  <button onClick={() => setView('settings')}>Ajustes</button>
                </>
              )}
              <button onClick={() => { setEmail(null); setRole('user'); }}>Salir</button>
            </div>
          </header>

          {view === 'availability' && <Availability userEmail={email!} />}
          {view === 'cells' && role === 'admin' && <AdminCells />}
          {view === 'settings' && role === 'admin' && <AdminSettings />}
          {view == 'ActiveReserves' && <MisReservas userEmail={email!} />}
    </div>
  );
};

export default App;
