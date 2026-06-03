import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.dev';
import { Room, Guest, Booking, ApiResponse, BookingStats, RoomStats } from '../shared/models';

// ============================================================
// ROOM SERVICE
// ============================================================
@Injectable({ providedIn: 'root' })
export class RoomService {
  private API = `${environment.apiUrl}/rooms`;
  constructor(private http: HttpClient) {}

  getAll(params: Record<string, any> = {}): Observable<ApiResponse<Room[]>> {
    return this.http.get<ApiResponse<Room[]>>(this.API, { params: this.toParams(params) });
  }

  getById(id: string): Observable<ApiResponse<Room>> {
    return this.http.get<ApiResponse<Room>>(`${this.API}/${id}`);
  }

  create(data: Partial<Room>): Observable<ApiResponse<Room>> {
    return this.http.post<ApiResponse<Room>>(this.API, data);
  }

  update(id: string, data: Partial<Room>): Observable<ApiResponse<Room>> {
    return this.http.patch<ApiResponse<Room>>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  updateStatus(id: string, status: string): Observable<ApiResponse<Room>> {
    return this.http.patch<ApiResponse<Room>>(`${this.API}/${id}/status`, { status });
  }

  checkAvailability(params: { checkIn: string; checkOut: string; type?: string; adults?: number }): Observable<ApiResponse<Room[]>> {
    return this.http.get<ApiResponse<Room[]>>(`${this.API}/availability`, { params: this.toParams(params) });
  }

  getStats(): Observable<ApiResponse<RoomStats>> {
    return this.http.get<ApiResponse<RoomStats>>(`${this.API}/stats`);
  }

  private toParams(obj: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => { if (v !== null && v !== undefined) params = params.set(k, v); });
    return params;
  }
}

// ============================================================
// GUEST SERVICE
// ============================================================
@Injectable({ providedIn: 'root' })
export class GuestService {
  private API = `${environment.apiUrl}/guests`;
  constructor(private http: HttpClient) {}

  getAll(params: Record<string, any> = {}): Observable<ApiResponse<Guest[]>> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p = p.set(k, v); });
    return this.http.get<ApiResponse<Guest[]>>(this.API, { params: p });
  }

  getById(id: string): Observable<ApiResponse<Guest>> {
    return this.http.get<ApiResponse<Guest>>(`${this.API}/${id}`);
  }

  create(data: Partial<Guest>): Observable<ApiResponse<Guest>> {
    return this.http.post<ApiResponse<Guest>>(this.API, data);
  }

  update(id: string, data: Partial<Guest>): Observable<ApiResponse<Guest>> {
    return this.http.patch<ApiResponse<Guest>>(`${this.API}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  getBookings(id: string): Observable<ApiResponse<Booking[]>> {
    return this.http.get<ApiResponse<Booking[]>>(`${this.API}/${id}/bookings`);
  }
}

// ============================================================
// BOOKING SERVICE
// ============================================================
@Injectable({ providedIn: 'root' })
export class BookingService {
  private API = `${environment.apiUrl}/bookings`;
  constructor(private http: HttpClient) {}

  getAll(params: Record<string, any> = {}): Observable<ApiResponse<Booking[]>> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v) p = p.set(k, v); });
    return this.http.get<ApiResponse<Booking[]>>(this.API, { params: p });
  }

  getById(id: string): Observable<ApiResponse<Booking>> {
    return this.http.get<ApiResponse<Booking>>(`${this.API}/${id}`);
  }

  create(data: Partial<Booking>): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(this.API, data);
  }

  checkIn(id: string): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(`${this.API}/${id}/check-in`, {});
  }

  checkOut(id: string): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(`${this.API}/${id}/check-out`, {});
  }

  cancel(id: string, reason: string): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(`${this.API}/${id}/cancel`, { cancellationReason: reason });
  }

  addPayment(id: string, payment: { amount: number; method: string; transactionId?: string }): Observable<ApiResponse<Booking>> {
    return this.http.post<ApiResponse<Booking>>(`${this.API}/${id}/payments`, payment);
  }

  getStats(): Observable<ApiResponse<BookingStats>> {
    return this.http.get<ApiResponse<BookingStats>>(`${this.API}/stats`);
  }
}