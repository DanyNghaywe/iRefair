type ReferrerMobileAuthOperation = 'exchange' | 'refresh';

type MappedReferrerMobileAuthError = {
  status: number;
  message: string;
};

const TEMPORARY_DB_ERROR_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Connection timeout
  'P1008', // Operations timed out
  'P1017', // Server closed the connection
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

function isMissingReferrerMobileSessionTable(error: unknown): boolean {
  const code = getErrorCode(error);
  const message = getErrorMessage(error).toLowerCase();

  if (code === 'P2021') {
    return true;
  }

  return message.includes('referrermobilesession') && message.includes('does not exist');
}

function isTemporaryDatabaseFailure(error: unknown): boolean {
  const code = getErrorCode(error);
  return code ? TEMPORARY_DB_ERROR_CODES.has(code) : false;
}

export function isReferrerMobileSessionStoreUnavailable(error: unknown): boolean {
  return isMissingReferrerMobileSessionTable(error) || isTemporaryDatabaseFailure(error);
}

export function mapReferrerMobileAuthError(
  error: unknown,
  operation: ReferrerMobileAuthOperation,
): MappedReferrerMobileAuthError {
  if (isReferrerMobileSessionStoreUnavailable(error)) {
    return {
      status: 503,
      message: 'Mobile portal sign-in is temporarily unavailable. Please try again in a few minutes.',
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
