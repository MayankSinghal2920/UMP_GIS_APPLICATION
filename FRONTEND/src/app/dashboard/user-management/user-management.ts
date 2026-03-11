import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from 'src/app/services/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagementComponent implements OnInit {

  users: any[] = [];
  filteredUsers: any[] = [];
  searchText: string = '';
  activeRoleFilter: string = 'Total';

  stats = [
    { label: 'Total', value: 0 },
    { label: 'Admin', value: 0 },
    { label: 'Maker', value: 0 },
    { label: 'Checker', value: 0 },
    { label: 'Approver', value: 0 },
    { label: 'User', value: 0 }
  ];

  constructor(private api: Api, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {

    this.api.getUsers().subscribe({
      next: (res) => {

        this.users = res || [];
        this.filteredUsers = [...this.users];

        this.calculateStats();

         this.cdr.detectChanges();

        console.log('Users loaded:', this.users);

      },
      error: (err) => {
        console.error('Failed to load users', err);
      }
    });

  }

  searchUsers(): void {

    const term = this.searchText.toLowerCase().trim();

    if (!term) {
      this.filteredUsers = [...this.users];
      return;
    }

    this.filteredUsers = this.users.filter(user =>
      user.user_name?.toLowerCase().includes(term) ||
      user.user_type?.toLowerCase().includes(term) ||
      user.zone?.toLowerCase().includes(term) ||
      user.division?.toLowerCase().includes(term) ||
      user.designation?.toLowerCase().includes(term) ||
      user.hrmsid?.toLowerCase().includes(term)
    );

  }

  calculateStats() {

    const counts: any = {
      Total: this.users.length,
      Admin: 0,
      Maker: 0,
      Checker: 0,
      Approver: 0,
      User: 0
    };

    this.users.forEach(user => {
      if (counts[user.user_type] !== undefined) {
        counts[user.user_type]++;
      }
    });

    this.stats = [
      { label: 'Total', value: counts.Total },
      { label: 'Admin', value: counts.Admin },
      { label: 'Maker', value: counts.Maker },
      { label: 'Checker', value: counts.Checker },
      { label: 'Approver', value: counts.Approver },
      { label: 'User', value: counts.User }
    ];

  }

  trackById(index: number, item: any) {
  return item.objectid;
}

filterByRole(role: string) {

  this.activeRoleFilter = role;

  if (role === 'Total') {
    this.filteredUsers = [...this.users];
    return;
  }

  this.filteredUsers = this.users.filter(user => user.user_type === role);

}

}