
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService, RoomService } from '../../services/room.service';
import { BookingStats, RoomStats } from '../../shared/models';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit {
  bookingStats = signal<BookingStats | null>(null);
  roomStats = signal<RoomStats | null>(null);
  today = new Date();
  currentUser: any;

  occupancyRate = () => {
    const byStatus = this.roomStats()?.byStatus || [];
    const total = byStatus.reduce((s, i) => s + i.count, 0);
    const occupied = byStatus.find(s => s._id === 'occupied')?.count || 0;
    return total ? Math.round((occupied / total) * 100) : 0;
  };

  constructor(
    private bookingService: BookingService,
    private roomService: RoomService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.currentUser;
    this.bookingService.getStats().subscribe((res: any) => this.bookingStats.set(res.data));
    this.roomService.getStats().subscribe((res: any) => this.roomStats.set(res.data));
  }

  formatStatus(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}