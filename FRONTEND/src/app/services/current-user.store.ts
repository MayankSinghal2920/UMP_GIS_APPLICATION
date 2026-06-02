export type CurrentUser = {
  user_id: string;
  user_name: string;
  railway: string;
  division: string;
  actualDivision?: string;
  department: string;
  user_type: string;
  unit_type: string;
  email?: string;
  mobile?: string;
  hrmsid?: string;
  designation?: string;
};

const USER_KEY = 'ump_current_user';
const USER_FALLBACK_KEY = 'ump_current_user_fallback';
const DIVISION_KEY = 'division';
const ASSET_DIVISION_KEY = 'asset_division';
const DEPARTMENT_KEY = 'department';

function clearLegacyAccessTokenStorage(): void {
  sessionStorage.removeItem('ump_access_token');
  localStorage.removeItem('ump_access_token_fallback');
}

function readUserFromSession(): CurrentUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

function readUserFromLocalStorage(): CurrentUser | null {
  try {
    const raw = localStorage.getItem(USER_FALLBACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

clearLegacyAccessTokenStorage();

let snapshot: CurrentUser | null = readUserFromSession();

export function setCurrentUserSnapshot(user: CurrentUser | null): void {
  snapshot = user;

  if (user) {
    const isSuperAdmin = String(user.user_type || '').trim().toLowerCase() === 'super admin';

    const normalizedUser: CurrentUser = {
      ...user,
      division: isSuperAdmin ? '' : String(user.division || '').trim(),
      actualDivision: isSuperAdmin ? '' : String(user.actualDivision || user.division || '').trim(),
    };

    snapshot = normalizedUser;

    sessionStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    localStorage.setItem(USER_FALLBACK_KEY, JSON.stringify(normalizedUser));

    if (isSuperAdmin) {
      localStorage.removeItem(DIVISION_KEY);
      localStorage.removeItem(ASSET_DIVISION_KEY);
    } else {
      localStorage.setItem(DIVISION_KEY, String(normalizedUser.actualDivision || normalizedUser.division || '').trim());
      localStorage.setItem(ASSET_DIVISION_KEY, String(normalizedUser.division || '').trim());
    }

    localStorage.setItem(DEPARTMENT_KEY, String(normalizedUser.department || '').trim());
  } else {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_FALLBACK_KEY);
    localStorage.removeItem(DIVISION_KEY);
    localStorage.removeItem(ASSET_DIVISION_KEY);
    localStorage.removeItem(DEPARTMENT_KEY);
  }
}

export function getCurrentUserSnapshot(): CurrentUser | null {
  if (!snapshot) {
    snapshot = readUserFromSession() || readUserFromLocalStorage();

    if (snapshot) {
      const isSuperAdmin = String(snapshot.user_type || '').trim().toLowerCase() === 'super admin';

      snapshot = {
        ...snapshot,
        division: isSuperAdmin ? '' : String(snapshot.division || '').trim(),
        actualDivision: isSuperAdmin ? '' : String(snapshot.actualDivision || snapshot.division || '').trim(),
      };

      sessionStorage.setItem(USER_KEY, JSON.stringify(snapshot));
      localStorage.setItem(USER_FALLBACK_KEY, JSON.stringify(snapshot));

      if (isSuperAdmin) {
        localStorage.removeItem(DIVISION_KEY);
        localStorage.removeItem(ASSET_DIVISION_KEY);
      } else {
        localStorage.setItem(DIVISION_KEY, String(snapshot.actualDivision || snapshot.division || '').trim());
        localStorage.setItem(ASSET_DIVISION_KEY, String(snapshot.division || '').trim());
      }

      localStorage.setItem(DEPARTMENT_KEY, String(snapshot.department || '').trim());
    }
  }

  return snapshot;
}

export function clearCurrentUserSnapshot(): void {
  snapshot = null;
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_FALLBACK_KEY);
  localStorage.removeItem(DIVISION_KEY);
  localStorage.removeItem(ASSET_DIVISION_KEY);
  localStorage.removeItem(DEPARTMENT_KEY);
}

export function setAccessToken(token: string | null): void {
  clearAccessToken();
}

export function getAccessToken(): string {
  return '';
}

export function clearAccessToken(): void {
  clearLegacyAccessTokenStorage();
}
