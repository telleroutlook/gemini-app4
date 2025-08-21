import { memo, useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Shield, RefreshCw, Info } from 'lucide-react';

interface SecurityMonitorProps {
  apiKeys: string[];
  onSecurityIssue: (issue: SecurityIssue) => void;
}

interface SecurityIssue {
  type: 'weak_key' | 'key_exposure' | 'rate_limit' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SecurityState {
  issues: SecurityIssue[];
  keyStrength: Record<string, number>;
  rateLimitStatus: Record<string, { remaining: number; resetTime: Date }>;
  lastSecurityCheck: Date | null;
}

export const SecurityMonitor = memo(function SecurityMonitor({
  apiKeys,
  onSecurityIssue
}: SecurityMonitorProps) {
  const [securityState, setSecurityState] = useState<SecurityState>({
    issues: [],
    keyStrength: {},
    rateLimitStatus: {},
    lastSecurityCheck: null
  });

  // Validate API key strength
  const validateKeyStrength = useCallback((key: string): number => {
    if (!key || key.length < 32) return 0;
    
    let strength = 0;
    
    // Check length (minimum 39 chars for Gemini keys)
    if (key.length >= 39) strength += 30;
    else if (key.length >= 32) strength += 20;
    else strength += 10;
    
    // Check for proper format (starts with AI)
    if (key.startsWith('AIza')) strength += 20;
    
    // Check for character variety
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    const hasNumbers = /\d/.test(key);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(key);
    
    if (hasUpperCase && hasLowerCase) strength += 15;
    if (hasNumbers) strength += 15;
    if (hasSpecialChars) strength += 10;
    
    // Check for entropy (randomness)
    const uniqueChars = new Set(key).size;
    if (uniqueChars / key.length > 0.6) strength += 10;
    
    return Math.min(strength, 100);
  }, []);

  // Check for potential key exposure patterns
  const checkKeyExposure = useCallback((key: string): boolean => {
    const suspiciousPatterns = [
      /test/i,
      /demo/i,
      /example/i,
      /sample/i,
      /1234/,
      /abcd/i,
      /qwerty/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(key));
  }, []);

  // Comprehensive security audit
  const performSecurityAudit = useCallback(() => {
    const newIssues: SecurityIssue[] = [];
    const newKeyStrength: Record<string, number> = {};
    
    apiKeys.forEach((key, index) => {
      if (!key) return;
      
      // Validate key strength
      const strength = validateKeyStrength(key);
      newKeyStrength[`key_${index}`] = strength;
      
      if (strength < 50) {
        newIssues.push({
          type: 'weak_key',
          severity: strength < 30 ? 'critical' : 'high',
          message: `API Key #${index + 1} has weak security (${strength}/100)`,
          timestamp: new Date(),
          metadata: { keyIndex: index, strength }
        });
      }
      
      // Check for exposure patterns
      if (checkKeyExposure(key)) {
        newIssues.push({
          type: 'key_exposure',
          severity: 'critical',
          message: `API Key #${index + 1} contains suspicious patterns`,
          timestamp: new Date(),
          metadata: { keyIndex: index }
        });
      }
    });
    
    // Report new critical issues
    newIssues.forEach(issue => {
      if (issue.severity === 'critical') {
        onSecurityIssue(issue);
        toast.error(`🚨 ${issue.message}`, { duration: 10000 });
      } else if (issue.severity === 'high') {
        toast.warning(`⚠️ ${issue.message}`, { duration: 8000 });
      }
    });
    
    setSecurityState(prev => ({
      ...prev,
      issues: [...prev.issues, ...newIssues].slice(-50), // Keep last 50 issues
      keyStrength: newKeyStrength,
      lastSecurityCheck: new Date()
    }));
  }, [apiKeys, validateKeyStrength, checkKeyExposure, onSecurityIssue]);

  // Auto security audit on API key changes
  useEffect(() => {
    if (apiKeys.length > 0) {
      // Debounce security check
      const timer = setTimeout(performSecurityAudit, 500);
      return () => clearTimeout(timer);
    }
  }, [apiKeys, performSecurityAudit]);

  // Periodic security check
  useEffect(() => {
    const interval = setInterval(performSecurityAudit, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [performSecurityAudit]);

  const criticalIssues = securityState.issues.filter(issue => issue.severity === 'critical');
  const highIssues = securityState.issues.filter(issue => issue.severity === 'high');
  
  if (criticalIssues.length === 0 && highIssues.length === 0) {
    return null; // No UI needed when secure
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2 shadow-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-1">
                Critical Security Issues
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                {criticalIssues.slice(0, 3).map((issue, index) => (
                  <li key={index}>• {issue.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {highIssues.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 mb-1">
                Security Warnings
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {highIssues.slice(0, 2).map((issue, index) => (
                  <li key={index}>• {issue.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});