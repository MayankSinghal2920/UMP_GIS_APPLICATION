import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Api } from 'src/app/api/api';
import { CurrentUserService } from 'src/app/services/current-user';

type SuperAdminTab =
  | 'all'
  | 'super-admin'
  | 'zonal'
  | 'divisional'
  | 'board'
  | 'cris'
  | 'pu'
  | 'cti';

type SummaryCard = {
  label: string;
  unitType: string;
  counts: Array<{ role: string; value: number }>;
};

type TabConfig = {
  key: SuperAdminTab;
  label: string;
};

@Component({
  selector: 'app-super-admin-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-user-management.html',
  styleUrl: './super-admin-user-management.css',
})
export class SuperAdminUserManagementComponent implements OnInit {
  users: any[] = [];
  loading = false;
  error = '';
  searchText = '';
  activeTab: SuperAdminTab = 'all';
  pageSize = 12;
  currentPage = 1;

  readonly tabs: TabConfig[] = [
    { key: 'all', label: 'User List' },
    { key: 'super-admin', label: 'Super Admin List' },
    { key: 'zonal', label: 'Zonal List' },
    { key: 'divisional', label: 'Divisional List' },
    { key: 'board', label: 'Board List' },
    { key: 'cris', label: 'CRIS List' },
    { key: 'pu', label: 'PU List' },
    { key: 'cti', label: 'CTI List' },
  ];

  constructor(
    private api: Api,
    private currentUser: CurrentUserService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get currentUserName(): string {
    return this.currentUser.getSnapshot()?.user_name || 'Super Admin';
  }

  get currentUserRole(): string {
    return this.currentUser.getSnapshot()?.user_type || 'Super Admin';
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get superAdminCount(): number {
    return this.users.filter((user) => this.normalizeText(user.user_type) === 'super admin').length;
  }

  get filteredUsers(): any[] {
    const term = this.normalizeText(this.searchText);

    return this.users.filter((user) => {
      if (!this.matchesTab(user)) return false;
      if (!term) return true;

      return [
        user.user_name,
        user.user_type,
        user.unit_type,
        user.unit_name,
        user.zone,
        user.division,
        user.department_id,
        user.hrmsid,
        user.designation,
        user.user_id,
      ].some((value) => this.normalizeText(value).includes(term));
    });
  }

  get paginatedUsers(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
  }

  get summaryCards(): SummaryCard[] {
    const unitTypes = ['Zonal', 'Divisional', 'Board', 'CRIS', 'PU', 'CTI'];

    return unitTypes
      .map((unitType) => this.buildSummaryCard(unitType))
      .filter((card) => card.counts.some((item) => item.value > 0));
  }


  get createUserUnitTypeOptions(): string[] {
    switch (this.normalizeText(this.createUserForm.user_type)) {
      case 'checker':
      case 'maker':
      case 'approver':
        return ['Divisional', 'PUs', 'Metro Kolkata'];
      case 'admin':
        return ['Divisional', 'Board', 'CRIS', 'PUs', 'Metro Kolkata'];
      case 'super admin':
        return ['CRIS'];
      default:
        return [];
    }
  }

  get createUserRequiresOrgFields(): boolean {
    return ['checker', 'maker', 'approver'].includes(this.normalizeText(this.createUserForm.user_type));
  }

  get createUserUsesPuField(): boolean {
    return this.createUserRequiresOrgFields && this.normalizeUnitType(this.createUserForm.unit_type) === 'pu';
  }

  get createUserUsesMetroMinimalFields(): boolean {
    return this.createUserRequiresOrgFields && this.normalizeText(this.createUserForm.unit_type) === 'metro kolkata';
  }

  get createZoneOptions(): string[] {
    return this.getDistinctValues(this.users.map((user) => user.zone));
  }

  get createDivisionOptions(): string[] {
    return this.getDivisionOptionsForZone(this.createUserForm.zone);
  }

  get createDepartmentOptions(): string[] {
    return this.getDistinctValues(this.users.map((user) => user.department_id));
  }

  get createPuOptions(): string[] {
    return this.getDistinctValues(
      this.users
        .filter((user) => this.normalizeUnitType(user.unit_type) === 'pu')
        .map((user) => user.unit_name),
    );
  }

  get isEditUserMode(): boolean {
    return this.editingUserObjectId !== null && this.editingUserObjectId !== undefined;
  }


  trackByUser(index: number, user: any) {
    return user.objectid || user.user_id || index;
  }

  setActiveTab(tab: SuperAdminTab): void {
    this.activeTab = tab;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.api.getSuperAdminUsers().subscribe({
      next: (res) => {
        this.users = res || [];
        this.currentPage = 1;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load super admin users', err);
        this.error = 'Failed to load users';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private matchesTab(user: any): boolean {
    const userType = this.normalizeText(user.user_type);
    const unitType = this.normalizeUnitType(user.unit_type);

    switch (this.activeTab) {
      case 'super-admin':
        return userType === 'super admin';
      case 'zonal':
        return unitType === 'zonal';
      case 'divisional':
        return unitType === 'divisional';
      case 'board':
        return unitType === 'board';
      case 'cris':
        return unitType === 'cris';
      case 'pu':
        return unitType === 'pu';
      case 'cti':
        return unitType === 'cti';
      default:
        return true;
    }
  }

  private buildSummaryCard(unitType: string): SummaryCard {
    const users = this.users.filter(
      (user) => this.normalizeUnitType(user.unit_type) === this.normalizeUnitType(unitType),
    );

    return {
      label: this.getSummaryLabel(unitType),
      unitType,
      counts: [
        { role: 'Admin', value: this.countRole(users, 'Admin') },
        { role: 'Users', value: this.countRole(users, 'User') },
        { role: 'Maker', value: this.countRole(users, 'Maker') },
        { role: 'Checker', value: this.countRole(users, 'Checker') },
        { role: 'Approver', value: this.countRole(users, 'Approver') },
      ].filter((item) => item.value > 0),
    };
  }

  private countRole(users: any[], role: string): number {
    return users.filter((user) => this.normalizeText(user.user_type) === this.normalizeText(role))
      .length;
  }

  private getSummaryLabel(unitType: string): string {
    return unitType === 'PU' ? 'PUs' : unitType;
  }

  private getDefaultCreateUserForm(): CreateUserForm {
    return {
      user_name: '',
      user_id: '',
      password: '',
      user_type: 'Checker',
      unit_type: '',
      unit_name: '',
      zone: '',
      division: '',
      department: '',
    };
  }

  private applyCreateUserDefaults(): void {
    const unitTypeOptions = this.createUserUnitTypeOptions;
    const hasValidUnitType = unitTypeOptions.some(
      (value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.unit_type),
    );

    if (!hasValidUnitType) {
      this.createUserForm.unit_type = unitTypeOptions[0] || '';
    }

    if (this.createUserUsesPuField) {
      const puOptions = this.createPuOptions;
      if (!puOptions.some((value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.unit_name))) {
        this.createUserForm.unit_name = puOptions[0] || '';
      }

      const departmentOptions = this.createDepartmentOptions;
      if (
        !departmentOptions.some(
          (value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.department),
        )
      ) {
        this.createUserForm.department = departmentOptions[0] || '';
      }

      this.createUserForm.zone = '';
      this.createUserForm.division = '';
    } else if (this.createUserUsesMetroMinimalFields) {
      this.createUserForm.unit_name = '';
      this.createUserForm.zone = '';
      this.createUserForm.division = '';
      this.createUserForm.department = '';
    } else if (this.createUserRequiresOrgFields) {
      this.createUserForm.unit_name = '';
      const zoneOptions = this.createZoneOptions;
      if (!zoneOptions.some((value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.zone))) {
        this.createUserForm.zone = zoneOptions[0] || '';
      }

      const divisionOptions = this.getDivisionOptionsForZone(this.createUserForm.zone);
      if (!divisionOptions.some((value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.division))) {
        this.createUserForm.division = divisionOptions[0] || '';
      }

      const departmentOptions = this.createDepartmentOptions;
      if (
        !departmentOptions.some(
          (value) => this.normalizeText(value) === this.normalizeText(this.createUserForm.department),
        )
      ) {
        this.createUserForm.department = departmentOptions[0] || '';
      }
    } else {
      this.createUserForm.unit_name = '';
      this.createUserForm.zone = '';
      this.createUserForm.division = '';
      this.createUserForm.department = '';
    }
  }

  private getDivisionOptionsForZone(zone: string): string[] {
    const normalizedZone = this.normalizeText(zone);
    const matchingUsers = normalizedZone
      ? this.users.filter((user) => this.normalizeText(user.zone) === normalizedZone)
      : this.users;

    return this.getDistinctValues(matchingUsers.map((user) => user.division));
  }

  private getDistinctValues(values: any[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }

  private buildCreateUserFormFromUser(user: any): CreateUserForm {
    return {
      user_name: String(user?.user_name || '').trim(),
      user_id: String(user?.user_id || '').trim(),
      password: '',
      user_type: this.mapUserTypeToFormValue(user?.user_type),
      unit_type: this.mapUnitTypeToFormValue(user?.unit_type),
      unit_name: String(user?.unit_name || '').trim(),
      zone: String(user?.zone || '').trim(),
      division: String(user?.division || '').trim(),
      department: String(user?.department_id || '').trim(),
    };
  }

  private mapUserTypeToFormValue(value: any): CreateUserType {
    const normalized = this.normalizeText(value);
    switch (normalized) {
      case 'checker':
        return 'Checker';
      case 'maker':
        return 'Maker';
      case 'approver':
        return 'Approver';
      case 'admin':
        return 'Admin';
      case 'super admin':
        return 'Super Admin';
      default:
        return 'Checker';
    }
  }

  private mapUnitTypeToFormValue(value: any): string {
    const normalized = this.normalizeUnitType(value);
    switch (normalized) {
      case 'divisional':
        return 'Divisional';
      case 'board':
        return 'Board';
      case 'pu':
        return 'PUs';
      case 'cris':
        return 'CRIS';
      case 'metro kolkata':
        return 'Metro Kolkata';
      default:
        return String(value || '').trim();
    }
  }


  private normalizeText(value: any): string {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  private normalizeUnitType(value: any): string {
    const normalized = this.normalizeText(value);
    return normalized === 'pus' ? 'pu' : normalized;
  }


  openViewModal(user: any) {
    this.selectedUser = user;
    this.showViewModal = true;
  }

  closeViewModal() {
    this.showViewModal = false;
    this.selectedUser = null;
  }

  isCurrentUser(user: any): boolean {
    const currentUserId = this.currentUser.getSnapshot()?.user_id || '';
    return this.normalizeText(user?.user_id) === this.normalizeText(currentUserId);
  }

  isSuperAdminUser(user: any): boolean {
    return this.normalizeText(user?.user_type) === 'super admin';
  }

  openDeleteConfirmModal(user: any): void {
    this.selectedDeleteUser = user;
    this.deleteError = this.isCurrentUser(user)
      ? 'You cannot delete your own logged-in user.'
      : this.isSuperAdminUser(user)
        ? 'Super Admin users cannot be deleted.'
        : '';
    this.showDeleteConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteConfirmModal(): void {
    if (this.deletingUser) return;

    this.showDeleteConfirmModal = false;
    this.selectedDeleteUser = null;
    this.deleteError = '';
    this.cdr.detectChanges();
  }

  deleteSelectedUser(): void {
    if (
      !this.selectedDeleteUser ||
      this.isCurrentUser(this.selectedDeleteUser) ||
      this.isSuperAdminUser(this.selectedDeleteUser)
    ) {
      this.deleteError = 'This user cannot be deleted.';
      return;
    }

    this.deletingUser = true;
    this.deleteError = '';
    this.cdr.detectChanges();

    this.api.deleteSuperAdminUser(this.selectedDeleteUser.objectid).subscribe({
      next: () => {
        this.deletingUser = false;
        this.showDeleteConfirmModal = false;
        this.selectedDeleteUser = null;
        this.loadUsers();
        this.showNotification('User deleted successfully', 'success');
      },
      error: (err) => {
        console.error('Failed to delete user', err);
        this.deletingUser = false;
        this.deleteError = err?.error?.message || err?.error?.error || 'Failed to delete user';
        this.showNotification(this.deleteError, 'error');
        this.cdr.detectChanges();
      },
    });
  }

}
