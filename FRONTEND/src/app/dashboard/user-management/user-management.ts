import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from 'src/app/api/api';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagementComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];

  assignedCheckerUsers: any[] = [];
  filteredAssignedCheckerUsers: any[] = [];

  searchText: string = '';
  activeRoleFilter: string = 'Total';
  activeTab: 'user-list' | 'assigned-layers' | 'assigned-checker' = 'user-list';

  pageSize = 12;
  currentPage = 1;

  makers: any[] = [];
  checkers: any[] = [];

  selectedMaker: any = null;
  selectedChecker: any = null;

  showAssignCheckerModal = false;

  showAssignLayerModal = false;
  layerMakers: any[] = [];
  availableLayers: any[] = [];
  selectedLayerMaker: any = null;
  selectedLayerDepartmentId: string = '';
  selectedLayerIds: any[] = [];
  selectedLayerObjects: any[] = [];

  showDeleteConfirmModal = false;
  selectedAssignedCheckerUser: any = null;

  showUserInfoModal = false;
  selectedUserInfo: any = null;

  showChangeCheckerModal = false;
  selectedCheckerAssignmentUser: any = null;
  updatedCheckerId: any = null;

  showEditUserModal = false;
  showEditConfirmModal = false;
  showPassword = false;

  assignedLayerUsers: any[] = [];
  filteredAssignedLayerUsers: any[] = [];

  showAssignedLayerDeleteConfirmModal = false;
  selectedAssignedLayerUser: any = null;
  isAssignLayerEditMode = false;

  editUserForm: any = {
    objectid: null,
    user_name: '',
    user_id: '',
    password: '',
    zone: '',
    division: '',
    department_id: '',
  };

  passwordError = '';
  editUserError = '';

  stats = [
    { label: 'Total', value: 0 },
    { label: 'Admin', value: 0 },
    { label: 'Maker', value: 0 },
    { label: 'Checker', value: 0 },
    { label: 'Approver', value: 0 },
    { label: 'User', value: 0 },
  ];

  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef,
  ) {}

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
      },
      error: (err: any) => {
        console.error('Failed to load users', err);
      },
    });
  }

  loadAssignedCheckerUsers(): void {
    this.api.getAssignedCheckerUsers().subscribe({
      next: (res) => {
        this.assignedCheckerUsers = res || [];
        this.filteredAssignedCheckerUsers = [...this.assignedCheckerUsers];
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load assigned checker users', err);
      },
    });
  }

  setActiveTab(tab: 'user-list' | 'assigned-layers' | 'assigned-checker') {
    this.activeTab = tab;
    this.searchText = '';
    this.currentPage = 1;

    if (tab === 'user-list') {
      this.filteredUsers = [...this.users];
    }

    if (tab === 'assigned-layers') {
      this.loadAssignedLayerUsers();
    }

    if (tab === 'assigned-checker') {
      this.loadAssignedCheckerUsers();
    }
  }

  searchUsers(): void {
    const term = this.searchText.toLowerCase().trim();

    if (this.activeTab === 'assigned-layers') {
      if (!term) {
        this.filteredAssignedLayerUsers = [...this.assignedLayerUsers];
      } else {
        this.filteredAssignedLayerUsers = this.assignedLayerUsers.filter(
          (user) =>
            user.user_name?.toLowerCase().includes(term) ||
            user.user_type?.toLowerCase().includes(term) ||
            user.unit_type?.toLowerCase().includes(term) ||
            user.zone?.toLowerCase().includes(term) ||
            user.division?.toLowerCase().includes(term) ||
            user.department_id?.toLowerCase().includes(term) ||
            user.assigned_layer_names?.toLowerCase().includes(term),
        );
      }

      this.currentPage = 1;
      return;
    }

    if (this.activeTab === 'assigned-checker') {
      if (!term) {
        this.filteredAssignedCheckerUsers = [...this.assignedCheckerUsers];
      } else {
        this.filteredAssignedCheckerUsers = this.assignedCheckerUsers.filter(
          (user) =>
            user.user_name?.toLowerCase().includes(term) ||
            user.user_type?.toLowerCase().includes(term) ||
            user.unit_type?.toLowerCase().includes(term) ||
            user.zone?.toLowerCase().includes(term) ||
            user.division?.toLowerCase().includes(term) ||
            user.department_id?.toLowerCase().includes(term) ||
            user.assigned_checker_name?.toLowerCase().includes(term),
        );
      }

      this.currentPage = 1;
      return;
    }

    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(
        (user) =>
          user.user_name?.toLowerCase().includes(term) ||
          user.user_type?.toLowerCase().includes(term) ||
          user.zone?.toLowerCase().includes(term) ||
          user.division?.toLowerCase().includes(term) ||
          user.designation?.toLowerCase().includes(term) ||
          user.hrmsid?.toLowerCase().includes(term) ||
          user.user_id?.toLowerCase().includes(term),
      );
    }

    this.currentPage = 1;
  }

  calculateStats() {
    const counts: any = {
      Total: this.users.length,
      Admin: 0,
      Maker: 0,
      Checker: 0,
      Approver: 0,
      User: 0,
    };

    this.users.forEach((user) => {
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
      { label: 'User', value: counts.User },
    ];
  }

  filterByRole(role: string) {
    this.activeTab = 'user-list';
    this.activeRoleFilter = role;
    this.searchText = '';
    this.currentPage = 1;

    if (role === 'Total') {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(
        (user) => user.user_type?.toLowerCase() === role.toLowerCase(),
      );
    }

    this.cdr.detectChanges();
  }

  trackById(index: number, item: any) {
    return item.objectid;
  }

  get currentDataLength(): number {
    if (this.activeTab === 'assigned-layers') {
      return this.filteredAssignedLayerUsers.length;
    }

    return this.activeTab === 'assigned-checker'
      ? this.filteredAssignedCheckerUsers.length
      : this.filteredUsers.length;
  }

  get paginatedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;

    let source = this.filteredUsers;

    if (this.activeTab === 'assigned-layers') {
      source = this.filteredAssignedLayerUsers;
    }

    if (this.activeTab === 'assigned-checker') {
      source = this.filteredAssignedCheckerUsers;
    }

    return source.slice(start, end);
  }

  get totalPages() {
    return Math.ceil(this.currentDataLength / this.pageSize) || 1;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openAssignCheckerModal() {
    this.showAssignCheckerModal = true;
    this.selectedMaker = null;
    this.selectedChecker = null;

    this.api.getMakerCheckerList().subscribe({
      next: (res) => {
        this.makers = res.makers || [];
        this.checkers = res.checkers || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load maker/checker list', err);
      },
    });
  }

  closeAssignCheckerModal() {
    this.showAssignCheckerModal = false;
    this.cdr.detectChanges();
  }

  assignChecker() {
    if (!this.selectedMaker || !this.selectedChecker) {
      alert('Please select Maker and Checker');
      return;
    }

    const payload = {
      maker_id: this.selectedMaker,
      checker_id: this.selectedChecker,
    };

    this.api.assignChecker(payload).subscribe({
      next: (res) => {
        console.log('Checker assigned successfully', res);

        this.showAssignCheckerModal = false;
        this.selectedMaker = null;
        this.selectedChecker = null;
        this.cdr.detectChanges();

        if (this.activeTab === 'assigned-checker') {
          this.loadAssignedCheckerUsers();
        }

        alert('Checker assigned successfully');
      },
      error: (err) => {
        console.error('Failed to assign checker', err);
        alert('Failed to assign checker');
      },
    });
  }

  openAssignLayerModal(user?: any) {
    this.showAssignLayerModal = true;
    this.selectedLayerMaker = null;
    this.selectedLayerDepartmentId = '';
    this.selectedLayerIds = [];
    this.selectedLayerObjects = [];
    this.availableLayers = [];
    this.isAssignLayerEditMode = !!user;

    this.api.getMakerLayerList().subscribe({
      next: (res) => {
        this.layerMakers = res.makers || [];

        if (user) {
          this.selectedLayerMaker = user.objectid;
          this.onLayerMakerChange();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load maker list for layer assignment', err);
      },
    });
  }

  closeAssignLayerModal() {
    this.showAssignLayerModal = false;
    this.selectedLayerMaker = null;
    this.selectedLayerDepartmentId = '';
    this.selectedLayerIds = [];
    this.selectedLayerObjects = [];
    this.availableLayers = [];
    this.isAssignLayerEditMode = false;
    this.cdr.detectChanges();
  }

  onLayerMakerChange() {
    this.selectedLayerIds = [];
    this.selectedLayerObjects = [];
    this.availableLayers = [];

    const selectedMakerObj = this.layerMakers.find(
      (maker) => String(maker.objectid) === String(this.selectedLayerMaker),
    );

    this.selectedLayerDepartmentId = selectedMakerObj?.department_id || '';

    if (!this.selectedLayerDepartmentId) {
      return;
    }

    this.api.getDepartmentLayers(this.selectedLayerDepartmentId).subscribe({
      next: (res) => {
        this.availableLayers = res || [];

        const existingAssignedIds = String(selectedMakerObj?.assigned_layers || '')
          .split(',')
          .map((id: string) => id.trim())
          .filter((id: string) => id);

        this.selectedLayerIds = [...existingAssignedIds];

        this.selectedLayerObjects = this.availableLayers.filter((layer) =>
          existingAssignedIds.includes(String(layer.layer_id)),
        );

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load department layers', err);
      },
    });
  }

  onLayerSelectionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const selectedIds = Array.from(select.selectedOptions).map((option) => option.value);

    this.selectedLayerIds = selectedIds;

    this.selectedLayerObjects = this.availableLayers.filter((layer) =>
      selectedIds.includes(String(layer.layer_id)),
    );

    this.cdr.detectChanges();
  }

  removeSelectedLayer(layerId: any) {
    this.selectedLayerIds = this.selectedLayerIds.filter((id) => String(id) !== String(layerId));

    this.selectedLayerObjects = this.selectedLayerObjects.filter(
      (layer) => String(layer.layer_id) !== String(layerId),
    );

    this.cdr.detectChanges();
  }

  assignLayersToMaker() {
    if (!this.selectedLayerMaker) {
      alert('Please select Maker');
      return;
    }

    if (!this.selectedLayerIds || this.selectedLayerIds.length === 0) {
      alert('Please select at least one layer');
      return;
    }

    const payload = {
      maker_id: this.selectedLayerMaker,
      layer_ids: this.selectedLayerIds,
    };

    this.api.assignLayers(payload).subscribe({
      next: (res) => {
        console.log('Layers assigned successfully', res);
        this.closeAssignLayerModal();

        this.loadUsers();
        this.loadAssignedLayerUsers();

        alert('Layers assigned successfully');
      },
      error: (err) => {
        console.error('Failed to assign layers', err);
        alert('Failed to assign layers');
      },
    });
  }

  openChangeCheckerModal(user: any) {
    this.selectedCheckerAssignmentUser = user;
    this.updatedCheckerId = null;
    this.showChangeCheckerModal = true;

    this.api.getMakerCheckerList().subscribe({
      next: (res) => {
        this.checkers = res.checkers || [];

        const matchedChecker = this.checkers.find(
          (checker: any) => checker.user_name === user.assigned_checker_name,
        );

        this.updatedCheckerId = matchedChecker ? matchedChecker.objectid : null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load checker list', err);
      },
    });
  }

  closeChangeCheckerModal() {
    this.showChangeCheckerModal = false;
    this.selectedCheckerAssignmentUser = null;
    this.updatedCheckerId = null;
    this.cdr.detectChanges();
  }

  updateAssignedChecker() {
    if (!this.selectedCheckerAssignmentUser || !this.updatedCheckerId) {
      alert('Please select a checker');
      return;
    }

    const payload = {
      maker_id: this.selectedCheckerAssignmentUser.objectid,
      checker_id: this.updatedCheckerId,
    };

    this.api.assignChecker(payload).subscribe({
      next: (res) => {
        console.log('Checker updated successfully', res);
        this.closeChangeCheckerModal();
        this.loadAssignedCheckerUsers();
        alert('Checker updated successfully');
      },
      error: (err) => {
        console.error('Failed to update checker', err);
        alert('Failed to update checker');
      },
    });
  }

  unassignChecker() {
    if (!this.selectedAssignedCheckerUser) {
      return;
    }

    const payload = {
      maker_id: this.selectedAssignedCheckerUser.objectid,
    };

    this.api.unassignChecker(payload).subscribe({
      next: (res) => {
        console.log('Checker unassigned successfully', res);
        this.closeDeleteConfirmModal();
        this.loadAssignedCheckerUsers();
        alert('Checker unassigned successfully');
      },
      error: (err) => {
        console.error('Failed to unassign checker', err);
        alert('Failed to unassign checker');
      },
    });
  }

  openDeleteConfirmModal(user: any) {
    this.selectedAssignedCheckerUser = user;
    this.showDeleteConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal = false;
    this.selectedAssignedCheckerUser = null;
    this.cdr.detectChanges();
  }

  openUserInfoModal(user: any) {
    this.selectedUserInfo = user;
    this.showUserInfoModal = true;
    this.cdr.detectChanges();
  }

  closeUserInfoModal() {
    this.showUserInfoModal = false;
    this.selectedUserInfo = null;
    this.cdr.detectChanges();
  }

  openEditUserModal(user: any) {
    this.editUserForm = {
      objectid: user.objectid,
      user_name: user.user_name || '',
      user_id: user.user_id || '',
      password: '',
      zone: user.zone || '',
      division: user.division || '',
      department_id: user.department_id || '',
    };

    this.passwordError = '';
    this.editUserError = '';
    this.showPassword = false;
    this.showEditUserModal = true;
    this.cdr.detectChanges();
  }

  closeEditUserModal() {
    this.showEditUserModal = false;
    this.passwordError = '';
    this.editUserError = '';
    this.showPassword = false;
    this.cdr.detectChanges();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  validatePassword(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return passwordRegex.test(String(password || ''));
  }

  openEditConfirmModal() {
    this.editUserError = '';
    this.passwordError = '';

    if (!this.editUserForm.user_name?.trim()) {
      this.editUserError = 'User Name is required';
      return;
    }

    if (!this.editUserForm.user_id?.trim()) {
      this.editUserError = 'User ID is required';
      return;
    }

    if (!this.validatePassword(this.editUserForm.password)) {
      this.passwordError =
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
      return;
    }

    this.showEditConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeEditConfirmModal() {
    this.showEditConfirmModal = false;
    this.cdr.detectChanges();
  }

  updateUserDetails() {
    const payload = {
      objectid: this.editUserForm.objectid,
      user_name: this.editUserForm.user_name.trim(),
      password: this.editUserForm.password,
    };

    this.api.updateUserDetails(payload).subscribe({
      next: (res) => {
        this.showEditConfirmModal = false;
        this.showEditUserModal = false;

        this.loadUsers();
        if (this.activeTab === 'assigned-checker') {
          this.loadAssignedCheckerUsers();
        }

        alert('User updated successfully');
      },
      error: (err) => {
        console.error('Failed to update user', err);
        this.editUserError = 'Failed to update user';
        this.showEditConfirmModal = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadAssignedLayerUsers(): void {
    this.api.getAssignedLayerUsers().subscribe({
      next: (res) => {
        this.assignedLayerUsers = res || [];
        this.filteredAssignedLayerUsers = [...this.assignedLayerUsers];
        this.currentPage = 1;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load assigned layer users', err);
      },
    });
  }

  updateAssignedLayersForMaker() {
    if (!this.selectedLayerMaker) {
      alert('Please select Maker');
      return;
    }

    const payload = {
      maker_id: this.selectedLayerMaker,
      layer_ids: this.selectedLayerIds,
    };

    this.api.updateAssignedLayers(payload).subscribe({
      next: (res) => {
        console.log('Assigned layers updated successfully', res);
        this.closeAssignLayerModal();
        this.loadAssignedLayerUsers();
        this.loadUsers();
        alert('Assigned layers updated successfully');
      },
      error: (err) => {
        console.error('Failed to update assigned layers', err);
        alert('Failed to update assigned layers');
      },
    });
  }

  openAssignedLayerDeleteConfirmModal(user: any) {
    this.selectedAssignedLayerUser = user;
    this.showAssignedLayerDeleteConfirmModal = true;
    this.cdr.detectChanges();
  }

  closeAssignedLayerDeleteConfirmModal() {
    this.showAssignedLayerDeleteConfirmModal = false;
    this.selectedAssignedLayerUser = null;
    this.cdr.detectChanges();
  }

  removeAllAssignedLayers() {
    if (!this.selectedAssignedLayerUser) {
      return;
    }

    const payload = {
      maker_id: this.selectedAssignedLayerUser.objectid,
    };

    this.api.clearAssignedLayers(payload).subscribe({
      next: (res) => {
        console.log('Assigned layers removed successfully', res);
        this.closeAssignedLayerDeleteConfirmModal();
        this.loadAssignedLayerUsers();
        this.loadUsers();
        alert('Assigned layers removed successfully');
      },
      error: (err) => {
        console.error('Failed to remove assigned layers', err);
        alert('Failed to remove assigned layers');
      },
    });
  }
}
