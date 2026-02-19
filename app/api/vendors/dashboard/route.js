import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/server-auth';
import { db } from '@/lib/db';
import { ROLES } from '@/constants/roles';
import connectToDatabase from '@/lib/mongodb';
import DocumentUpload from '@/models/DocumentUpload';

export async function GET(request) {
    try {
        // Get current user from session
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user has Vendor role or is an Admin
        const role = user.role;
        if (role !== ROLES.VENDOR && role !== ROLES.ADMIN) {
            return NextResponse.json({ error: 'Forbidden: Vendor or Admin access required' }, { status: 403 });
        }

        // Fetch invoices with RBAC filtering (Vendor only sees their own invoices via submittedByUserId)
        const invoices = await db.getInvoices(user);

        // Fetch additional documents for all invoices
        await connectToDatabase();
        const invoiceIds = invoices.map(inv => inv.id);
        const additionalDocs = invoiceIds.length > 0
            ? await DocumentUpload.find({ invoiceId: { $in: invoiceIds } }).lean()
            : [];

        // Build a map of invoiceId -> documents
        const docsMap = {};
        for (const doc of additionalDocs) {
            if (!docsMap[doc.invoiceId]) docsMap[doc.invoiceId] = [];
            docsMap[doc.invoiceId].push({
                documentId: doc.id,
                type: doc.type,
                fileName: doc.fileName,
            });
        }

        // Enrich invoices with additional documents
        const enrichedInvoices = invoices.map(inv => ({
            ...inv,
            additionalDocs: docsMap[inv.id] || [],
        }));

        // Calculate vendor-specific statistics
        const stats = {
            totalInvoices: invoices.length,
            paidCount: invoices.filter(inv => inv.status === 'PAID').length,
            processingCount: invoices.filter(inv => ['DIGITIZING', 'RECEIVED'].includes(inv.status)).length,
            totalBillingVolume: invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0)
        };

        // Fetch active rate cards for the vendor
        const rateCardRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/vendor/rate-cards`, {
            headers: { cookie: request.headers.get('cookie') || '' }
        });
        const rateCards = rateCardRes.ok ? await rateCardRes.json() : [];

        // Return stats, filtered invoices, and rate cards
        return NextResponse.json({
            stats,
            invoices: enrichedInvoices,
            rateCards
        });

    } catch (error) {
        console.error('Vendor dashboard API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
