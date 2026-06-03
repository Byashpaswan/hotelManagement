import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RoomService } from '../../services/room.service';
import { AuthService } from '../../services/auth.service';
import { Room, RoomStatus, RoomType } from '../../shared/models';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rooms.html',
  styleUrls: ['./rooms.css'],
})
export class Rooms {
  rooms = signal<Room[]>([]);
  loading = signal(false);
  error = signal('');
  showAdd = signal(false);
  addForm: FormGroup;

  readonly statuses: RoomStatus[] = ['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'];
  readonly types: RoomType[] = ['single','double','twin','suite','deluxe','presidential'];

  constructor(private roomService: RoomService, public auth: AuthService, private fb: FormBuilder) {
    this.addForm = this.fb.group({
      roomNumber: ['', [Validators.required]],
      floor: [1, [Validators.required, Validators.min(0)]],
      type: ['single', [Validators.required]],
      pricePerNight: [0, [Validators.required, Validators.min(0)]],
      adults: [1, [Validators.required, Validators.min(1)]],
      children: [0, [Validators.min(0)]],
      amenities: [''],
      images: [''],
      description: [''],
      isSmokingAllowed: [false],
      isPetFriendly: [false],
      hasBalcony: [false]
    });
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading.set(true);
    this.error.set('');
    this.roomService.getAll().subscribe({
      next: (res) => { this.rooms.set(res.data || []); this.loading.set(false); },
      error: (err) => { this.error.set(err?.message || 'Failed to load rooms'); this.loading.set(false); }
    });
  }

  openAdd(): void { this.showAdd.set(true); }
  closeAdd(): void { this.showAdd.set(false); this.addForm.reset({ floor:1, type:'single', pricePerNight:0, adults:1, children:0 }); }

  submitAdd(): void {
    if (!(this.auth.isAdmin() || this.auth.isManager())) {
      this.error.set('You are not authorized to add rooms.');
      return;
    }

    if (this.addForm.invalid) { this.addForm.markAllAsTouched(); return; }
    const raw = this.addForm.value;
    const payload: any = {
      roomNumber: raw.roomNumber,
      floor: raw.floor,
      type: raw.type,
      pricePerNight: Number(raw.pricePerNight),
      capacity: { adults: Number(raw.adults), children: Number(raw.children) },
      amenities: raw.amenities ? raw.amenities.split(',').map((s: string) => ({ name: s.trim() })).filter((a: any) => a.name) : [],
      images: raw.images ? raw.images.split(',').map((s: string) => s.trim()).filter((i: string) => i) : [],
      description: raw.description,
      isSmokingAllowed: !!raw.isSmokingAllowed,
      isPetFriendly: !!raw.isPetFriendly,
      hasBalcony: !!raw.hasBalcony
    };

    this.roomService.create(payload).subscribe({
      next: (res) => {
        const created: Room = res.data;
        this.rooms.set([created, ...this.rooms()]);
        this.closeAdd();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to create room';
        this.error.set(msg);
      }
    });
  }

  changeStatus(id: string, status: RoomStatus): void {
    this.roomService.updateStatus(id, status).subscribe({
      next: (res) => {
        const updated = res.data;
        this.rooms.set(this.rooms().map(r => r._id === updated._id ? updated : r));
      },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to update status'); }
    });
  }

  deleteRoom(id: string): void {
    if (!confirm('Delete this room?')) return;
    this.roomService.delete(id).subscribe({
      next: () => { this.rooms.set(this.rooms().filter(r => r._id !== id)); },
      error: (err) => { this.error.set(err?.error?.message || 'Failed to delete room'); }
    });
  }
}
