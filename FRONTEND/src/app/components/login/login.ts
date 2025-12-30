import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(
    private auth: Auth,
    private router: Router
  ) {}

  login() {
    this.error = '';
    this.loading = true;

    // IMPORTANT: Use auth.login2() if that is your working method,
    // otherwise rename login2 -> login inside auth.ts
    this.auth.login2(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/home'); // ✅ opens GIS page
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.message || 'Invalid user_id or password';
      }
    });
  }
}
