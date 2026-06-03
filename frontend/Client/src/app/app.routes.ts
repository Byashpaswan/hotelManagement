import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './middlware/guard-guard';

export const routes: Routes = [
	{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
	{
		path: 'auth',
		children: [
			{
				path: 'login',
				loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
				canActivate: [publicGuard]
			},
			{
				path: 'register',
				loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
				canActivate: [publicGuard]
			},
			{ path: '', redirectTo: 'login', pathMatch: 'full' }
		]
	},
	{
		path: 'dashboard',
		loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
		canActivate: [authGuard]
	},
	{
		path: 'rooms',
		loadComponent: () => import('./features/rooms/rooms').then(m => m.Rooms),
		canActivate: [authGuard]
	},
	{
		path: 'guests',
		loadComponent: () => import('./features/guest/guest').then(m => m.GuestComponent),
		canActivate: [authGuard]
	},
	{
		path: 'bookings',
		loadComponent: () => import('./features/booking/booking').then(m => m.Booking),
		canActivate: [authGuard]
	},
	{ path: '**', redirectTo: 'dashboard' }
];
