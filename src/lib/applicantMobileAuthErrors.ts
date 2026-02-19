type ApplicantMobileAuthOperation = 'exchange' | 'refresh';

type MappedApplicantMobileAuthError = {
  status: number;
  message: string;
};

const TEMPORARY_DB_ERROR_CODES = new Set([
  'P1001',
  'P1002',
  'P1008',
  'P1017',
]);

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  if (!('code' in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function isMissingApplicantMobileSessionTable(error: unknown): boolean {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code === 'P2021') {
    return true;
  }

  return message.includes('applicantmobilesession') && message.includes('does not exist');
}

function isTemporaryDatabaseFailure(error: unknown): boolean {
  const code = getErrorCode(error);
  return code ? TEMPORARY_DB_ERROR_CODES.has(code) : false;
}

export function isApplicantMobileSessionStoreUnavailable(error: unknown): boolean {
  return isMissingApplicantMobileSessionTable(error) || isTemporaryDatabaseFailure(error);
}

export function mapApplicantMobileAuthError(
  error: unknown,
  operation: ApplicantMobileAuthOperation,
): MappedApplicantMobileAuthError {
  if (isApplicantMobileSessionStoreUnavailable(error)) {
    return {
      status: 503,
      message: 'Applicant portal sign-in is temporarily unavailable. Please try again in a few minutes.',
    };
  }

  if (operation === 'refresh') {
    return {
      status: 500,
      message: 'Unable to refresh session right now. Please sign in again.',
    };
  }

  return {
    status: 500,
    message: 'Unable to sign in right now. Please try again later.',
  };
}
