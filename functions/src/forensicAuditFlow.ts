import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * GENKIT BACKEND CORE
 * Protocol: Senior Forensic Auditor (Agentic Two-Pass)
 */
const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_API_KEY })],
});

// Output Schema matching your extensive prompt
const auditOutputSchema = z.object({
  forensic_audit: z.object({
    summary: z.object({
      total_violations: z.number(),
      severity_score: z.string(),
    }),
    accounts: z.array(z.object({
      account_name: z.string(),
      iwc_key: z.string(),
      violation_list: z.array(z.object({
        law_violated: z.string(),
        error_description: z.string(),
        recommended_dispute: z.string(),
        metro2_code_ref: z.string(),
      })),
      research_needed: z.boolean().optional(),
    })),
  }),
});

export const forensicAuditFlow = ai.defineFlow(
  {
    name: 'forensicAuditFlow',
    inputSchema: z.object({
      clientId: z.string(),
      selectedAccounts: z.array(z.any()), // MergedAccount objects
    }),
    outputSchema: auditOutputSchema,
  },
  async (input) => {
    const db = getFirestore();

    // --- PASS 1: DIRECT FORENSIC AUDIT ---
    let auditResponse = await ai.prompt('forensic-audit-v1')({
      input: {
        CREDIT_REPORT_DATA: JSON.stringify(input.selectedAccounts),
        LAW_LIBRARY_CONTEXT: "" // Empty for first pass
      },
    });

    let result = auditResponse.output as z.infer<typeof auditOutputSchema>;

    // --- AGENTIC TRIGGER: Check for Ambiguity ---
    const needsResearch = result.forensic_audit.accounts.some(acc => acc.research_needed);

    if (needsResearch) {
      console.log("AGENTIC ALERT: Grounded Pass Required for Legal Ambiguity.");
      
      // PASS 2: FETCH SPECIALIZED STATUTES
      const lawDocs = await db.collection('law_library_docs').limit(10).get();
      const context = lawDocs.docs.map(d => d.data().content).join('\n\n');

      auditResponse = await ai.prompt('forensic-audit-v1')({
        input: {
          CREDIT_REPORT_DATA: JSON.stringify(input.selectedAccounts),
          LAW_LIBRARY_CONTEXT: context
        },
      });
      result = auditResponse.output as z.infer<typeof auditOutputSchema>;
    }

    // --- COMMIT: Direct-to-Dashboard Persistence ---
    const batch = db.batch();
    for (const acc of result.forensic_audit.accounts) {
      // FIX: Write to the same collection as the frontend bridge ('account_audits')
      // ensuring we merge into the existing document rather than creating a split 'audit_results' doc.
      const path = `clients/${input.clientId}/account_audits/${acc.iwc_key}`;
      
      batch.set(db.doc(path), {
        // Nest AI results under 'analysis' to keep root account data clean
        analysis: {
            violation_list: acc.violation_list,
            research_needed: acc.research_needed || false,
            account_name: acc.account_name, // AI's version of name
            summary: result.forensic_audit.summary
        },
        status: 'analyzed', // Updates status from 'analyzing'
        auditedAt: FieldValue.serverTimestamp(),
        engine: 'gemini-3-flash-preview'
      }, { merge: true });
    }
    await batch.commit();

    return result;
  }
);