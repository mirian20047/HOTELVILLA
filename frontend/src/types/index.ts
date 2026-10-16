export interface Usuario {
  id_usuario: number;
  username: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  estado: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: Usuario;
}

export interface Cliente {
  id_cliente: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email?: string;
  telefono?: string;
  nacionalidad?: string;
  tipo_cliente?: string;
  estado: string;
}

export interface Habitacion {
  id_habitacion: number;
  numero_habitacion: string;
  id_tipo_habitacion: number;
  piso: number;
  estado_actual: string;
}

export interface Reserva {
  id_reserva: number;
  codigo_reserva: string;
  fecha_entrada: string;
  fecha_salida: string;
  canal_reserva: string;
  estado_reserva: string;
  id_cliente: number;
  id_tipo_habitacion: number;
  fecha_registro: string;
}

export interface Huesped {
  id_hospedaje: number;
  id_reserva: number;
  id_cliente: number;
  id_habitacion: number;
  fecha_checkin: string;
  fecha_checkout?: string;
  estado_hospedaje: string;
  id_usuario_checkin: number;
  id_usuario_checkout?: number;
}