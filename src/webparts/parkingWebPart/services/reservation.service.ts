import { SpService } from './sp-service';
import type {
  SPReservation, SPParkingSpot, SPSettings,
  AvailabilityCell, TurnType, VehicleType
} from '../types';
import { SpotsService } from './spots.service';

type ResCfg = { webUrl: string; listTitle?: string; listId?: string };
const MOTO_SLOTS = 4;

export class ReservationsService {
  constructor(private sp: SpService, private spotsSvc: SpotsService, private cfg: ResCfg) {}

  //Funcion que apunta a lista indicada
  private items() {
    const { webUrl, listId, listTitle } = this.cfg;
    return listId ? this.sp.itemsById(listId, webUrl) : this.sp.items(listTitle!, webUrl);
  }

  //Obtener turnos por la fecha indicada
  async getByDateTurn(date: string, turn: TurnType): Promise<SPReservation[]> {
    const filter = `Date eq '${date}' and Turn eq '${turn}' and Status eq 'Activa'`;
    const items = await this.items()
      .select('ID','Title','Date','Turn','SpotIdId','VehicleType','Status')
      .filter(filter)();
    return items as SPReservation[];
  }

  //Funcion para crear una reserva
  async create(dto: {
    Title: string;
    Date: string;  
    Turn: string;
    SpotIdId: number; //ID de la celda en la que se reservo
    VehicleType: string;
    Status?: 'Activa' | 'Cancelada';
  }) {
    if (!dto.Status) dto.Status = 'Activa';
    console.log(dto)
    return this.items().add(dto);
  }

  async cancel(id: number) {
    return this.items().getById(id).update({ Status: 'Cancelada' });
  }

  //Funcion para obtener celdas disponibles
  async getAvailability(date: string, turn: TurnType): Promise<AvailabilityCell[]> {

  // Traemos todas las reservas ACTIVAS del día
  const [spots, allRes] = await Promise.all([
    this.spotsSvc.all(),
    this.getByDateAll(date),
  ]);

  // Mapas por celda
  const bySpotAll = new Map<number, SPReservation[]>();
  for (const r of allRes) {
    const arr = bySpotAll.get(r.SpotIdId) ?? [];
    arr.push(r);
    bySpotAll.set(r.SpotIdId, arr);
  }

  const cells: AvailabilityCell[] = spots
    .filter(s => s.Activa === "Activa")
    .map(s => {
      const listAll = bySpotAll.get(s.ID!) ?? [];

      // ¿Existe una reserva "Día Completo" para esta celda (cualquier vehículo)?
      const hasFullDay = listAll.some(x => x.Turn === 'Dia Completo (6:00 AM - 12:00 PM)');

      // Reservas SOLO del turno solicitado (mañana/tarde)
      const listThisTurn = listAll.filter(x => x.Turn === turn);

      if (hasFullDay) {
        // Día completo bloquea todo
        return {
          spot: s,
          carBlocked: true,
          motoSlotsFree: 0,
          isCarAvailable: false,
          isMotoAvailable: false,
        };
      }

      // --- Lógica por tipo de celda cuando NO hay día completo ---
      if (s.TipoCelda === "Carro") {
        const hasCarThisTurn = listThisTurn.some(x => x.VehicleType === "Carro");
        return {
          spot: s,
          carBlocked: hasCarThisTurn,
          motoSlotsFree: 0,
          isCarAvailable: !hasCarThisTurn,
          isMotoAvailable: false,
        };
      }

      if (s.TipoCelda === "Moto") {
        const fullMotoCount = listAll.filter(x => x.VehicleType === 'Moto' && x.Turn === 'Dia Completo (6:00 AM - 12:00 PM)').length;
        const motoTurnCount = listThisTurn.filter(x => x.VehicleType === 'Moto').length;
        const motoFree = Math.max(0, MOTO_SLOTS - (motoTurnCount + fullMotoCount));
        return {
          spot: s,
          carBlocked: true,          // celda moto nunca admite carro
          motoSlotsFree: motoFree,
          isCarAvailable: false,
          isMotoAvailable: motoFree > 0,
        };
      }

      // Fallback tipo desconocido
      return {
        spot: s,
        carBlocked: true,
        motoSlotsFree: 0,
        isCarAvailable: false,
        isMotoAvailable: false,
      };
    });

  return cells;
}

  //Funcion para obtener las reservas de un usuario
  async getUserReserves(userEmail: string, initial?: string, final?: string){
    const initialDate = new Date(initial + 'T00:00:00');
    const finalDate = new Date(final + 'T00:00:00');
    const startIso = initialDate.toISOString();
    const endIso   = finalDate.toISOString();
    const filter = `Title eq '${userEmail}' and Status eq 'Activa' ` + `and Date ge datetime'${startIso}' and Date lt datetime'${endIso}'`;;  // Filtro de reservas activas para el dia en el que intenta reservar
    const items = await this.items().select('Date', 'Turn', 'SpotId/Title', 'VehicleType', 'Status').filter(filter).expand('SpotId')();  // Obtiene los items que coincidan con el filtro
    return items as SPReservation[];  // Devuelve el número de reservas activas
  }

  //Funcion para hacer validaciones antes de agendar
  async validateBeforeCreate(date: string,turn: TurnType, userEmail: string, vehicle: VehicleType, spot: SPParkingSpot, settings: SPSettings) {

    // Constantes de turnos 
    const MORNING_TURN: TurnType   = 'Manana (6:00 AM - 12:00 PM)' as TurnType;
    const AFTERNOON_TURN: TurnType = 'Tarde (1:00 PM - 6:00PM)' as TurnType;
    const FULL_DAY_TURN: TurnType  = 'Dia Completo (6:00 AM - 12:00 PM)' as TurnType;

    //Validaciones de fecha y ventana visible
    const now = new Date();
    const todayLocal = new Date(now.toDateString()); // 00:00 local
    const target = new Date(date + 'T00:00:00');
    if (target < todayLocal) {
      throw new Error('La fecha debe ser hoy o futura.');
    }

    // Verifica que la celda exista y esté activa ese día/turno
    const avail = await this.getAvailability(date, turn);
    const cell = avail.find(a => a.spot.ID === spot.ID);
    if (!cell) {
      throw new Error('Celda no encontrada o inactiva.');
    }

    // Trae TODAS las reservas activas del día (sin filtrar por turno) de esa lista
    const resAll = await this.getByDateAll(date)
    const listForSpot = (resAll as SPReservation[]).filter(r => r.SpotIdId === spot.ID);

    // Reglas por tipo de vehículo
    if (vehicle === 'Carro') {
      // Día completo de carro bloquea ambos turnos
      const anyFullCar = listForSpot.some(r => r.VehicleType === 'Carro' && r.Turn === FULL_DAY_TURN);

       if (turn === FULL_DAY_TURN) {
        const anyCarThatDay = listForSpot.some(r => r.VehicleType === 'Carro');
        if (anyCarThatDay) {
          throw new Error('Ya hay reservas de carro este día en esta celda; no se puede reservar día completo.');
        }
      } else {
        // Mañana y tarde no se bloquean entre sí, pero "día completo" sí bloquea
        if (anyFullCar) {
          throw new Error('La celda tiene una reserva de día completo para carro.');
        }
        const carThisTurn = listForSpot.some(r => r.VehicleType === 'Carro' && r.Turn === turn);
        if (carThisTurn) {
          throw new Error('Ya existe una reserva de carro en este turno para esta celda.');
        }
      }
    } else if (vehicle === 'Moto') {
      // Día completo de moto cuenta como 1 cupo del día y afecta ambos turnos
      const fullMotoCount = listForSpot.filter(r =>
        r.VehicleType === 'Moto' && r.Turn === FULL_DAY_TURN
      ).length;

      if (turn === FULL_DAY_TURN) {
        // Para reservar día completo en moto, debe haber cupo simultáneo en mañana y tarde
        const motoMorningCount = listForSpot.filter(r =>
          r.VehicleType === 'Moto' && r.Turn === MORNING_TURN
        ).length;
        const motoAfternoonCount = listForSpot.filter(r =>
          r.VehicleType === 'Moto' && r.Turn === AFTERNOON_TURN
        ).length;

        const wouldBeMorning   = motoMorningCount   + fullMotoCount + 1; 
        const wouldBeAfternoon = motoAfternoonCount + fullMotoCount + 1;

        if (wouldBeMorning > MOTO_SLOTS || wouldBeAfternoon > MOTO_SLOTS) {
          throw new Error('No hay cupo suficiente para una reserva de día completo en moto.');
        }
      } else {
        const motoTurnCount = listForSpot.filter(r =>
          r.VehicleType === 'Moto' && r.Turn === turn
        ).length;

        const effectiveCount = motoTurnCount + fullMotoCount; // << lo que pediste
        if (effectiveCount >= MOTO_SLOTS) {
          throw new Error('El estacionamiento de motos no tiene cupos para este turno.');
        }
      }
    }

    // Una reserva diaria por usuario 
    const activeReservations = await this.getUserActiveCount(userEmail, date);
    if (activeReservations >= 1) {
      throw new Error('Ya tienes una reserva activa para este día.');
    }
}

//Funcion para contar la cantidad de reservas de un usuario
  async getUserActiveCount(userEmail: string, dateStr: string): Promise<number> {
    const start = new Date(`${dateStr}T00:00:00Z`);          // inicio día en UTC
    const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000); // día siguiente
    const startIso = start.toISOString();
    const endIso   = end.toISOString();

    const filter = `Title eq '${userEmail}' and Status eq 'Activa' ` + `and Date ge datetime'${startIso}' and Date lt datetime'${endIso}'`;;  // Filtro de reservas activas para el dia en el que intenta reservar
    const items = await this.items().select('Id').filter(filter)();  // Obtiene los items que coincidan con el filtro
    return items.length;  // Devuelve el número de reservas activas
  }

  //Funcion para todas las reservas de un dia 
  private async getByDateAll(date: string): Promise<SPReservation[]> {
    const filter = `Date eq '${date}' and Status eq 'Activa'`;
    const items = await this.items()
      .select('ID','Title','Date','Turn','SpotIdId','VehicleType','Status')
      .filter(filter)();
    return items as SPReservation[];
  }
}
