
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GuestService } from '../../services/room.service';
import { Guest } from '../../shared/models';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-guest',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './guest.html',
  styleUrls: ['./guest.css'],
})
export class GuestComponent implements OnInit {

  guests = signal<Guest[]>([]);
  loading = signal(true);
  showModal = signal(false);
  editingGuest = signal<Guest | null>(null);
  saving = signal(false);
  formError = signal('');
  private allGuests: Guest[] = [];
  guestForm: FormGroup;

  constructor(private guestService: GuestService, public auth: AuthService, private fb: FormBuilder) {
    this.guestForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      nationality: [''],
      vipStatus: ['none'],
    });
  }

  ngOnInit(): void { this.loadGuests(); }

  loadGuests(): void {
    this.loading.set(true);
    this.guestService.getAll({ limit: 100 }).subscribe({
      next: (res) => { this.allGuests = res.data; this.guests.set(res.data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  search(val: string): void {
    const q = val.toLowerCase();
    this.guests.set(q
      ? this.allGuests.filter(g =>
          g.fullName?.toLowerCase().includes(q) || g.email.includes(q) || g.phone.includes(q))
      : this.allGuests);
  }

  filterVip(val: string): void {
    this.guests.set(val ? this.allGuests.filter(g => g.vipStatus === val) : this.allGuests);
  }

  openModal(guest?: Guest): void {
    this.editingGuest.set(guest || null);
    if (guest) this.guestForm.patchValue(guest);
    else this.guestForm.reset({ vipStatus: 'none' });
    this.formError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  saveGuest(): void {
    if (this.guestForm.invalid) return;
    this.saving.set(true);
    const op = this.editingGuest()
      ? this.guestService.update(this.editingGuest()!._id, this.guestForm.value)
      : this.guestService.create(this.guestForm.value);

    op.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.loadGuests(); },
      error: (err) => { this.saving.set(false); this.formError.set(err.error?.message || 'Failed'); },
    });
  }

  toggleBlacklist(guest: Guest): void {
    const reason = guest.isBlacklisted ? '' : prompt('Reason for blacklisting:') || 'Policy violation';
    this.guestService.update(guest._id, { isBlacklisted: !guest.isBlacklisted, blacklistReason: reason } as any).subscribe({
      next: () => this.loadGuests(),
    });
  }
}