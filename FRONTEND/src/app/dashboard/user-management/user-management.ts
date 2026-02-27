import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding:20px">
      <h2>User Management</h2>
      <p>Admin Panel</p>
    </div>
  `
})
export class UserManagementComponent {}
