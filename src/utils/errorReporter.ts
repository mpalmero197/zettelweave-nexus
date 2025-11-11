import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a unique signature for an error to enable deduplication
 */
function generateErrorSignature(
  errorType: string,
  errorMessage: string,
  filename?: string,
  lineNumber?: number
): string {
  const parts = [
    errorType,
    errorMessage.substring(0, 200), // Limit message length for signature
    filename || 'unknown',
    lineNumber?.toString() || '0'
  ];
  
  // Simple hash function for deduplication
  return parts.join('||');
}

/**
 * Report an error to the database
 */
export async function reportError(
  errorType: string,
  errorMessage: string,
  stack?: string,
  filename?: string,
  lineNumber?: number,
  columnNumber?: number
): Promise<void> {
  try {
    const errorSignature = generateErrorSignature(errorType, errorMessage, filename, lineNumber);
    
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      // Not authenticated, skip reporting
      return;
    }

    // Call the database function to report the error with deduplication
    await supabase.rpc('report_error', {
      p_error_signature: errorSignature,
      p_error_type: errorType,
      p_error_message: errorMessage,
      p_stack_trace: stack,
      p_filename: filename,
      p_line_number: lineNumber,
      p_column_number: columnNumber,
      p_user_agent: navigator.userAgent,
      p_url: window.location.href,
      p_severity: 'error'
    });
  } catch (err) {
    // Silently fail - we don't want error reporting to cause more errors
    console.error('Failed to report error:', err);
  }
}
