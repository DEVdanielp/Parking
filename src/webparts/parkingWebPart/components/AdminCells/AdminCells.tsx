import * as React from 'react';
import styles from './AdminCells.module.scss';
import { useDeps } from '../../context/AppProviders';
import type { SPParkingSpot } from '../../types';

const AdminCells: React.FC = () => {
  const { spotsSvc } = useDeps(); 
  const [list, setList] = React.useState<SPParkingSpot[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    Title: '',
    TipoCelda: 'Carro' as 'Carro' | 'Moto',
    Activa: 'Activa' as 'Activa' | 'No Activa',  
    Notes: ''
  });
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;


  // Funcion para actualizar el formulario
  setForm(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  //Funcion para invocar funcion "AddSlot"
  const handleAddSpot = async () => {
    try {
      const newSpot: SPParkingSpot = {
        Title: form.Title,
        TipoCelda: form.TipoCelda,
        Activa: form.Activa, 
        Notas: form.Notes,
      };

      const result = await spotsSvc.addSlot(newSpot); 
      console.log("Spot agregado:", result);
      alert("Spot agregado con éxito");
      load(); // Recarga la lista de spots
    } catch (e) {
      console.error("Error al agregar spot:", e);
      alert("Error al agregar spot");
    }
  };

  //Funcion para cargar los elementos de la bd
  const load = React.useCallback(async () => {
    setLoading(true);  // Indicador para el spinner de carga
    try {
      setList(await spotsSvc.all());  // Cargar la lista de spots
    }
    finally {
      setLoading(false); // Quitar indicador para el spinner de carga
    }
  }, [spotsSvc]);

  React.useEffect(() => { load(); }, [load]);  // Cargar los spots al cargar el componente

  return (
    <div className={styles.wrapper}>
      <h3>Listado</h3>

      {loading ? (
        'Cargando...'
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Codigo de celda</th>
              <th>Tipo de celda</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {list.map(s => (
              <tr key={s.ID}>
                <td>{s.Title}</td>
                <td>{s.TipoCelda}</td>
                <td>{s.Activa === 'Activa' ? 'Activo' : 'No activo'}</td>
                <td>
                  <button
                    className={styles.btnLight}
                    onClick={async () => {
                      try {
                        if (await spotsSvc.UpdateSlotStatus(s.ID!, s.Activa, s.Title)) {
                          alert(
                            `Se ha ${s.Activa === 'Activa' ? 'desactivado' : 'activado'} con éxito la celda`
                          );
                          load();
                        }
                      } catch {
                        alert('Ha ocurrido un error, por favor vuelva a intentarlo');
                      }
                    }}
                  >
                    {s.Activa === 'Activa' ? 'Desactivar' : 'Activar'}
                  </button>

                  <button
                    className={styles.btnDanger}
                    onClick={async () => {
                      try {
                        await spotsSvc.deleteSlote(s.ID!);
                        alert('Se ha eliminado con éxito');
                        load();
                      } catch {
                        alert('Ha ocurrido un error');
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}


      <h3>Nueva celda</h3>

      <div className={styles.form}>
        <label>
          Codigo
          <input
            name="Title"
            value={form.Title}
            onChange={handleChange}
            placeholder="Ej. C-12"
          />
        </label>

        <label>
          Celda para
          <select name="TipoCelda" value={form.TipoCelda} onChange={handleChange}>
            <option value="Carro">Carro</option>
            <option value="Moto">Moto</option>
          </select>
        </label>

        <label>
          Estado
          <select name="Activa" value={form.Activa} onChange={handleChange}>
            <option value="Activa">Activa</option>
            <option value="No Activa">No Activa</option>
          </select>
        </label>

        <label>
          Notas
          <textarea
            name="Notes"
            value={form.Notes}
            onChange={handleChange}
            placeholder="Ej. Celda techada"
          />
        </label>

        <button className={styles.btn} onClick={handleAddSpot}>
          Agregar
        </button>
      </div>

    </div>
  );
};

export default AdminCells;
