// ---------------------------------------------------------------------
// PortNova - autonomous notification emails (via Resend, free tier)
// ---------------------------------------------------------------------
// A Supabase Edge Function triggered by Database Webhooks on
// `public.applications`:
//   * INSERT  -> email the JOB OWNER (provider) about the new applicant
//   * UPDATE  -> email the APPLICANT when their status changes
//                (pending -> accepted / rejected)
//
// Deploy:
//   npx supabase functions deploy notify --no-verify-jwt
// Secrets (set once):
//   npx supabase secrets set RESEND_API_KEY=re_... WEBHOOK_SECRET=<random> EMAIL_FROM="PortNova <onboarding@resend.dev>"
// ---------------------------------------------------------------------
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'PortNova <onboarding@resend.dev>';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const sendEmail = async (to, subject, html) => {
    if (!RESEND_API_KEY || !to) return { skipped: true };
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    return { status: res.status };
};

serve(async (req) => {
    if (req.headers.get('authorization') !== `Bearer ${WEBHOOK_SECRET}`) {
        return new Response('unauthorized', { status: 401 });
    }

    let payload;
    try {
        payload = await req.json();
    } catch {
        return new Response('bad json', { status: 400 });
    }

    const { type, record, old_record } = payload;
    if (!record) return new Response('ok');

    // ---- INSERT: new application -> email the job owner (provider) ----
    if (type === 'INSERT') {
        const { data: job } = await supabase
            .from('jobs')
            .select('role, company, created_by')
            .eq('id', record.job_id)
            .single();
        if (!job?.created_by) return new Response('ok');
        const { data: owner } = await supabase.auth.admin.getUserById(job.created_by);
        const to = owner?.user?.email;
        if (to) {
            await sendEmail(
                to,
                `📬 New application: ${record.applicant_name || 'Someone'} - ${job.role}`,
                `<div style="font-family:Arial,sans-serif;color:#0f172a">
          <p>A new application just arrived on <strong>PortNova</strong>.</p>
          <p><strong>Job:</strong> ${job.role} · ${job.company}<br/>
          <strong>Applicant:</strong> ${record.applicant_name}<br/>
          <strong>Email:</strong> ${record.email}<br/>
          <strong>Phone:</strong> ${record.phone || '-'}<br/>
          <strong>City:</strong> ${record.city || '-'}</p>
          <p>Log in to your <strong>Studio → Applicants</strong> to review and accept or reject.</p>
        </div>`,
            );
        }
    }

    // ---- UPDATE: status changed -> email the applicant ----
    if (type === 'UPDATE' && old_record?.app_status !== record.app_status) {
        const status = record.app_status; // pending | accepted | rejected
        if (status === 'accepted' || status === 'rejected') {
            const { data: job } = await supabase
                .from('jobs')
                .select('role, company')
                .eq('id', record.job_id)
                .single();
            const role = job?.role || 'the role';
            const company = job?.company || 'The company';
            if (status === 'accepted') {
                await sendEmail(
                    record.email,
                    `🎉 Application accepted - ${role}`,
                    `<div style="font-family:Arial,sans-serif;color:#0f172a">
            <p>Great news! <strong>${company}</strong> <strong style="color:#16a34a">accepted</strong> your application for <strong>${role}</strong>.</p>
            <p>They will contact you at ${record.email}. Good luck! 🚀</p>
          </div>`,
                );
            } else {
                await sendEmail(
                    record.email,
                    `Update on your application - ${role}`,
                    `<div style="font-family:Arial,sans-serif;color:#0f172a">
            <p>Thank you for applying for <strong>${role}</strong> at <strong>${company}</strong>.</p>
            <p>Unfortunately, they have <strong style="color:#dc2626">moved on with other candidates</strong> this time.</p>
            <p>Don't give up - new opportunities are posted on PortNova regularly. Keep an eye on the jobs board!</p>
          </div>`,
                );
            }
        }
    }

    return new Response('ok', { status: 200 });
});
