import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RoomService, BookingService } from '../../services/room.service';
import { AuthService } from '../../services/auth.service';
import { Room, Booking as BookingModel } from '../../shared/models';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking.html',
  styleUrls: ['./booking.css'],
})
export class Booking {
  // State
  step = signal<'search' | 'select' | 'confirm'>('search');
  searchForm: FormGroup;
  guestForm: FormGroup;
  availableRooms = signal<Room[]>([]);
  selectedRoom = signal<Room | null>(null);
  loading = signal(false);
  error = signal('');
  bookings = signal<BookingModel[]>([]);

  constructor(
    private fb: FormBuilder,
    private roomService: RoomService,
    private bookingService: BookingService,
    public auth: AuthService
  ) {
    this.searchForm = this.fb.group({
      checkIn: ['', Validators.required],
      checkOut: ['', Validators.required],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      roomType: [''],
    });

    this.guestForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      dateOfBirth: [''],
      nationality: [''],
      specialRequests: [''],
    });

    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getAll().subscribe({
      next: (res) => this.bookings.set(res.data || []),
      error: () => {},
    });
  }

  searchAvailable(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { checkIn, checkOut, adults, children, roomType } = this.searchForm.value;

    this.roomService.checkAvailability({ checkIn, checkOut, adults, type: roomType || undefined }).subscribe({
      next: (res) => {
        this.availableRooms.set(res.data || []);
        this.step.set('select');
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to search rooms');
        this.loading.set(false);
      },
    });
  }

  selectRoom(room: Room): void {
    this.selectedRoom.set(room);
    this.step.set('confirm');
  }

  calculateNights(): number {
    const checkIn = new Date(this.searchForm.get('checkIn')?.value);
    const checkOut = new Date(this.searchForm.get('checkOut')?.value);
    return Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }

  calculateTotal(): number {
    if (!this.selectedRoom()) return 0;
    const nights = this.calculateNights();
    const subtotal = nights * this.selectedRoom()!.pricePerNight;
    const tax = subtotal * 0.12;
    return subtotal + tax;
  }

  completeBooking(): void {
    if (this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      return;
    }

    if (!this.selectedRoom()) return;

    this.loading.set(true);
    this.error.set('');

    // Get or create guest, then create booking
    const guestData = this.guestForm.value;
    const bookingPayload = {
      guest: guestData,
      room: this.selectedRoom()!._id,
      checkIn: this.searchForm.get('checkIn')?.value,
      checkOut: this.searchForm.get('checkOut')?.value,
      adults: this.searchForm.get('adults')?.value,
      children: this.searchForm.get('children')?.value || 0,
      specialRequests: guestData.specialRequests,
      source: 'web',
    };

    // For now, submit as-is. Backend should handle guest creation.
    this.bookingService.create(bookingPayload as any).subscribe({
      next: (res) => {
        this.error.set('');
        alert('Booking confirmed! Reference: ' + (res.data as any).bookingReference);
        this.resetForms();
        this.loadBookings();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Failed to complete booking');
        this.loading.set(false);
      },
    });
  }

  resetForms(): void {
    this.step.set('search');
    this.searchForm.reset({ adults: 1, children: 0 });
    this.guestForm.reset();
    this.selectedRoom.set(null);
    this.availableRooms.set([]);
  }

  goBack(): void {
    if (this.step() === 'select') this.step.set('search');
    else if (this.step() === 'confirm') this.step.set('select');
  }
}
