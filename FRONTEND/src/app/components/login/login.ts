import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

type Step = 'LOGIN' | 'OTP';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginStep: Step = 'LOGIN';

  // Step 1
  username = '';
  password = '';
  consent = false;

  // Step 2
  otp = '';

  // UI
  loading = false;
  error = '';
  infoMsg = ''; // ✅ show backend message like fallback info
  showPassword = false;

  constructor(private auth: Auth, private router: Router) {}

  // STEP 1: validate credentials + send OTP
login() {
  if (!this.username || !this.password) {
    this.error = 'Please enter User ID and Password';
    return;
  }
  if (!this.consent) {
    this.error = 'Please accept Privacy Policy and Terms of Use';
    return;
  }

  // ✅ INSTANT redirect inside same card
  this.loginStep = 'OTP';
  this.loading = true;
  this.error = '';
  this.infoMsg = 'Connecting… Sending OTP to registered email (or fallback mailbox due to policy).';
  this.otp = '';

  this.auth.requestOtp(this.username, this.password).subscribe({
    next: (res: any) => {
      this.loading = false;

      if (res?.success) {
        // keep OTP screen
        this.infoMsg = res?.message || this.infoMsg;
      } else {
        // ❌ If login credentials wrong or OTP send failed
        this.error = res?.message || res?.error || 'Invalid user ID or password';
        this.loginStep = 'LOGIN';
      }
    },
    error: (err) => {
      this.loading = false;
      this.error = err?.error?.message || 'Server error during login';
      this.loginStep = 'LOGIN';
    }
  });
}


  // STEP 2: verify OTP -> redirect
  verifyOtp() {
    if (!this.otp || this.otp.trim().length < 4) {
      this.error = 'Please enter valid OTP';
      return;
    }

    if (this.loading) return;


    this.loading = true;
    this.error = '';

    this.auth.verifyOtp(this.username, this.otp.trim()).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.success) {
          // Auth service already stores localStorage fields.
          this.router.navigateByUrl('/dashboard');
        } else {
          this.error = res?.message || res?.error || 'Invalid OTP';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Server error during OTP verification';
      },
    });
  }

  backToLogin() {
    this.loginStep = 'LOGIN';
    this.otp = '';
    this.error = '';
    this.infoMsg = '';
    this.loading = false;
  }

  resendOtp() {
    this.loading = true;
    this.error = '';
    this.infoMsg = '';

    // DB-based OTP resend only needs user_id
    this.auth.resendOtp(this.username).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.success) {
          this.infoMsg = res?.message || 'OTP resent.';
        } else {
          this.error = res?.message || res?.error || 'Failed to resend OTP';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Server error while resending OTP';
      },
    });
  }
}
