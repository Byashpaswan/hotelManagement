import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environment/environment.dev';
import { User, AuthResponse, LoginPayload, RegisterPayload } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'hotel_access_token';
  private readonly REFRESH_KEY = 'hotel_refresh_token';

  // Angular 19 signals for reactive state
  private _currentUser = signal<User | null>(this.loadStoredUser());
  private _loading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());
  readonly userRole = computed(() => this._currentUser()?.role);
  readonly isAdmin = computed(() => this.userRole() === 'admin');
  readonly isManager = computed(() => ['admin', 'manager'].includes(this.userRole() || ''));
  readonly loading = this._loading.asReadonly();

  constructor(private http: HttpClient, private router: Router) {}

  login(payload: LoginPayload): Observable<AuthResponse> {
    this._loading.set(true);
    return this.http.post<AuthResponse>(`${this.API}/login`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res)),
      catchError((err) => { this._loading.set(false); return throwError(() => err); })
    );
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API}/register`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res))
    );
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post(`${this.API}/logout`, { refreshToken }).pipe(
      tap(() => this.clearSession()),
      catchError(() => { this.clearSession(); return throwError(() => null); })
    );
  }

  refreshToken(): Observable<{ data: { accessToken: string } }> {
    return this.http.post<any>(`${this.API}/refresh-token`, {
      refreshToken: this.getRefreshToken(),
    }).pipe(
      tap((res) => this.setAccessToken(res.data.accessToken))
    );
  }

  getMe(): Observable<{ data: { user: User } }> {
    return this.http.get<any>(`${this.API}/me`).pipe(
      tap((res) => this._currentUser.set(res.data.user))
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  setAccessToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  hasRole(...roles: string[]): boolean {
    return roles.includes(this.userRole() || '');
  }

  private handleAuthSuccess(res: AuthResponse): void {
    this._loading.set(false);
    const { user, accessToken, refreshToken } = res.data;
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(this.REFRESH_KEY, refreshToken);
    localStorage.setItem('hotel_user', JSON.stringify(user));
    this._currentUser.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem('hotel_user');
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private loadStoredUser(): User | null {
    try {
      const raw = localStorage.getItem('hotel_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}