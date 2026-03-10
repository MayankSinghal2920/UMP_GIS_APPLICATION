import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Api } from 'src/app/services/api';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagementComponent implements OnInit {

  users: any[] = [];

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

        this.calculateStats();
        console.log('Users loaded:', this.users);
         this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Failed to load users', err);
      }
    });

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


}