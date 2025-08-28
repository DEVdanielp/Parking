export type TurnType = 'Manana (6:00 AM - 12:00 PM)' | 'Tarde (1:00 PM - 6:00PM)' | 'Dia Completo (6:00 AM - 12:00 PM)';
export type VehicleType = 'Carro' | 'Moto';
export type SpotType = 'Carro' | 'Moto';

export interface SPSettings {
  Id: number;
  VisibleDays: number;       // ej: 7
  MaxAdvanceHours: number;   // ej: 72
  MaxUserTurns: number;      // ej: 3
}

export interface SPParkingSpot {
  ID ?: number;
  Title: string;
  TipoCelda: SpotType;
  Activa: string;
  Notas?: string;
}

export interface SPReservation {
  ID: number;
  Title: string;             // Título de la reserva
  Dare: string;      
  Turn: string;
  SpotIdId: number;
  VehicleType: string;      
  Status: string;            
  MotoSlotIndex: number
}

export interface AvailabilityCell {
  spot: SPParkingSpot;
  carBlocked: boolean;
  motoSlotsFree: number;    // 0..4
  isCarAvailable: boolean;
  isMotoAvailable: boolean;
}
